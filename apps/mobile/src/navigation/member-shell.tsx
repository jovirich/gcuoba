import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { apiFetch } from '../lib/api';
import type { MobileSession } from '../lib/session';
import {
  DashboardTab,
  DocumentsTab,
  DuesTab,
  EventsTab,
  NotificationsTab,
  ProfileTab,
  WelfareTab,
} from '../screens/member';
import { styles } from '../styles';

type TabKey = 'dashboard' | 'dues' | 'events' | 'welfare' | 'documents' | 'notifications' | 'profile';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dues', label: 'Dues' },
  { key: 'events', label: 'Events' },
  { key: 'welfare', label: 'Welfare' },
  { key: 'documents', label: 'Docs' },
  { key: 'notifications', label: 'Alerts' },
  { key: 'profile', label: 'Profile' },
];

type Props = {
  session: MobileSession;
  onSignOut: () => Promise<void>;
};

export function MemberShell({ session, onSignOut }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const result = await apiFetch<{ count: number }>('/notifications/me/unread-count', {
        token: session.token,
      });
      setUnreadCount(result.count ?? 0);
    } catch {
      // Keep existing badge state if the count endpoint fails.
    }
  }, [session.token]);

  useEffect(() => {
    void loadUnreadCount();
    const timer = setInterval(() => {
      void loadUnreadCount();
    }, 45000);
    return () => clearInterval(timer);
  }, [loadUnreadCount]);

  const content = useMemo(() => {
    if (activeTab === 'dashboard') {
      return <DashboardTab session={session} />;
    }
    if (activeTab === 'dues') {
      return <DuesTab session={session} />;
    }
    if (activeTab === 'events') {
      return <EventsTab session={session} />;
    }
    if (activeTab === 'welfare') {
      return <WelfareTab session={session} />;
    }
    if (activeTab === 'documents') {
      return <DocumentsTab session={session} />;
    }
    if (activeTab === 'notifications') {
      return <NotificationsTab session={session} onUnreadCountChange={setUnreadCount} />;
    }
    return <ProfileTab session={session} />;
  }, [activeTab, session]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Member workspace</Text>
          <Text style={styles.headerTitle}>{session.user.name}</Text>
        </View>
        <Pressable style={styles.subtleButton} onPress={() => void onSignOut()}>
          <Text style={styles.subtleButtonLabel}>Sign out</Text>
        </Pressable>
      </View>
      <View style={styles.content}>{content}</View>
      <View style={styles.bottomNav}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.bottomNavButton, activeTab === tab.key && styles.bottomNavButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <View style={styles.bottomNavLabelWrap}>
              <Text style={[styles.bottomNavText, activeTab === tab.key && styles.bottomNavTextActive]}>{tab.label}</Text>
              {tab.key === 'notifications' && unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
