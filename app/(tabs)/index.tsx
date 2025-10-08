// app/(tabs)/index.tsx - Dashboard Optimizado
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { DashboardData, Sale } from '../../types';
import { formatCurrency, formatFecha } from '../../utils/helpers';

const screenWidth = Dimensions.get('window').width;

interface Quote {
  id: number;
  quote_number: string;
  customer_id: number;
  customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  user_id: number;
  user?: {
    id: number;
    name: string;
  };
  company_id?: number;
  company?: {
    id: number;
    name: string;
  };
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  valid_until: string;
  quote_date: string;
  terms_conditions?: string;
  notes?: string;
  items?: QuoteItem[];
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  id: number;
  quote_id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
    code: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
}

interface Company {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  sellers_count?: number;
}

interface QuickActionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}

interface SaleItemProps {
  sale: Sale;
}

export default function DashboardScreen(): JSX.Element {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showRecentQuotes, setShowRecentQuotes] = useState<boolean>(false);
  const { user, logout } = useAuth();

  const handleAutoLogout = useCallback(async () => {
    try {
      await logout();
      await AsyncStorage.multiRemove(['selectedCompany', 'user', 'token']);
      router.replace('/(auth)/login');
    } catch (error) {
      console.log('Error during auto-logout:', error);
      router.replace('/(auth)/login');
    }
  }, [logout]);

  useEffect(() => {
    if (!user?.name) {
      console.log('Usuario no disponible, ejecutando auto-logout...');
      handleAutoLogout();
      return;
    }
    loadInitialData();
  }, [user, handleAutoLogout]);

  useEffect(() => {
    const loadSelectedCompany = async () => {
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      if (storedCompany) {
        setSelectedCompany(JSON.parse(storedCompany));
      } else {
        setSelectedCompany(null);
      }
    };
    loadSelectedCompany();
  }, [user]);

  const loadInitialData = async (): Promise<void> => {
    try {
      setLoading(true);
      await Promise.all([loadDashboardData(), loadCompanies()]);
    } catch (error) {
      console.log('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (): Promise<void> => {
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.log('Error loading dashboard:', error);
    }
  };

  const loadCompanies = async (): Promise<void> => {
    try {
      const response = await api.getCompanies({ per_page: 100 });
      setCompanies(response.data);
      
      if (response.data.length > 0 && !selectedCompany) {
        setSelectedCompany(response.data[0]);
        await AsyncStorage.setItem('selectedCompany', JSON.stringify(response.data[0]));
      }
    } catch (error) {
      console.log('Error loading companies:', error);
    }
  };

  const getStatusText = (status: Quote['status']) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'sent': return 'Enviado';
      case 'draft': return 'Borrador';
      case 'rejected': return 'Rechazado';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case "approved": return colors.success;
      case "sent": return colors.info;
      case "draft": return colors.warning;
      case "rejected": return colors.error;
      case "expired": return colors.gray[500];
      default: return colors.text.secondary;
    }
  };

  const handleRefresh = useCallback((): void => {
    loadInitialData();
  }, []);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const QuickAction: React.FC<QuickActionProps> = ({ 
    title, 
    icon, 
    onPress, 
    color = colors.primary[500],
    disabled = false
  }) => (
    <TouchableOpacity 
      style={[styles.quickAction, disabled && styles.quickActionDisabled]} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={colors.text.inverse} />
      </View>
      <Text style={styles.quickActionText} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );

  const SaleItem: React.FC<SaleItemProps> = ({ sale }) => (
    <TouchableOpacity 
      style={styles.saleItem}
      onPress={() => {
        setShowRecentQuotes(false);
        router.push(`/quotes/${sale.id}`);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleLeft}>
          <Text style={styles.saleNumber}>#{sale?.id}</Text>
          <Text style={styles.saleCustomer}>{sale?.customer || 'Cliente no especificado'}</Text>
        </View>
        <View style={styles.saleRight}>
          <Text style={styles.saleAmount}>{formatCurrency(sale.total)}</Text>
          <Text style={styles.saleDate}>{formatFecha(sale.date)}</Text>
        </View>
      </View>
      <View style={[
        styles.statusBadge,
        { backgroundColor: getStatusColor(sale.status) + '20' }
      ]}>
        <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
          {getStatusText(sale.status)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="log-out-outline" size={48} color={colors.primary[500]} />
        <Text style={styles.loadingText}>Cerrando sesión...</Text>
      </View>
    );
  }

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando dashboard..." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Compacto */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            {selectedCompany && (
              <Text style={styles.companyName}>{selectedCompany.name}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={20} color={colors.primary[500]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Acciones Rápidas - Primera Sección */}
        <View style={styles.quickActionsContainer}>
          <QuickAction
            title="Crear Presupuesto"
            icon="add-circle"
            color={colors.primary[500]}
            onPress={() => router.push({ 
              pathname: '/quotes/new', 
              params: { company_id: selectedCompany?.id?.toString() } 
            })}
          />
          <QuickAction
            title="Presupuestos Recientes"
            icon="document-text"
            color={colors.info}
            onPress={() => setShowRecentQuotes(true)}
          />
        </View>

        {/* Métricas - Segunda Sección */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsGrid}>
            <TouchableOpacity 
              style={[styles.metricCard, { borderLeftColor: colors.success }]}
              onPress={() => router.push('/quotes')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>
                {dashboardData?.data.business_summary?.quotes_today || 0}
              </Text>
              <Text style={styles.metricTitle}>Presupuestos Hoy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.metricCard, { borderLeftColor: colors.primary[500] }]}
              onPress={() => router.push('/quotes')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>
                {dashboardData?.data.business_summary?.quotes_this_month || 0}
              </Text>
              <Text style={styles.metricTitle}>Presupuestos Mes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.metricCard, { borderLeftColor: colors.warning }]}
              onPress={() => router.push('/products')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>
                {dashboardData?.data.business_summary?.total_products || 0}
              </Text>
              <Text style={styles.metricTitle}>Productos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.metricCard, { borderLeftColor: colors.info }]}
              onPress={() => router.push('/customers')}
              activeOpacity={0.7}
            >
              <Text style={styles.metricValue}>
                {dashboardData?.data.business_summary?.total_customers || 0}
              </Text>
              <Text style={styles.metricTitle}>Clientes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal de Presupuestos Recientes */}
      <Modal
        visible={showRecentQuotes}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecentQuotes(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Presupuestos Recientes</Text>
            <TouchableOpacity onPress={() => setShowRecentQuotes(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {dashboardData?.data?.recent_quotes && dashboardData.data?.recent_quotes.length > 0 ? (
              <>
                {dashboardData.data?.recent_quotes.slice(0, 5).map((sale) => (
                  <SaleItem key={sale.id} sale={sale} />
                ))}
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => {
                    setShowRecentQuotes(false);
                    router.push('/quotes');
                  }}
                >
                  <Text style={styles.viewAllButtonText}>Ver Todos los Presupuestos</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.primary[500]} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyStateText}>No hay presupuestos recientes</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
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
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  companyName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  profileButton: {
    padding: spacing.xs,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionDisabled: {
    opacity: 0.6,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    color: colors.text.primary,
  },
  metricsContainer: {
    marginBottom: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metricTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  saleItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  saleLeft: {
    flex: 1,
  },
  saleNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  saleCustomer: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  saleDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  viewAllButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
    marginRight: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
});