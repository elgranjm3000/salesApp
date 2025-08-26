// app/(auth)/register.tsx
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
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';

const USER_ROLES = [
  { value: 'company', label: 'Compañía', icon: 'storefront', description: 'Administra vendedores y ventas' },
  { value: 'seller', label: 'Vendedor', icon: 'person', description: 'Realiza ventas y gestiona clientes' },
];

export default function RegisterScreen(): JSX.Element {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
    role: '',
    rif: '',
    companyName: '',
    contactPerson: '',
    address: '',
    country: '',
    province: '',
    city: '',
    key_activation: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ingresa un email válido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (formData.phone.length < 9) {
      newErrors.phone = 'El teléfono debe tener al menos 9 dígitos';
    }

   

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!formData.password_confirmation) {
      newErrors.password_confirmation = 'Confirma tu contraseña';
    } else if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (): Promise<void> => {
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const registrationData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: 'company',  // Registro solo para comapñías
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        rif: formData.rif.trim(),
        companyName: formData.companyName.trim(),
        contactPerson: formData.contactPerson.trim(),
        address: formData.address.trim(),
        country: formData.country.trim(),
        province: formData.province.trim(),
        city: formData.city.trim(),
        key_activation: formData.key_activation.trim(),
      };

          console.log(registrationData);

      // Crear el usuario usando tu endpoint de users
      await api.createUser(registrationData);
      
      Alert.alert(
        'Registro Exitoso',
        'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.',
        [
          {
            text: 'Iniciar Sesión',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error en registro:', error);
      const message = error.response?.data?.message || 'Error al crear la cuenta';
      Alert.alert('Error de Registro', message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectRole = (role: string) => {
    updateFormData('role', role);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Únete a Sales App</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información Personal */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
         
          <Input
            label="Email *"
            placeholder="tu@email.com"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
          />

          <Input
              label="Nombre *"
              placeholder="Ej: Ana Gómez"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              error={errors.name}
              keyboardType="default"
              autoCapitalize="words"
              leftIcon={<Ionicons name="person" size={20} color={colors.text.tertiary} />}
            />

        
           <Input
              label="RIF *"
              placeholder="J-12345678-9"
              value={formData.rif}
              onChangeText={(value) => updateFormData('rif', value)}
              error={errors.rif}
              keyboardType="default"
              autoCapitalize="characters"
              leftIcon={<Ionicons name="card" size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="Nombre de Empresa *"
              placeholder="Ej: Café Andino"
              value={formData.companyName}
              onChangeText={(value) => updateFormData('companyName', value)}
              error={errors.companyName}
              keyboardType="default"
              autoCapitalize="words"
              leftIcon={<Ionicons name="business" size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="Persona de Contacto *"
              placeholder="Ej: Luis Ramírez"
              value={formData.contactPerson}
              onChangeText={(value) => updateFormData('contactPerson', value)}
              error={errors.contactPerson}
              keyboardType="default"
              autoCapitalize="words"
              leftIcon={<Ionicons name="person" size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="Teléfono *"
              placeholder="+58 412-1234567"
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              error={errors.phone}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="call" size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="Dirección *"
              placeholder="Av. Principal, El Junko"
              value={formData.address}
              onChangeText={(value) => updateFormData('address', value)}
              error={errors.address}
              keyboardType="default"
              autoCapitalize="sentences"
              leftIcon={<Ionicons name="location" size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="País *"
              placeholder="Venezuela"
              value={formData.country}
              onChangeText={(value) => updateFormData('country', value)}
              error={errors.country}
              keyboardType="default"
              autoCapitalize="words"
              leftIcon={<Ionicons name="flag" size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="Provincia *"
              placeholder="Distrito Capital"
              value={formData.province}
              onChangeText={(value) => updateFormData('province', value)}
              error={errors.province}
              keyboardType="default"
              autoCapitalize="words"
              leftIcon={<Ionicons name="map" size={20} color={colors.text.tertiary} />}
            />

            <Input
              label="Ciudad *"
              placeholder="Caracas"
              value={formData.city}
              onChangeText={(value) => updateFormData('city', value)}
              error={errors.city}
              keyboardType="default"
              autoCapitalize="words"
              leftIcon={<Ionicons name="home" size={20} color={colors.text.tertiary} />}
            />
        </Card>       

        {/* Contraseña */}
        <Card style={styles.passwordCard}>
          <Text style={styles.sectionTitle}>Seguridad</Text>

          <Input
              label="Clave de Activación *"
              placeholder="Ej: ABC123-XYZ789"
              value={formData.key_activation}
              onChangeText={(value) => updateFormData('key_activation', value)}
              error={errors.key_activation}
              keyboardType="default"
              autoCapitalize="characters"
              leftIcon={<Ionicons name="key" size={20} color={colors.text.tertiary} />}
            />
          
          <Input
            label="Contraseña *"
            placeholder="Mínimo 8 caracteres"
            value={formData.password}
            onChangeText={(value) => updateFormData('password', value)}
            error={errors.password}
            secureTextEntry
            leftIcon={<Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Confirmar Contraseña *"
            placeholder="Repite tu contraseña"
            value={formData.password_confirmation}
            onChangeText={(value) => updateFormData('password_confirmation', value)}
            error={errors.password_confirmation}
            secureTextEntry
            leftIcon={<Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Botones */}
        <View style={styles.actions}>
          <Button
            title="Crear Cuenta"
            onPress={handleRegister}
            loading={loading}
            style={styles.registerButton}
          />
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  roleCard: {
    marginBottom: spacing.lg,
  },
  passwordCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  rolesContainer: {
    gap: spacing.md,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  roleOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  roleIconContainer: {
    marginRight: spacing.md,
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  roleLabelSelected: {
    color: colors.primary[600],
  },
  roleDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  actions: {
    marginTop: spacing.xl,
  },
  registerButton: {
    marginBottom: spacing.lg,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  bottomSpacer: {
    height: spacing.xl,
  },
});