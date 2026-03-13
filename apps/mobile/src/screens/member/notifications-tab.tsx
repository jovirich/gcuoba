import type { NotificationDTO } from '@gcuoba/types';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { apiFetch } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import type { MobileSession } from '../../lib/session';
import { styles } from '../../styles';

type Props = {
  session: MobileSession;
  onUnreadCountChange?: (count: number) => void;
};

export function NotificationsTab({ session, onUnreadCountChange }: Props) {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<NotificationDTO[]>('/notifications/me?limit=100', {
        token: session.token,
      });
      setItems(data);
      onUnreadCountChange?.(data.filter((item) => !item.read).length);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [onUnreadCountChange, session.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(notificationId: string) {
    try {
      await apiFetch(`/notifications/${notificationId}/read`, {
        method: 'POST',
        token: session.token,
      });
      await load();
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  }

  async function markAllRead() {
    try {
      await apiFetch('/notifications/me/read-all', {
        method: 'POST',
        token: session.token,
      });
      await load();
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.sectionList}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.rowWrap}>
            <Pressable style={styles.subtleButton} onPress={() => void load()} disabled={busy}>
              <Text style={styles.subtleButtonLabel}>{busy ? '...' : 'Refresh'}</Text>
            </Pressable>
            <Pressable style={styles.subtleButton} onPress={() => void markAllRead()}>
              <Text style={styles.subtleButtonLabel}>Mark all read</Text>
            </Pressable>
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {items.length === 0 ? <Text style={styles.mutedText}>No notifications.</Text> : null}
        {items.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.title}</Text>
            <Text style={styles.listMeta}>{item.message}</Text>
            <Text style={styles.listMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
            {!item.read ? (
              <Pressable style={styles.subtleButton} onPress={() => void markRead(item.id)}>
                <Text style={styles.subtleButtonLabel}>Mark read</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
