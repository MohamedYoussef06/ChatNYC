import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';
import { sendOckMessage } from '@/services/ock';
import type { ChatTurn } from '@/types';
import { Header } from '@/components/ui';

type Message = ChatTurn & { id: string; failed?: boolean };
export default function OckScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useRef<FlatList<Message>>(null);
  const submit = useCallback(async (retry?: Message) => {
    const value = retry?.content ?? text.trim();
    if (!value || busy) return;
    const history = messages.filter((m) => !m.failed && m.id !== retry?.id).map(({ role, content }) => ({ role, content }));
    const user: Message = retry ?? { id: `${Date.now()}`, role: 'user', content: value };
    setError(''); setBusy(true); setText('');
    setMessages((old) => retry ? old.map((message) => message.id === retry.id ? { ...message, failed: false } : message) : [...old, user]);
    try {
      const reply = await sendOckMessage(value, history, { time: new Date().toISOString(), client: 'ChatNYC mobile' });
      setMessages((old) => [...old, { id: `${Date.now()}-ock`, role: 'assistant', content: reply }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ock is temporarily unavailable.';
      setError(message);
      setMessages((old) => old.map((item) => item.id === user.id ? { ...item, failed: true } : item));
    } finally { setBusy(false); }
  }, [busy, messages, text]);
  useEffect(() => { if (messages.length) list.current?.scrollToEnd({ animated: true }); }, [messages.length, busy]);
  return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}>
    <View style={{ paddingHorizontal: 20 }}><Header title="Ock" /></View>
    {messages.length === 0 ? <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}><Text style={{ color: C.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }}>YOUR NYC ASSISTANT</Text><Text style={{ color: C.ink, fontSize: 34, lineHeight: 40, fontWeight: '800' }}>What are we getting into?</Text><Text style={{ color: C.muted, fontSize: 15, lineHeight: 22 }}>Ask about getting around, finding your next stop, or making a plan.</Text>{['Help me plan my day', 'How should I get across town?'].map((s) => <Pressable key={s} onPress={() => setText(s)} style={{ padding: 14, borderColor: C.line, borderWidth: 1, backgroundColor: 'white', borderRadius: 14 }}><Text style={{ color: C.ink }}>{s}  →</Text></Pressable>)}</View> : <FlatList ref={list} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, gap: 13 }} keyboardShouldPersistTaps="handled" renderItem={({ item }) => <View style={{ maxWidth: '88%', alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}><View style={{ paddingVertical: 12, paddingHorizontal: 15, borderRadius: 17, borderBottomRightRadius: item.role === 'user' ? 5 : 17, borderBottomLeftRadius: item.role === 'assistant' ? 5 : 17, backgroundColor: item.role === 'user' ? C.blue : 'white', borderColor: item.role === 'assistant' ? C.line : C.blue, borderWidth: item.role === 'assistant' ? 1 : 0 }}><Text style={{ color: item.role === 'user' ? 'white' : C.ink, fontSize: 15, lineHeight: 22 }}>{item.content}</Text></View>{item.failed && <Pressable onPress={() => void submit(item)}><Text style={{ color: '#a32922', fontSize: 13, fontWeight: '700' }}>Couldn’t reach Ock. Tap to retry.</Text></Pressable>}</View>} />}
    {busy && <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 22, paddingBottom: 12 }}><ActivityIndicator color={C.blue} /><Text style={{ color: C.muted }}>Ock is thinking…</Text></View>}
    {!!error && <Text accessibilityRole="alert" style={{ color: '#a32922', paddingHorizontal: 20, paddingBottom: 8, fontSize: 12 }}>{error}</Text>}
    <View style={{ paddingHorizontal: 13, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 5 : 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Voice input is not available yet" accessibilityState={{ disabled: true }} disabled style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', opacity: .55 }}><Text style={{ fontSize: 17 }}>🎙</Text></Pressable><TextInput accessibilityLabel="Message Ock" value={text} onChangeText={setText} onSubmitEditing={() => void submit()} returnKeyType="send" placeholder="Ask Ock anything…" placeholderTextColor="#85898f" multiline maxLength={2000} style={{ flex: 1, maxHeight: 128, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: 'white', color: C.ink, fontSize: 15 }} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!text.trim() || busy} onPress={() => void submit()} style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || busy ? .45 : 1 }}><Text style={{ color: 'white', fontWeight: '800', fontSize: 20 }}>↑</Text></Pressable></View><Text style={{ color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 5 }}>Voice input is coming later. Ock currently accepts text only.</Text></View>
  </KeyboardAvoidingView></SafeAreaView>;
}
