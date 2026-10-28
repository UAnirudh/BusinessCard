import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, AppState, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Contact } from 'expo-contacts';
import QRCode from 'react-native-qrcode-svg';
import NfcManager, { Ndef, NfcTech } from 'react-native-nfc-manager';
import { ApiError, apiConfigured, apiRequest, BusinessCard, clearToken, deleteAccount, loadToken, NativeSession, NativeUser, passwordResetUrl, privacyUrl, publicCardUrl, saveToken, supportUrl, WalletContact, walletPassUrl } from './src/api';
import { parseCardReference } from './src/card-reference';

type Tab = 'card' | 'wallet' | 'scan' | 'settings';
type NativeSignupVerification = { ok: true; verificationRequired: true; email: string };
const C = { bg: '#F7F6F1', ink: '#18211B', muted: '#717970', line: '#E5E7DF', green: '#D8FB45', white: '#FFFFFF', dark: '#20352B', soft: '#EDF1E8', red: '#B84032' };
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'T';
const friendlyDate = (value: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';

function Button({ title, onPress, variant = 'dark', disabled = false }: { title: string; onPress: () => void; variant?: 'dark' | 'light' | 'outline'; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, variant === 'dark' ? styles.buttonDark : variant === 'light' ? styles.buttonLight : styles.buttonOutline, disabled && { opacity: 0.5 }]}><Text style={[styles.buttonText, variant === 'light' && { color: C.ink }, variant === 'outline' && { color: C.ink }]}>{title}</Text></Pressable>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.fieldWrap}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor="#9AA197" style={styles.input} autoCapitalize="none" {...props} /></View>;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<NativeUser | null>(null);
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [walletAvailability, setWalletAvailability] = useState<{ apple: boolean; google: boolean }>({ apple: false, google: false });
  const [contacts, setContacts] = useState<WalletContact[]>([]);
  const [tab, setTab] = useState<Tab>('card');
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationNotice, setVerificationNotice] = useState('');
  const [error, setError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [selected, setSelected] = useState<WalletContact | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [scanHandled, setScanHandled] = useState(false);
  const [cardReference, setCardReference] = useState('');
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [cameraPermissionOverride, setCameraPermissionOverride] = useState<typeof cameraPermission>(null);
  const currentCameraPermission = cameraPermissionOverride ?? cameraPermission;

  const loadContacts = useCallback(async (auth: string) => {
    const result = await apiRequest<{ connections: WalletContact[] }>('/api/connections', { token: auth });
    setContacts(result.connections ?? []);
  }, []);

  const loadWalletAvailability = useCallback(async (auth: string) => {
    try {
      const result = await apiRequest<{ walletAvailability: { apple: boolean; google: boolean } }>('/api/native/wallet-availability', { token: auth });
      setWalletAvailability({ apple: result.walletAvailability.apple === true, google: result.walletAvailability.google === true });
    } catch {
      // Fail closed: don't show a Wallet action unless the server confirms it is configured.
      setWalletAvailability({ apple: false, google: false });
    }
  }, []);

  const restore = useCallback(async () => {
    setRestoreError('');
    const stored = await loadToken();
    if (!stored) return;
    let data: { user: NativeUser; card: BusinessCard };
    try {
      data = await apiRequest<{ user: NativeUser; card: BusinessCard }>('/api/native/bootstrap', { token: stored });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearToken();
        setWalletAvailability({ apple: false, google: false });
      } else {
        setRestoreError('Couldn’t reach Tappd to restore your session. Your saved sign-in is safe; check your connection and try again.');
      }
      return;
    }
    setToken(stored); setUser(data.user); setCard(data.card);
    await loadWalletAvailability(stored);
    try {
      await loadContacts(stored);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        try { await clearToken(); }
        finally { setToken(null); setUser(null); setCard(null); setWalletAvailability({ apple: false, google: false }); setContacts([]); }
        return;
      }
      Alert.alert('Wallet could not sync', 'Your session is restored, but your connections could not load. Check your connection and refresh your wallet.');
    }
  }, [loadContacts, loadWalletAvailability]);

  const retryRestore = async () => {
    setBooting(true);
    try { await restore(); }
    finally { setBooting(false); }
  };

  useEffect(() => { restore().finally(() => setBooting(false)); }, [restore]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getCameraPermission().then(setCameraPermissionOverride).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [getCameraPermission]);

  const handleVerificationReturn = useCallback((url: string | null | undefined) => {
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'tappd:' || parsed.hostname !== 'auth' || parsed.pathname !== '/verified') return;
      setAuthMode('login');
      setVerificationEmail('');
      setPassword('');
      setError('');
      setVerificationNotice('Your email is verified. Sign in to finish setting up your card.');
    } catch {
      // Ignore unrelated or malformed URLs.
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const subscription = Linking.addEventListener('url', ({ url }) => handleVerificationReturn(url));
    Linking.getInitialURL().then((url) => { if (mounted) handleVerificationReturn(url); }).catch(() => undefined);
    return () => { mounted = false; subscription.remove(); };
  }, [handleVerificationReturn]);

  const signIn = async () => {
    setBusy(true); setError(''); setVerificationNotice('');
    try {
      const result = await apiRequest<NativeSession | NativeSignupVerification>(`/api/native/auth/${authMode}`, { method: 'POST', body: authMode === 'signup' ? { name: name.trim(), email: email.trim() } : { email: email.trim(), password } });
      if (!('token' in result)) {
        setVerificationEmail(result.email);
        setPassword('');
        return;
      }
      await saveToken(result.token);
      setToken(result.token); setUser(result.user); setCard(result.card); setPassword('');
      await loadWalletAvailability(result.token);
      await loadContacts(result.token);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in. Try again.'); }
    finally { setBusy(false); }
  };

  const refresh = async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ user: NativeUser; card: BusinessCard }>('/api/native/bootstrap', { token });
      setUser(data.user); setCard(data.card);
      await loadWalletAvailability(token);
      await loadContacts(token);
    } catch (e) { Alert.alert('Could not refresh', e instanceof Error ? e.message : 'Try again.'); }
  };

  const signOut = async () => {
    if (token) { try { await apiRequest('/api/auth/logout', { method: 'POST', token }); } catch { /* local credentials still need clearing */ } }
    await clearToken(); setToken(null); setUser(null); setCard(null); setWalletAvailability({ apple: false, google: false }); setContacts([]); setSelected(null); setTab('card');
  };

  const requestAccountDeletion = () => {
    if (!token || !deletePassword) {
      setDeleteError('Enter your current password to continue.');
      return;
    }
    Alert.alert(
      'Delete your Tappd account?',
      'This permanently deletes your card, wallet, and account. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => { void confirmAccountDeletion(); } },
      ],
    );
  };

  const confirmAccountDeletion = async () => {
    if (!token) return;
    setBusy(true);
    setDeleteError('');
    try {
      await deleteAccount(token, deletePassword);
      const deletedEmail = user?.email ?? email;
      try { await clearToken(); } catch { /* the deleted account has already revoked this token */ }
      setToken(null); setUser(null); setCard(null); setWalletAvailability({ apple: false, google: false }); setContacts([]); setSelected(null); setTab('card');
      setAuthMode('login'); setEmail(deletedEmail); setPassword('');
      setDeletePassword(''); setDeleteAccountOpen(false);
      Alert.alert('Account deleted', 'Your Tappd account and wallet have been deleted.');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete your account. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveFollowUp = async () => {
    if (!token || !selected) return;
    if (followUp && !/^\d{4}-\d{2}-\d{2}$/.test(followUp)) { Alert.alert('Use YYYY-MM-DD', 'For example, 2026-11-04.'); return; }
    setBusy(true);
    try {
      await apiRequest(`/api/connections/${encodeURIComponent(selected.id)}`, { method: 'PATCH', token, body: { followUpDate: followUp || null } });
      setContacts((items) => items.map((item) => item.id === selected.id ? { ...item, followUpDate: followUp || null } : item));
      setSelected({ ...selected, followUpDate: followUp || null });
      Alert.alert('Saved', followUp ? `Follow-up set for ${friendlyDate(followUp)}.` : 'Follow-up date removed.');
    } catch (e) { Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.'); }
    finally { setBusy(false); }
  };

  const shareCard = async () => {
    if (!card) return;
    if (!card.isPublic) { Alert.alert('Your card is private', 'Turn on public sharing in Settings before sharing your card.'); return; }
    await Share.share({ title: `${card.displayName} on Tappd`, message: `${card.displayName}${card.headline ? ` · ${card.headline}` : ''}\nView and save my contact — no app needed:\n${publicCardUrl(card)}` });
  };

  const updateCardVisibility = async (isPublic: boolean) => {
    if (!token || !card || busy) return;
    setBusy(true);
    try {
      await apiRequest<{ ok: true; slug: string }>('/api/card', {
        method: 'PATCH',
        token,
        body: { displayName: card.displayName, isPublic, collectLeads: isPublic ? card.collectLeads : false },
      });
      setCard({ ...card, isPublic, collectLeads: isPublic ? card.collectLeads : false });
    } catch (e) {
      Alert.alert('Could not update sharing', e instanceof Error ? e.message : 'Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmCardVisibility = () => {
    if (!card || busy) return;
    const makePublic = !card.isPublic;
    Alert.alert(
      makePublic ? 'Make your card public?' : 'Make your card private?',
      makePublic
        ? 'Anyone with your card link can see the details you have added. Visitor contact submissions will stay off until you enable them.'
        : 'People will no longer be able to open your card link or scan its QR code.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: makePublic ? 'Make public' : 'Make private', onPress: () => { void updateCardVisibility(makePublic); } },
      ],
    );
  };

  const walletProvider = Platform.OS === 'ios'
    ? (walletAvailability.apple ? 'apple' : null)
    : Platform.OS === 'android' && walletAvailability.google ? 'google' : null;

  const addCardToWallet = async () => {
    if (!card?.isPublic || !walletProvider) return;
    try {
      await Linking.openURL(walletPassUrl(card, walletProvider));
    } catch {
      Alert.alert('Could not open Wallet', 'Check your connection and try again.');
    }
  };

  const saveContact = async (person: WalletContact) => {
    try {
      const saved = await Contact.presentCreateForm({ givenName: person.name, jobTitle: person.headline ?? undefined, company: person.company ?? undefined, emails: person.email ? [{ label: 'work', address: person.email }] : [], phones: person.phone ? [{ label: 'mobile', number: person.phone }] : [], urlAddresses: person.website ? [{ label: 'work', url: person.website }] : [] });
      if (saved) Alert.alert('Contact saved', `${person.name} is now in your contacts.`);
    } catch { Alert.alert('Contacts unavailable', 'Try again on a physical device with Contacts enabled.'); }
  };

  const writeNfc = async () => {
    if (!card) return;
    if (!card.isPublic) { Alert.alert('Your card is private', 'Make it public in your card settings before writing it to a tag.'); return; }
    try {
      await NfcManager.start();
      if (!(await NfcManager.isSupported())) { Alert.alert('NFC unavailable', 'This device does not support NFC.'); return; }
      await NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage: 'Hold your phone near an NFC tag.' });
      const bytes = Ndef.encodeMessage([Ndef.uriRecord(publicCardUrl(card))]);
      if (!bytes) throw new Error('Could not prepare the card link.');
      await NfcManager.writeNdefMessage(bytes);
      Alert.alert('Card shared', 'Your public Tappd card was written to the tag.');
    } catch (e) { Alert.alert('NFC could not complete', e instanceof Error ? e.message : 'Use a writable NDEF tag and try again.'); }
    finally { try { await NfcManager.cancelTechnologyRequest(); } catch { /* session may already be closed */ } }
  };

  const exchange = async (value: string) => {
    if (scanHandled || !card || !token) return;
    setScanHandled(true);
    const serviceOrigin = publicCardUrl(card).replace(/\/c\/[^/]+$/, '');
    const slug = parseCardReference(value, serviceOrigin);
    if (!slug) { Alert.alert('Not a Tappd card', 'Enter a Tappd card link from this service or its card slug.'); setTimeout(() => setScanHandled(false), 1500); return; }
    if (slug === card.slug) { Alert.alert('That is your card', 'Share your own QR from the Card tab.'); setTimeout(() => setScanHandled(false), 1500); return; }
    try {
      await apiRequest('/api/exchange', { method: 'POST', token, body: { slug, name: card.displayName, email: card.email, phone: card.phone, company: card.company, headline: card.headline, note: 'Met in person' } });
      await loadContacts(token); Alert.alert('You’re connected', 'The contact is now in your wallet.', [{ text: 'Open wallet', onPress: () => setTab('wallet') }]);
    } catch (e) { Alert.alert('Could not exchange cards', e instanceof Error ? e.message : 'Try again.'); }
    finally { setTimeout(() => setScanHandled(false), 1800); }
  };

  const dueCount = useMemo(() => contacts.filter((person) => person.followUpDate && person.followUpDate <= new Date().toISOString().slice(0, 10)).length, [contacts]);

  const contactSupport = () => {
    const url = supportUrl();
    if (!url) {
      Alert.alert('Support is unavailable', 'This app build does not have a support website configured yet.');
      return;
    }
    Linking.openURL(url).catch(() => Alert.alert('Could not open support', 'Check your connection and try again.'));
  };

  if (booting) return <SafeAreaView style={styles.center}><ActivityIndicator color={C.ink} /><Text style={styles.muted}>Opening your wallet…</Text></SafeAreaView>;

  if (!token || !card) return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView contentContainerStyle={styles.authPage} keyboardShouldPersistTaps="handled"><Text style={styles.brand}>tappd®</Text><Text style={styles.eyebrow}>YOUR NETWORK, IN YOUR POCKET</Text>{verificationEmail ? <View style={styles.authPanel}><Text style={styles.panelTitle}>Check your inbox</Text><Text accessibilityRole="text" style={styles.panelSub}>If this address can create an account, watch for a verification link at {verificationEmail}. Open it on this device to verify your email and choose your password. On the confirmation page, tap Return to Tappd and sign in here. The link expires in 24 hours. If it doesn’t arrive, return to signup and request a fresh link.</Text><View style={{ height: 18 }} /><Button title="Back to sign in" onPress={() => { setVerificationEmail(''); setAuthMode('login'); setPassword(''); setError(''); setVerificationNotice(''); }} /><Pressable accessibilityRole="button" onPress={() => { setVerificationEmail(''); setAuthMode('signup'); setError(''); setVerificationNotice(''); }} style={styles.authSwitch}><Text style={styles.muted}>Try again or edit email</Text></Pressable></View> : <><Text style={styles.hero}>Good things start{ '\n' }with an introduction.</Text><Text style={styles.body}>One card to share. A wallet that remembers the people behind every conversation.</Text><View style={styles.authPanel}><Text style={styles.panelTitle}>{authMode === 'login' ? 'Welcome back' : 'Make your card'}</Text><Text style={styles.panelSub}>{authMode === 'login' ? 'Pick up where your network left off.' : 'Verify your email before setting up your card.'}</Text>{authMode === 'signup' && <Field label="YOUR NAME" placeholder="Alex Morgan" value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" />}
    <Field label="EMAIL ADDRESS" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" returnKeyType="next" />
    {authMode === 'login' ? <Field label="PASSWORD" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={signIn} /> : <Text style={styles.panelSub}>We’ll ask you to choose a password after you verify your email.</Text>}
    {!!verificationNotice && <Text accessibilityRole="alert" style={{ color: C.dark, backgroundColor: C.soft, borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 19 }}>{verificationNotice}</Text>}
    {authMode === 'login' && apiConfigured() && <Pressable accessibilityRole="link" onPress={() => { Linking.openURL(passwordResetUrl()).catch(() => Alert.alert('Could not open password reset', 'Check your connection and try again.')); }} style={{ alignSelf: 'flex-end', paddingVertical: 6 }}><Text style={{ color: C.muted, fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' }}>Forgot password?</Text></Pressable>}
    {!!restoreError && <Text style={styles.error}>{restoreError}</Text>}
    {!!error && <Text style={styles.error}>{error}</Text>}
    {!!restoreError && <Button title="Retry saved session" variant="outline" onPress={retryRestore} disabled={booting} />}
    <Button title={busy ? 'One moment…' : authMode === 'login' ? 'Sign in' : 'Email me a verification link'} onPress={signIn} disabled={busy || !apiConfigured()} />
    {!apiConfigured() && <Text style={styles.error}>This app build needs its Tappd service URL before account access is enabled.</Text>}
    <Pressable onPress={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setVerificationNotice(''); }} style={styles.authSwitch}><Text style={styles.muted}>{authMode === 'login' ? 'New to Tappd? ' : 'Already have an account? '}<Text style={{ color: C.ink, fontWeight: '700' }}>{authMode === 'login' ? 'Create account' : 'Sign in'}</Text></Text></Pressable>
    </View><Text style={styles.legal}>By continuing, you agree to use Tappd responsibly. Your session stays protected on this device.</Text><View style={styles.privacyEntry}><Pressable accessibilityRole="link" onPress={() => Linking.openURL(privacyUrl()).catch(() => Alert.alert('Could not open privacy policy', 'Check your connection and try again.'))}><Text style={styles.privacyEntryText}>Privacy policy</Text></Pressable><Text style={styles.privacyEntryArrow}>·</Text><Pressable accessibilityRole="link" onPress={contactSupport}><Text style={styles.privacyEntryText}>Contact support</Text></Pressable></View></>}</ScrollView></KeyboardAvoidingView></SafeAreaView>;

  const renderCard = () => <ScrollView contentContainerStyle={styles.page}>
    <View style={styles.topline}><View><Text style={styles.eyebrow}>YOUR INTRODUCTION</Text><Text style={styles.screenTitle}>Your card</Text></View><Pressable onPress={refresh} style={styles.avatar}><Text style={styles.avatarText}>{initials(card.displayName)}</Text></Pressable></View>
    <View style={styles.card}><View style={styles.cardTop}><Text style={styles.cardBrand}>tappd®</Text><Text style={[styles.livePill, !card.isPublic && styles.privatePill]}>{card.isPublic ? '● LIVE CARD' : '● PRIVATE'}</Text></View><View style={styles.cardIdentity}><View style={styles.cardAvatar}><Text style={styles.cardInitials}>{initials(card.displayName)}</Text></View><Text style={styles.cardName}>{card.displayName}</Text><Text style={styles.cardRole}>{[card.headline, card.company].filter(Boolean).join('  ·  ') || 'Add a role to your card'}</Text></View>{card.isPublic ? <><View style={styles.qrFrame}><QRCode value={publicCardUrl(card)} size={160} color={C.ink} backgroundColor={C.white} /></View><Text style={styles.qrCaption}>SCAN TO MEET {card.displayName.split(' ')[0].toUpperCase()}</Text><Text style={styles.cardUrl}>{publicCardUrl(card).replace(/^https?:\/\//, '')}</Text><Text style={{ color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 7 }}>Opens in any browser — no app needed to view or save your contact.</Text></> : <View style={styles.privateCardNotice}><Text style={styles.privateCardTitle}>Only you can see this card</Text><Text style={styles.privateCardCopy}>Your card stays private until you choose to share it. Visitor contact submissions will stay off.</Text><Button title={busy ? 'Updating…' : 'Make my card public'} variant="light" onPress={confirmCardVisibility} disabled={busy} /></View>}</View>
    {card.isPublic ? <View style={styles.actionsRow}><View style={{ flex: 1 }}><Button title="Share my card  ↗" onPress={shareCard} /></View><Pressable onPress={writeNfc} style={styles.smallAction}><Text style={styles.smallActionIcon}>◉</Text><Text style={styles.smallActionLabel}>Write NFC</Text></Pressable></View> : <View style={styles.privateCardActions}><Text style={styles.privateCardCopy}>QR and NFC sharing are turned off while your card is private.</Text></View>}
    {card.isPublic && walletProvider && <View style={styles.walletActions}><Button title={`Add to ${walletProvider === 'apple' ? 'Apple' : 'Google'} Wallet`} variant="outline" onPress={addCardToWallet} /><Text style={styles.walletNote}>This adds a scannable pass to Wallet. People can save your contact details separately from your public card.</Text></View>}
    <View style={styles.tip}><Text style={styles.tipGlyph}>✳</Text><View style={{ flex: 1 }}><Text style={styles.tipTitle}>A better kind of business card</Text><Text style={styles.tipCopy}>Share once. Keep the connection long after the room.</Text></View></View>
    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Quick pulse</Text><Text style={styles.smallMuted}>YOUR NETWORK</Text></View><View style={styles.statsRow}><View style={styles.stat}><Text style={styles.statNum}>{contacts.length}</Text><Text style={styles.statLabel}>people met</Text></View><View style={styles.stat}><Text style={styles.statNum}>{dueCount}</Text><Text style={styles.statLabel}>follow-ups due</Text></View></View>
  </ScrollView>;

  const renderWallet = () => <ScrollView contentContainerStyle={styles.page}><View style={styles.topline}><View><Text style={styles.eyebrow}>ALL THE RIGHT PEOPLE</Text><Text style={styles.screenTitle}>Your wallet</Text></View><View style={styles.countBubble}><Text style={styles.countText}>{contacts.length}</Text></View></View><Text style={styles.body}>Connections, notes and the next reason to reach out.</Text>{dueCount > 0 && <View style={styles.dueBanner}><Text style={styles.dueMark}>↗</Text><Text style={styles.dueText}>{dueCount} {dueCount === 1 ? 'person' : 'people'} ready for a follow-up</Text></View>}{contacts.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>↗</Text><Text style={styles.emptyTitle}>Your next introduction is out there.</Text><Text style={styles.body}>Scan a Tappd card or add someone after a great conversation.</Text><Button title="Scan a card" onPress={() => setTab('scan')} /></View> : contacts.map((person) => <Pressable key={person.id} onPress={() => { setSelected(person); setFollowUp(person.followUpDate ?? ''); }} style={styles.personRow}><View style={styles.personAvatar}><Text style={styles.personInitial}>{initials(person.name)}</Text></View><View style={{ flex: 1 }}><Text style={styles.personName}>{person.name}</Text><Text style={styles.personMeta}>{[person.headline, person.company].filter(Boolean).join(' · ') || person.email || 'Connection'}</Text><Text style={styles.personFollow}>{person.followUpDate ? `↗  Follow up ${friendlyDate(person.followUpDate)}` : '＋  Set a follow-up'}</Text></View><Text style={styles.chevron}>›</Text></Pressable>)}<Pressable style={styles.nativeHint} onPress={() => Alert.alert('Keep your network close', 'Open a person in your wallet and tap Save to contacts to add them with the native Contacts sheet.')}><Text style={styles.nativeHintIcon}>◎</Text><Text style={styles.nativeHintText}>Save any connection to your phone’s contacts</Text><Text style={styles.chevron}>›</Text></Pressable></ScrollView>;

  const renderScan = () => <ScrollView style={styles.scanScreen} contentContainerStyle={styles.scanContent} keyboardShouldPersistTaps="handled"><View style={styles.topline}><View><Text style={styles.eyebrow}>MAKE IT MUTUAL</Text><Text style={styles.screenTitle}>Meet someone</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close scanner" onPress={() => setTab('card')}><Text style={styles.closeScan}>×</Text></Pressable></View><Text style={styles.body}>Scan their Tappd card to save the introduction both ways.</Text>{currentCameraPermission?.granted ? <View style={styles.cameraWrap}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanHandled ? undefined : ({ data }) => exchange(data)} /><View pointerEvents="none" style={styles.scanOverlay}><View style={styles.scanCorners}><View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} /><View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} /></View><Text style={styles.scanHint}>{scanHandled ? 'Connecting…' : 'Fit their card QR in the frame'}</Text></View></View> : <View style={styles.cameraPermission}><Text style={styles.emptyIcon}>▦</Text><Text style={styles.emptyTitle}>{!currentCameraPermission ? 'Checking camera access' : currentCameraPermission.canAskAgain ? 'Your camera is ready when you are' : 'Camera access is off'}</Text><Text style={styles.body}>{!currentCameraPermission ? 'Checking whether Tappd can scan a card.' : currentCameraPermission.canAskAgain ? 'Camera access is only used to scan a Tappd card QR code.' : 'Allow camera access in your device settings to scan QR codes. You can also enter a Tappd card link below.'}</Text>{currentCameraPermission?.canAskAgain && <Button title="Allow camera" onPress={() => { void requestCameraPermission().then(setCameraPermissionOverride).catch(() => undefined); }} />}{currentCameraPermission && !currentCameraPermission.canAskAgain && <Button title="Open camera settings" variant="outline" onPress={() => { void Linking.openSettings().catch(() => Alert.alert('Could not open settings', 'Enable camera access for Tappd in your device settings.')); }} />}</View>}<View style={styles.manualCard}><Text style={styles.manualTitle}>Enter a card link or slug</Text><Text style={styles.manualCopy}>No camera? Paste their Tappd card URL or enter the slug shown on their card.</Text><TextInput accessibilityLabel="Tappd card link or slug" style={styles.input} value={cardReference} onChangeText={setCardReference} placeholder="https://tappd.up.railway.app/c/name" placeholderTextColor="#9AA197" autoCapitalize="none" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => { void exchange(cardReference); }} /><View style={{ height: 10 }} /><Button title={scanHandled ? 'Connecting…' : 'Add this connection'} onPress={() => { void exchange(cardReference); }} disabled={scanHandled || !cardReference.trim()} variant="outline" /></View><Text style={styles.scanPrivacy}>Their card opens only after they choose to share it.</Text></ScrollView>;

  const renderSettings = () => <ScrollView contentContainerStyle={styles.page}><View style={styles.topline}><View><Text style={styles.eyebrow}>MADE FOR REAL LIFE</Text><Text style={styles.screenTitle}>Settings</Text></View></View><View style={styles.profilePanel}><View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{initials(user?.name ?? card.displayName)}</Text></View><View style={{ flex: 1 }}><Text style={styles.profileName}>{user?.name ?? card.displayName}</Text><Text style={styles.personMeta}>{user?.email}</Text></View><View style={styles.accountTag}><Text style={styles.accountTagText}>ACCOUNT</Text></View></View><Text style={styles.sectionTitle}>Your sharing tools</Text><SettingRow icon={card.isPublic ? '◌' : '◉'} title={card.isPublic ? 'Make my card private' : 'Make my card public'} subtitle={card.isPublic ? 'Hide your card link and QR code' : 'Let anyone with your link view your card'} onPress={confirmCardVisibility} /><SettingRow icon="↗" title="Share your card" subtitle="Send your link with any app" onPress={shareCard} /><SettingRow icon="◉" title="Write an NFC tag" subtitle="Make a tap-to-share card" onPress={writeNfc} /><SettingRow icon="▦" title="Scan a Tappd card" subtitle="Exchange details in person" onPress={() => setTab('scan')} /><Text style={[styles.sectionTitle, { marginTop: 28 }]}>Your account</Text><SettingRow icon="↻" title="Refresh your card and wallet" subtitle="Sync the latest from Tappd" onPress={refresh} /><SettingRow icon="✉" title="Contact support" subtitle="Open the support page" onPress={contactSupport} /><SettingRow icon="⌑" title="Privacy policy" subtitle="How your information is used" onPress={() => Linking.openURL(privacyUrl()).catch(() => Alert.alert('Could not open privacy policy', 'Check your connection and try again.'))} /><Pressable onPress={signOut} style={styles.signOut}><Text style={styles.signOutText}>Sign out</Text><Text style={styles.chevron}>↗</Text></Pressable><View style={styles.deleteSection}><Text style={styles.deleteTitle}>Delete account</Text><Text style={styles.deleteCopy}>Permanently remove your Tappd account, card, and wallet.</Text>{deleteAccountOpen ? <><Field label="CURRENT PASSWORD" placeholder="Enter your password" value={deletePassword} onChangeText={(value) => { setDeletePassword(value); setDeleteError(''); }} secureTextEntry autoCapitalize="none" editable={!busy} returnKeyType="done" onSubmitEditing={requestAccountDeletion} />{!!deleteError && <Text accessibilityRole="alert" style={styles.error}>{deleteError}</Text>}<Button title={busy ? 'Deleting…' : 'Continue to delete'} onPress={requestAccountDeletion} disabled={busy} /><Pressable accessibilityRole="button" onPress={() => { setDeleteAccountOpen(false); setDeletePassword(''); setDeleteError(''); }} style={styles.deleteCancel} disabled={busy}><Text style={styles.deleteCancelText}>Cancel</Text></Pressable></> : <Pressable accessibilityRole="button" onPress={() => setDeleteAccountOpen(true)} style={styles.deleteOpen}><Text style={styles.deleteOpenText}>Delete account</Text></Pressable>}</View><Text style={styles.version}>TAPPD FOR IOS + ANDROID · BUILD 1.0</Text></ScrollView>;

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" />{tab === 'card' && renderCard()}{tab === 'wallet' && renderWallet()}{tab === 'scan' && renderScan()}{tab === 'settings' && renderSettings()}<View accessibilityRole="tabbar" style={styles.tabBar}>{([['card', 'Card', '▣'], ['wallet', 'Wallet', '◷'], ['scan', 'Scan', '⌗'], ['settings', 'Settings', '⚙']] as [Tab, string, string][]).map(([key, label, glyph]) => <Pressable key={key} accessibilityRole="tab" accessibilityLabel={key === 'wallet' && dueCount > 0 ? `Wallet, ${dueCount} follow-ups due` : label} accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={styles.tabItem}><Text style={[styles.tabGlyph, tab === key && styles.tabActive]}>{glyph}</Text><Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>{key === 'wallet' && dueCount > 0 ? <View style={styles.tabDot} /> : null}</Pressable>)}</View>
    {!!selected && <View style={styles.modalShade}><View style={styles.detailSheet}><View style={styles.sheetHandle} /><Pressable accessibilityRole="button" accessibilityLabel="Close contact details" style={styles.sheetClose} onPress={() => setSelected(null)}><Text style={styles.sheetCloseText}>×</Text></Pressable><ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent} keyboardShouldPersistTaps="handled"><View style={styles.detailIdentity}><View style={styles.personAvatarLarge}><Text style={styles.personInitialLarge}>{initials(selected.name)}</Text></View><Text style={styles.detailName}>{selected.name}</Text><Text style={styles.detailMeta}>{[selected.headline, selected.company].filter(Boolean).join(' · ')}</Text></View>{selected.email && <Text style={styles.detailInfo}>{selected.email}</Text>}{selected.phone && <Text style={styles.detailInfo}>{selected.phone}</Text>}{selected.location && <Text style={styles.detailInfo}>{selected.location}</Text>}<View style={styles.divider} /><Text style={styles.sectionTitle}>Keep the connection moving</Text><Text style={styles.fieldLabel}>FOLLOW-UP DATE · YYYY-MM-DD</Text><TextInput style={styles.input} value={followUp} onChangeText={setFollowUp} placeholder="2026-11-04" placeholderTextColor="#9AA197" keyboardType="numbers-and-punctuation" /><Text style={styles.sheetSub}>Current: {friendlyDate(selected.followUpDate)}</Text><Button title={busy ? 'Saving…' : 'Save follow-up'} onPress={saveFollowUp} disabled={busy} /><View style={{ height: 10 }} /><Button title="Save to phone contacts" variant="outline" onPress={() => saveContact(selected)} /></ScrollView></View></View>}
  </SafeAreaView>;
}

function SettingRow({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.settingRow}><View style={styles.settingIcon}><Text style={styles.settingIconText}>{icon}</Text></View><View style={{ flex: 1 }}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingSub}>{subtitle}</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }, authPage: { padding: 26, paddingTop: 38, flexGrow: 1, justifyContent: 'center' }, brand: { fontSize: 27, fontWeight: '900', letterSpacing: -1.8, color: C.ink }, cardBrand: { fontSize: 18, fontWeight: '900', letterSpacing: -1.3, color: C.ink }, eyebrow: { color: '#788078', fontSize: 10, letterSpacing: 1.7, fontWeight: '800', marginBottom: 9 }, hero: { fontSize: 39, lineHeight: 42, letterSpacing: -2, fontWeight: '800', color: C.ink, marginTop: 13 }, body: { fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 9 }, authPanel: { backgroundColor: C.white, borderRadius: 22, padding: 21, marginTop: 29, borderWidth: 1, borderColor: C.line }, panelTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, color: C.ink }, panelSub: { fontSize: 13, color: C.muted, marginTop: 5, marginBottom: 16 }, fieldWrap: { marginBottom: 13 }, fieldLabel: { fontSize: 9, color: '#626C63', fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 }, input: { height: 48, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 13, color: C.ink, fontSize: 14, backgroundColor: '#FCFCFA' }, button: { borderRadius: 13, minHeight: 49, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }, buttonDark: { backgroundColor: C.ink }, buttonLight: { backgroundColor: C.green }, buttonOutline: { borderWidth: 1, borderColor: C.line, backgroundColor: C.white }, buttonText: { fontSize: 14, fontWeight: '800', color: C.white }, authSwitch: { alignItems: 'center', marginTop: 17, paddingVertical: 5 }, muted: { fontSize: 13, color: C.muted }, legal: { color: '#9BA198', fontSize: 10, textAlign: 'center', marginTop: 21, lineHeight: 15 }, error: { fontSize: 12, color: C.red, marginBottom: 11, lineHeight: 17 }, page: { paddingHorizontal: 22, paddingTop: 19, paddingBottom: 30 }, topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, screenTitle: { fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -1.2, color: C.ink }, avatar: { width: 40, height: 40, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, avatarText: { fontSize: 14, fontWeight: '900', color: C.ink }, card: { backgroundColor: '#E9F5D4', borderRadius: 25, padding: 21, alignItems: 'center', borderWidth: 1, borderColor: '#D9E9C3' }, cardTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, livePill: { fontSize: 9, fontWeight: '800', color: '#46602F', backgroundColor: '#F7FBEF', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, overflow: 'hidden', letterSpacing: 0.5 }, cardIdentity: { alignItems: 'center', marginTop: 19 }, cardAvatar: { width: 52, height: 52, borderRadius: 19, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, cardInitials: { fontSize: 20, color: C.green, fontWeight: '800' }, cardName: { fontSize: 23, fontWeight: '800', letterSpacing: -0.7, color: C.ink, textAlign: 'center' }, cardRole: { fontSize: 12, color: '#596957', marginTop: 4, textAlign: 'center' }, qrFrame: { backgroundColor: C.white, borderRadius: 19, padding: 13, marginTop: 19 }, qrCaption: { color: '#667262', fontWeight: '800', fontSize: 8, letterSpacing: 1.25, marginTop: 13 }, cardUrl: { fontSize: 11, color: '#54634D', marginTop: 5 }, actionsRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch', marginTop: 13 }, smallAction: { width: 94, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }, smallActionIcon: { color: C.ink, fontSize: 18 }, smallActionLabel: { fontSize: 10, color: C.ink, fontWeight: '700', marginTop: 3 }, walletActions: { marginTop: 12 }, walletNote: { color: C.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 7, paddingHorizontal: 6 }, tip: { flexDirection: 'row', gap: 12, backgroundColor: C.dark, padding: 16, borderRadius: 17, marginTop: 19, alignItems: 'center' }, tipGlyph: { color: C.green, fontSize: 22 }, tipTitle: { color: C.white, fontWeight: '700', fontSize: 13 }, tipCopy: { color: '#B8C5B7', fontSize: 11, marginTop: 4, lineHeight: 15 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }, sectionTitle: { fontSize: 17, fontWeight: '800', color: C.ink, letterSpacing: -0.3 }, smallMuted: { color: '#7A837B', fontSize: 8, letterSpacing: 1.2, fontWeight: '800' }, statsRow: { flexDirection: 'row', gap: 10 }, stat: { flex: 1, backgroundColor: C.white, borderRadius: 15, padding: 14, borderWidth: 1, borderColor: C.line }, statNum: { color: C.ink, fontSize: 26, fontWeight: '800' }, statLabel: { color: C.muted, fontSize: 11, marginTop: 3 }, countBubble: { width: 37, height: 37, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }, countText: { fontWeight: '900', color: C.ink }, dueBanner: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: '#EFF6E2', padding: 13, borderRadius: 13, marginVertical: 16 }, dueMark: { color: '#537238', fontSize: 16, fontWeight: '900' }, dueText: { color: '#3D5430', fontSize: 12, fontWeight: '700' }, empty: { marginTop: 22, backgroundColor: C.white, padding: 22, borderRadius: 18, borderWidth: 1, borderColor: C.line, gap: 7 }, emptyIcon: { fontSize: 30, color: '#60704D', marginBottom: 5 }, emptyTitle: { color: C.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 }, personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderColor: C.line }, personAvatar: { height: 45, width: 45, borderRadius: 16, backgroundColor: '#E9EDE5', alignItems: 'center', justifyContent: 'center' }, personInitial: { color: C.dark, fontSize: 14, fontWeight: '800' }, personName: { color: C.ink, fontSize: 14, fontWeight: '800' }, personMeta: { color: C.muted, fontSize: 11, marginTop: 4 }, personFollow: { color: '#68803B', fontSize: 10, marginTop: 6, fontWeight: '700' }, chevron: { color: '#919A90', fontSize: 23 }, nativeHint: { marginTop: 17, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, nativeHintIcon: { fontSize: 19, color: C.ink }, nativeHintText: { flex: 1, color: C.muted, fontSize: 11 }, scanScreen: { flex: 1, paddingHorizontal: 22, paddingTop: 19 }, scanContent: { paddingBottom: 24 }, closeScan: { fontSize: 30, color: C.ink }, cameraPermission: { justifyContent: 'center', alignItems: 'flex-start', backgroundColor: C.white, borderRadius: 22, padding: 22, marginTop: 17, gap: 9 }, cameraWrap: { height: 330, overflow: 'hidden', backgroundColor: '#111', borderRadius: 25, marginTop: 17, marginBottom: 15 }, manualCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 16, marginTop: 16 }, manualTitle: { color: C.ink, fontSize: 15, fontWeight: '800' }, manualCopy: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 12 }, scanOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' }, scanCorners: { height: 246, width: 246 }, corner: { position: 'absolute', width: 38, height: 38, borderColor: C.green }, topLeft: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 15 }, topRight: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 15 }, bottomLeft: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 15 }, bottomRight: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 15 }, scanHint: { backgroundColor: 'rgba(0,0,0,0.62)', overflow: 'hidden', borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10, color: C.white, fontSize: 11, fontWeight: '700', marginTop: 20 }, scanPrivacy: { fontSize: 10, color: C.muted, textAlign: 'center', marginBottom: 12 }, tabBar: { height: 69, backgroundColor: C.white, borderTopWidth: 1, borderColor: C.line, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 4 : 5 }, tabItem: { alignItems: 'center', justifyContent: 'center', width: '24%', position: 'relative' }, tabGlyph: { color: '#899188', fontSize: 17, fontWeight: '700' }, tabActive: { color: C.ink }, tabLabel: { color: '#899188', fontSize: 9, marginTop: 3, fontWeight: '600' }, tabLabelActive: { color: C.ink, fontWeight: '800' }, tabDot: { position: 'absolute', width: 6, height: 6, backgroundColor: '#9EBE44', right: '27%', top: 2, borderRadius: 4 }, profilePanel: { backgroundColor: C.white, padding: 14, borderRadius: 17, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 }, avatarLarge: { width: 48, height: 48, borderRadius: 17, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }, avatarLargeText: { fontSize: 18, color: C.ink, fontWeight: '900' }, profileName: { fontSize: 14, color: C.ink, fontWeight: '800' }, accountTag: { backgroundColor: '#F3F5EF', padding: 7, borderRadius: 8 }, accountTagText: { fontSize: 8, color: '#6A7669', fontWeight: '900', letterSpacing: 0.6 }, settingRow: { paddingVertical: 14, borderBottomWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 12 }, settingIcon: { width: 38, height: 38, backgroundColor: '#EBEEE7', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, settingIconText: { fontSize: 16, color: C.dark }, settingTitle: { color: C.ink, fontWeight: '700', fontSize: 12 }, settingSub: { color: C.muted, fontSize: 10, marginTop: 4 }, signOut: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 18, marginTop: 12, borderBottomWidth: 1, borderColor: C.line }, signOutText: { color: C.red, fontSize: 13, fontWeight: '700' }, deleteSection: { backgroundColor: '#FFF7F5', borderWidth: 1, borderColor: '#EFD8D3', borderRadius: 17, padding: 16, marginTop: 23 }, deleteTitle: { color: C.red, fontSize: 14, fontWeight: '800' }, deleteCopy: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 13 }, deleteOpen: { minHeight: 42, borderWidth: 1, borderColor: '#E5B8B0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: C.white }, deleteOpenText: { color: C.red, fontSize: 12, fontWeight: '800' }, deleteCancel: { padding: 12, alignItems: 'center' }, deleteCancelText: { color: C.muted, fontSize: 12, fontWeight: '700' }, version: { textAlign: 'center', marginTop: 23, color: '#A0A69E', fontSize: 8, letterSpacing: 1.2, fontWeight: '700' }, modalShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,25,19,0.48)', justifyContent: 'flex-end' }, detailSheet: { maxHeight: '90%', backgroundColor: C.bg, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 22, paddingBottom: 30 }, detailScroll: { flexShrink: 1 }, detailScrollContent: { paddingBottom: 10 }, sheetHandle: { width: 35, height: 4, borderRadius: 5, backgroundColor: '#D1D5CB', alignSelf: 'center', marginBottom: 13 }, sheetClose: { position: 'absolute', top: 14, right: 18, zIndex: 1, width: 32, height: 32, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }, sheetCloseText: { color: C.ink, fontSize: 22, lineHeight: 25 }, detailIdentity: { alignItems: 'center', marginVertical: 10 }, personAvatarLarge: { backgroundColor: C.green, width: 55, height: 55, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, personInitialLarge: { color: C.ink, fontSize: 18, fontWeight: '900' }, detailName: { color: C.ink, fontSize: 21, fontWeight: '800' }, detailMeta: { color: C.muted, fontSize: 12, marginTop: 4 }, detailInfo: { color: '#536057', fontSize: 12, textAlign: 'center', paddingTop: 5 }, divider: { height: 1, backgroundColor: C.line, marginVertical: 18 }, sheetSub: { color: C.muted, fontSize: 10, marginVertical: 9 }, privacyEntry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 17, padding: 8 }, privacyEntryText: { color: C.ink, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }, privacyEntryArrow: { color: C.muted, fontSize: 12 }, privatePill: { color: '#684E2C', backgroundColor: '#F7EAD4' }, privateCardNotice: { width: '100%', backgroundColor: '#F7F8F3', borderRadius: 16, padding: 15, marginTop: 18 }, privateCardTitle: { color: C.ink, fontSize: 14, fontWeight: '800' }, privateCardCopy: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }, privateCardActions: { backgroundColor: C.white, borderRadius: 14, borderColor: C.line, borderWidth: 1, padding: 14, marginTop: 13 },
});
