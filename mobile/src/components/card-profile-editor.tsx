import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { cardProfileIssue, cardProfilePatch, type CardProfileDraft } from '../card-profile';

type Props = {
  initial: CardProfileDraft;
  isPublic: boolean;
  busy: boolean;
  onCancel: () => void;
  onSave: (profile: CardProfileDraft) => Promise<void>;
};

export function CardProfileEditor({ initial, isPublic, busy, onCancel, onSave }: Props) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState('');

  const field = (key: keyof CardProfileDraft, label: string, options: { maxLength: number; multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad'; autoCapitalize?: 'none' | 'sentences' | 'words' } = { maxLength: 120 }) => (
    <View style={{ marginBottom: 12 }} key={key}>
      <Text style={{ color: '#626C63', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={draft[key]}
        onChangeText={(value) => { setDraft((current) => ({ ...current, [key]: value })); setError(''); }}
        placeholder={`Add ${label.toLowerCase()}`}
        placeholderTextColor="#9AA197"
        style={{ minHeight: options.multiline ? 92 : 48, borderWidth: 1, borderColor: '#E5E7DF', borderRadius: 12, paddingHorizontal: 13, paddingVertical: options.multiline ? 11 : 0, color: '#18211B', fontSize: 15, backgroundColor: '#FCFCFA', textAlignVertical: options.multiline ? 'top' : 'center' }}
        maxLength={options.maxLength}
        multiline={options.multiline}
        keyboardType={options.keyboardType}
        autoCapitalize={options.autoCapitalize ?? 'sentences'}
        autoCorrect={key === 'bio'}
        returnKeyType={options.multiline ? 'default' : 'next'}
        editable={!busy}
      />
    </View>
  );

  const submit = async () => {
    setError('');
    const issue = cardProfileIssue(cardProfilePatch(draft));
    if (issue) {
      setError(issue);
      return;
    }
    try {
      await onSave(draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your card. Try again.');
    }
  };

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7DF', borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 16 }}>
      <Text style={{ color: '#18211B', fontSize: 18, fontWeight: '800' }}>Your card details</Text>
      <Text style={{ color: '#717970', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 15 }}>
        {isPublic ? 'Updates appear on your public card as soon as you save.' : 'Add what you want people to see. Your card stays private until you turn on sharing.'}
      </Text>
      {field('displayName', 'Name', { maxLength: 80, autoCapitalize: 'words' })}
      {field('headline', 'Role or headline', { maxLength: 120 })}
      {field('company', 'Company', { maxLength: 120 })}
      {field('email', 'Email', { maxLength: 200, keyboardType: 'email-address', autoCapitalize: 'none' })}
      {field('phone', 'Phone', { maxLength: 40, keyboardType: 'phone-pad', autoCapitalize: 'none' })}
      {field('website', 'Website', { maxLength: 300, keyboardType: 'default', autoCapitalize: 'none' })}
      {field('location', 'Location', { maxLength: 120 })}
      {field('bio', 'Short introduction', { maxLength: 500, multiline: true })}
      {!!error && <Text accessibilityRole="alert" style={{ color: '#B84032', fontSize: 13, lineHeight: 19, marginBottom: 12 }}>{error}</Text>}
      <Pressable accessibilityRole="button" onPress={() => void submit()} disabled={busy} style={{ minHeight: 48, borderRadius: 13, backgroundColor: '#18211B', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.55 : 1 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>{busy ? 'Saving…' : 'Save card details'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onCancel} disabled={busy} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 5 }}>
        <Text style={{ color: '#536057', fontSize: 14, fontWeight: '700' }}>Cancel</Text>
      </Pressable>
    </View>
  );
}
