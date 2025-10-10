// app/profile.tsx - Perfil optimizado
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
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { borderRadius, colors, spacing, typography } from '../theme/design';

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

interface Seller {
  id: number;
  user_id: number;
  company_id: number;
  code: string;
  description?: string;
  percent_sales: number;
  percent_receivable: number;
  seller_status: 'active' | 'inactive';
  company?: {
    id: number;
    name: string;
    description?: string;
    status: 'active' | 'inactive';
  };
}

interface CompanyCardProps {
  company: Company;
}

interface SellerCompanyCardProps {
  seller: Seller;
}

export default function ProfileScreen(): JSX.Element {
  const { user, logout } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sellerCompanies, setSellerCompanies] = useState<Seller[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    console.log('👤 Usuario actual:', user);
     if (user?.role === 'company') {
      loadUserCompanies();
     } else{
      loadSellerCompanies();
     }
   
   
  }, [user]);

  const loadUserCompanies = async () => {
    if (user?.role !== 'company') return;
    
    try {
      setLoadingCompanies(true);
      const response = await api.getCompanies();
      console.log('✅ Compañías cargadas:', response.data);
      const userCompanies = response.data.filter(company => company.user_id === user.id);
      setCompanies(user?.companies || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadSellerCompanies = async () => {
    if (user?.role !== 'seller') return;
    
    try {
      setLoadingCompanies(true);
      // Asumiendo que existe un endpoint para obtener las empresas del vendedor
      const response = await api.getCompanies();
      const userCompanies = response.data.filter(company => company.user_id === user.id);
      setSellerCompanies(user?.companies || []);
      console.log('✅ Empresas del vendedor cargadas:', user?.companies);
    } catch (error) {
      console.error('Error loading seller companies:', error);
    } finally {
      setLoadingCompanies(false);
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

  const CompanyCard: React.FC<CompanyCardProps> = ({ company }) => (
    <View style={styles.companyCard}>
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
        <View style={[
          styles.statusIndicator,
          { backgroundColor:  colors.success  }
        ]} />
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
        {company.contact && (
          <View style={styles.companyDetailRow}>
            <Ionicons name="person" size={14} color={colors.text.secondary} />
            <Text style={styles.companyDetailText}>Contacto: {company.contact}</Text>
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
    </View>
  );

  const SellerCompanyCard: React.FC<SellerCompanyCardProps> = ({ seller }) => (
    <View style={styles.companyCard}>
      <View style={styles.companyHeader}>
        <View style={styles.companyIcon}>
          <Ionicons name="business" size={24} color={colors.primary[500]} />
        </View>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{seller?.name || 'Empresa'}</Text>
          
        </View>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: colors.success  }
        ]} />
      </View>
      
     
    </View>
  );

  const renderCompany: ListRenderItem<Company> = ({ item }) => (
    <CompanyCard company={item} />
  );

  const renderSellerCompany: ListRenderItem<Seller> = ({ item }) => (
    <SellerCompanyCard seller={item} />
  );

  if (!user) {
    return <View style={styles.container} />;
  }

  // Determinar el nombre a mostrar
  const displayName = user.role === 'company' 
    ? (companies[0]?.contact || user.name)
    : user.name;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header con Logout */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
        </View>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={loadingCompanies} 
            onRefresh={() => {
              if (user?.role === 'company') {
                loadUserCompanies();
              } else if (user?.role === 'seller') {
                loadSellerCompanies();
              }
            }} 
          />
        }
      >
        {/* Avatar y info básica */}
        <Card style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.statusBadge}>
                <View style={[
                  styles.statusIndicator,
                  { backgroundColor:  colors.success }
                ]} />
                <Text style={styles.statusText}>
                  {user.status === 'active' ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Seguridad en Card */}
        <Card style={styles.securityCard}>
          <Text style={styles.sectionTitle}>Seguridad</Text>
          <BiometricSettings />
        </Card>

        {/* Información personal */}
        <Card>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <Input
            label="Nombre Completo"
            value={displayName}
            editable={false}
            leftIcon={<Ionicons name="person" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Email"
            value={user.email}
            editable={false}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Teléfono"
            value={user.phone || 'No especificado'}
            editable={false}
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Compañías del usuario company */}
        {user.role === 'company' && (
          <Card style={styles.companiesCard}>
            <View style={styles.companiesHeader}>
              <Text style={styles.sectionTitle}>Mi Empresa</Text>
            </View>
            
            {loadingCompanies ? (
              <LoadingSpinner text="Cargando empresa..." />
            ) : companies.length > 0 ? (
              <FlatList
                data={companies}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderCompany}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyCompanies}>
                <Ionicons name="business" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyCompaniesText}>
                  No hay información de empresa disponible
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Empresas del vendedor */}
        {user.role === 'seller' && (
          <Card style={styles.companiesCard}>
            <View style={styles.companiesHeader}>
              <Text style={styles.sectionTitle}>
                Mis Empresas ({sellerCompanies.length})
              </Text>
            </View>
            
            {loadingCompanies ? (
              <LoadingSpinner text="Cargando empresas..." />
            ) : sellerCompanies.length > 0 ? (
              <FlatList
                data={sellerCompanies}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderSellerCompany}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyCompanies}>
                <Ionicons name="business" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyCompaniesText}>
                  No estás asociado a ninguna empresa
                </Text>
              </View>
            )}
          </Card>
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
    marginTop: Platform.OS === 'ios' ? 15: 15,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  logoutText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
    marginLeft: spacing.xs,
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
  securityCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  companiesCard: {
    marginTop: spacing.lg,
  },
  companiesHeader: {
    marginBottom: spacing.md,
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
  sellerCode: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
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
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});