import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { forgotPassword } from '../../lib/api';
import { parseResetLink } from '../../lib/deep-links';
import { toMessage } from '../../lib/messages';
import { styles } from '../../styles';

type Props = {
  initialEmail?: string;
  onBack: () => void;
  onResetReady: (email: string, token?: string) => void;
};

export function ForgotPasswordScreen({
  initialEmail,
  onBack,
  onResetReady,
}: Props) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  async function submit() {
    const value = email.trim().toLowerCase();
    if (!value) {
      setError('Enter your email.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    setResetUrl(null);
    setResetToken('');
    setResetEmail('');
    try {
      const result = await forgotPassword(value);
      setNotice(result.message);
      if (result.resetUrl) {
        const parsed = parseResetLink(result.resetUrl);
        setResetUrl(result.resetUrl);
        setResetToken(parsed.token);
        setResetEmail(parsed.email || value);
      }
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function copyResetLink() {
    if (!resetUrl) {
      return;
    }
    await Clipboard.setStringAsync(resetUrl);
    setNotice('Reset link copied to clipboard.');
  }

  async function openResetLink() {
    if (!resetUrl) {
      return;
    }
    await WebBrowser.openBrowserAsync(resetUrl);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.kicker}>Member access</Text>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.mutedText}>Enter your email to receive a reset link.</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Email"
          editable={!busy}
        />
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {resetUrl ? (
          <View style={styles.card}>
            <Text style={styles.listTitle}>Reset link generated</Text>
            <Text style={styles.listMeta}>{resetUrl}</Text>
            <View style={styles.rowWrap}>
              <Pressable style={styles.subtleButton} onPress={() => void copyResetLink()} disabled={busy}>
                <Text style={styles.subtleButtonLabel}>Copy link</Text>
              </Pressable>
              <Pressable style={styles.subtleButton} onPress={() => void openResetLink()} disabled={busy}>
                <Text style={styles.subtleButtonLabel}>Open link</Text>
              </Pressable>
              <Pressable
                style={styles.subtleButton}
                onPress={() => onResetReady(resetEmail || email.trim().toLowerCase(), resetToken || undefined)}
                disabled={busy}
              >
                <Text style={styles.subtleButtonLabel}>Use in app</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.rowWrap}>
          <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={() => void submit()} disabled={busy}>
            <Text style={styles.primaryButtonLabel}>{busy ? 'Submitting...' : 'Send reset email'}</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={() => onResetReady(email.trim().toLowerCase())} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>I have a token</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={onBack} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>Back to login</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
