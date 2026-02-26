import Image from 'next/image';
import Link from 'next/link';

const regions = [
  { title: 'Nigeria', count: '18 branches' },
  { title: 'Europe', count: '5 branches' },
  { title: 'North America', count: '6 branches' },
  { title: 'Africa & Middle East', count: '4 branches' },
];

const events = [
  { title: 'Annual General Meeting', date: 'July 18, 2026', location: 'Lagos' },
  { title: 'Founders Day Reunion', date: 'Nov 30, 2026', location: 'Ughelli' },
  { title: 'Global Branch Summit', date: 'Feb 15, 2027', location: 'Virtual' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white antialiased">
      <header className="bg-gradient-to-b from-[#0b182b] via-[#121b2f] to-[#101524]">
        <div className="w-full bg-[#b9031b] text-sm text-yellow-300">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4 py-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="font-semibold">Get in touch:</span> +234 803 059 8387
              </span>
              <span className="hidden border-l border-white/30 pl-4 text-white/80 md:inline">info@gcuoba.com.ng</span>
            </div>
            <div className="flex items-center gap-4 text-white">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-yellow-200">
                Fb
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-yellow-200">
                X
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-yellow-200">
                In
              </a>
            </div>
          </div>
        </div>

        <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-6">
          <div className="flex items-center gap-3">
            <Image
              src="https://gcuoba.com.ng/wp-content/uploads/2024/02/cropped-GCUOBA-Logo.png"
              alt="GCUOBA Crest"
              width={56}
              height={56}
              className="h-14 w-14 rounded-full border border-yellow-400 object-cover"
            />
            <div>
              <p className="text-xs uppercase tracking-widest text-yellow-300">Government College Ughelli</p>
              <p className="text-2xl font-bold text-white">Old Boys Association</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-white/80">
            <a href="#mission" className="hover:text-yellow-200">
              About
            </a>
            <a href="#branches" className="hover:text-yellow-200">
              Branches
            </a>
            <a href="#programs" className="hover:text-yellow-200">
              Projects
            </a>
            <a href="#events" className="hover:text-yellow-200">
              Events
            </a>
            <a href="#contact" className="hover:text-yellow-200">
              Contact
            </a>
            <Link
              href="/register"
              className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-[#0b182b] shadow-lg shadow-yellow-500/30 transition hover:bg-yellow-300"
            >
              Register
            </Link>
          </div>
        </nav>

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-20 pt-10 lg:flex-row lg:items-center">
          <div className="flex-1">
            <p className="text-yellow-300">Established 1945 - Integrity - Leadership</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              The lifelong hub for every GCU alumnus
            </h1>
            <p className="mt-6 text-lg text-slate-200">
              Manage memberships, contribute to projects and welfare cases, pay dues, and stay updated with global and
              branch news-everything powered by the new GCUOBA digital portal.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="inline-flex items-center rounded-full bg-yellow-400 px-6 py-3 text-base font-semibold text-[#0b182b] shadow-lg shadow-yellow-500/40 transition hover:bg-yellow-300"
              >
                Become a member
              </Link>
              <Link
                href="/login?portal=member"
                className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:border-white"
              >
                Member sign in
              </Link>
              <Link
                href="/login?portal=admin"
                className="inline-flex items-center rounded-full border border-yellow-300/40 px-6 py-3 text-base font-semibold text-yellow-100 transition hover:border-yellow-200"
              >
                Executive sign in
              </Link>
            </div>
          </div>
          <div className="flex-1">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <Image
                src="https://gcuoba.com.ng/wp-content/uploads/2023/09/School-Building.jpg"
                alt="Government College Ughelli"
                width={1200}
                height={768}
                className="h-64 w-full rounded-2xl object-cover"
              />
              <div className="mt-6 grid grid-cols-2 gap-6 text-center text-white">
                <div>
                  <p className="text-3xl font-bold">78</p>
                  <p className="text-xs uppercase tracking-widest text-white/70">Years of brotherhood</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">30+</p>
                  <p className="text-xs uppercase tracking-widest text-white/70">Global branches</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">850M+</p>
                  <p className="text-xs uppercase tracking-widest text-white/70">Projects funded</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">100%</p>
                  <p className="text-xs uppercase tracking-widest text-white/70">Alumni pride</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 bg-[#f6f6f6] text-slate-900">
        <section id="mission" className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#b9031b]">Our mission</p>
            <h2 className="mt-4 text-3xl font-bold text-[#0b182b]">
              Building legacies that honour Government College Ughelli
            </h2>
            <p className="mt-4 text-base text-slate-600">
              The GCU Old Boys Association brings alumni across the globe together to mentor the next generation,
              support the school infrastructure, and ensure members thrive through welfare, professional networking,
              and structured dues management.
            </p>
            <ul className="mt-6 space-y-4 text-slate-700">
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#b9031b]" />
                State-of-the-art digital portal for members and executives.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#b9031b]" />
                Transparent dues, project funding, and welfare tracking.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-[#b9031b]" />
                Branch and class collaboration powered by smart notifications.
              </li>
            </ul>
          </div>
          <div id="programs" className="rounded-3xl bg-white p-8 shadow-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#b9031b]">Portal features</p>
            <div className="mt-6 grid gap-6">
              <div className="rounded-2xl border border-slate-100 p-5">
                <p className="text-lg font-semibold text-[#0b182b]">Member Hub</p>
                <p className="text-sm text-slate-600">
                  Manage profiles, branch memberships, and role assignments in one modern interface.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-5">
                <p className="text-lg font-semibold text-[#0b182b]">Dues and Donations</p>
                <p className="text-sm text-slate-600">
                  Invoice history, payment receipts, and scheme targets with Paystack-ready integrations.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-5">
                <p className="text-lg font-semibold text-[#0b182b]">Events and Communication</p>
                <p className="text-sm text-slate-600">
                  RSVP tracking, member contribution intent, scoped announcements, and secure document storage.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="branches" className="bg-[#0b182b] py-16 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col gap-3 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-yellow-400">global network</p>
              <h2 className="text-3xl font-bold">Branches on four continents</h2>
              <p className="text-sm text-white/80">
                Connect with Lagos, Abuja, Port Harcourt, London, Houston, Toronto, Johannesburg, Accra, and dozens
                more.
              </p>
            </div>
            <div className="mt-10 grid gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
              {regions.map((region) => (
                <div key={region.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <p className="text-2xl font-semibold text-yellow-300">{region.title}</p>
                  <p className="mt-2 text-sm text-white/70">{region.count}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="events" className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#b9031b]">Stay informed</p>
            <h2 className="text-3xl font-bold text-[#0b182b]">Upcoming highlights</h2>
            <p className="text-sm text-slate-600">Log in to see full schedules, RSVP, and contribution options.</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {events.map((event) => (
              <div key={event.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg">
                <p className="text-sm uppercase tracking-wider text-slate-500">{event.date}</p>
                <p className="mt-3 text-xl font-semibold text-[#0b182b]">{event.title}</p>
                <p className="text-sm text-slate-500">{event.location}</p>
                <Link href="/login?portal=member" className="mt-4 inline-flex text-sm font-semibold text-[#b9031b]">
                  View details
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#0b182b] py-10 text-sm text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-center">
          <p className="text-lg font-semibold text-white">GCUOBA Secretariat</p>
          <p>Government College Ughelli, Delta State, Nigeria</p>
          <p>support@gcuoba.org - +234 803 059 8387</p>
          <p className="pt-3 text-xs text-white/50">
            &copy; {new Date().getFullYear()} Government College Ughelli Old Boys Association. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
