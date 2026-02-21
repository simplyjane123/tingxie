import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform, useEffect } from 'react';
import { colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../lib/AuthContext';

const rootStyle = Platform.select({
  web: { flex: 1, height: '100vh' as any },
  default: { flex: 1 },
});

// Auth guard — redirects to /login when not authenticated
function RootNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    if (!session && !inLogin) {
      router.replace('/login');
    } else if (session && inLogin) {
      router.replace('/');
    }
  }, [session, loading, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={rootStyle}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootNav />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
