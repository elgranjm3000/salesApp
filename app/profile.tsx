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
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { borderRadius, colors, spacing, typography } from '../theme/design';
import type { User } from '../types';
import StorageService from '../utils/storage';

export default function ProfileScreen(): JSX.Element {
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [storageInfo, setStorageInfo] = useState<any>(null);

  React.useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await StorageService.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

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
      
      const updatedData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
      };

      // Aquí deberías llamar a la API para actualizar el usuario
      // const updatedUser = await api.updateProfile(updatedData);
      // updateUser(updatedUser);
      
      // Por ahora simulamos la actualización
      const updatedUser: User = {
        ...user!,
        ...updatedData,
        updated_at: new Date().toISOString(),
      };
      
      updateUser(updatedUser);
      setEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const clearStorageData = () => {
    Alert.alert(
      'Limpiar Datos',
      '¿Estás seguro de que quieres eliminar todos los datos almacenados localmente? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              await loadStorageInfo();
              Alert.alert('Éxito', 'Datos locales eliminados correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudieron eliminar los datos');
            }
          },
        },
      ]
    );
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const getRoleText = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'seller':
        return 'Vendedor';
      case 'manager':
        return 'Gerente';
      default:
        return role;
    }
  };

  if (!user) {
    return <View style={styles.container} />;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <Text style={styles.headerSubtitle}>{getRoleText(user.role)}</Text>
          </View>
        </View>
        
        {!editing && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditing(true)}
          >
            <Ionicons name="create" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar y info básica */}
        <Card style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user.avatar ? (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userRole}>{getRoleText(user.role)}</Text>
              <View style={styles.statusBadge}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor: user.status === 'active' ? colors.success : colors.error }
                ]} />
                <Text style={styles.statusText}>
                  {user.status === 'active' ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Información personal */}
        <Card>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <Input
            label="Nombre Completo"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            error={errors.name}
            editable={editing}
            leftIcon={<Ionicons name="person" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            error={errors.email}
            editable={editing}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Teléfono"
            value={formData.phone}
            onChangeText={(value) => updateFormData('phone', value)}
            error={errors.phone}
            editable={editing}
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Información de la cuenta */}
        <Card>
          <Text style={styles.sectionTitle}>Información de la Cuenta</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID de Usuario:</Text>
            <Text style={styles.infoValue}>#{user.id}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de registro:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.created_at).toLocaleDateString('es-ES')}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última actualización:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.updated_at).toLocaleDateString('es-ES')}
            </Text>
          </View>
          
          {user.email_verified_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email verificado:</Text>
              <View style={styles.verificationBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.verificationText}>Verificado</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Información de almacenamiento */}
        {storageInfo && (
          <Card>
            <Text style={styles.sectionTitle}>Datos Locales</Text>
            
            <View style={styles.storageInfo}>
              <View style={styles.storageItem}>
                <Ionicons name="archive" size={20} color={colors.info} />
                <Text style={styles.storageLabel}>Ventas offline:</Text>
                <Text style={styles.storageValue}>{storageInfo.offlineSalesCount}</Text>
              </View>
              
              <View style={styles.storageItem}>
                <Ionicons name="cube" size={20} color={colors.primary[500]} />
                <Text style={styles.storageLabel}>Productos en caché:</Text>
                <Text style={styles.storageValue}>{storageInfo.cachedProductsCount}</Text>
              </View>
              
              <View style={styles.storageItem}>
                <Ionicons name="people" size={20} color={colors.warning} />
                <Text style={styles.storageLabel}>Clientes en caché:</Text>
                <Text style={styles.storageValue}>{storageInfo.cachedCustomersCount}</Text>
              </View>
            </View>
            
            <Button
              title="Limpiar Datos Locales"
              variant="outline"
              onPress={clearStorageData}
              style={styles.clearButton}
            />
          </Card>
        )}

        {/* Acciones */}
        {editing ? (
          <View style={styles.actions}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={() => {
                setEditing(false);
                setFormData({
                  name: user.name,
                  email: user.email,
                  phone: user.phone || '',
                });
                setErrors({});
              }}
              style={styles.cancelButton}
            />
            <Button
              title="Guardar Cambios"
              onPress={handleSave}
              loading={saving}
              style={styles.saveButton}
            />
          </View>
        ) : (
          <View style={styles.logoutContainer}>
            <Button
              title="Cerrar Sesión"
              variant="outline"
              onPress={handleLogout}
              style={styles.logoutButton}
            />
          </View>
        )}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  editButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  avatarCard: {
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: spacing.lg,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  avatarInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  userRole: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  storageInfo: {
    marginBottom: spacing.lg,
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  storageLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginLeft: spacing.md,
    flex: 1,
  },
  storageValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.bold,
  },
  clearButton: {
    marginTop: spacing.md,
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
  logoutContainer: {
    marginTop: spacing.xl,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});