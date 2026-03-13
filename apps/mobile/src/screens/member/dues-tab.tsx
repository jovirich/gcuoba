import type { DuesBroadsheetDTO } from '@gcuoba/types';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import type { MobileSession } from '../../lib/session';
import { styles } from '../../styles';

function statusTone(status: 'clear' | 'owing_current' | 'outstanding_prior') {
  if (status === 'clear') {
    return { borderColor: '#15803d', backgroundColor: '#dcfce7', color: '#14532d', label: 'Clear' };
  }
  if (status === 'owing_current') {
    return { borderColor: '#92400e', backgroundColor: '#fef3c7', color: '#78350f', label: 'Owing current year' };
  }
  return { borderColor: '#b91c1c', backgroundColor: '#fee2e2', color: '#7f1d1d', label: 'Outstanding prior years' };
}

export function DuesTab({ session }: { session: MobileSession }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<DuesBroadsheetDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const parsedYear = Number(year);
    if (!Number.isFinite(parsedYear) || parsedYear < 2000) {
      setError('Enter a valid year.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<DuesBroadsheetDTO>(`/finance/dues/me?year=${parsedYear}`, {
        token: session.token,
      });
      setData(result);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [session.token, year]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.sectionList}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My dues</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.rowInput]}
            value={year}
            onChangeText={setYear}
            keyboardType="numeric"
            placeholder="Year"
            editable={!busy}
          />
          <Pressable style={[styles.primaryButton, styles.rowButton]} onPress={() => void load()} disabled={busy}>
            <Text style={styles.primaryButtonLabel}>{busy ? 'Loading...' : 'Load'}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {data ? (
          <>
            <Text style={styles.metricText}>Members: {data.totals.members}</Text>
            <Text style={styles.metricText}>Current due: {data.totals.currentYearDues.toLocaleString()} {data.currency}</Text>
            <Text style={styles.metricText}>Paid: {data.totals.paidSoFar.toLocaleString()} {data.currency}</Text>
            <Text style={styles.metricText}>Balance: {data.totals.balanceOwing.toLocaleString()} {data.currency}</Text>
            {data.rows.map((row) => {
              const tone = statusTone(row.status);
              return (
                <View key={row.userId} style={styles.listItem}>
                  <View style={styles.row}>
                    <Text style={styles.listTitle}>{row.memberName}</Text>
                    <View
                      style={[
                        styles.pill,
                        {
                          borderColor: tone.borderColor,
                          backgroundColor: tone.backgroundColor,
                        },
                      ]}
                    >
                      <Text style={[styles.pillText, { color: tone.color }]}>{tone.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.listMeta}>
                    Current balance: {row.currentYearBalance.toLocaleString()} {row.currency} | Prior: {row.priorOutstanding.toLocaleString()} {row.currency}
                  </Text>
                </View>
              );
            })}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}
