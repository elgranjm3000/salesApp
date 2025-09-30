import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { colors, spacing, typography } from '../../theme/design';

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen(): JSX.Element {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Email
  const [email, setEmail] = useState('');
  
  // Step 2: Código de verificación
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  // Step 3: Nueva contraseña
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErrors = () => setErrors({});

  // PASO 1: Solicitar código de recuperación
  const handleRequestCode = async (): Promise<void> => {
    clearErrors();
    
    if (!email.trim()) {
      setErrors({ email: 'El email es requerido' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Ingresa un email válido' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.forgotPassword({ email: email.trim() });
      
      if (response.success) {
        Alert.alert(
          'Código enviado',
          `Hemos enviado un código de verificación a ${response.data.email}. El código expira en ${response.data.expires_in_minutes} minutos.`,
          [{ text: 'OK', onPress: () => setCurrentStep(2) }]
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al enviar el código';
      const errorCode = error.response?.data?.code;
      
      if (errorMessage.includes('No existe un usuario')) {
        Alert.alert('Usuario no encontrado', 'No existe un usuario registrado con este correo electrónico');
      } else if (errorMessage.includes('inactiva')) {
        Alert.alert('Cuenta inactiva', 'Esta cuenta está inactiva. Contacte al administrador.');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // PASO 2: Verificar código
  const handleVerifyCode = async (): Promise<void> => {
    clearErrors();
    
    if (!verificationCode.trim()) {
      setErrors({ code: 'El código de verificación es requerido' });
      return;
    }
    
    if (verificationCode.length !== 6) {
      setErrors({ code: 'El código debe tener exactamente 6 caracteres' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.verifyResetCode({
        email: email.trim(),
        code: verificationCode
      });
      
      if (response.success) {
        setResetToken(response.data.reset_token);
        Alert.alert(
          'Código verificado',
          'Código correcto. Ahora puede establecer su nueva contraseña.',
          [{ text: 'Continuar', onPress: () => setCurrentStep(3) }]
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al verificar el código';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'INVALID_CODE') {
        Alert.alert('Código inválido', 'El código de verificación es inválido o ha expirado');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // PASO 3: Restablecer contraseña
  const handleResetPassword = async (): Promise<void> => {
    clearErrors();
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.password = 'La contraseña es requerida';
    } else if (newPassword.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      const response = await api.resetPassword({
        reset_token: resetToken,
        email: email.trim(),
        password: newPassword,
        password_confirmation: confirmPassword
      });
      
      if (response.success) {
        Alert.alert(
          'Contraseña restablecida',
          'Su contraseña ha sido restablecida exitosamente. Ahora puede iniciar sesión con su nueva contraseña.',
          [
            {
              text: 'Ir al Login',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al restablecer la contraseña';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'INVALID_TOKEN') {
        Alert.alert('Sesión expirada', 'El token ha expirado. Inicie el proceso nuevamente.');
        setCurrentStep(1);
        setResetToken('');
        setVerificationCode('');
      } else if (errorCode === 'TOKEN_MISMATCH') {
        Alert.alert('Error', 'Token no válido para este correo electrónico');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderizar Step 1: Ingresar email
  const renderStep1 = () => (
    <>
      <Text style={styles.description}>
        Ingresa tu correo electrónico y te enviaremos un código de verificación para restablecer tu contraseña.
      </Text>
      
      <Card style={styles.card}>
        <Input
          label="Correo Electrónico"
          placeholder="tu@email.com"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
        />

        <Button
          title="Enviar Código"
          onPress={handleRequestCode}
          loading={loading}
          style={styles.submitButton}
        />
      </Card>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={16} color={colors.text.secondary} />
        <Text style={styles.infoText}>
          Recibirás un código de 6 dígitos válido por 15 minutos
        </Text>
      </View>
    </>
  );

  // Renderizar Step 2: Verificar código
  const renderStep2 = () => (
    <>
      <Text style={styles.description}>
        Hemos enviado un código de verificación a {email}. Ingresa el código para continuar.
      </Text>
      
      <Card style={styles.card}>
        <Input
          label="Código de Verificación"
          placeholder="123456"
          value={verificationCode}
          onChangeText={setVerificationCode}
          error={errors.code}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          leftIcon={<Ionicons name="shield-checkmark" size={20} color={colors.text.tertiary} />}
        />

        <Button
          title="Verificar Código"
          onPress={handleVerifyCode}
          loading={loading}
          style={styles.submitButton}
        />
      </Card>

      <View style={styles.infoContainer}>
        <Ionicons name="time" size={16} color={colors.text.secondary} />
        <Text style={styles.infoText}>
          El código expira en 15 minutos
        </Text>
      </View>

      <TouchableOpacity 
        onPress={() => {
          setCurrentStep(1);
          setVerificationCode('');
        }}
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>← Solicitar un nuevo código</Text>
      </TouchableOpacity>
    </>
  );

  // Renderizar Step 3: Nueva contraseña
  const renderStep3 = () => (
    <>
      <Text style={styles.description}>
        Establece tu nueva contraseña. Debe tener al menos 8 caracteres.
      </Text>
      
      <Card style={styles.card}>
        <Input
          label="Nueva Contraseña"
          placeholder="Mínimo 8 caracteres"
          value={newPassword}
          onChangeText={setNewPassword}
          error={errors.password}
          secureTextEntry
          leftIcon={<Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />}
        />

        <Input
          label="Confirmar Contraseña"
          placeholder="Repite tu contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
          secureTextEntry
          leftIcon={<Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />}
        />

        <Button
          title="Restablecer Contraseña"
          onPress={handleResetPassword}
          loading={loading}
          style={styles.submitButton}
        />
      </Card>

      <View style={styles.infoContainer}>
        <Ionicons name="shield-checkmark" size={16} color={colors.success} />
        <Text style={styles.infoText}>
          Tu contraseña debe tener al menos 8 caracteres
        </Text>
      </View>
    </>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Recuperar Contraseña';
      case 2: return 'Verificar Código';
      case 3: return 'Nueva Contraseña';
      default: return 'Recuperar Contraseña';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="key" size={48} color={colors.primary[500]} />
          </View>

          <Text style={styles.title}>{getStepTitle()}</Text>

          {/* Indicador de pasos */}
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <View style={[
                  styles.stepDot,
                  step === currentStep && styles.stepDotActive,
                  step < currentStep && styles.stepDotCompleted
                ]}>
                  {step < currentStep ? (
                    <Ionicons name="checkmark" size={12} color="white" />
                  ) : null}
                </View>
                {step < 3 && (
                  <View style={[
                    styles.stepLine,
                    step < currentStep && styles.stepLineCompleted
                  ]} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Contenido del paso actual */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Link para volver al login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Recordaste tu contraseña? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.primary[500],
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.xs,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  card: {
    marginBottom: spacing.lg,
  },
  submitButton: {
    marginTop: spacing.md,
    backgroundColor: "#004856",
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    textAlign: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  loginText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  loginLink: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  backLink: {
    alignSelf: 'center',
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  backLinkText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    textAlign: 'center',
  },
});