import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';

export default function Index() {
  const { accessToken, isHydrated } = useAuthStore();

  if (!isHydrated) return null;

  if (accessToken) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/splash" />;
}
