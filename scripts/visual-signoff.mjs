import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { chromium, devices } from 'playwright';

let API_URL = 'http://localhost:4000';
const WEB_PORT = (process.env.WEB_PORT ?? process.env.PORT ?? '').trim();
let WEB_URL = (process.env.WEB_URL ?? '').trim() || (WEB_PORT ? `http://localhost:${WEB_PORT}` : 'http://localhost');
const SCREEN_DIR = join(process.cwd(), 'artifacts', 'visual-signoff');

const QA_USER = {
  email: 'visual.qa@gcuoba.local',
  password: 'VisualQa#2026',
  name: 'Visual QA User',
};

async function fetchWithTimeout(url, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: 'no-store', signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHttp(url, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetchWithTimeout(url, 3500);
      if (res.ok || res.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function findLiveBaseUrl(kind) {
  const ports =
    kind === 'api'
      ? [4000, 4001, 4100]
      : WEB_PORT && Number.isFinite(Number(WEB_PORT))
        ? [Number(WEB_PORT)]
        : [];
  const path = kind === 'api' ? '/health' : '/login';
  if (ports.length === 0) {
    return null;
  }
  for (const port of ports) {
    const url = `http://localhost:${port}${path}`;
    try {
      const res = await fetchWithTimeout(url, 2500);
      if (res.status < 500) {
        return `http://localhost:${port}`;
      }
    } catch {
      // try next
    }
  }
  return null;
}

async function ensureQaUser() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(mongoUri);
  const users = mongoose.connection.collection('users');
  const passwordHash = await bcrypt.hash(QA_USER.password, 10);
  await users.updateOne(
    { email: QA_USER.email },
    {
      $set: {
        name: QA_USER.name,
        email: QA_USER.email,
        passwordHash,
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    },
    { upsert: true },
  );
  await mongoose.disconnect();
}

function startService(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[svc] ${chunk.toString()}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[svc:err] ${chunk.toString()}`);
  });

  return child;
}

async function captureRoute(page, route, fileName) {
  await page.goto(`${WEB_URL}${route}`, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: join(SCREEN_DIR, fileName),
    fullPage: true,
  });
  const html = await page.content();
  const hasServerError =
    html.includes('Internal Server Error') ||
    html.includes('API 403') ||
    html.includes('Application error: a server-side exception has occurred');
  return { route, fileName, hasServerError };
}

async function runVisualCapture() {
  await mkdir(SCREEN_DIR, { recursive: true });
  console.log(`Output directory: ${SCREEN_DIR}`);

  await ensureQaUser();
  console.log('QA user ensured.');

  let apiProc = null;
  let webProc = null;

  const liveApi = await findLiveBaseUrl('api');
  if (liveApi) {
    API_URL = liveApi;
    console.log(`Using existing API: ${API_URL}`);
  } else {
    console.log('Starting API service...');
    apiProc = startService('npm', ['run', 'start:dev', '--workspace', 'api']);
    API_URL = 'http://localhost:4000';
  }

  const liveWeb = await findLiveBaseUrl('web');
  if (liveWeb) {
    WEB_URL = liveWeb;
    console.log(`Using existing Web: ${WEB_URL}`);
  } else {
    console.log('Starting Web service...');
    const webEnv = {
      NEXT_PUBLIC_API_BASE_URL: API_URL,
      NEXTAUTH_SECRET: 'visual-signoff-secret',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || WEB_URL,
    };
    if (WEB_PORT) {
      webEnv.PORT = WEB_PORT;
    }
    webProc = startService('npm', ['run', 'start', '--workspace', 'web'], {
      ...webEnv,
    });
    WEB_URL = process.env.NEXTAUTH_URL || WEB_URL;
  }

  try {
    console.log('Waiting for services...');
    await waitForHttp(`${API_URL}/health`);
    await waitForHttp(`${WEB_URL}/login`);
    console.log('Services are up.');

    const browser = await chromium.launch({ headless: true });
    const desktop = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const mobile = await browser.newContext(devices['iPhone 13']);

    const desktopPage = await desktop.newPage();
    const mobilePage = await mobile.newPage();

    const results = [];

    console.log('Capturing desktop public routes...');
    results.push(await captureRoute(desktopPage, '/', 'desktop-home.png'));
    results.push(await captureRoute(desktopPage, '/login', 'desktop-login.png'));
    results.push(await captureRoute(desktopPage, '/register', 'desktop-register.png'));
    results.push(await captureRoute(desktopPage, '/forgot-password', 'desktop-forgot-password.png'));

    console.log('Logging in desktop user...');
    await desktopPage.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });
    await desktopPage.fill('input[type="email"]', QA_USER.email);
    await desktopPage.fill('input[type="password"]', QA_USER.password);
    await desktopPage.click('button[type="submit"]');
    await desktopPage.waitForURL('**/dashboard', { timeout: 30000 });

    const protectedRoutes = [
      ['/dashboard', 'desktop-dashboard.png'],
      ['/profile', 'desktop-profile.png'],
      ['/documents', 'desktop-documents.png'],
      ['/notifications', 'desktop-notifications.png'],
      ['/events', 'desktop-events.png'],
      ['/announcements', 'desktop-announcements.png'],
      ['/admin', 'desktop-admin-home.png'],
      ['/admin/finance', 'desktop-admin-finance.png'],
      ['/admin/welfare', 'desktop-admin-welfare.png'],
      ['/admin/reference', 'desktop-admin-reference.png'],
    ];

    console.log('Capturing desktop protected routes...');
    for (const [route, file] of protectedRoutes) {
      results.push(await captureRoute(desktopPage, route, file));
    }

    console.log('Logging in mobile user...');
    await mobilePage.goto(`${WEB_URL}/login`, { waitUntil: 'networkidle' });
    await mobilePage.fill('input[type="email"]', QA_USER.email);
    await mobilePage.fill('input[type="password"]', QA_USER.password);
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL('**/dashboard', { timeout: 30000 });

    const mobileRoutes = [
      ['/dashboard', 'mobile-dashboard.png'],
      ['/documents', 'mobile-documents.png'],
      ['/admin', 'mobile-admin-home.png'],
      ['/admin/finance', 'mobile-admin-finance.png'],
    ];

    console.log('Capturing mobile routes...');
    for (const [route, file] of mobileRoutes) {
      results.push(await captureRoute(mobilePage, route, file));
    }

    await browser.close();

    const failed = results.filter((entry) => entry.hasServerError);
    console.log('\nVisual sign-off capture complete.');
    console.log(`Captured ${results.length} screenshots in ${SCREEN_DIR}`);
    if (failed.length > 0) {
      console.log('Routes with potential render errors:');
      for (const item of failed) {
        console.log(`- ${item.route} (${item.fileName})`);
      }
    } else {
      console.log('No server-error signatures detected in captured HTML.');
    }
  } finally {
    if (apiProc) apiProc.kill('SIGTERM');
    if (webProc) webProc.kill('SIGTERM');
  }
}

runVisualCapture().catch((error) => {
  console.error(error);
  process.exit(1);
});
