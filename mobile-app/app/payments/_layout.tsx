import { Stack } from 'expo-router';

export default function PaymentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="mobile-money" />
      <Stack.Screen name="confirmation" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
