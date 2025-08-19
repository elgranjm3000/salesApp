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
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Card } from '../../components/ui/Card';
import { api } from '../../services/api';
import { colors, spacing, typography } from '../../theme/design';
import type { DashboardData } from '../../types';
import { formatCurrency } from '../../utils/helpers';

const screenWidth = Dimensions.get('window').width;

interface ReportCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface QuickReportProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export default function ReportsScreen(): JSX.Element {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.log('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = (): void => {
    loadReportsData();
  };

  const ReportCard: React.FC<ReportCardProps> = ({ 
    title, 
    value, 
    change, 
    changeType = 'neutral',
    icon, 
    color = colors.primary[500] 
  }) => {
    const getChangeColor = () => {
      switch (changeType) {
        case 'positive':
          return colors.success;
        case 'negative':
          return colors.error;
        default:
          return colors.text.secondary;
      }
    };

    const getChangeIcon = () => {
      switch (changeType) {
        case 'positive':
          return 'trending-up';
        case 'negative':
          return 'trending-down';
        default:
          return 'remove';
      }
    };

    return (
      <Card style={styles.reportCard}>
        <View style={styles.reportCardHeader}>
          <View style={[styles.reportCardIcon, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          {change && (
            <View style={styles.changeContainer}>
              <Ionicons name={getChangeIcon()} size={14} color={getChangeColor()} />
              <Text style={[styles.changeText, { color: getChangeColor() }]}>{change}</Text>
            </View>
          )}
        </View>
        <Text style={styles.reportCardValue}>{value}</Text>
        <Text style={styles.reportCardTitle}>{title}</Text>
      </Card>
    );
  };

  const QuickReport: React.FC<QuickReportProps> = ({ title, description, icon, onPress }) => (
    <TouchableOpacity style={styles.quickReport} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.quickReportIcon}>
        <Ionicons name={icon} size={24} color={colors.primary[500]} />
      </View>
      <View style={styles.quickReportContent}>
        <Text style={styles.quickReportTitle}>{title}</Text>
        <Text style={styles.quickReportDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  );

  // Datos para gráficos de ejemplo
  const salesByCategory = {
    labels: ['Electrónicos', 'Ropa', 'Hogar', 'Deportes'],
    datasets: [{
      data: [45, 25, 20, 10]
    }]
  };

  const monthlyRevenue = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [{
      data: [12000, 15000, 18000, 14000, 22000, 25000]
    }]
  };

  const topProductsData = [
    { name: 'Producto A', population: 35, color: colors.primary[500], legendFontColor: colors.text.primary, legendFontSize: 12 },
    { name: 'Producto B', population: 25, color: colors.success, legendFontColor: colors.text.primary, legendFontSize: 12 },
    { name: 'Producto C', population: 20, color: colors.warning, legendFontColor: colors.text.primary, legendFontSize: 12 },
    { name: 'Otros', population: 20, color: colors.gray[400], legendFontColor: colors.text.primary, legendFontSize: 12 },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reportes</Text>
          <Text style={styles.subtitle}>Análisis de ventas y rendimiento</Text>
        </View>
      </View>

      {/* Métricas principales */}
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Resumen del Mes</Text>
        <View style={styles.metricsGrid}>
          <ReportCard
            title="Ventas del Mes"
            value={formatCurrency(dashboardData?.metrics?.month_sales || 0)}
            change="+12.5%"
            changeType="positive"
            icon="trending-up"
            color={colors.success}
          />
          <ReportCard
            title="Ventas de Hoy"
            value={formatCurrency(dashboardData?.metrics?.today_sales || 0)}
            change="+5.2%"
            changeType="positive"
            icon="today"
            color={colors.primary[500]}
          />
          <ReportCard
            title="Productos Vendidos"
            value="248"
            change="-2.1%"
            changeType="negative"
            icon="cube"
            color={colors.info}
          />
          <ReportCard
            title="Clientes Nuevos"
            value={dashboardData?.metrics?.total_customers?.toString() || '0'}
            change="+8.3%"
            changeType="positive"
            icon="people"
            color={colors.warning}
          />
        </View>
      </View>

      {/* Gráfico de ingresos mensuales */}
      <View style={styles.chartContainer}>
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Ingresos Mensuales</Text>
          <BarChart
            data={monthlyRevenue}
            width={screenWidth - 80} // Reducido para evitar overflow
            height={220}
            chartConfig={{
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => colors.primary[500] + Math.round(opacity * 255).toString(16).padStart(2, '0'),
              labelColor: (opacity = 1) => colors.text.secondary + Math.round(opacity * 255).toString(16).padStart(2, '0'),
              style: { borderRadius: 16 },
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: colors.gray[200],
                strokeWidth: 1,
              },
              paddingRight: 20, // Padding adicional
            }}
            style={styles.chart}
          />
        </Card>
      </View>

      {/* Gráfico de productos más vendidos */}
      <View style={styles.chartContainer}>
        <Card padding="lg">
          <Text style={styles.sectionTitle}>Productos Más Vendidos</Text>
          <PieChart
            data={topProductsData}
            width={screenWidth - 80} // Reducido para evitar overflow
            height={220}
            chartConfig={{
              color: (opacity = 1) => colors.primary[500] + Math.round(opacity * 255).toString(16).padStart(2, '0'),
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            style={styles.chart}
          />
        </Card>
      </View>

      {/* Reportes rápidos */}
      <View style={styles.quickReportsContainer}>
        <Text style={styles.sectionTitle}>Reportes Detallados</Text>
        <Card padding="sm">
          <QuickReport
            title="Reporte de Ventas Diarias"
            description="Ver ventas detalladas por día"
            icon="calendar"
            onPress={() => router.push('/reports/daily-sales')}
          />
          <QuickReport
            title="Inventario Bajo Stock"
            description="Productos que necesitan reabastecimiento"
            icon="warning"
            onPress={() => router.push('/reports/low-stock')}
          />
          <QuickReport
            title="Top Clientes"
            description="Clientes con más compras"
            icon="star"
            onPress={() => router.push('/reports/top-customers')}
          />
          <QuickReport
            title="Análisis de Productos"
            description="Rendimiento detallado por producto"
            icon="analytics"
            onPress={() => router.push('/reports/product-analysis')}
          />
          <QuickReport
            title="Reporte Financiero"
            description="Ingresos, costos y ganancias"
            icon="wallet"
            onPress={() => router.push('/reports/financial')}
          />
        </Card>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
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
  reportCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.lg,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reportCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.xs,
  },
  reportCardValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  reportCardTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  chartContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  chart: {
    marginVertical: spacing.md,
    borderRadius: 16,
  },
  quickReportsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickReport: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  quickReportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickReportContent: {
    flex: 1,
  },
  quickReportTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  quickReportDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  bottomSpacer: {
    height: spacing.lg,
  },
});