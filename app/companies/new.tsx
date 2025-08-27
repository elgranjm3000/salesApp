// app/companies/new.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function NewCompanyScreen(): JSX.Element {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    contact: '',
    serial_no: '',
    status: 'active' as 'active' | 'inactive',
    rif: '',
    key_system_items_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCompanyUsers();
    
    // Si el usuario actual es de tipo 'company', preseleccionarlo
    if (user?.role === 'company') {
      setSelectedUserId(user.id);
    }
  }, [user]);

  const loadCompanyUsers = async () => {
    try {
      setLoading(true);
      // Solo cargar usuarios si el usuario actual es admin o manager
      if (user?.role === 'admin' || user?.role === 'manager') {
        const response = await api.getUsers({ role: 'company' });
        setCompanyUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading company users:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre de la compañía es requerido';
    }

    if (!selectedUserId && user?.role !== 'company') {
      newErrors.user_id = 'Debes seleccionar un usuario responsable';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (formData.phone && formData.phone.length < 9) {
      newErrors.phone = 'El teléfono debe tener al menos 9 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const companyData = {
        user_id: selectedUserId || user?.id,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        contact: formData.contact.trim() || undefined,
        serial_no: formData.serial_no.trim() || undefined,
        status: formData.status,
        rif: formData.rif,
        key_system_items_id: formData.key_system_items_id.trim() || undefined,
      };
      console.log(companyData)

      const company = await api.createCompany(companyData);
      Alert.alert('Éxito', 'Compañía creada correctamente');
      router.back();
    } catch (error: any) {
      console.error('Error creating company:', error);
      const message = error.response?.data?.message || 'Error al crear la compañía';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectUser = (userId: number) => {
    setSelectedUserId(userId);
    if (errors.user_id) {
      setErrors(prev => ({ ...prev, user_id: '' }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando..." />
      </View>
    );
  }

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
            <Ionicons name="business" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Nueva Compañía</Text>
          <Text style={styles.subtitle}>Registra una nueva compañía</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selección de usuario responsable (solo para admin/manager) */}
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Card style={styles.userCard}>
            <Text style={styles.sectionTitle}>Usuario Responsable</Text>
            <Text style={styles.sectionSubtitle}>
              Selecciona el usuario que será responsable de esta compañía
            </Text>
            
            <View style={styles.usersContainer}>
              {companyUsers.map((companyUser) => (
                <TouchableOpacity
                  key={companyUser.id}
                  style={[
                    styles.userOption,
                    selectedUserId === companyUser.id && styles.userOptionSelected
                  ]}
                  onPress={() => selectUser(companyUser.id)}
                >
                  <View style={styles.userOptionContent}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {companyUser.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[
                        styles.userLabel,
                        selectedUserId === companyUser.id && styles.userLabelSelected
                      ]}>
                        {companyUser.name}
                      </Text>
                      <Text style={styles.userEmail}>{companyUser.email}</Text>
                    </View>
                  </View>
                  {selectedUserId === companyUser.id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {errors.user_id && (
              <Text style={styles.errorText}>{errors.user_id}</Text>
            )}
          </Card>
        )}

        {/* Información de la compañía */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Información de la Compañía</Text>

           <Input
            label="RIF *"
            placeholder="Ej: J-12345678-9"
            value={formData.rif}
            onChangeText={(value) => updateFormData('rif', value)}
            error={errors.rif}
            leftIcon={<Ionicons name="card" size={20} color={colors.text.tertiary} />}
          />
          
          <Input
            label="Nombre de la Compañía *"
            placeholder="Nombre de tu compañía"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            error={errors.name}
            leftIcon={<Ionicons name="business" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="KEY *"
            placeholder="Ej: SYS-00123"
            value={formData.key_system_items_id}
            onChangeText={(value) => updateFormData('key_system_items_id', value)}
            error={errors.key_system_items_id}
            leftIcon={<Ionicons name="key" size={20} color={colors.text.tertiary} />}
          />

         

          <Input
            label="Descripción"
            placeholder="Descripción de la compañía"
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            error={errors.description}
            multiline
            numberOfLines={3}
            leftIcon={<Ionicons name="document-text" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Dirección"
            placeholder="Dirección completa"
            value={formData.address}
            onChangeText={(value) => updateFormData('address', value)}
            error={errors.address}
            multiline
            numberOfLines={2}
            leftIcon={<Ionicons name="location" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Información de contacto */}
        <Card style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Información de Contacto</Text>
          
          <Input
            label="Teléfono"
            placeholder="999 999 999"
            value={formData.phone}
            onChangeText={(value) => updateFormData('phone', value)}
            error={errors.phone}
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Email"
            placeholder="contacto@empresa.com"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Persona de Contacto"
            placeholder="Nombre del contacto principal"
            value={formData.contact}
            onChangeText={(value) => updateFormData('contact', value)}
            error={errors.contact}
            leftIcon={<Ionicons name="person" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Número de Serie/RUC"
            placeholder="20123456789"
            value={formData.serial_no}
            onChangeText={(value) => updateFormData('serial_no', value)}
            error={errors.serial_no}
            leftIcon={<Ionicons name="card" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Estado */}
        <Card style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Estado</Text>
          
          <View style={styles.statusOptions}>
            <TouchableOpacity
              style={[
                styles.statusOption,
                formData.status === 'active' && styles.statusOptionSelected
              ]}
              onPress={() => updateFormData('status', 'active')}
            >
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color={formData.status === 'active' ? colors.success : colors.text.secondary} 
              />
              <Text style={[
                styles.statusText,
                formData.status === 'active' && styles.statusTextSelected
              ]}>
                Activa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusOption,
                formData.status === 'inactive' && styles.statusOptionSelected
              ]}
              onPress={() => updateFormData('status', 'inactive')}
            >
              <Ionicons 
                name="close-circle" 
                size={24} 
                color={formData.status === 'inactive' ? colors.error : colors.text.secondary} 
              />
              <Text style={[
                styles.statusText,
                formData.status === 'inactive' && styles.statusTextSelected
              ]}>
                Inactiva
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Botones */}
        <View style={styles.actions}>
          <Button
            title="Cancelar"
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
          <Button
            title="Crear Compañía"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: spacing.md,
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
  userCard: {
    marginBottom: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  contactCard: {
    marginBottom: spacing.lg,
  },
  statusCard: {
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
  usersContainer: {
    gap: spacing.md,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  userOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  userOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userAvatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  userInfo: {
    flex: 1,
  },
  userLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  userLabelSelected: {
    color: colors.primary[600],
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  statusOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  statusText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  statusTextSelected: {
    color: colors.primary[600],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});