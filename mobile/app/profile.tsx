import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, Eyebrow, Header, Heading, Page } from '@/components/ui';
import { C } from '@/constants/theme';
import { forgetOckMemory, listOckMemories, type OckMemory } from '@/services/ock';

export default function ProfileScreen() {
  const [memories, setMemories] = useState<OckMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forgetting, setForgetting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await listOckMemories();
      setMemories(result.memories);
      if (!result.available) setError(result.message ?? 'Ock memory is temporarily unavailable.');
    } catch { setError('Ock memory is temporarily unavailable.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const forget = useCallback(async (id: string) => {
    setForgetting(id); setError('');
    try { await forgetOckMemory(id); setMemories((current) => current.filter((item) => item.id !== id)); }
    catch { setError('That memory could not be forgotten. Please try again.'); }
    finally { setForgetting(null); }
  }, []);

  return <Page><Header title="Profile" /><Eyebrow>CHATNYC ACCOUNT</Eyebrow><Heading small>Guest</Heading><Text style={{ color: C.muted, lineHeight: 21 }}>You can use Ock and plan trips without an account. Ock history and memory are scoped to this app session.</Text>
    <Card><View style={{ gap: 4 }}><Text style={{ color: C.blue, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 }}>BACKBOARD</Text><Text style={{ color: C.ink, fontWeight: '800', fontSize: 20 }}>Ock Memory</Text><Text style={{ color: C.muted, lineHeight: 20 }}>Durable mobility preferences Ock may use in later conversations.</Text></View>
      {loading ? <Text accessibilityRole="text" style={{ color: C.muted, paddingVertical: 8 }}>Loading Ock memory…</Text> : error ? <View style={{ gap: 10, padding: 12, borderRadius: 11, backgroundColor: '#fff0ed' }}><Text accessibilityRole="alert" style={{ color: '#a32922', lineHeight: 19 }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center', borderColor: '#d6aaa4', borderWidth: 1, borderRadius: 10 }}><Text style={{ color: '#8d3028', fontWeight: '700' }}>Try again</Text></Pressable></View> : memories.length ? memories.map((memory) => <View key={memory.id} style={{ gap: 8, paddingVertical: 12, borderTopColor: C.line, borderTopWidth: 1 }}><Text style={{ color: C.ink, fontSize: 15, lineHeight: 22 }}>{memory.content}</Text>{(memory.updated_at || memory.created_at) && <Text style={{ color: C.muted, fontSize: 11 }}>Remembered {new Date(memory.updated_at || memory.created_at || '').toLocaleDateString()}</Text>}<Pressable accessibilityRole="button" disabled={forgetting === memory.id} onPress={() => void forget(memory.id)} style={{ minHeight: 42, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 15, borderColor: C.line, borderWidth: 1, borderRadius: 10, opacity: forgetting === memory.id ? .5 : 1 }}><Text style={{ color: '#6e3130', fontWeight: '700', fontSize: 12 }}>{forgetting === memory.id ? 'Forgetting…' : 'Forget'}</Text></Pressable></View>) : <View style={{ paddingVertical: 14, gap: 5 }}><Text style={{ color: C.ink, fontWeight: '800' }}>Nothing saved yet.</Text><Text style={{ color: C.muted, lineHeight: 20 }}>Tell Ock a durable mobility preference, such as “I usually prefer the subway.” Backboard decides whether it is useful to remember.</Text></View>}
    </Card>
    <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18 }}>Guest memory does not follow you to a new app session or device. Location is requested only when you choose “Use my location” in NextStop; no background tracking is used.</Text>
  </Page>;
}
