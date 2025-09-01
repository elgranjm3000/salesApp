// app/profile.tsx - Perfil mejorado con compañías y biometría
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BiometricSettings } from '../components/BiometricSettings';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { borderRadius, colors, spacing, typography } from '../theme/design';
import type { User } from '../types';
import StorageService from '../utils/storage';

interface Company {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  serial_no?: string;
  status: 'active' | 'inactive';
  sellers_count?: number;
  created_at: string;
  updated_at: string;
}

interface CompanyCardProps {
  company: Company;
  onPress: () => void;
}

export default function ProfileScreen(): JSX.Element {
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    loadStorageInfo();
    if (user?.role === 'company') {
      loadUserCompanies();
    }
  }, [user]);

  const loadStorageInfo = async () => {
    try {
      const info = await StorageService.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const loadUserCompanies = async () => {
    if (user?.role !== 'company') return;
    
    try {
      setLoadingCompanies(true);
      const response = await api.getCompanies();
      // Filtrar solo las compañías del usuario actual
      const userCompanies = response.data.filter(company => company.user_id === user.id);
      setCompanies(userCompanies);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
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
      // const updatedUser = await api.updateUser(user!.id, updatedData);
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
      case 'manager':
        return 'Manager';
      case 'company':
        return 'Compañía';
      case 'seller':
        return 'Vendedor';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return colors.error;
      case 'manager':
        return colors.primary[500];
      case 'company':
        return colors.success;
      case 'seller':
        return colors.warning;
      default:
        return colors.text.secondary;
    }
  };

  const getRoleIcon = (role: string): keyof typeof Ionicons.glyphMap => {
    switch (role) {
      case 'admin':
        return 'shield-checkmark';
      case 'manager':
        return 'business';
      case 'company':
        return 'storefront';
      case 'seller':
        return 'person';
      default:
        return 'person';
    }
  };

  const CompanyCard: React.FC<CompanyCardProps> = ({ company, onPress }) => (
    <TouchableOpacity style={styles.companyCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.companyHeader}>
        <View style={styles.companyIcon}>
          <Ionicons name="business" size={24} color={colors.primary[500]} />
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.name}</Text>
          {company.description && (
            <Text style={styles.companyDescription} numberOfLines={2}>
              {company.description}
            </Text>
          )}
        </View>
        <View style={styles.companyStatus}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: company.status === 'active' ? colors.success : colors.error }
          ]} />
        </View>
      </View>
      
      <View style={styles.companyDetails}>
        {company.phone && (
          <View style={styles.companyDetailRow}>
            <Ionicons name="call" size={14} color={colors.text.secondary} />
            <Text style={styles.companyDetailText}>{company.phone}</Text>
          </View>
        )}
        {company.email && (
          <View style={styles.companyDetailRow}>
            <Ionicons name="mail" size={14} color={colors.text.secondary} />
            <Text style={styles.companyDetailText}>{company.email}</Text>
          </View>
        )}
        {company.sellers_count !== undefined && (
          <View style={styles.companyDetailRow}>
            <Ionicons name="people" size={14} color={colors.text.secondary} />
            <Text style={styles.companyDetailText}>
              {company.sellers_count} vendedor{company.sellers_count !== 1 ? 'es' : ''}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCompany: ListRenderItem<Company> = ({ item }) => (
    <CompanyCard
      company={item}
      onPress={() => router.push(`/companies/${item.id}`)}
    />
  );

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
            {/* <Text style={styles.headerSubtitle}>{getRoleText(user.role)}</Text>*/}
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

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={loadingCompanies} 
            onRefresh={() => {
              loadStorageInfo();
              if (user?.role === 'company') {
                loadUserCompanies();
              }
            }} 
          />
        }
      >
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
              <View style={styles.roleContainer}>
                {/*<View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                  <Ionicons name={getRoleIcon(user.role)} size={16} color={getRoleColor(user.role)} />
                   <Text style={[styles.userRole, { color: getRoleColor(user.role) }]}>
                    {getRoleText(user.role)}
                  </Text>
                </View>*/}
              </View>
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

        {/* Configuración de Seguridad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <BiometricSettings />
        </View>

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

        {/* Compañías del usuario (solo si es company) */}
        {user.role === 'company' && (
          <Card style={{ marginTop: spacing.lg }}>
            <View style={styles.companiesHeader}>
              <Text style={styles.sectionTitle}>Mis Compañías</Text>
             {/* <TouchableOpacity
                style={styles.addCompanyButton}
                onPress={() => router.push('/companies/new')}
              >
                <Ionicons name="add" size={20} color={colors.primary[500]} />
              </TouchableOpacity> */}
            </View>
            
            {loadingCompanies ? (
              <LoadingSpinner text="Cargando compañías..." />
            ) : companies.length > 0 ? (
              <FlatList
                data={companies}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderCompany}
                scrollEnabled={false}
                style={styles.companiesList}
              />
            ) : (
              <View style={styles.emptyCompanies}>
                <Ionicons name="business" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyCompaniesText}>No tienes compañías registradas</Text>
                <Button
                  title="Crear Primera Compañía"
                  variant="outline"
                  onPress={() => router.push('/companies/new')}
                  style={styles.createCompanyButton}
                />
              </View>
            )}
          </Card>
        )}

        {/* Información de la cuenta */}
        {/* <Card style={{ marginTop: spacing.lg }}>
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
        </Card>*/}

        {/* Información de almacenamiento */}
       {/* {storageInfo && (
          <Card style={{ marginTop: spacing.lg }}>
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
        )}*/}

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
  section: {
    marginBottom: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  roleContainer: {
    marginBottom: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  userRole: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
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
  companiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,    
  },
  addCompanyButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
  },
  companiesList: {
    maxHeight: 300,
  },
  companyCard: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  companyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  companyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  companyStatus: {
    alignItems: 'center',
  },
  companyDetails: {
    marginTop: spacing.sm,
  },
  companyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  companyDetailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  emptyCompanies: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyCompaniesText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  createCompanyButton: {
    marginTop: spacing.md,
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