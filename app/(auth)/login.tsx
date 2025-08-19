import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme/design';

export default function LoginScreen(): JSX.Element {
  const [email, setEmail] = useState<string>('admin@ventas.com');
  const [password, setPassword] = useState<string>('password');
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  
  const { login, loading } = useAuth();

  const validateForm = (): boolean => {
    let isValid = true;
    
    setEmailError('');
    setPasswordError('');

    if (!email) {
      setEmailError('El email es requerido');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Ingresa un email válido');
      isValid = false;
    }

    if (!password) {
      setPasswordError('La contraseña es requerida');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async (): Promise<void> => {
    if (!validateForm()) return;

    const result = await login(email, password);
    
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Error de acceso', result.message || 'Error desconocido');
    }
  };

  const selectTestUser = (userEmail: string): void => {
    setEmail(userEmail);
    setPassword('password');
    setEmailError('');
    setPasswordError('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="storefront" size={48} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Sales App</Text>
          <Text style={styles.subtitle}>Sistema de Ventas Inteligente</Text></View>

        {/* Formulario */}
        <Card padding="lg">
          <Input
            label="Email"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Contraseña"
            placeholder="Tu contraseña"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            secureTextEntry
            leftIcon={<Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />}
            autoComplete="password"
          />

          <Button
            title="Iniciar Sesión"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {/* Usuarios de prueba */}
        <View style={styles.testUsers}>
          <Text style={styles.testUsersTitle}>Usuarios de Prueba:</Text>
          
          <View style={styles.testUsersList}>
            <Button
              title="👨‍💼 Admin"
              variant="outline"
              size="sm"
              onPress={() => selectTestUser('admin@ventas.com')}
              style={styles.testUserButton}
            />
            <Button
              title="👨‍💻 Vendedor"
              variant="outline"
              size="sm"
              onPress={() => selectTestUser('vendedor1@ventas.com')}
              style={styles.testUserButton}
            />
          </View>
          
          <Text style={styles.testUsersNote}>
            Contraseña para todos: <Text style={styles.passwordText}>password</Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  testUsers: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  testUsersTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  testUsersList: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  testUserButton: {
    flex: 1,
  },
  testUsersNote: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  passwordText: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
