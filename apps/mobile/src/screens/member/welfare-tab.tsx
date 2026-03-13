import type { WelfareCaseDTO, WelfareCaseDetailDTO, WelfareContributionDTO } from '@gcuoba/types';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import type { MobileSession } from '../../lib/session';
import { styles } from '../../styles';

function statusTone(status: WelfareContributionDTO['status']) {
  if (status === 'approved') {
    return {
      borderColor: '#15803d',
      backgroundColor: '#dcfce7',
      color: '#14532d',
    };
  }
  if (status === 'rejected') {
    return {
      borderColor: '#b91c1c',
      backgroundColor: '#fee2e2',
      color: '#7f1d1d',
    };
  }
  return {
    borderColor: '#92400e',
    backgroundColor: '#fef3c7',
    color: '#78350f',
  };
}

export function WelfareTab({ session }: { session: MobileSession }) {
  const [cases, setCases] = useState<WelfareCaseDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftAmountByCase, setDraftAmountByCase] = useState<Record<string, string>>({});
  const [draftNoteByCase, setDraftNoteByCase] = useState<Record<string, string>>({});
  const [draftEvidenceByCase, setDraftEvidenceByCase] = useState<Record<string, DocumentPicker.DocumentPickerAsset | null>>({});
  const [actionCaseId, setActionCaseId] = useState<string | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [historyBusyCaseId, setHistoryBusyCaseId] = useState<string | null>(null);
  const [historyErrorByCase, setHistoryErrorByCase] = useState<Record<string, string | null>>({});
  const [myContributionsByCase, setMyContributionsByCase] = useState<Record<string, WelfareContributionDTO[]>>({});

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<WelfareCaseDTO[]>('/welfare/cases', { token: session.token });
      setCases(data);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [session.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitContribution(caseId: string) {
    const amount = Number(draftAmountByCase[caseId] ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid contribution amount.');
      return;
    }
    setActionCaseId(caseId);
    setError(null);
    setNotice(null);
    try {
      let created: WelfareContributionDTO;
      const evidence = draftEvidenceByCase[caseId];
      if (evidence) {
        const formData = new FormData();
        formData.append('amount', String(amount));
        const notes = draftNoteByCase[caseId]?.trim();
        if (notes) {
          formData.append('notes', notes);
        }
        formData.append(
          'paymentEvidence',
          {
            uri: evidence.uri,
            name: evidence.name,
            type: evidence.mimeType || 'application/octet-stream',
          } as any,
        );
        created = await apiFetch<WelfareContributionDTO>(`/welfare/cases/${caseId}/contributions`, {
          method: 'POST',
          token: session.token,
          body: formData,
        });
      } else {
        created = await apiFetch<WelfareContributionDTO>(`/welfare/cases/${caseId}/contributions`, {
          method: 'POST',
          token: session.token,
          body: {
            amount,
            notes: draftNoteByCase[caseId]?.trim() || undefined,
          },
        });
      }
      setDraftAmountByCase((prev) => ({ ...prev, [caseId]: '' }));
      setDraftNoteByCase((prev) => ({ ...prev, [caseId]: '' }));
      setDraftEvidenceByCase((prev) => ({ ...prev, [caseId]: null }));
      setNotice(`Contribution submitted with "${created.status}" status.`);
      setMyContributionsByCase((prev) => {
        if (!prev[caseId]) {
          return prev;
        }
        return {
          ...prev,
          [caseId]: [created, ...prev[caseId]],
        };
      });
      await load();
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setActionCaseId(null);
    }
  }

  async function pickEvidence(caseId: string) {
    setError(null);
    setNotice(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    setDraftEvidenceByCase((prev) => ({ ...prev, [caseId]: result.assets[0] }));
  }

  async function loadMyContributionHistory(caseId: string) {
    setHistoryBusyCaseId(caseId);
    setHistoryErrorByCase((prev) => ({ ...prev, [caseId]: null }));
    try {
      const detail = await apiFetch<WelfareCaseDetailDTO>(`/welfare/cases/${caseId}`, {
        token: session.token,
      });
      const myRows = detail.contributions.filter((row) => {
        if (row.contributorUserId && row.contributorUserId === session.user.id) {
          return true;
        }
        if (row.contributorEmail && row.contributorEmail.toLowerCase() === session.user.email.toLowerCase()) {
          return true;
        }
        return row.contributorName.trim().toLowerCase() === session.user.name.trim().toLowerCase();
      });
      setMyContributionsByCase((prev) => ({ ...prev, [caseId]: myRows }));
    } catch (requestError) {
      setHistoryErrorByCase((prev) => ({ ...prev, [caseId]: toMessage(requestError) }));
    } finally {
      setHistoryBusyCaseId(null);
    }
  }

  function toggleHistory(caseId: string) {
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
      return;
    }
    setExpandedCaseId(caseId);
    if (!myContributionsByCase[caseId]) {
      void loadMyContributionHistory(caseId);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.sectionList}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Welfare appeals</Text>
          <Pressable style={styles.subtleButton} onPress={() => void load()} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>{busy ? '...' : 'Refresh'}</Text>
          </Pressable>
        </View>
        <Text style={styles.mutedText}>Submit payments here. Executive approval is required.</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {cases.length === 0 ? <Text style={styles.mutedText}>No active welfare appeals.</Text> : null}
        {cases.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.title}</Text>
            <Text style={styles.listMeta}>
              Target: {item.targetAmount.toLocaleString()} {item.currency} | Raised: {(item.totalRaised ?? 0).toLocaleString()} {item.currency}
            </Text>
            {item.attendanceRequired ? (
              <Text style={styles.noticeText}>
                Attendance required: {item.attendanceEventTitle || 'Linked event'}
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              value={draftAmountByCase[item.id] ?? ''}
              onChangeText={(value) => setDraftAmountByCase((prev) => ({ ...prev, [item.id]: value }))}
              keyboardType="decimal-pad"
              placeholder={`Amount (${item.currency})`}
            />
            <TextInput
              style={styles.input}
              value={draftNoteByCase[item.id] ?? ''}
              onChangeText={(value) => setDraftNoteByCase((prev) => ({ ...prev, [item.id]: value }))}
              placeholder="Note (optional)"
            />
            <Pressable
              style={styles.subtleButton}
              onPress={() => toggleHistory(item.id)}
              disabled={historyBusyCaseId === item.id}
            >
              <Text style={styles.subtleButtonLabel}>
                {historyBusyCaseId === item.id
                  ? 'Loading...'
                  : expandedCaseId === item.id
                    ? 'Hide my submissions'
                    : 'View my submissions'}
              </Text>
            </Pressable>
            {expandedCaseId === item.id ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>My contribution history</Text>
                {historyErrorByCase[item.id] ? <Text style={styles.errorText}>{historyErrorByCase[item.id]}</Text> : null}
                {(myContributionsByCase[item.id] ?? []).length === 0 ? (
                  <Text style={styles.mutedText}>No contributions submitted yet for this welfare case.</Text>
                ) : (
                  (myContributionsByCase[item.id] ?? []).map((row) => {
                    const tone = statusTone(row.status);
                    return (
                      <View key={row.id} style={styles.listItem}>
                        <View style={styles.row}>
                          <Text style={styles.listMeta}>
                            {new Date(row.paidAt ?? new Date().toISOString()).toLocaleString()}
                          </Text>
                          <View style={[styles.pill, { borderColor: tone.borderColor, backgroundColor: tone.backgroundColor }]}>
                            <Text style={[styles.pillText, { color: tone.color }]}>{row.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.listTitle}>
                          {row.amount.toLocaleString()} {row.currency}
                        </Text>
                        {row.notes ? <Text style={styles.listMeta}>Note: {row.notes}</Text> : null}
                        {row.reviewNote ? <Text style={styles.listMeta}>Review: {row.reviewNote}</Text> : null}
                      </View>
                    );
                  })
                )}
              </View>
            ) : null}
            <Pressable
              style={styles.subtleButton}
              onPress={() => void pickEvidence(item.id)}
              disabled={actionCaseId === item.id}
            >
              <Text style={styles.subtleButtonLabel}>Attach evidence (image/pdf)</Text>
            </Pressable>
            {draftEvidenceByCase[item.id] ? (
              <Text style={styles.mutedText}>Attached: {draftEvidenceByCase[item.id]?.name}</Text>
            ) : null}
            <Pressable
              style={[styles.primaryButton, actionCaseId === item.id && styles.buttonDisabled]}
              onPress={() => void submitContribution(item.id)}
              disabled={actionCaseId === item.id}
            >
              <Text style={styles.primaryButtonLabel}>
                {actionCaseId === item.id ? 'Submitting...' : 'Post contribution'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
