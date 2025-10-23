// app/(auth)/login.tsx - ACTUALIZADO
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ActiveSessionModal } from '../../components/ActiveSessionModal'; // NUEVO
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme/design';

interface ActiveSessionInfo {
  device_name: string;
  device_type: string;
  ip_address: string;
  last_activity: string;
  login_time: string;
}

export default function LoginScreen(): JSX.Element {
  const { 
    login, 
    loginWithBiometric, 
    loading, 
    isBiometricSupported, 
    isBiometricEnabled 
  } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [biometricLoading, setBiometricLoading] = useState(false);
  
  // NUEVO: Estados para modal de sesión activa
  const [showActiveSessionModal, setShowActiveSessionModal] = useState(false);
  const [activeSessionInfo, setActiveSessionInfo] = useState<ActiveSessionInfo | null>(null);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();

  // Auto-login con biometría si está habilitada
  useEffect(() => {
    const tryBiometricLogin = async () => {
      if (isBiometricEnabled && isBiometricSupported && !loading) {
        setTimeout(handleBiometricLogin, 800);
      }
    };

    tryBiometricLogin();
  }, [isBiometricEnabled, isBiometricSupported]);

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

  // NUEVO: Obtener nombre del dispositivo
  const getDeviceName = async (): Promise<string> => {
    try {
      const deviceName = Device.deviceName || Device.modelName || 'Mobile Device';
      const brand = Device.brand || '';
      return brand ? `${brand} ${deviceName}` : deviceName;
    } catch {
      return 'Mobile App';
    }
  };

  // ACTUALIZADO: Manejar login con detección de sesión activa
  const handleLogin = async (forceLogout: boolean = false): Promise<void> => {
    if (!validateForm()) return;

    const deviceName = await getDeviceName();

    const result = await login(email, password, {
      device_name: deviceName,
      device_type: 'mobile',
      force_logout: forceLogout,
    });
    
    // Verificar si es error de sesión activa
    if (!result.success && result.isActiveSessionError) {
      setActiveSessionInfo(result.activeSessionData?.data?.active_session || null);
      setShowActiveSessionModal(true);
      return;
    }
    
    if (result.success) {
      setShowActiveSessionModal(false);
      router.replace('/(tabs)');
    } else {
      //Alert.alert('Error de acceso', result.message || 'Error desconocido');

    showAlert({
              title: 'Error de acceso',
              message: result.message || 'Error desconocido',
              icon: 'close',
              iconColor: colors.error,
              buttons: [{ text: 'Entendido' }]
      });
    }
  };

  // NUEVO: Manejar cierre forzado de sesión anterior
  const handleForceLogin = async (): Promise<void> => {
    setForceLogoutLoading(true);
    await handleLogin(true);
    setForceLogoutLoading(false);
  };

  // NUEVO: Cancelar modal de sesión activa
  const handleCancelActiveSession = (): void => {
    setShowActiveSessionModal(false);
    setActiveSessionInfo(null);
  };

  const handleBiometricLogin = async (): Promise<void> => {
    if (biometricLoading) return;
    
    setBiometricLoading(true);
    
    const deviceName = await getDeviceName();
    
    const result = await loginWithBiometric({
      device_name: deviceName,
      device_type: 'mobile',
    });
    
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      if (result.message && !result.message.includes('cancelada') && !result.message.includes('fallida')) {
        /*Alert.alert(
          'Error de acceso biométrico', 
          result.message,
          [{ text: 'OK' }]
        );*/


        showAlert({
              title: 'Error de acceso biométrico',
              message: result.message || 'Error desconocido',
              icon: 'close',
              iconColor: colors.error,
              buttons: [{ text: 'Ok' }]
      });


        
      }
    }
    
    setBiometricLoading(false);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <AlertComponent />

      <ScrollView>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={{ width: 100, height: 100 }}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Chrystal Mobile</Text>
            <Text style={styles.subtitle}>¡Tu empresa en tus manos!</Text> 
          </View>

          {/* Biometric Login Button */}
          {isBiometricSupported && isBiometricEnabled && (
            <Card style={styles.biometricCard}>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={biometricLoading || loading}
              >
                <View style={styles.biometricIconContainer}>
                  <Ionicons 
                    name="finger-print" 
                    size={32} 
                    color={biometricLoading ? colors.gray[400] : colors.primary[500]} 
                  />
                </View>
                <Text style={[
                  styles.biometricText,
                  (biometricLoading || loading) && { color: colors.gray[400] }
                ]}>
                  {biometricLoading ? 'Autenticando...' : 'Usar Huella Dactilar'}
                </Text>
                <Text style={styles.biometricSubtext}>
                  Toca para iniciar sesión rápidamente
                </Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Divider */}
          {isBiometricSupported && isBiometricEnabled && (
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.divider} />
            </View>
          )}

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
              autoCapitalize="none"
            />

            <Button
              title="Iniciar Sesión"
              onPress={() => handleLogin(false)}
              loading={loading}
              style={{ marginTop: spacing.md, backgroundColor: "#004856" }}
            />
          </Card>

          {/* Enlace de registro */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Crear Cuenta</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerContainerPassword}>
            <Text style={styles.registerText}>¿Olvidaste tu contraseña? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
              <Text style={styles.registerLink}>Toque aquí</Text>
            </TouchableOpacity>
          </View>

          {/* Info sobre biometría */}
          {isBiometricSupported && !isBiometricEnabled && (
            <View style={[styles.biometricInfo, {marginBottom: (isBiometricEnabled) ? 200 : 0}]}>
              <Ionicons name="information-circle" size={16} color={colors.text.secondary} />
              <Text style={styles.biometricInfoText}>
                Después de iniciar sesión, vaya a Mi Perfil {'>'} Seguridad para activar la huella dactilar
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* NUEVO: Modal de sesión activa */}
      <ActiveSessionModal
        visible={showActiveSessionModal}
        sessionInfo={activeSessionInfo}
        onForceLogin={handleForceLogin}
        onCancel={handleCancelActiveSession}
        loading={forceLogoutLoading}
      />
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
    paddingTop: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: 0,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  biometricCard: {
    marginBottom: spacing.lg,
  },
  biometricButton: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  biometricIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  biometricText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  biometricSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,    
  },
  registerContainerPassword: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  registerText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: 20,
  },
  registerLink: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 20,
  },
  biometricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  biometricInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    textAlign: 'center',
    flex: 1,
  },
});