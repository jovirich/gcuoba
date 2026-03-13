import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { signIn } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import { saveStoredSession, type MobileSession } from '../../lib/session';
import { styles } from '../../styles';

type Props = {
  onSignedIn: (session: MobileSession) => void;
  onForgotPassword: () => void;
  onResetPassword: () => void;
  onClaimAccount: () => void;
};

export function LoginScreen({
  onSignedIn,
  onForgotPassword,
  onResetPassword,
  onClaimAccount,
}: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const id = identifier.trim();
    if (!id || !password) {
      setError('Enter your email or phone and password.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const auth = await signIn(id, password);
      const session: MobileSession = { token: auth.token, user: auth.user };
      await saveStoredSession(session);
      onSignedIn(session);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.kicker}>GCUOBA Member App</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.mutedText}>Use the same account details you use on the web member portal.</Text>

        <TextInput
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email or phone"
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          editable={!busy}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={() => void submit()} disabled={busy}>
          <Text style={styles.primaryButtonLabel}>{busy ? 'Signing in...' : 'Sign in'}</Text>
        </Pressable>

        <View style={styles.rowWrap}>
          <Pressable style={styles.subtleButton} onPress={onForgotPassword} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>Forgot password</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={onResetPassword} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>Reset password</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={onClaimAccount} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>Claim account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
