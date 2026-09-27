import { Text } from 'react-native';
import { Card, Eyebrow, Header, Heading, Page } from '@/components/ui';
import { C } from '@/constants/theme';

export default function ProfileScreen() { return <Page><Header title="Profile" /><Eyebrow>CHATNYC ACCOUNT</Eyebrow><Heading small>Guest</Heading><Text style={{ color: C.muted, lineHeight: 21 }}>Not signed in. You can use Ock and plan trips without an account.</Text><Card><Text style={{ color: C.ink, fontWeight: '800', fontSize: 16 }}>Personalize ChatNYC</Text><Text style={{ color: C.muted, lineHeight: 20 }}>Ock preferences, saved places, voice settings, payment settings, and accessibility controls can be added here when those features are connected.</Text></Card><Text style={{ color: C.muted, fontSize: 12 }}>Location is requested only when you choose “Use my location” in NextStop. No background tracking is used.</Text></Page>; }
