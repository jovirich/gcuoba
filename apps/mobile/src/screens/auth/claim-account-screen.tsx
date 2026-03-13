import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  completeClassClaim,
  getClassClaimOptions,
  listClassClaimMembers,
  verifyClassClaim,
  type ClaimMemberOption,
  type ClaimRegistrationOptions,
  type ClaimSearchBy,
} from '../../lib/api';
import { toMessage } from '../../lib/messages';
import { styles } from '../../styles';

type ClaimFormErrors = Partial<{
  classYear: string;
  selectedMember: string;
  defaultPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  password: string;
  confirmPassword: string;
}>;

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? '', lastName: parts[0] ?? '', middleName: '' };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1], middleName: '' };
  }
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

type Props = {
  onBack: () => void;
  initialClassYear?: string;
};

export function ClaimAccountScreen({ onBack, initialClassYear }: Props) {
  const [classYear, setClassYear] = useState(initialClassYear || String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState<ClaimSearchBy>('all');
  const [members, setMembers] = useState<ClaimMemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<ClaimMemberOption | null>(null);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [verifiedToken, setVerifiedToken] = useState('');
  const [options, setOptions] = useState<ClaimRegistrationOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('mr');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [branchId, setBranchId] = useState('');
  const [houseId, setHouseId] = useState('');
  const [note, setNote] = useState('');
  const [branchQuery, setBranchQuery] = useState('');
  const [houseQuery, setHouseQuery] = useState('');
  const [claimErrors, setClaimErrors] = useState<ClaimFormErrors>({});

  const parsedClassYear = Number(classYear);
  const canSearch = Number.isInteger(parsedClassYear) && parsedClassYear >= 1900 && parsedClassYear <= 2100;

  useEffect(() => {
    if (initialClassYear && initialClassYear !== classYear) {
      setClassYear(initialClassYear);
    }
  }, [initialClassYear, classYear]);

  const filteredBranches = useMemo(() => {
    const all = options?.branches ?? [];
    const query = branchQuery.trim().toLowerCase();
    if (!query) {
      return all.slice(0, 20);
    }
    return all.filter((entry) => entry.name.toLowerCase().includes(query)).slice(0, 20);
  }, [options?.branches, branchQuery]);

  const filteredHouses = useMemo(() => {
    const all = options?.houses ?? [];
    const query = houseQuery.trim().toLowerCase();
    if (!query) {
      return all.slice(0, 20);
    }
    return all.filter((entry) => entry.name.toLowerCase().includes(query)).slice(0, 20);
  }, [options?.houses, houseQuery]);

  function validateSearchStep(): ClaimFormErrors {
    const next: ClaimFormErrors = {};
    if (!canSearch) {
      next.classYear = 'Enter a valid class year.';
    }
    return next;
  }

  function validateVerifyStep(): ClaimFormErrors {
    const next = validateSearchStep();
    if (!selectedMember) {
      next.selectedMember = 'Select your name first.';
    }
    if (!defaultPassword.trim()) {
      next.defaultPassword = 'Enter your default claim password.';
    }
    return next;
  }

  function validateCompleteStep(): ClaimFormErrors {
    const next: ClaimFormErrors = {};
    if (!firstName.trim()) {
      next.firstName = 'First name is required.';
    }
    if (!lastName.trim()) {
      next.lastName = 'Last name is required.';
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      next.phone = 'Enter a valid phone number.';
    }
    if (!email.trim() || !email.includes('@')) {
      next.email = 'Enter a valid email.';
    }

    const day = Number(dobDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      next.dobDay = 'Day must be between 1 and 31.';
    }
    const month = Number(dobMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      next.dobMonth = 'Month must be between 1 and 12.';
    }
    if (dobYear.trim()) {
      const year = Number(dobYear);
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        next.dobYear = 'Year must be between 1900 and 2100.';
      }
    }

    if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.';
    }
    if (confirmPassword.length < 8) {
      next.confirmPassword = 'Confirm password must be at least 8 characters.';
    } else if (password !== confirmPassword) {
      next.confirmPassword = 'Password confirmation does not match.';
    }
    return next;
  }

  async function loadMembers() {
    const nextErrors = validateSearchStep();
    if (Object.keys(nextErrors).length > 0) {
      setClaimErrors(nextErrors);
      setError('Please fix highlighted fields.');
      return;
    }
    setBusy(true);
    setClaimErrors({});
    setError(null);
    setNotice(null);
    try {
      const data = await listClassClaimMembers(parsedClassYear, search.trim() || undefined, searchBy);
      setMembers(data.members);
      if (data.members.length === 0) {
        setNotice('No members matched your search.');
      }
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function verifySelectedMember() {
    const nextErrors = validateVerifyStep();
    if (Object.keys(nextErrors).length > 0) {
      setClaimErrors(nextErrors);
      setError('Please fix highlighted fields.');
      return;
    }
    const member = selectedMember;
    if (!member) {
      setClaimErrors({ selectedMember: 'Select your name first.' });
      setError('Please fix highlighted fields.');
      return;
    }
    setBusy(true);
    setClaimErrors({});
    setError(null);
    setNotice(null);
    try {
      const verified = await verifyClassClaim(parsedClassYear, member.userId, defaultPassword);
      const claimOptions = await getClassClaimOptions(parsedClassYear);
      setVerifiedToken(verified.token);
      setOptions(claimOptions);
      const names = splitName(member.name);
      setFirstName(names.firstName);
      setMiddleName(names.middleName);
      setLastName(names.lastName);
      setBranchQuery('');
      setHouseQuery('');
      setNotice('Identity verified. Complete your profile to activate account.');
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function completeClaim() {
    if (!canSearch || !verifiedToken) {
      setError('Verify your identity first.');
      return;
    }
    const nextErrors = validateCompleteStep();
    if (Object.keys(nextErrors).length > 0) {
      setClaimErrors(nextErrors);
      setError('Please fix highlighted fields.');
      return;
    }

    setBusy(true);
    setClaimErrors({});
    setError(null);
    setNotice(null);
    try {
      await completeClassClaim(parsedClassYear, {
        token: verifiedToken,
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        title: title.trim().toLowerCase(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        dobDay: Number(dobDay),
        dobMonth: Number(dobMonth),
        dobYear: dobYear.trim() ? Number(dobYear) : null,
        branchId: branchId || null,
        houseId: houseId || null,
        note: note.trim() || null,
      });
      setNotice('Account claimed successfully. You can now sign in.');
      setTimeout(() => onBack(), 900);
    } catch (requestError) {
      setError(toMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.sectionList}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.kicker}>Claim account</Text>
        <Text style={styles.title}>Class onboarding</Text>
        <Text style={styles.mutedText}>Search your name, verify default password, then complete profile.</Text>

        <TextInput
          style={[styles.input, claimErrors.classYear ? styles.inputError : undefined]}
          value={classYear}
          onChangeText={setClassYear}
          keyboardType="numeric"
          placeholder="Class year (e.g. 1992)"
          editable={!busy}
        />
        {claimErrors.classYear ? <Text style={styles.errorText}>{claimErrors.classYear}</Text> : null}
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, or phone"
          editable={!busy}
        />
        <View style={styles.rowWrap}>
          <Pressable style={[styles.pill, searchBy === 'all' && styles.pillActive]} onPress={() => setSearchBy('all')}>
            <Text style={styles.pillText}>All</Text>
          </Pressable>
          <Pressable style={[styles.pill, searchBy === 'name' && styles.pillActive]} onPress={() => setSearchBy('name')}>
            <Text style={styles.pillText}>Name</Text>
          </Pressable>
          <Pressable style={[styles.pill, searchBy === 'email' && styles.pillActive]} onPress={() => setSearchBy('email')}>
            <Text style={styles.pillText}>Email</Text>
          </Pressable>
          <Pressable style={[styles.pill, searchBy === 'phone' && styles.pillActive]} onPress={() => setSearchBy('phone')}>
            <Text style={styles.pillText}>Phone</Text>
          </Pressable>
        </View>
        <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={() => void loadMembers()} disabled={busy}>
          <Text style={styles.primaryButtonLabel}>{busy ? 'Loading...' : 'Search members'}</Text>
        </Pressable>

        {members.map((member) => (
          <Pressable
            key={member.userId}
            style={[styles.listItem, selectedMember?.userId === member.userId && styles.listItemActive]}
            onPress={() => setSelectedMember(member)}
          >
            <Text style={styles.listTitle}>{member.name}</Text>
            <Text style={styles.listMeta}>Phone: {member.phone || '-'}</Text>
            <Text style={styles.listMeta}>Email: {member.emailMasked}</Text>
          </Pressable>
        ))}
        {claimErrors.selectedMember ? <Text style={styles.errorText}>{claimErrors.selectedMember}</Text> : null}

        <TextInput
          style={[styles.input, claimErrors.defaultPassword ? styles.inputError : undefined]}
          value={defaultPassword}
          onChangeText={setDefaultPassword}
          secureTextEntry
          placeholder="Default claim password"
          editable={!busy}
        />
        {claimErrors.defaultPassword ? <Text style={styles.errorText}>{claimErrors.defaultPassword}</Text> : null}
        <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={() => void verifySelectedMember()} disabled={busy}>
          <Text style={styles.primaryButtonLabel}>{busy ? 'Verifying...' : 'Verify account'}</Text>
        </Pressable>

        {verifiedToken ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Complete profile</Text>
            <TextInput
              style={[styles.input, claimErrors.firstName ? styles.inputError : undefined]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              editable={!busy}
            />
            {claimErrors.firstName ? <Text style={styles.errorText}>{claimErrors.firstName}</Text> : null}
            <TextInput style={styles.input} value={middleName} onChangeText={setMiddleName} placeholder="Middle name (optional)" editable={!busy} />
            <TextInput
              style={[styles.input, claimErrors.lastName ? styles.inputError : undefined]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              editable={!busy}
            />
            {claimErrors.lastName ? <Text style={styles.errorText}>{claimErrors.lastName}</Text> : null}
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Title (mr, mrs...)" editable={!busy} />
            <TextInput
              style={[styles.input, claimErrors.phone ? styles.inputError : undefined]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              editable={!busy}
            />
            {claimErrors.phone ? <Text style={styles.errorText}>{claimErrors.phone}</Text> : null}
            <TextInput
              style={[styles.input, claimErrors.email ? styles.inputError : undefined]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Email"
              editable={!busy}
            />
            {claimErrors.email ? <Text style={styles.errorText}>{claimErrors.email}</Text> : null}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.rowInput, claimErrors.dobDay ? styles.inputError : undefined]}
                value={dobDay}
                onChangeText={setDobDay}
                keyboardType="numeric"
                placeholder="Birth day"
                editable={!busy}
              />
              <TextInput
                style={[styles.input, styles.rowInput, claimErrors.dobMonth ? styles.inputError : undefined]}
                value={dobMonth}
                onChangeText={setDobMonth}
                keyboardType="numeric"
                placeholder="Birth month"
                editable={!busy}
              />
              <TextInput
                style={[styles.input, styles.rowInput, claimErrors.dobYear ? styles.inputError : undefined]}
                value={dobYear}
                onChangeText={setDobYear}
                keyboardType="numeric"
                placeholder="Birth year (optional)"
                editable={!busy}
              />
            </View>
            {claimErrors.dobDay ? <Text style={styles.errorText}>{claimErrors.dobDay}</Text> : null}
            {claimErrors.dobMonth ? <Text style={styles.errorText}>{claimErrors.dobMonth}</Text> : null}
            {claimErrors.dobYear ? <Text style={styles.errorText}>{claimErrors.dobYear}</Text> : null}

            <Text style={styles.listMeta}>Branch (optional)</Text>
            <TextInput
              style={styles.input}
              value={branchQuery}
              onChangeText={setBranchQuery}
              placeholder="Search branch"
              editable={!busy}
            />
            <View style={styles.rowWrap}>
              {filteredBranches.map((branch) => (
                <Pressable key={branch.id} style={[styles.pill, branchId === branch.id && styles.pillActive]} onPress={() => setBranchId(branch.id)}>
                  <Text style={styles.pillText}>{branch.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.listMeta}>House (optional)</Text>
            <TextInput
              style={styles.input}
              value={houseQuery}
              onChangeText={setHouseQuery}
              placeholder="Search house"
              editable={!busy}
            />
            <View style={styles.rowWrap}>
              {filteredHouses.map((house) => (
                <Pressable key={house.id} style={[styles.pill, houseId === house.id && styles.pillActive]} onPress={() => setHouseId(house.id)}>
                  <Text style={styles.pillText}>{house.name}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Branch request note (optional)" editable={!busy} />
            <TextInput
              style={[styles.input, claimErrors.password ? styles.inputError : undefined]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="New password"
              editable={!busy}
            />
            {claimErrors.password ? <Text style={styles.errorText}>{claimErrors.password}</Text> : null}
            <TextInput
              style={[styles.input, claimErrors.confirmPassword ? styles.inputError : undefined]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirm password"
              editable={!busy}
            />
            {claimErrors.confirmPassword ? <Text style={styles.errorText}>{claimErrors.confirmPassword}</Text> : null}
            <Pressable style={[styles.primaryButton, busy && styles.buttonDisabled]} onPress={() => void completeClaim()} disabled={busy}>
              <Text style={styles.primaryButtonLabel}>{busy ? 'Submitting...' : 'Complete claim'}</Text>
            </Pressable>
          </View>
        ) : null}

        {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.subtleButton} onPress={onBack} disabled={busy}>
          <Text style={styles.subtleButtonLabel}>Back to login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
