import type { EventDTO, EventParticipationDTO } from '@gcuoba/types';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import type { MobileSession } from '../../lib/session';
import { styles } from '../../styles';

type ParticipationResponse = {
  participation: EventParticipationDTO | null;
  summary: { attendeeCount: number; contributionTotal: number };
};

export function EventsTab({ session }: { session: MobileSession }) {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionEventId, setActionEventId] = useState<string | null>(null);
  const [draftContributionByEvent, setDraftContributionByEvent] = useState<Record<string, string>>({});
  const [draftContributionNoteByEvent, setDraftContributionNoteByEvent] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<EventDTO[]>('/events?status=published', { token: session.token });
      setEvents(data);
      setDraftContributionByEvent((prev) => {
        const next = { ...prev };
        data.forEach((item) => {
          if (next[item.id] === undefined) {
            next[item.id] = String(item.myContributionAmount ?? 0);
          }
        });
        return next;
      });
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [session.token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveParticipation(
    eventId: string,
    payload: {
      status?: 'interested' | 'attending' | 'not_attending';
      contributionAmount?: number;
      contributionCurrency?: string;
      contributionNote?: string | null;
    },
  ) {
    setActionEventId(eventId);
    setError(null);
    try {
      const response = await apiFetch<ParticipationResponse>(`/events/${eventId}/participation`, {
        method: 'POST',
        token: session.token,
        body: payload,
      });
      setEvents((prev) =>
        prev.map((item) =>
          item.id === eventId
            ? {
                ...item,
                attendeeCount: response.summary.attendeeCount,
                contributionTotal: response.summary.contributionTotal,
                myRsvp: response.participation?.status ?? 'none',
                myContributionAmount: response.participation?.contributionAmount ?? 0,
              }
            : item,
        ),
      );
      if (response.participation) {
        setDraftContributionByEvent((prev) => ({
          ...prev,
          [eventId]: String(response.participation?.contributionAmount ?? 0),
        }));
        setDraftContributionNoteByEvent((prev) => ({
          ...prev,
          [eventId]: response.participation?.contributionNote ?? '',
        }));
      }
      await load();
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setActionEventId(null);
    }
  }

  async function rsvp(eventId: string, status: 'interested' | 'attending' | 'not_attending') {
    await saveParticipation(eventId, { status });
  }

  async function postContribution(eventId: string) {
    const amount = Number(draftContributionByEvent[eventId] ?? 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Contribution amount must be zero or greater.');
      return;
    }
    await saveParticipation(eventId, {
      contributionAmount: Number(amount.toFixed(2)),
      contributionCurrency: 'NGN',
      contributionNote: draftContributionNoteByEvent[eventId]?.trim() || null,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.sectionList}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Events</Text>
          <Pressable style={styles.subtleButton} onPress={() => void load()} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>{busy ? '...' : 'Refresh'}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {events.length === 0 ? <Text style={styles.mutedText}>No events available.</Text> : null}
        {events.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.title}</Text>
            <Text style={styles.listMeta}>
              {item.startAt ? new Date(item.startAt).toLocaleString() : 'Date TBD'}
              {item.location ? ` | ${item.location}` : ''}
            </Text>
            <Text style={styles.listMeta}>My RSVP: {item.myRsvp ?? 'none'}</Text>
            <Text style={styles.listMeta}>My contribution: {(item.myContributionAmount ?? 0).toLocaleString()} NGN</Text>
            <View style={styles.rowWrap}>
              <Pressable
                style={styles.pill}
                onPress={() => void rsvp(item.id, 'interested')}
                disabled={actionEventId === item.id}
              >
                <Text style={styles.pillText}>Interested</Text>
              </Pressable>
              <Pressable
                style={styles.pill}
                onPress={() => void rsvp(item.id, 'attending')}
                disabled={actionEventId === item.id}
              >
                <Text style={styles.pillText}>Attending</Text>
              </Pressable>
              <Pressable
                style={styles.pill}
                onPress={() => void rsvp(item.id, 'not_attending')}
                disabled={actionEventId === item.id}
              >
                <Text style={styles.pillText}>Not attending</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              value={draftContributionByEvent[item.id] ?? ''}
              onChangeText={(value) => setDraftContributionByEvent((prev) => ({ ...prev, [item.id]: value }))}
              keyboardType="decimal-pad"
              placeholder="Contribution amount (NGN)"
            />
            <TextInput
              style={styles.input}
              value={draftContributionNoteByEvent[item.id] ?? ''}
              onChangeText={(value) => setDraftContributionNoteByEvent((prev) => ({ ...prev, [item.id]: value }))}
              placeholder="Contribution note (optional)"
            />
            <Pressable
              style={[styles.subtleButton, actionEventId === item.id && styles.buttonDisabled]}
              onPress={() => void postContribution(item.id)}
              disabled={actionEventId === item.id}
            >
              <Text style={styles.subtleButtonLabel}>
                {actionEventId === item.id ? 'Saving...' : 'Save contribution'}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
