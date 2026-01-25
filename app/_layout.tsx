// app/_layout.tsx - Mantener EXACTAMENTE tu estructura original
import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { AuthProvider } from '../context/AuthContext';
import { SyncProvider } from '../context/SyncContext';
import { colors } from '../theme/design';

export default function RootLayout(): JSX.Element {

  return (
    <AuthProvider>
      <SyncProvider>
        <View style={{ flex: 1 }}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={colors.surface}
            translucent={false}
          />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
      </SyncProvider>
    </AuthProvider>
  );
}