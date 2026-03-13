import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { resetPassword } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import { styles } from '../../styles';

type Props = {
  initialEmail?: string;
  initialToken?: string;
  onBack: () => void;
};

export function ResetPasswordScreen({
  initialEmail,
  initialToken,
  onBack,
}: Props) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [token, setToken] = useState(initialToken ?? '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !token.trim() || password.length < 8 || passwordConfirmation.length < 8) {
      setError('Enter email, token, and passwords (min 8 chars).');
      return;
    }
    if (password !== passwordConfirmation) {
      setError('Password confirmation does not match.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resetPassword({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        password,
        passwordConfirmation,
      });
      setNotice(result.message);
      setPassword('');
      setPasswordConfirmation('');
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
        <Text style={styles.kicker}>Member access</Text>
        <Text style={styles.title}>Reset password</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email"
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Reset token"
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="New password"
          editable={!busy}
        />
        <TextInput
          style={styles.input}
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
          secureTextEntry
          placeholder="Confirm new password"
          editable={!busy}
        />
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.rowWrap}>
          <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={() => void submit()} disabled={busy}>
            <Text style={styles.primaryButtonLabel}>{busy ? 'Submitting...' : 'Reset password'}</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={onBack} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>Back to login</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
