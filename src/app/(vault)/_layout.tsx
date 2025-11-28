import { Stack } from 'expo-router';

export default function VaultLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="lock-screen" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}