import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItem,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { DashboardData, Sale } from '../../types';
import { formatCurrency, formatFecha, formatHora } from '../../utils/helpers';

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

interface Seller {
  id: number;
  user_id: number;
  company_id: number;
  code: string;
  description?: string;
  percent_sales: number;
  percent_receivable: number;
  seller_status: 'active' | 'inactive';
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

interface CompanySelectorProps {
  visible: boolean;
  companies: Company[];
  selectedCompany: Company | null;
  onSelect: (company: Company) => void;
  onClose: () => void;
  loading: boolean;
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

const CompanySelector: React.FC<CompanySelectorProps> = ({
  visible,
  companies,
  selectedCompany,
  onSelect,
  onClose,
  loading,
}) => {
  const [search, setSearch] = useState('');
  
  const filteredCompanies = companies.filter(company =>    
    company.name?.toLowerCase().includes(search.toLowerCase()) ||
    company.description?.toLowerCase().includes(search.toLowerCase())
  );

  

  const renderCompany: ListRenderItem<Company> = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.companyItem,
        selectedCompany?.id === item.id && styles.companyItemSelected
      ]}
      onPress={() => onSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.companyInfo}>
        <View style={styles.companyHeader}>
          <View style={styles.companyIcon}>
            <Ionicons name="business" size={20} color={colors.primary[500]} />
          </View>
          <View style={styles.companyDetails}>
            <Text style={styles.companyName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.companyDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.companyMeta}>
          <View style={styles.companyMetaItem}>
            <Ionicons name="people" size={16} color={colors.text.secondary} />
            <Text style={styles.companyMetaText}>
              {item.sellers_count || 0} vendedores
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'active' ? colors.success + '20' : colors.error + '20' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'active' ? colors.success : colors.error }
            ]}>
              {item.status === 'active' ? 'Activa' : 'Inactiva'}
            </Text>
          </View>
        </View>
      </View>
      
      {selectedCompany?.id === item.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderContent}>
            <Text style={styles.modalTitle}>Seleccionar Empresa</Text>
            <Text style={styles.modalSubtitle}>
              {filteredCompanies.length} empresa{filteredCompanies.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Input
            placeholder="Buscar empresas..."
            value={search}
            onChangeText={setSearch}
            leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
            style={{ marginBottom: 0 }}
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner text="Cargando empresas..." />
          </View>
        ) : (
          <FlatList
            data={filteredCompanies}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCompany}
            contentContainerStyle={styles.companiesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="business" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No se encontraron empresas</Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

export default function DashboardScreen(): JSX.Element {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySellers, setCompanySellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false);
  const [loadingSellers, setLoadingSellers] = useState<boolean>(false);
  const [showCompanySelector, setShowCompanySelector] = useState<boolean>(false);
  const { user, logout } = useAuth();

  // ✨ FUNCIÓN DE AUTO-LOGOUT EFICIENTE
  const handleAutoLogout = useCallback(async () => {
    try {
      await logout();
      // Limpiar AsyncStorage
      await AsyncStorage.multiRemove(['selectedCompany', 'user', 'token']);
      // Redirigir al login
      router.replace('/(auth)/login');
    } catch (error) {
      console.log('Error during auto-logout:', error);
      // En caso de error, forzar navegación al login
      router.replace('/(auth)/login');
    }
  }, [logout]);

  // ✨ EFECTO PARA VERIFICAR USUARIO AL MONTAR
  useEffect(() => {
    if (!user?.name) {
      console.log('Usuario no disponible, ejecutando auto-logout...');
      handleAutoLogout();
      return; // Detener ejecución del resto del componente
    }
    
    // Si el usuario existe, cargar datos normalmente
    loadInitialData();
  }, [user, handleAutoLogout]);
  

  useEffect(() => {
    if (selectedCompany) {
      console.log('Selected Company changed:', selectedCompany.id);
      loadCompanySellers();
      loadCompanyDashboard();
    }
  }, [selectedCompany]);

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
  },[user]);

  const loadInitialData = async (): Promise<void> => {
    try {
      setLoading(true);
      await Promise.all([
        loadDashboardData(),
        loadCompanies(),
      ]);
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

  const getStatusText = (status: Quote['status']) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'sent':
        return 'Enviado';
      case 'draft':
        return 'Borrador';
      case 'rejected':
        return 'Rechazado';
      case 'expired':
        return 'Expirado';
      default:
        return status;
      }
    };

    const getStatusColor = (status: Quote['status']) => {
      switch (status) {
        case "approved":
          return colors.success;
        case "sent":
          return colors.info;
        case "draft":
          return colors.warning;
        case "rejected":
          return colors.error;
        case "expired":
          return colors.gray[500];
        default:
          return colors.text.secondary;
      }
    };

  const loadCompanies = async (): Promise<void> => {
    try {
      setLoadingCompanies(true);
      const response = await api.getCompanies({ per_page: 100 });
      setCompanies(response.data);
      
      // Auto-seleccionar la primera empresa si no hay ninguna seleccionada
      if (response.data.length > 0 && !selectedCompany) {
        setSelectedCompany(response.data[0]);
        await AsyncStorage.setItem('selectedCompany', JSON.stringify(response.data[0])); // <-- Guarda en AsyncStorage
        console.log('Auto-selected first company:', response.data[0]);        
      }
    } catch (error) {
      console.log('Error loading companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadCompanySellers = async (): Promise<void> => {
    if (!selectedCompany) return;
    
    try {
      setLoadingSellers(true);
      console.log("compañia: ",selectedCompany.id);
      const response = await api.getCompanySellers(selectedCompany.id);
      setCompanySellers(response.data);
    } catch (error) {
      console.log('Error loading company sellers:', error);
      setCompanySellers([]);
    } finally {
      setLoadingSellers(false);
    }
  };

  const loadCompanyDashboard = async (): Promise<void> => {
    // Aquí podrías cargar datos específicos de la empresa
    // Por ahora mantenemos los datos generales del dashboard
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.log('Error loading company dashboard:', error);
    }
  };

  const handleRefresh = useCallback((): void => {
    loadInitialData();
  }, []);

  const handleCompanySelect = async (company: Company): Promise<void> => {    
    setSelectedCompany(company);
    setShowCompanySelector(false);
    await AsyncStorage.setItem('selectedCompany', JSON.stringify(company));

  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getRoleText = (role: string): string => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Manager';
      case 'company': return 'Compañía';
      case 'seller': return 'Vendedor';
      default: return role;
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'admin': return colors.error;
      case 'manager': return colors.primary[500];
      case 'company': return colors.success;
      case 'seller': return colors.warning;
      default: return colors.text.secondary;
    }
  };

  const getQuickActionsForRole = () => {
    const actions = [];
    
    switch (user?.role) {
      case 'admin':
        actions.push(
          { title: 'Gestionar Usuarios', icon: 'people', color: '#10b981', onPress: () => router.push('/users') },
          { title: 'Ver Empresas', icon: 'business', color: '#0ea5e9', onPress: () => setShowCompanySelector(true) },
          { title: 'Nuevo Presupuesto', icon: 'document-text', color: '#f59e0b', onPress: () => router.push('/quotes/new') },
          { title: 'Reportes Globales', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }
        );
        break;
        
      case 'manager':
        actions.push(
          { title: 'Crear Empresa', icon: 'add-circle', color: '#10b981', onPress: () => router.push('/companies/new') },
          { title: 'Ver Empresas', icon: 'business', color: '#0ea5e9', onPress: () => setShowCompanySelector(true) },
          { title: 'Nuevo Presupuesto', icon: 'document-text', color: '#f59e0b', onPress: () => router.push('/quotes/new') },
          { title: 'Reportes', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }
        );
        break;
        
      case 'company':
        actions.push(
          /*{ title: 'Crear Vendedor', icon: 'person-add', color: '#10b981', onPress: () => router.push('/sellers/new') },
          { title: 'Mis vendedores', icon: 'people', color: '#0ea5e9', onPress: () => router.push('/sellers') },*/
          { title: 'Nuevo Presupuesto', icon: 'document-text', color: '#f59e0b', onPress: () => router.push({ pathname: '/quotes/new', params: { company_id: selectedCompany?.id?.toString() } }) },
          /*{ title: 'Reportes', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }*/
        );
        break;
        
      case 'seller':
        actions.push(
          { title: 'Nuevo Presupuesto', icon: 'add-circle', color: '#10b981', onPress: () => router.push('/quotes/new') },
          { title: 'Ver Clientes', icon: 'person-add', color: '#0ea5e9', onPress: () => router.push('/customers') },
          { title: 'Ver Productos', icon: 'cube', color: '#f59e0b', onPress: () => router.push('/products') },
        );
        break;
        
      default:
        actions.push(
          { title: 'Nuevo Presupuesto', icon: 'add-circle', color: '#10b981', onPress: () => router.push('/quotes/new') },
          { title: 'Productos', icon: 'cube', color: '#0ea5e9', onPress: () => router.push('/products') },
          { title: 'Clientes', icon: 'person-add', color: '#f59e0b', onPress: () => router.push('/customers') },
          { title: 'Reportes', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }
        );
    }
    
    return actions;
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
      activeOpacity={0.8}
      disabled={disabled}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={28} color={colors.text.inverse} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

  const SaleItem: React.FC<SaleItemProps> = ({ sale }) => (
    <TouchableOpacity 
      style={styles.saleItem}
      onPress={() => router.push(`/quotes/${sale.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleLeft}>
          <Text style={styles.saleNumber}>{sale?.id}</Text>
          <Text style={styles.saleCustomer}>{sale?.customer || 'Cliente no especificado'}</Text>
        </View>
        <View style={styles.saleRight}>
          <Text style={styles.saleAmount}>{formatCurrency(sale.total)}</Text>
          <Text style={styles.saleDate}>{formatFecha(sale.date)}</Text>
          <Text style={styles.saleDate}>{formatHora(sale.date)}</Text>
        </View>
      </View>
      <View style={styles.saleStatus}>
        <View style={[
          styles.statusBadge, 
          { color: getStatusColor(sale.status) }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(sale.status) }
          ]}>
            {getStatusText(sale.status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ✨ RETORNO TEMPRANO SI NO HAY USUARIO (Prevención adicional)
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
        <Ionicons name="analytics" size={48} color={colors.primary[500]} />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  const quickActions = getQuickActionsForRole();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <View style={styles.roleContainer}>
              {/*<View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role || '') + '20' }]}>
                <Ionicons name="person" size={16} color={getRoleColor(user?.role || '')} />
                <Text style={[styles.userRole, { color: getRoleColor(user?.role || '') }]}>
                  {getRoleText(user?.role || '')}
                </Text>
              </View>*/}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={24} color={colors.primary[500]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selector de Empresa */}
      {companies.length > 0 && (
        <View style={styles.companySelectorContainer}>
          <Card padding="lg">
            <View style={styles.companySelectorHeader}>
                {user?.role === 'company'  ? (
                  <Text style={styles.companySelectorTitle}>Empresa Seleccionada</Text>
                ) : (
                  <Text style={styles.companySelectorTitle}>Empresa asociada</Text>
                )}
             {/* <TouchableOpacity
                style={styles.changeCompanyButton}
                onPress={() => setShowCompanySelector(true)}
              >
                <Text style={styles.changeCompanyText}>Cambiar</Text>
                <Ionicons name="chevron-down" size={16} color={colors.primary[500]} />
              </TouchableOpacity>*/}
            </View>
            
            {selectedCompany ? (
              <TouchableOpacity
                style={styles.selectedCompanyCard}
                //onPress={() => setShowCompanySelector(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectedCompanyIcon}>
                  <Ionicons name="business" size={24} color={colors.primary[500]} />
                </View>
                <View style={styles.selectedCompanyInfo}>
                  <Text style={styles.selectedCompanyName}>{selectedCompany.name}</Text>
                  {selectedCompany.description && (
                    <Text style={styles.selectedCompanyDescription} numberOfLines={1}>
                      {selectedCompany.description}
                    </Text>
                  )}
                  {user?.role === 'company' && (
                  <Text style={styles.selectedCompanyMeta}>
                    {companySellers.length} vendedor{companySellers.length !== 1 ? 'es' : ''} • {selectedCompany.status === 'active' ? 'Activa' : 'Inactiva'}
                  </Text>
                  )}
                </View>
                 {/* {user?.role === 'company' && (
                   <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} /> 
                 )}*/}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.noCompanySelected}
                onPress={() => setShowCompanySelector(true)}
              >
                <Ionicons name="business" size={32} color={colors.text.tertiary} />
                <Text style={styles.noCompanyText}>Seleccionar empresa</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>
      )}

      {/* Vendedores de la empresa */}
      {selectedCompany && companySellers.length > 0 && (
        <View style={styles.sellersContainer}>
          <Card padding="lg">
            <View style={styles.sellersHeader}>
              <Text style={styles.sellersTitle}>
                Vendedores ({companySellers.length})
              </Text>
              <TouchableOpacity
                style={styles.addSellerButton}
                onPress={() => router.push(`/sellers/new?company_id=${selectedCompany.id}`)}
              >
                <Ionicons name="add" size={16} color={colors.primary[500]} />
                <Text style={styles.addSellerText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sellersScrollContainer}
            >
              {loadingSellers ? (
                <View style={styles.sellersLoading}>
                  <LoadingSpinner text="Cargando vendedores..." />
                </View>
              ) : (
                companySellers.map((seller) => (
                  <TouchableOpacity
                    key={seller.id}
                    style={styles.sellerCard}
                    onPress={() => router.push(`/sellers/${seller.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.sellerAvatar}>
                      <Text style={styles.sellerAvatarText}>
                        {seller.user?.name.charAt(0).toUpperCase() || 'S'}
                      </Text>
                    </View>
                    <Text style={styles.sellerName} numberOfLines={1}>
                      {seller.user?.name || 'Vendedor'}
                    </Text>
                    <Text style={styles.sellerCode} numberOfLines={1}>
                      #{seller.code}
                    </Text>
                    <View style={[
                      styles.sellerStatusBadge,
                      { backgroundColor: seller.seller_status === 'active' ? colors.success + '20' : colors.error + '20' }
                    ]}>
                      <Text style={[
                        styles.sellerStatusText,
                        { color: seller.seller_status === 'active' ? colors.success : colors.error }
                      ]}>
                        {seller.seller_status === 'active' ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Card>
        </View>
      )}

      {/* Métricas principales */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.metricsGrid}>
          <Card style={[styles.metricCard, { borderLeftColor: colors.success }]}>
            <View style={styles.metricHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                <Text style={styles.metricValue}>{dashboardData?.data.business_summary?.quotes_today || 0}</Text>
              </View>
              <View style={styles.trendContainer}>
                <Text style={[styles.trendText, { color: colors.success }]}>+12%</Text>
              </View>
            </View>            
            <Text style={styles.metricTitle}>Presupuestos Hoy</Text>
          </Card>

          <Card style={[styles.metricCard, { borderLeftColor: colors.primary[500] }]}>
            <View style={styles.metricHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary[500] + '15' }]}>
                <Text style={styles.metricValue}>{dashboardData?.data.business_summary?.quotes_this_month || 0}</Text>
              </View>
              <View style={styles.trendContainer}>
                <Ionicons name="trending-up" size={14} color={colors.success} />
                <Text style={[styles.trendText, { color: colors.success }]}>+8%</Text>
              </View>
            </View>
            <Text style={styles.metricTitle}>Presupuestos Mes</Text>
          </Card>

          {/*<Card style={[styles.metricCard, { borderLeftColor: colors.warning }]}>
            <View style={styles.metricHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="warning" size={20} color={colors.warning} />
              </View>
            </View>
            <Text style={styles.metricValue}>{dashboardData?.metrics?.low_stock_products?.toString() || '0'}</Text>
            <Text style={styles.metricTitle}>Stock Bajo</Text>
          </Card>*/}

          <Card style={[styles.metricCard, { borderLeftColor: colors.info }]}>
            <View style={styles.metricHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.info + '15' }]}>
                <Ionicons name="people" size={20} color={colors.info} />
              </View>
            </View>
            <Text style={styles.metricValue}>{dashboardData?.data.business_summary?.total_customers || '0'}</Text>
            <Text style={styles.metricTitle}>Clientes</Text>
          </Card>
        </View>
      </View>

      {/* Gráfico de ventas */}
      {dashboardData?.sales_chart && dashboardData.sales_chart.length > 0 && (
        <View style={styles.chartContainer}>
          <Card padding="lg" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Presupuestos de los Últimos 7 Días</Text>              
              <TouchableOpacity onPress={() => router.push('/reports')}>
                <Text style={styles.viewMoreText}>Ver más</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: dashboardData.sales_chart.map(item => item.day),
                  datasets: [{
                    data: dashboardData.sales_chart.map(item => item.total),
                    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
                    strokeWidth: 3,
                  }],
                }}
                width={screenWidth - 80}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "3",
                    stroke: "#0ea5e9",
                    fill: "#ffffff"
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: "",
                    stroke: "#e5e7eb",
                    strokeWidth: 1,
                  },
                  fillShadowGradient: '#0ea5e9',
                  fillShadowGradientOpacity: 0.1,
                }}
                bezier
                style={styles.chart}
              />
            </View>
          </Card>
        </View>
      )}

      {/* Acciones rápidas mejoradas */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <QuickAction
              key={index}
              title={action.title}
              icon={action.icon as any}
              color={action.color}
              onPress={action.onPress}
            />
          ))}
        </View>
      </View>

      {/* Presupuestos recientes */}
      <View style={[styles.recentSalesContainer, { marginTop: user?.role === 'company' ? 50 : 150 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Presupuestos Recientes</Text>
          <TouchableOpacity onPress={() => router.push('/quotes')}>
            <Text style={styles.seeAllText}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        
        <Card padding="sm">
          {dashboardData?.data?.recent_quotes && dashboardData.data?.recent_quotes.length > 0 ? (
            dashboardData.data?.recent_quotes.slice(0, 5).map((sale) => (
              <SaleItem key={sale.id} sale={sale} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateText}>No hay presupuestos recientes</Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => router.push('/quotes/new')}
              >
                <Text style={styles.emptyActionText}>Crear primer presupuesto</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </View>

      <View style={styles.bottomSpacer} />

      {/* Modal Selector de Empresas */}
      <CompanySelector
        visible={showCompanySelector}
        companies={companies}
        selectedCompany={selectedCompany}
        onSelect={handleCompanySelect}
        onClose={() => setShowCompanySelector(false)}
        loading={loadingCompanies}
      />
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
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  roleContainer: {
    marginTop: spacing.sm,
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
  profileButton: {
    padding: spacing.xs,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Company Selector Styles
  companySelectorContainer: {
    padding: spacing.lg,
  },
  companySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companySelectorTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  changeCompanyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  changeCompanyText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginRight: spacing.xs,
  },
  selectedCompanyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  selectedCompanyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  selectedCompanyInfo: {
    flex: 1,
  },
  selectedCompanyName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  selectedCompanyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  selectedCompanyMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  noCompanySelected: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noCompanyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  
  // Sellers Styles
  sellersContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sellersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sellersTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  addSellerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  addSellerText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  },
  sellersScrollContainer: {
    paddingHorizontal: spacing.sm,
  },
  sellersLoading: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: screenWidth - 80,
  },
  sellerCard: {
    width: 100,
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.sm,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sellerAvatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  sellerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  sellerCode: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sellerStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sellerStatusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },

  // Modal Styles
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
    borderBottomColor: colors.gray[100],
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  companiesList: {
    padding: spacing.lg,
  },
  companyItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  companyItemSelected: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[25],
  },
  companyInfo: {
    flex: 1,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  companyDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  companyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyMetaText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Existing styles with updated references
  metricsContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 36,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  },
  metricValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metricTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  chartContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  chartCard: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  viewMoreText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  chartWrapper: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  chart: {
    borderRadius: borderRadius.lg,
    backgroundColor: '#ffffff',
  },
  quickActionsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: 5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 100,
    justifyContent: 'center',
  },
  quickActionDisabled: {
    opacity: 0.6,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    color: colors.text.primary,
    lineHeight: 18,
  },
  recentSalesContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  saleItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
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
  saleStatus: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyActionButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  emptyActionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semibold,
  },
  bottomSpacer: {
    height: spacing.lg,
  },
});