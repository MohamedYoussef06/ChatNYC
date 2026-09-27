import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const blue = '#0039A6';

export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: blue, tabBarInactiveTintColor: '#73777d', tabBarStyle: { backgroundColor: '#faf9f6', borderTopColor: '#deddd8', height: 62, paddingTop: 5, paddingBottom: 7 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>⌂</Text> }} />
    <Tabs.Screen name="nextstop" options={{ title: 'NextStop', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>↗</Text> }} />
    <Tabs.Screen name="ock" options={{ title: 'Ock', tabBarLabelStyle: { fontSize: 12, fontWeight: '800' }, tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>●</Text> }} />
    <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 19 }}>▣</Text> }} />
  </Tabs>;
}
