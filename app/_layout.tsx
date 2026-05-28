import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { useAppStore } from '../store/useAppStore';

const rootStyle = Platform.select({
  web: { flex: 1, height: '100vh' as any },
  default: { flex: 1 },
});

// Loads cloud progress once the user session is ready
function CloudSync() {
  const { user } = useAuth();
  const initFromCloud = useAppStore((s) => s.initFromCloud);

  useEffect(() => {
    if (user) initFromCloud();
  }, [user?.id]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={rootStyle}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <CloudSync />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
