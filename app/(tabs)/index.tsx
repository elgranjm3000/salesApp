import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors } from '../../theme/design';
import type { DashboardData, Sale } from '../../type';
import { formatCurrency, formatDate } from '../../utils/helpers';

const screenWidth = Dimensions.get('window').width;

interface MetricCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress?: () => void;
}

interface QuickActionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
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

  const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    icon, 
    color = colors.primary[500], 
    onPress 
  }) => (
    <TouchableOpacity 
      style={[styles.metricCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={styles.metricHeader}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const QuickAction: React.FC<QuickActionProps> = ({ 
    title, 
    icon, 
    onPress, 
    color = colors.primary[500] 
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
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
        <View>
          <Text style={styles.saleNumber}>{sale.sale_number}</Text>
          <Text style={styles.saleCustomer}>{sale.customer?.name}</Text>
        </View>
        <View style={styles.saleRight}>
          <Text style={styles.saleAmount}>{formatCurrency(sale.total)}</Text>
          <Text style={styles.saleDate}>{formatDate(sale.sale_date)}</Text>
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
          >
            <Ionicons name="person-circle" size={40} color={colors.primary[500]} />
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
          />
          <MetricCard
            title="Ventas Mes"
            value={formatCurrency(dashboardData?.metrics?.month_sales || 0)}
            icon="calendar"
            color={colors.primary[500]}
          />
          <MetricCard
            title="Stock Bajo"
            value={dashboardData?.metrics?.low_stock_products?.toString() || '0'}
            icon="warning"
            color={colors.warning}
            onPress={() => router.push('/products?lowStock=true')}
          />
          <MetricCard
            title="Clientes"
            value={dashboardData?.metrics?.total_customers?.toString() || '0'}
            icon="people"
            color={colors.info}
            onPress={() => router.push('/customers')}
          />
        </View>
      </View>

      {/* Gráfico de ventas */}
      {dashboardData?.sales_chart && dashboardData.sales_chart.length > 0 && (
        <View style={styles.chartContainer}>
          <Card padding="lg">
            <Text style={styles.sectionTitle}>Ventas de los Últimos 7 Días</Text>
            <LineChart
              data={{
                labels: dashboardData.sales_chart.map(item => item.day),
                datasets: [{
                  data: dashboardData.sales_chart.map(item => item.total),
                }],
              }}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: colors.primary[500],
                backgroundGradientFrom: colors.primary[500],
                backgroundGradientTo: colors.primary[600],
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              bezier
              style={styles.chart}
            />
          </Card>
        </View>
      )}

      {/* Acciones rápidas */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActionsGrid}>
          <QuickAction
            title="Nueva Venta"
            icon="add-circle"
            color={colors.success}
            onPress={() => router.push('/sales/new')}
          />
          <QuickAction
            title="Producto"
            icon="cube"
            color={colors.primary[500]}
            onPress={() => router.push('/products/new')}
          />
          <QuickAction
            title="Cliente"
            icon="person-add"
            color={colors.warning}
            onPress={() => router.push('/customers/new')}
          />
          <QuickAction
            title="Reportes"
            icon="analytics"
            color={colors.info}
            onPress={() => router.push('/reports')}
          />
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
            </View>
          )}
        </Card>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}