import type { BranchDTO, BranchMembershipDTO, ProfileDTO } from '@gcuoba/types';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import type { MobileSession } from '../../lib/session';
import { styles } from '../../styles';

export function ProfileTab({ session }: { session: MobileSession }) {
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branchBusy, setBranchBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [branchMemberships, setBranchMemberships] = useState<BranchMembershipDTO[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'public_to_members' | 'private'>('public_to_members');
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchNote, setBranchNote] = useState('');
  const [branchQuery, setBranchQuery] = useState('');

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [data, availableBranches, memberships] = await Promise.all([
        apiFetch<ProfileDTO | null>(`/profiles/${session.user.id}`, {
          token: session.token,
        }),
        apiFetch<BranchDTO[]>('/branches', { token: session.token }),
        apiFetch<BranchMembershipDTO[]>(`/memberships/branches/${session.user.id}`, { token: session.token }),
      ]);
      setProfile(data);
      setBranches(availableBranches);
      setBranchMemberships(memberships);
      setFirstName(data?.firstName ?? '');
      setLastName(data?.lastName ?? '');
      setOccupation(data?.occupation ?? '');
      setPrivacyLevel(data?.privacyLevel ?? 'public_to_members');
      setSelectedPhoto(null);
      const nextBranch = availableBranches.find((branch) => !memberships.some((entry) => entry.branchId === branch.id));
      setSelectedBranchId((current) => current || nextBranch?.id || availableBranches[0]?.id || '');
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [session.token, session.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const basePayload = {
        title: profile?.title ?? '',
        firstName,
        middleName: profile?.middleName ?? '',
        lastName,
        dobDay: profile?.dobDay ?? null,
        dobMonth: profile?.dobMonth ?? null,
        dobYear: profile?.dobYear ?? null,
        sex: profile?.sex ?? '',
        stateOfOrigin: profile?.stateOfOrigin ?? '',
        lgaOfOrigin: profile?.lgaOfOrigin ?? '',
        resHouseNo: profile?.residence?.houseNo ?? '',
        resStreet: profile?.residence?.street ?? '',
        resArea: profile?.residence?.area ?? '',
        resCity: profile?.residence?.city ?? '',
        resCountry: profile?.residence?.country ?? '',
        occupation,
        photoUrl: profile?.photoUrl ?? '',
        houseId: profile?.houseId ?? '',
        privacyLevel,
      };

      const body: FormData | typeof basePayload = selectedPhoto
        ? (() => {
            const formData = new FormData();
            formData.append('title', basePayload.title);
            formData.append('firstName', basePayload.firstName);
            formData.append('middleName', basePayload.middleName);
            formData.append('lastName', basePayload.lastName);
            if (basePayload.dobDay !== null) {
              formData.append('dobDay', String(basePayload.dobDay));
            }
            if (basePayload.dobMonth !== null) {
              formData.append('dobMonth', String(basePayload.dobMonth));
            }
            if (basePayload.dobYear !== null) {
              formData.append('dobYear', String(basePayload.dobYear));
            }
            formData.append('sex', basePayload.sex);
            formData.append('stateOfOrigin', basePayload.stateOfOrigin);
            formData.append('lgaOfOrigin', basePayload.lgaOfOrigin);
            formData.append('resHouseNo', basePayload.resHouseNo);
            formData.append('resStreet', basePayload.resStreet);
            formData.append('resArea', basePayload.resArea);
            formData.append('resCity', basePayload.resCity);
            formData.append('resCountry', basePayload.resCountry);
            formData.append('occupation', basePayload.occupation);
            formData.append('houseId', basePayload.houseId);
            formData.append('privacyLevel', basePayload.privacyLevel);
            formData.append(
              'photo',
              {
                uri: selectedPhoto.uri,
                name: selectedPhoto.fileName || `profile-${Date.now()}.jpg`,
                type: selectedPhoto.mimeType || 'image/jpeg',
              } as any,
            );
            return formData;
          })()
        : basePayload;

      const updated = await apiFetch<ProfileDTO>(`/profiles/${session.user.id}`, {
        method: 'PUT',
        token: session.token,
        body,
      });
      setProfile(updated);
      setSelectedPhoto(null);
      setNotice('Profile updated.');
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function pickProfilePhoto() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Media library permission is required to select a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    setSelectedPhoto(result.assets[0]);
    setNotice('New photo selected. Tap "Save profile" to upload.');
  }

  async function takeProfilePhoto() {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to capture a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    setSelectedPhoto(result.assets[0]);
    setNotice('New photo selected. Tap "Save profile" to upload.');
  }

  async function requestBranchMembership() {
    if (!selectedBranchId) {
      setError('Choose a branch first.');
      return;
    }
    setBranchBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/memberships/branches/${session.user.id}`, {
        method: 'POST',
        token: session.token,
        body: {
          branchId: selectedBranchId,
          note: branchNote.trim() || undefined,
        },
      });
      setBranchNote('');
      setNotice('Branch membership request submitted.');
      await load();
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBranchBusy(false);
    }
  }

  const filteredBranches = useMemo(() => {
    const query = branchQuery.trim().toLowerCase();
    if (!query) {
      return branches.slice(0, 8);
    }
    return branches.filter((branch) => branch.name.toLowerCase().includes(query)).slice(0, 8);
  }, [branchQuery, branches]);

  const photoPreviewUri = selectedPhoto?.uri || profile?.photoUrl || null;
  const branchNameById = useMemo(() => {
    return new Map(branches.map((item) => [item.id, item.name]));
  }, [branches]);

  return (
    <ScrollView contentContainerStyle={styles.sectionList}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Pressable style={styles.subtleButton} onPress={() => void load()} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>{busy ? '...' : 'Refresh'}</Text>
          </Pressable>
        </View>
        <Text style={styles.mutedText}>Email: {session.user.email}</Text>
        <Text style={styles.mutedText}>Phone: {session.user.phone || '-'}</Text>

        {photoPreviewUri ? <Image source={{ uri: photoPreviewUri }} style={styles.profilePhoto} /> : null}
        <View style={styles.rowWrap}>
          <Pressable style={styles.subtleButton} onPress={() => void pickProfilePhoto()}>
            <Text style={styles.subtleButtonLabel}>Choose photo</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={() => void takeProfilePhoto()}>
            <Text style={styles.subtleButtonLabel}>Take photo</Text>
          </Pressable>
        </View>

        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" />
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" />
        <TextInput style={styles.input} value={occupation} onChangeText={setOccupation} placeholder="Occupation" />
        <View style={styles.rowWrap}>
          <Pressable
            style={[styles.pill, privacyLevel === 'public' && styles.pillActive]}
            onPress={() => setPrivacyLevel('public')}
          >
            <Text style={styles.pillText}>Public</Text>
          </Pressable>
          <Pressable
            style={[styles.pill, privacyLevel === 'public_to_members' && styles.pillActive]}
            onPress={() => setPrivacyLevel('public_to_members')}
          >
            <Text style={styles.pillText}>Members</Text>
          </Pressable>
          <Pressable
            style={[styles.pill, privacyLevel === 'private' && styles.pillActive]}
            onPress={() => setPrivacyLevel('private')}
          >
            <Text style={styles.pillText}>Private</Text>
          </Pressable>
        </View>

        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={() => void save()} disabled={saving}>
          <Text style={styles.primaryButtonLabel}>{saving ? 'Saving...' : 'Save profile'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Branch membership</Text>
        {branchMemberships.length === 0 ? <Text style={styles.mutedText}>No branch membership yet.</Text> : null}
        {branchMemberships.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{branchNameById.get(entry.branchId) || 'Branch'}</Text>
            <Text style={styles.listMeta}>Status: {entry.status}</Text>
            <Text style={styles.listMeta}>
              Requested: {entry.requestedAt ? new Date(entry.requestedAt).toLocaleDateString() : '-'}
            </Text>
          </View>
        ))}

        <Text style={styles.listTitle}>Request branch membership</Text>
        <TextInput
          style={styles.input}
          value={branchQuery}
          onChangeText={setBranchQuery}
          placeholder="Search branch name"
        />
        <View style={styles.rowWrap}>
          {filteredBranches.map((branch) => (
            <Pressable
              key={branch.id}
              style={[styles.pill, selectedBranchId === branch.id && styles.pillActive]}
              onPress={() => setSelectedBranchId(branch.id)}
            >
              <Text style={styles.pillText}>{branch.name}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={branchNote}
          onChangeText={setBranchNote}
          placeholder="Note (optional)"
        />
        <Pressable
          style={[styles.primaryButton, branchBusy && styles.buttonDisabled]}
          onPress={() => void requestBranchMembership()}
          disabled={branchBusy}
        >
          <Text style={styles.primaryButtonLabel}>{branchBusy ? 'Submitting...' : 'Request membership'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
