import type { AnnouncementDTO, DashboardSummaryDTO } from '@gcuoba/types';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { LoadingScreen } from '../../components/loading-screen';
import { apiFetch } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import type { MobileSession } from '../../lib/session';
import { styles } from '../../styles';

export function DashboardTab({ session }: { session: MobileSession }) {
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<DashboardSummaryDTO>(`/dashboard/${session.user.id}`, {
        token: session.token,
      });
      setSummary(data);
    } catch (requestError) {
      setError(toMessage(requestError));
    }
  }, [session.token, session.user.id]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    load()
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [load]);

  const duesSummary = summary?.duesSummary;
  const totals = duesSummary?.totalsByCurrency?.[duesSummary.primaryCurrency] ?? {
    due: 0,
    paid: 0,
    balance: 0,
  };

  if (loading) {
    return <LoadingScreen text="Loading dashboard..." />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.sectionList}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dues summary ({duesSummary?.year ?? new Date().getFullYear()})</Text>
        <Text style={styles.mutedText}>Currency: {duesSummary?.primaryCurrency ?? 'NGN'}</Text>
        <Text style={styles.metricText}>Due: {totals.due.toLocaleString()}</Text>
        <Text style={styles.metricText}>Paid: {totals.paid.toLocaleString()}</Text>
        <Text style={styles.metricText}>Balance: {totals.balance.toLocaleString()}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Welfare</Text>
        <Text style={styles.metricText}>Active appeals: {summary?.welfareCases?.length ?? 0}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Events</Text>
        <Text style={styles.metricText}>Upcoming: {summary?.events?.length ?? 0}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Announcements</Text>
        {(summary?.announcements ?? []).slice(0, 4).map((item: AnnouncementDTO) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.title}</Text>
            <Text style={styles.listMeta}>{item.body}</Text>
          </View>
        ))}
        {(summary?.announcements?.length ?? 0) === 0 ? <Text style={styles.mutedText}>No announcements yet.</Text> : null}
      </View>
    </ScrollView>
  );
}
