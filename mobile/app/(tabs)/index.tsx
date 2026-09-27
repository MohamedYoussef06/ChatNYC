import { Link, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Card, Copy, Eyebrow, Header, Heading, Page } from '@/components/ui';
import { C } from '@/constants/theme';

export default function HomeScreen() {
  return <Page><Header /><View style={{ gap: 12, paddingTop: 13 }}><Eyebrow>YOUR CITY, IN MOTION</Eyebrow><Heading>Your day, connected.</Heading><Copy>One place to ask, plan, and move through New York.</Copy></View>
    <Pressable onPress={() => router.push('/(tabs)/ock')} accessibilityRole="button" style={({ pressed }) => [{ backgroundColor: C.blue, borderRadius: 21, padding: 22, minHeight: 162, justifyContent: 'space-between' }, pressed && { opacity: .9 }]}><View><Text style={{ color: '#dbe7ff', fontSize: 11, fontWeight: '800', letterSpacing: 1.4 }}>OCK · YOUR NYC ASSISTANT</Text><Text style={{ color: 'white', fontSize: 26, fontWeight: '800', marginTop: 12 }}>Just ask Ock.</Text><Text style={{ color: '#e8eeff', marginTop: 6, fontSize: 14 }}>Plans, routes, and city questions—start here.</Text></View><Text style={{ color: 'white', fontSize: 18, fontWeight: '800' }}>Start a conversation  →</Text></Pressable>
    <View style={{ gap: 10 }}><Eyebrow>GET AROUND THE CITY</Eyebrow><Link href="/(tabs)/nextstop" asChild><Pressable accessibilityRole="button"><Card><Text style={{ color: C.blue, fontWeight: '800', fontSize: 17 }}>Plan a trip</Text><Text style={{ color: C.muted }}>Compare ways to get where you’re going.  →</Text></Card></Pressable></Link><Link href="/split" asChild><Pressable accessibilityRole="button"><Card><Text style={{ color: C.ink, fontWeight: '800', fontSize: 17 }}>Split an expense</Text><Text style={{ color: C.muted }}>Work out a group total and each person’s share.  →</Text></Card></Pressable></Link></View>
    <Card><Eyebrow>BUILT FOR NEW YORK</Eyebrow><Text style={{ color: C.ink, fontSize: 17, lineHeight: 24, fontWeight: '700' }}>Ask Ock what’s next. Use NextStop when it’s time to go.</Text></Card>
  </Page>;
}
