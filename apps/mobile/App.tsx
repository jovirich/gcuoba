import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { LoadingScreen } from './src/components/loading-screen';
import { parseAuthLink } from './src/lib/deep-links';
import { clearStoredSession, loadStoredSession, type MobileSession } from './src/lib/session';
import { MemberShell } from './src/navigation/member-shell';
import {
  ClaimAccountScreen,
  ForgotPasswordScreen,
  LoginScreen,
  ResetPasswordScreen,
} from './src/screens/auth';

type AuthView = 'login' | 'forgot' | 'reset' | 'claim';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<MobileSession | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [resetEmailPrefill, setResetEmailPrefill] = useState('');
  const [resetTokenPrefill, setResetTokenPrefill] = useState('');
  const [claimClassYearPrefill, setClaimClassYearPrefill] = useState('');

  useEffect(() => {
    let mounted = true;
    loadStoredSession()
      .then((loaded) => {
        if (mounted) {
          setSession(loaded);
        }
      })
      .finally(() => {
        if (mounted) {
          setBooting(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function applyAuthLink(rawUrl: string) {
      if (session) {
        return;
      }
      const parsed = parseAuthLink(rawUrl);
      if (!parsed) {
        return;
      }
      if (parsed.view === 'reset') {
        if (parsed.email) {
          setResetEmailPrefill(parsed.email);
        }
        if (parsed.token) {
          setResetTokenPrefill(parsed.token);
        }
        setAuthView('reset');
        return;
      }
      if (parsed.view === 'claim') {
        if (parsed.classYear) {
          setClaimClassYearPrefill(parsed.classYear);
        }
        setAuthView('claim');
      }
    }

    void Linking.getInitialURL().then((url) => {
      if (url) {
        applyAuthLink(url);
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      applyAuthLink(url);
    });
    return () => {
      sub.remove();
    };
  }, [session]);

  if (booting) {
    return <LoadingScreen text="Starting app..." />;
  }

  if (!session) {
    if (authView === 'forgot') {
      return (
        <ForgotPasswordScreen
          initialEmail={resetEmailPrefill}
          onBack={() => setAuthView('login')}
          onResetReady={(email, token) => {
            setResetEmailPrefill(email);
            setResetTokenPrefill(token ?? '');
            setAuthView('reset');
          }}
        />
      );
    }
    if (authView === 'reset') {
      return (
        <ResetPasswordScreen
          initialEmail={resetEmailPrefill}
          initialToken={resetTokenPrefill}
          onBack={() => setAuthView('login')}
        />
      );
    }
    if (authView === 'claim') {
      return <ClaimAccountScreen onBack={() => setAuthView('login')} initialClassYear={claimClassYearPrefill} />;
    }
    return (
      <LoginScreen
        onSignedIn={setSession}
        onForgotPassword={() => setAuthView('forgot')}
        onResetPassword={() => setAuthView('reset')}
        onClaimAccount={() => setAuthView('claim')}
      />
    );
  }

  return (
    <MemberShell
      session={session}
      onSignOut={async () => {
        await clearStoredSession();
        setAuthView('login');
        setSession(null);
      }}
    />
  );
}
