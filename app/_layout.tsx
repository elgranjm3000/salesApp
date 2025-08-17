import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar, View } from 'react-native';
import { NetworkBanner } from '../components/ui/NetworkBanner';
import { AuthProvider } from '../context/AuthContext';
import { colors } from '../theme/design';

export default function RootLayout(): JSX.Element {
  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor={colors.surface} 
          translucent={false}
        />
        <NetworkBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>
    </AuthProvider>
  );
}