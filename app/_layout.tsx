import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { colors } from '../constants/theme';

const rootStyle = Platform.select({
  web: { flex: 1, height: '100vh' as any },
  default: { flex: 1 },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
