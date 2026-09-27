import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#faf9f6' } }}><Stack.Screen name="(tabs)" /><Stack.Screen name="profile" options={{ presentation: 'card' }} /><Stack.Screen name="split" options={{ presentation: 'card' }} /></Stack></>;
}
