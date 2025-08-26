// app/(tabs)/index.tsx - Dashboard mejorado con roles
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { DashboardData, Sale } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';

const screenWidth = Dimensions.get('window').width;

interface MetricCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  trend?: {
    value: string;
    type: 'up' | 'down' | 'stable';
  };
  onPress?: () => void;
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
  const [loading, setLoading] = useState<boolean>(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.log('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = (): void => {
    loadDashboardData();
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
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

  const getQuickActionsForRole = () => {
    const actions = [];
    
    switch (user?.role) {
      case 'admin':
        actions.push(
          { title: 'Gestionar Usuarios', icon: 'people', color: '#10b981', onPress: () => router.push('/users') },
          { title: 'Ver Compañías', icon: 'business', color: '#0ea5e9', onPress: () => router.push('/companies') },
          { title: 'Vendedores', icon: 'person', color: '#f59e0b', onPress: () => router.push('/sellers') },
          { title: 'Reportes Globales', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }
        );
        break;
        
      case 'manager':
        actions.push(
          { title: 'Crear Compañía', icon: 'add-circle', color: '#10b981', onPress: () => router.push('/companies/new') },
          { title: 'Ver Compañías', icon: 'business', color: '#0ea5e9', onPress: () => router.push('/companies') },
          { title: 'Gestionar Vendedores', icon: 'people', color: '#f59e0b', onPress: () => router.push('/sellers') },
          { title: 'Reportes', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }
        );
        break;
        
      case 'company':
        actions.push(
          { title: 'Crear Vendedor', icon: 'person-add', color: '#10b981', onPress: () => router.push('/sellers/new') },
          { title: 'Mis Vendedores', icon: 'people', color: '#0ea5e9', onPress: () => router.push('/sellers') },
          { title: 'Nueva Venta', icon: 'receipt', color: '#f59e0b', onPress: () => router.push('/sales/new') },
          { title: 'Reportes', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }
        );
        break;
        
      case 'seller':
        actions.push(
          { title: 'Nueva Venta', icon: 'add-circle', color: '#10b981', onPress: () => router.push('/sales/new') },
          { title: 'Nuevo Cliente', icon: 'person-add', color: '#0ea5e9', onPress: () => router.push('/customers/new') },
          { title: 'Productos', icon: 'cube', color: '#f59e0b', onPress: () => router.push('/products') },
          { title: 'Mis Ventas', icon: 'receipt', color: '#8b5cf6', onPress: () => router.push('/sales') }
        );
        break;
        
      default:
        actions.push(
          { title: 'Nueva Venta', icon: 'add-circle', color: '#10b981', onPress: () => router.push('/sales/new') },
          { title: 'Productos', icon: 'cube', color: '#0ea5e9', onPress: () => router.push('/products') },
          { title: 'Clientes', icon: 'person-add', color: '#f59e0b', onPress: () => router.push('/customers') },
          { title: 'Reportes', icon: 'analytics', color: '#8b5cf6', onPress: () => router.push('/reports') }
        );
    }
    
    return actions;
  };

  const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    icon, 
    color = colors.primary[500], 
    trend,
    onPress 
  }) => (
    <TouchableOpacity 
      style={[styles.metricCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={styles.metricHeader}>
        <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {trend && (
          <View style={styles.trendContainer}>
            <Ionicons 
              name={trend.type === 'up' ? 'trending-up' : trend.type === 'down' ? 'trending-down' : 'remove'} 
              size={14} 
              color={trend.type === 'up' ? colors.success : trend.type === 'down' ? colors.error : colors.text.secondary} 
            />
            <Text style={[
              styles.trendText, 
              { color: trend.type === 'up' ? colors.success : trend.type === 'down' ? colors.error : colors.text.secondary }
            ]}>
              {trend.value}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </TouchableOpacity>
  );

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
      onPress={() => router.push(`/sales/${sale.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleLeft}>
          <Text style={styles.saleNumber}>{sale.sale_number}</Text>
          <Text style={styles.saleCustomer}>{sale.customer?.name || 'Cliente no especificado'}</Text>
        </View>
        <View style={styles.saleRight}>
          <Text style={styles.saleAmount}>{formatCurrency(sale.total)}</Text>
          <Text style={styles.saleDate}>{formatDate(sale.sale_date)}</Text>
        </View>
      </View>
      <View style={styles.saleStatus}>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: sale.status === 'completed' ? colors.success + '20' : 
                            sale.status === 'pending' ? colors.warning + '20' : 
                            colors.error + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: sale.status === 'completed' ? colors.success : 
                    sale.status === 'pending' ? colors.warning : 
                    colors.error }
          ]}>
            {sale.status === 'completed' ? 'Completada' : 
             sale.status === 'pending' ? 'Pendiente' : 'Cancelada'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user?.role || '') + '20' }]}>
                <Ionicons name="person" size={16} color={getRoleColor(user?.role || '')} />
                <Text style={[styles.userRole, { color: getRoleColor(user?.role || '') }]}>
                  {getRoleText(user?.role || '')}
                </Text>
              </View>
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

      {/* Métricas principales */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Resumen de Hoy</Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            title="Ventas Hoy"
            value={formatCurrency(dashboardData?.metrics?.today_sales || 0)}
            icon="today"
            color={colors.success}
            trend={{ value: '+12%', type: 'up' }}
          />
          <MetricCard
            title="Ventas Mes"
            value={formatCurrency(dashboardData?.metrics?.month_sales || 0)}
            icon="calendar"
            color={colors.primary[500]}
            trend={{ value: '+8%', type: 'up' }}
          />
          <MetricCard
            title="Stock Bajo"
            value={dashboardData?.metrics?.low_stock_products?.toString() || '0'}
            icon="warning"
            color={colors.warning}
            trend={{ value: '-2', type: 'down' }}
            onPress={() => router.push('/products?lowStock=true')}
          />
          <MetricCard
            title="Clientes"
            value={dashboardData?.metrics?.total_customers?.toString() || '0'}
            icon="people"
            color={colors.info}
            trend={{ value: '+5', type: 'up' }}
            onPress={() => router.push('/customers')}
          />
        </View>
      </View>

      {/* Gráfico de ventas mejorado */}
      {dashboardData?.sales_chart && dashboardData.sales_chart.length > 0 && (
        <View style={styles.chartContainer}>
          <Card padding="lg" style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.sectionTitle}>Ventas de los Últimos 7 Días</Text>              
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

      {/* Ventas recientes */}
      <View style={styles.recentSalesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ventas Recientes</Text>
          <TouchableOpacity onPress={() => router.push('/sales')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        
        <Card padding="sm">
          {dashboardData?.recent_sales && dashboardData.recent_sales.length > 0 ? (
            dashboardData.recent_sales.slice(0, 5).map((sale) => (
              <SaleItem key={sale.id} sale={sale} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateText}>No hay ventas recientes</Text>
              <TouchableOpacity 
                style={styles.emptyActionButton}
                onPress={() => router.push('/sales/new')}
              >
                <Text style={styles.emptyActionText}>Crear primera venta</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </View>

      {/* Productos con stock bajo */}
      {dashboardData?.low_stock_products && dashboardData.low_stock_products.length > 0 && (
        <View style={styles.lowStockContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Productos con Stock Bajo</Text>
            <TouchableOpacity onPress={() => router.push('/products?lowStock=true')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          <Card padding="sm">
            {dashboardData.low_stock_products.slice(0, 3).map((product) => (
              <TouchableOpacity 
                key={product.id}
                style={styles.lowStockItem}
                onPress={() => router.push(`/products/${product.id}`)}
              >
                <View style={styles.lowStockInfo}>
                  <Ionicons name="warning" size={20} color={colors.warning} />
                  <View style={styles.lowStockText}>
                    <Text style={styles.lowStockProductName}>{product.name}</Text>
                    <Text style={styles.lowStockProductCode}>#{product.code}</Text>
                  </View>
                </View>
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockCount}>{product.stock}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      )}

      <View style={styles.bottomSpacer} />
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
    height: 32,
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
    fontSize: typography.fontSize.xl,
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
    marginBottom: spacing.lg,
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
    padding: spacing.lg,
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
  lowStockContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  lowStockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lowStockText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  lowStockProductName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  lowStockProductCode: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  lowStockBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    minWidth: 32,
    alignItems: 'center',
  },
  lowStockCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
  },
  bottomSpacer: {
    height: spacing.lg,
  },
});