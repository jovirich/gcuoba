import type { BranchMembershipDTO, ClassMembershipDTO, DocumentRecordDTO } from '@gcuoba/types';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { apiFetch, buildApiUrl } from '../../lib/api';
import { toMessage } from '../../lib/messages';
import type { MobileSession } from '../../lib/session';
import { styles } from '../../styles';

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function safeFilename(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return `document-${Date.now()}.bin`;
  }
  return trimmed.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

export function DocumentsTab({ session }: { session: MobileSession }) {
  const [mine, setMine] = useState<DocumentRecordDTO[]>([]);
  const [scopeDocs, setScopeDocs] = useState<DocumentRecordDTO[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [scopeType, setScopeType] = useState<'private' | 'class' | 'branch' | 'global'>('private');
  const [visibility, setVisibility] = useState<'private' | 'scope' | 'public'>('private');
  const [classMembership, setClassMembership] = useState<ClassMembershipDTO | null>(null);
  const [branchMembership, setBranchMembership] = useState<BranchMembershipDTO | null>(null);
  const [mineQuery, setMineQuery] = useState('');
  const [scopeQuery, setScopeQuery] = useState('');
  const [minePage, setMinePage] = useState(1);
  const [scopePage, setScopePage] = useState(1);
  const pageSize = 8;

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [mineDocs, classData, branchData] = await Promise.all([
        apiFetch<DocumentRecordDTO[]>('/documents/mine', { token: session.token }),
        apiFetch<ClassMembershipDTO | null>(`/memberships/class/${session.user.id}`, { token: session.token }),
        apiFetch<BranchMembershipDTO[]>(`/memberships/branches/${session.user.id}`, { token: session.token }),
      ]);
      setMine(mineDocs);
      setClassMembership(classData);
      setBranchMembership(
        branchData.find((item) => item.status === 'approved') ??
          branchData.find((item) => item.status === 'requested') ??
          null,
      );
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [session.token, session.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const scopeId =
    scopeType === 'class'
      ? classMembership?.classId
      : scopeType === 'branch'
        ? branchMembership?.branchId
        : undefined;

  const filteredMine = useMemo(() => {
    const query = mineQuery.trim().toLowerCase();
    const sorted = [...mine].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    if (!query) {
      return sorted;
    }
    return sorted.filter((item) => {
      const target = `${item.originalName} ${item.scopeType} ${item.visibility}`.toLowerCase();
      return target.includes(query);
    });
  }, [mine, mineQuery]);

  const filteredScope = useMemo(() => {
    const query = scopeQuery.trim().toLowerCase();
    const sorted = [...scopeDocs].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    if (!query) {
      return sorted;
    }
    return sorted.filter((item) => {
      const target = `${item.originalName} ${item.scopeType} ${item.visibility}`.toLowerCase();
      return target.includes(query);
    });
  }, [scopeDocs, scopeQuery]);

  const mineTotalPages = Math.max(1, Math.ceil(filteredMine.length / pageSize));
  const scopeTotalPages = Math.max(1, Math.ceil(filteredScope.length / pageSize));
  const mineRows = filteredMine.slice((minePage - 1) * pageSize, minePage * pageSize);
  const scopeRows = filteredScope.slice((scopePage - 1) * pageSize, scopePage * pageSize);

  useEffect(() => {
    setMinePage(1);
  }, [mineQuery]);

  useEffect(() => {
    setScopePage(1);
  }, [scopeQuery, scopeType]);

  useEffect(() => {
    if (minePage > mineTotalPages) {
      setMinePage(mineTotalPages);
    }
  }, [minePage, mineTotalPages]);

  useEffect(() => {
    if (scopePage > scopeTotalPages) {
      setScopePage(scopeTotalPages);
    }
  }, [scopePage, scopeTotalPages]);

  async function loadScopeDocuments() {
    if (scopeType === 'private') {
      setScopeDocs([]);
      return;
    }
    if ((scopeType === 'class' || scopeType === 'branch') && !scopeId) {
      setError(`No ${scopeType} membership is available for your account.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const query = new URLSearchParams({ scopeType });
      if (scopeId) {
        query.set('scopeId', scopeId);
      }
      const docs = await apiFetch<DocumentRecordDTO[]>(`/documents/scope?${query.toString()}`, {
        token: session.token,
      });
      setScopeDocs(docs);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function pickFile() {
    setNotice(null);
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    setPickedFile(result.assets[0]);
  }

  async function upload() {
    if (!pickedFile) {
      setError('Choose a file first.');
      return;
    }
    if ((scopeType === 'class' || scopeType === 'branch') && !scopeId) {
      setError(`No ${scopeType} membership is available for your account.`);
      return;
    }

    setUploading(true);
    setError(null);
    setNotice(null);
    try {
      const query = new URLSearchParams({ scopeType, visibility });
      if (scopeId) {
        query.set('scopeId', scopeId);
      }
      const formData = new FormData();
      formData.append(
        'file',
        {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType || 'application/octet-stream',
        } as any,
      );
      await apiFetch(`/documents/upload?${query.toString()}`, {
        method: 'POST',
        token: session.token,
        body: formData,
      });
      setPickedFile(null);
      setNotice('Document uploaded.');
      await load();
      if (scopeType !== 'private') {
        await loadScopeDocuments();
      }
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(documentId: string) {
    setDeletingId(documentId);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/documents/${documentId}`, {
        method: 'DELETE',
        token: session.token,
      });
      setNotice('Document deleted.');
      await load();
      if (scopeType !== 'private') {
        await loadScopeDocuments();
      }
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setDeletingId(null);
    }
  }

  function confirmDelete(documentId: string) {
    Alert.alert('Delete document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void removeDocument(documentId);
        },
      },
    ]);
  }

  async function downloadDocument(documentId: string, originalName: string) {
    setDownloadingId(documentId);
    setError(null);
    setNotice(null);
    try {
      const cacheDir = FileSystemLegacy.cacheDirectory;
      if (!cacheDir) {
        throw new Error('File system cache directory is not available on this device.');
      }
      const fileUri = `${cacheDir}${Date.now()}-${safeFilename(originalName)}`;
      const downloadUrl = buildApiUrl(`/documents/${documentId}/download`);
      const result = await FileSystemLegacy.downloadAsync(downloadUrl, fileUri, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri);
        setNotice('Document downloaded and opened in share sheet.');
      } else {
        setNotice(`Document downloaded: ${result.uri}`);
      }
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.sectionList}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Documents</Text>
        <Text style={styles.mutedText}>Upload your own files and review scope documents.</Text>

        <View style={styles.rowWrap}>
          <Pressable style={[styles.pill, scopeType === 'private' && styles.pillActive]} onPress={() => setScopeType('private')}>
            <Text style={styles.pillText}>Private</Text>
          </Pressable>
          <Pressable style={[styles.pill, scopeType === 'class' && styles.pillActive]} onPress={() => setScopeType('class')}>
            <Text style={styles.pillText}>Class</Text>
          </Pressable>
          <Pressable style={[styles.pill, scopeType === 'branch' && styles.pillActive]} onPress={() => setScopeType('branch')}>
            <Text style={styles.pillText}>Branch</Text>
          </Pressable>
          <Pressable style={[styles.pill, scopeType === 'global' && styles.pillActive]} onPress={() => setScopeType('global')}>
            <Text style={styles.pillText}>Global</Text>
          </Pressable>
        </View>

        <View style={styles.rowWrap}>
          <Pressable style={[styles.pill, visibility === 'private' && styles.pillActive]} onPress={() => setVisibility('private')}>
            <Text style={styles.pillText}>Private</Text>
          </Pressable>
          <Pressable style={[styles.pill, visibility === 'scope' && styles.pillActive]} onPress={() => setVisibility('scope')}>
            <Text style={styles.pillText}>Scope</Text>
          </Pressable>
          <Pressable style={[styles.pill, visibility === 'public' && styles.pillActive]} onPress={() => setVisibility('public')}>
            <Text style={styles.pillText}>Public</Text>
          </Pressable>
        </View>

        <Pressable style={styles.subtleButton} onPress={() => void pickFile()} disabled={uploading}>
          <Text style={styles.subtleButtonLabel}>Choose file</Text>
        </Pressable>
        {pickedFile ? <Text style={styles.mutedText}>Selected: {pickedFile.name}</Text> : null}

        <View style={styles.rowWrap}>
          <Pressable style={[styles.primaryButton, uploading && styles.buttonDisabled]} onPress={() => void upload()} disabled={uploading}>
            <Text style={styles.primaryButtonLabel}>{uploading ? 'Uploading...' : 'Upload document'}</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={() => void load()} disabled={busy}>
            <Text style={styles.subtleButtonLabel}>{busy ? '...' : 'Refresh list'}</Text>
          </Pressable>
          <Pressable style={styles.subtleButton} onPress={() => void loadScopeDocuments()} disabled={busy || scopeType === 'private'}>
            <Text style={styles.subtleButtonLabel}>{busy ? '...' : 'Load scope docs'}</Text>
          </Pressable>
        </View>

        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My documents ({mine.length})</Text>
        <TextInput
          style={styles.input}
          value={mineQuery}
          onChangeText={setMineQuery}
          placeholder="Search my documents"
        />
        {filteredMine.length === 0 ? <Text style={styles.mutedText}>No documents uploaded yet.</Text> : null}
        {mineRows.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.originalName}</Text>
            <Text style={styles.listMeta}>
              {item.scopeType} | {item.visibility} | {formatBytes(item.sizeBytes)}
            </Text>
            <Text style={styles.listMeta}>{new Date(item.uploadedAt).toLocaleString()}</Text>
            <View style={styles.rowWrap}>
              <Pressable
                style={[styles.subtleButton, downloadingId === item.id && styles.buttonDisabled]}
                onPress={() => void downloadDocument(item.id, item.originalName)}
                disabled={downloadingId === item.id}
              >
                <Text style={styles.subtleButtonLabel}>{downloadingId === item.id ? 'Downloading...' : 'Download'}</Text>
              </Pressable>
              <Pressable
                style={[styles.subtleButton, deletingId === item.id && styles.buttonDisabled]}
                onPress={() => confirmDelete(item.id)}
                disabled={deletingId === item.id}
              >
                <Text style={styles.subtleButtonLabel}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {filteredMine.length > pageSize ? (
          <View style={styles.row}>
            <Pressable
              style={[styles.subtleButton, minePage <= 1 && styles.buttonDisabled]}
              onPress={() => setMinePage((page) => Math.max(1, page - 1))}
              disabled={minePage <= 1}
            >
              <Text style={styles.subtleButtonLabel}>Prev</Text>
            </Pressable>
            <Text style={styles.listMeta}>Page {minePage} of {mineTotalPages}</Text>
            <Pressable
              style={[styles.subtleButton, minePage >= mineTotalPages && styles.buttonDisabled]}
              onPress={() => setMinePage((page) => Math.min(mineTotalPages, page + 1))}
              disabled={minePage >= mineTotalPages}
            >
              <Text style={styles.subtleButtonLabel}>Next</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scope documents ({scopeDocs.length})</Text>
        <Text style={styles.mutedText}>Scope list is based on selected scope type.</Text>
        <TextInput
          style={styles.input}
          value={scopeQuery}
          onChangeText={setScopeQuery}
          placeholder="Search scope documents"
        />
        {filteredScope.length === 0 ? <Text style={styles.mutedText}>No scope documents loaded.</Text> : null}
        {scopeRows.map((item) => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{item.originalName}</Text>
            <Text style={styles.listMeta}>
              {item.scopeType} | {item.visibility} | {formatBytes(item.sizeBytes)}
            </Text>
            <Text style={styles.listMeta}>{new Date(item.uploadedAt).toLocaleString()}</Text>
            <Pressable
              style={[styles.subtleButton, downloadingId === item.id && styles.buttonDisabled]}
              onPress={() => void downloadDocument(item.id, item.originalName)}
              disabled={downloadingId === item.id}
            >
              <Text style={styles.subtleButtonLabel}>{downloadingId === item.id ? 'Downloading...' : 'Download'}</Text>
            </Pressable>
          </View>
        ))}
        {filteredScope.length > pageSize ? (
          <View style={styles.row}>
            <Pressable
              style={[styles.subtleButton, scopePage <= 1 && styles.buttonDisabled]}
              onPress={() => setScopePage((page) => Math.max(1, page - 1))}
              disabled={scopePage <= 1}
            >
              <Text style={styles.subtleButtonLabel}>Prev</Text>
            </Pressable>
            <Text style={styles.listMeta}>Page {scopePage} of {scopeTotalPages}</Text>
            <Pressable
              style={[styles.subtleButton, scopePage >= scopeTotalPages && styles.buttonDisabled]}
              onPress={() => setScopePage((page) => Math.min(scopeTotalPages, page + 1))}
              disabled={scopePage >= scopeTotalPages}
            >
              <Text style={styles.subtleButtonLabel}>Next</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
