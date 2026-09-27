import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/constants/theme';
import { getOckConversation, listOckConversations, sendOckMessage, type OckConversation } from '@/services/ock';
import type { ChatTurn } from '@/types';
import { Header } from '@/components/ui';
import { OckMarkdown } from '@/components/OckMarkdown';
import { OckThinking } from '@/components/OckThinking';

type Message = ChatTurn & { id: string; failed?: boolean };
export default function OckScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [conversations, setConversations] = useState<OckConversation[]>([]);
  const list = useRef<FlatList<Message>>(null);
  const submit = useCallback(async (retry?: Message) => {
    const value = retry?.content ?? text.trim();
    if (!value || busy) return;
    const history = messages.filter((m) => !m.failed && m.id !== retry?.id).map(({ role, content }) => ({ role, content }));
    const user: Message = retry ?? { id: `${Date.now()}`, role: 'user', content: value };
    setError(''); setBusy(true); setText('');
    setMessages((old) => retry ? old.map((message) => message.id === retry.id ? { ...message, failed: false } : message) : [...old, user]);
    try {
      const result = await sendOckMessage(value, history, { time: new Date().toISOString(), client: 'ChatNYC mobile' }, conversationId);
      setMessages((old) => [...old, { id: `${Date.now()}-ock`, role: 'assistant', content: result.reply }]);
      if (result.conversationId) setConversationId(result.conversationId);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ock is temporarily unavailable.';
      setError(message);
      setMessages((old) => old.map((item) => item.id === user.id ? { ...item, failed: true } : item));
    } finally { setBusy(false); }
  }, [busy, conversationId, messages, text]);
  useEffect(() => { if (messages.length) list.current?.scrollToEnd({ animated: true }); }, [messages.length, busy]);

  const newChat = useCallback(() => {
    if (busy) return;
    setMessages([]); setConversationId(null); setError(''); setHistoryOpen(false);
  }, [busy]);

  const openHistory = useCallback(async () => {
    setHistoryOpen(true); setHistoryLoading(true); setError('');
    try {
      const result = await listOckConversations();
      setConversations(result.conversations);
      if (!result.available) setError(result.message ?? 'Ock history is temporarily unavailable.');
    } catch { setError('Ock history is temporarily unavailable. Your active conversation is unchanged.'); }
    finally { setHistoryLoading(false); }
  }, []);

  const reopen = useCallback(async (id: string) => {
    setHistoryLoading(true);
    try {
      const conversation = await getOckConversation(id);
      setMessages((conversation.messages ?? []).map((turn, index) => ({ ...turn, id: `${id}-${index}` })));
      setConversationId(id); setHistoryOpen(false); setError('');
    } catch { setError('That conversation could not be reopened. Your active conversation is unchanged.'); }
    finally { setHistoryLoading(false); }
  }, []);

  return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}>
    <View style={{ paddingHorizontal: 20 }}><Header title="Ock" /></View>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}><Pressable accessibilityRole="button" onPress={() => void openHistory()} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, borderColor: C.line, borderWidth: 1, backgroundColor: 'white' }}><Text style={{ color: C.ink, fontSize: 12, fontWeight: '700' }}>History</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => void newChat()} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: C.blue, opacity: busy ? .5 : 1 }}><Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>New chat</Text></Pressable></View>
    {messages.length === 0 ? <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 12 }}><Text style={{ color: C.blue, fontSize: 11, fontWeight: '800', letterSpacing: 1.3 }}>YOUR NYC ASSISTANT</Text><Text style={{ color: C.ink, fontSize: 34, lineHeight: 40, fontWeight: '800' }}>What are we getting into?</Text><Text style={{ color: C.muted, fontSize: 15, lineHeight: 22 }}>Ask about getting around, finding your next stop, or making a plan.</Text>{['Help me plan my day', 'How should I get across town?'].map((s) => <Pressable key={s} onPress={() => setText(s)} style={{ padding: 14, borderColor: C.line, borderWidth: 1, backgroundColor: 'white', borderRadius: 14 }}><Text style={{ color: C.ink }}>{s}  →</Text></Pressable>)}</View> : <FlatList ref={list} data={messages} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, gap: 13 }} keyboardShouldPersistTaps="handled" ListFooterComponent={busy ? <OckThinking /> : null} renderItem={({ item }) => <View style={{ maxWidth: '88%', alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', gap: 6 }}><View style={{ paddingVertical: 12, paddingHorizontal: 15, borderRadius: 17, borderBottomRightRadius: item.role === 'user' ? 5 : 17, borderBottomLeftRadius: item.role === 'assistant' ? 5 : 17, backgroundColor: item.role === 'user' ? C.blue : 'white', borderColor: item.role === 'assistant' ? C.line : C.blue, borderWidth: item.role === 'assistant' ? 1 : 0 }}>{item.role === 'assistant' ? <OckMarkdown>{item.content}</OckMarkdown> : <Text style={{ color: 'white', fontSize: 15, lineHeight: 22 }}>{item.content}</Text>}</View>{item.failed && <Pressable accessibilityRole="button" onPress={() => void submit(item)}><Text style={{ color: '#a32922', fontSize: 13, fontWeight: '700' }}>Couldn’t reach Ock. Tap to retry.</Text></Pressable>}</View>} />}
    {!!error && <Text accessibilityRole="alert" style={{ color: '#a32922', paddingHorizontal: 20, paddingBottom: 8, fontSize: 12 }}>{error}</Text>}
    <View style={{ paddingHorizontal: 13, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 5 : 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}><View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel="Voice input is not available yet" accessibilityState={{ disabled: true }} disabled style={{ width: 48, height: 48, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', opacity: .55 }}><Text style={{ fontSize: 17 }}>🎙</Text></Pressable><TextInput accessibilityLabel="Message Ock" value={text} editable={!busy} onChangeText={setText} onSubmitEditing={() => void submit()} returnKeyType="send" placeholder="Ask Ock anything…" placeholderTextColor="#85898f" multiline maxLength={2000} style={{ flex: 1, maxHeight: 128, minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: 'white', color: C.ink, fontSize: 15 }} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!text.trim() || busy} onPress={() => void submit()} style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || busy ? .45 : 1 }}><Text style={{ color: 'white', fontWeight: '800', fontSize: 20 }}>↑</Text></Pressable></View><Text style={{ color: C.muted, fontSize: 10, textAlign: 'center', marginTop: 5 }}>Voice input is coming later. Ock currently accepts text only.</Text></View>
    <Modal visible={historyOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHistoryOpen(false)}><SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomColor: C.line, borderBottomWidth: 1 }}><View><Text style={{ color: C.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }}>OCK</Text><Text style={{ color: C.ink, fontSize: 24, fontWeight: '800', marginTop: 3 }}>Chat history</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close history" onPress={() => setHistoryOpen(false)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderColor: C.line, borderWidth: 1, borderRadius: 14 }}><Text style={{ fontSize: 20 }}>×</Text></Pressable></View>{historyLoading ? <Text accessibilityRole="text" style={{ padding: 24, color: C.muted }}>Loading conversations…</Text> : error ? <View style={{ margin: 20, padding: 16, borderRadius: 12, backgroundColor: '#fff0ed', gap: 10 }}><Text accessibilityRole="alert" style={{ color: '#a32922', lineHeight: 20 }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void openHistory()} style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center', borderColor: '#d6aaa4', borderWidth: 1, borderRadius: 10 }}><Text style={{ color: '#8d3028', fontWeight: '700' }}>Try again</Text></Pressable></View> : <FlatList data={conversations} keyExtractor={(item) => item.id} contentContainerStyle={{ padding: 14, flexGrow: 1 }} ListEmptyComponent={<View style={{ padding: 28, alignItems: 'center', gap: 7 }}><Text style={{ color: C.ink, fontWeight: '800' }}>No saved conversations yet.</Text><Text style={{ color: C.muted, textAlign: 'center', lineHeight: 20 }}>Chats appear here when Backboard is available.</Text></View>} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => void reopen(item.id)} style={{ minHeight: 64, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1 }}><Text style={{ color: C.ink, fontSize: 15, fontWeight: '800' }}>{item.title}</Text><Text numberOfLines={1} style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{item.preview || 'New conversation'}</Text></Pressable>} />}<View style={{ padding: 16, borderTopColor: C.line, borderTopWidth: 1 }}><Pressable accessibilityRole="button" onPress={() => void newChat()} style={{ minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: C.blue }}><Text style={{ color: 'white', fontWeight: '800' }}>Start a new chat</Text></Pressable></View></SafeAreaView></Modal>
  </KeyboardAvoidingView></SafeAreaView>;
}
