import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    ListRenderItem,
    RefreshControl,
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
import type { Sale } from '../../types';
import { debounce, formatCurrency, formatDate } from '../../utils/helpers';

interface SaleItemProps {
  sale: Sale;
}

const getStatusColor = (status: Sale['status']) => {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'cancelled':
      return colors.error;
    default:
      return colors.text.secondary;
  }
};

const getStatusText = (status: Sale['status']) => {
  switch (status) {
    case 'completed':
      return 'Completada';
    case 'pending':
      return 'Pendiente';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
};

const getPaymentStatusColor = (status: Sale['payment_status']) => {
  switch (status) {
    case 'paid':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'partial':
      return colors.info;
    default:
      return colors.text.secondary;
  }
};

const getPaymentStatusText = (status: Sale['payment_status']) => {
  switch (status) {
    case 'paid':
      return 'Pagado';
    case 'pending':
      return 'Pendiente';
    case 'partial':
      return 'Parcial';
    default:
      return status;
  }
};

export default function SalesScreen(): JSX.Element {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [searchText, sales]);

  const loadSales = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.getSales();
      setSales(response.data);
    } catch (error) {
      console.log('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = (): void => {
    if (!searchText) {
      setFilteredSales(sales);
      return;
    }

    const filtered = sales.filter(sale =>
      sale.sale_number.toLowerCase().includes(searchText.toLowerCase()) ||
      sale.customer?.name.toLowerCase().includes(searchText.toLowerCase())
    );
    
    setFilteredSales(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

  const deleteSale = async (saleId: number): Promise<void> => {
    Alert.alert(
      'Eliminar Venta',
      '¿Estás seguro de que quieres eliminar esta venta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // await api.deleteSale(saleId); // Implementar si es necesario
              loadSales();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la venta');
            }
          },
        },
      ]
    );
  };

  const SaleItem: React.FC<SaleItemProps> = ({ sale }) => {
    return (
      <Card style={styles.saleCard}>
        <TouchableOpacity
          style={styles.saleContent}
          onPress={() => router.push(`/sales/${sale.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.saleHeader}>
            <View style={styles.saleNumberContainer}>
              <Ionicons name="receipt" size={20} color={colors.primary[500]} />
              <Text style={styles.saleNumber}>{sale.sale_number}</Text>
            </View>
            <Text style={styles.saleDate}>{formatDate(sale.sale_date)}</Text>
          </View>

          <View style={styles.saleBody}>
            <View style={styles.customerInfo}>
              <Ionicons name="person" size={16} color={colors.text.secondary} />
              <Text style={styles.customerName}>{sale.customer?.name || 'Cliente no especificado'}</Text>
            </View>

            <View style={styles.saleDetails}>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sale.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
                    {getStatusText(sale.status)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(sale.payment_status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getPaymentStatusColor(sale.payment_status) }]}>
                    {getPaymentStatusText(sale.payment_status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.saleTotal}>{formatCurrency(sale.total)}</Text>
            </View>
          </View>

          <View style={styles.saleFooter}>
            <View style={styles.paymentMethod}>
              <Ionicons 
                name={sale.payment_method === 'cash' ? 'cash' : sale.payment_method === 'card' ? 'card' : 'wallet'} 
                size={14} 
                color={colors.text.secondary} 
              />
              <Text style={styles.paymentMethodText}>
                {sale.payment_method === 'cash' ? 'Efectivo' : 
                 sale.payment_method === 'card' ? 'Tarjeta' : 
                 sale.payment_method === 'transfer' ? 'Transferencia' : 'Crédito'}
              </Text>
            </View>
            
            <View style={styles.saleActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/sales/${sale.id}?mode=edit`)}
              >
                <Ionicons name="create" size={16} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/sales/${sale.id}/print`)}
              >
                <Ionicons name="print" size={16} color={colors.info} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderItem: ListRenderItem<Sale> = ({ item }) => (
    <SaleItem sale={item} />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No hay ventas</Text>
      <Button
        title="Nueva Venta"
        variant="outline"
        onPress={() => router.push('/sales/new')}
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Ventas</Text>
            <Text style={styles.subtitle}>{filteredSales.length} ventas</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/sales/new')}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar ventas..."
          onChangeText={debouncedSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      {/* Lista de ventas */}
      <FlatList
        data={filteredSales}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSales} />
        }
        contentContainerStyle={styles.salesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
      />
    </View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  salesList: {
    padding: spacing.lg,
  },
  saleCard: {
    marginBottom: spacing.md,
  },
  saleContent: {
    padding: spacing.md,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  saleNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  saleDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  saleBody: {
    marginBottom: spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customerName: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  saleTotal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  saleActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});