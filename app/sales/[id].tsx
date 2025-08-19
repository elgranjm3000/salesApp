import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    ListRenderItem,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { Sale, SaleItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/helpers';

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

const getPaymentMethodText = (method: Sale['payment_method']) => {
  switch (method) {
    case 'cash':
      return 'Efectivo';
    case 'card':
      return 'Tarjeta';
    case 'transfer':
      return 'Transferencia';
    case 'credit':
      return 'Crédito';
    default:
      return method;
  }
};

export default function SaleDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadSale();
  }, [id]);

  const loadSale = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const saleData = await api.getSale(Number(id));
      setSale(saleData);
    } catch (error) {
      console.error('Error loading sale:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la venta');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = (newStatus: Sale['status']) => {
    if (!sale) return;

    const statusText = getStatusText(newStatus);
    
    Alert.alert(
      'Cambiar Estado',
      `¿Estás seguro de que quieres cambiar el estado a "${statusText}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setUpdating(true);
              const updatedSale = await api.updateSale(sale.id, { status: newStatus });
              setSale(updatedSale);
              Alert.alert('Éxito', `Estado cambiado a ${statusText}`);
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdatePaymentStatus = (newPaymentStatus: Sale['payment_status']) => {
    if (!sale) return;

    const paymentStatusText = getPaymentStatusText(newPaymentStatus);
    
    Alert.alert(
      'Cambiar Estado de Pago',
      `¿Estás seguro de que quieres cambiar el estado de pago a "${paymentStatusText}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setUpdating(true);
              const updatedSale = await api.updateSale(sale.id, { payment_status: newPaymentStatus });
              setSale(updatedSale);
              Alert.alert('Éxito', `Estado de pago cambiado a ${paymentStatusText}`);
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado de pago');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handlePrint = () => {
    if (!sale) return;
    router.push(`/sales/${sale.id}/print`);
  };

  const handleShare = async () => {
    if (!sale) return;

    try {
      const saleText = generateSaleText(sale);
      await Share.share({
        message: saleText,
        title: `Venta ${sale.sale_number}`,
      });
    } catch (error) {
      console.error('Error sharing sale:', error);
    }
  };

  const generateSaleText = (sale: Sale): string => {
    let text = `📋 VENTA ${sale.sale_number}\n\n`;
    text += `📅 Fecha: ${formatDate(sale.sale_date)}\n`;
    text += `👤 Cliente: ${sale.customer?.name || 'No especificado'}\n`;
    text += `💰 Total: ${formatCurrency(sale.total)}\n`;
    text += `📝 Estado: ${getStatusText(sale.status)}\n`;
    text += `💳 Pago: ${getPaymentStatusText(sale.payment_status)}\n`;
    text += `💵 Método: ${getPaymentMethodText(sale.payment_method)}\n\n`;

    if (sale.items && sale.items.length > 0) {
      text += `📦 PRODUCTOS:\n`;
      sale.items.forEach((item) => {
        text += `• ${item.product?.name || 'Producto'} x${item.quantity} - ${formatCurrency(item.total_price)}\n`;
      });
      text += `\n💵 Subtotal: ${formatCurrency(sale.subtotal)}\n`;
      text += `🏷️ Descuento: ${formatCurrency(sale.discount)}\n`;
      text += `📊 IGV: ${formatCurrency(sale.tax)}\n`;
      text += `💰 TOTAL: ${formatCurrency(sale.total)}\n`;
    }

    if (sale.notes) {
      text += `\n📝 Notas: ${sale.notes}`;
    }

    return text;
  };

  const renderSaleItem: ListRenderItem<SaleItem> = ({ item, index }) => (
    <View style={[styles.saleItem, index === 0 && styles.firstSaleItem]}>
      <View style={styles.saleItemInfo}>
        <Text style={styles.saleItemName}>
          {item.product?.name || 'Producto no disponible'}
        </Text>
        <Text style={styles.saleItemCode}>
          #{item.product?.code || 'N/A'}
        </Text>
        <Text style={styles.saleItemUnitPrice}>
          {formatCurrency(item.unit_price)} c/u
        </Text>
      </View>
      
      <View style={styles.saleItemDetails}>
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityLabel}>Cantidad:</Text>
          <Text style={styles.quantityValue}>{item.quantity}</Text>
        </View>
        
        {item.discount > 0 && (
          <View style={styles.discountContainer}>
            <Text style={styles.discountLabel}>Descuento:</Text>
            <Text style={styles.discountValue}>-{formatCurrency(item.discount)}</Text>
          </View>
        )}
        
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>{formatCurrency(item.total_price)}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando venta..." />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>No se pudo cargar la venta</Text>
        <Button
          title="Volver"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButtonHeader}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Venta {sale.sale_number}</Text>
            <Text style={styles.headerSubtitle}>
              {formatDate(sale.sale_date)}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
          >
            <Ionicons name="share" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handlePrint}
          >
            <Ionicons name="print" size={20} color={colors.info} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSale} />
        }
      >
        {/* Estados y información general */}
        <Card style={styles.statusCard}>
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Estado</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sale.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
                  {getStatusText(sale.status)}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Pago</Text>
              <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(sale.payment_status) + '20' }]}>
                <Text style={[styles.statusText, { color: getPaymentStatusColor(sale.payment_status) }]}>
                  {getPaymentStatusText(sale.payment_status)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Información del cliente */}
        <Card>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <Ionicons name="person" size={24} color={colors.primary[500]} />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>
                {sale.customer?.name || 'Cliente no especificado'}
              </Text>
              {sale.customer?.email && (
                <Text style={styles.customerContact}>{sale.customer.email}</Text>
              )}
              {sale.customer?.phone && (
                <Text style={styles.customerContact}>{sale.customer.phone}</Text>
              )}
              {sale.customer?.document_number && (
                <Text style={styles.customerContact}>
                  {sale.customer.document_type}: {sale.customer.document_number}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Información de pago */}
        <Card>
          <Text style={styles.sectionTitle}>Información de Pago</Text>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentRow}>
              <Ionicons 
                name={sale.payment_method === 'cash' ? 'cash' : 
                      sale.payment_method === 'card' ? 'card' : 
                      sale.payment_method === 'transfer' ? 'wallet' : 'time'} 
                size={20} 
                color={colors.text.secondary} 
              />
              <Text style={styles.paymentLabel}>Método de pago:</Text>
              <Text style={styles.paymentValue}>
                {getPaymentMethodText(sale.payment_method)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Productos */}
        <Card>
          <Text style={styles.sectionTitle}>
            Productos ({sale.items?.length || 0})
          </Text>
          
          {sale.items && sale.items.length > 0 ? (
            <FlatList
              data={sale.items}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSaleItem}
              scrollEnabled={false}
              nestedScrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyItems}>
              <Ionicons name="cube" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyItemsText}>No hay productos en esta venta</Text>
            </View>
          )}
        </Card>

        {/* Resumen de totales */}
        <Card>
          <Text style={styles.sectionTitle}>Resumen</Text>
          
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(sale.subtotal)}</Text>
            </View>
            
            {sale.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Descuento:</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  -{formatCurrency(sale.discount)}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>IGV (18%):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(sale.tax)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>TOTAL:</Text>
              <Text style={styles.totalValueFinal}>{formatCurrency(sale.total)}</Text>
            </View>
          </View>
        </Card>

        {/* Notas */}
        {sale.notes && (
          <Card>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notesText}>{sale.notes}</Text>
          </Card>
        )}

        {/* Información adicional */}
        <Card>
          <Text style={styles.sectionTitle}>Información Adicional</Text>
          
          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vendedor:</Text>
              <Text style={styles.infoValue}>{sale.user?.name || 'No especificado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de creación:</Text>
              <Text style={styles.infoValue}>{formatDate(sale.created_at)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Última actualización:</Text>
              <Text style={styles.infoValue}>{formatDate(sale.updated_at)}</Text>
            </View>
          </View>
        </Card>

        {/* Acciones */}
        <Card>
          <Text style={styles.sectionTitle}>Acciones</Text>
          
          <View style={styles.actionsContainer}>
            {/* Cambiar estado */}
            <View style={styles.actionGroup}>
              <Text style={styles.actionGroupTitle}>Estado de la venta</Text>
              <View style={styles.actionButtons}>
                {sale.status !== 'pending' && (
                  <Button
                    title="Marcar como Pendiente"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdateStatus('pending')}
                    disabled={updating}
                    style={styles.actionButton}
                  />
                )}
                {sale.status !== 'completed' && (
                  <Button
                    title="Marcar como Completada"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdateStatus('completed')}
                    disabled={updating}
                    style={styles.actionButton}
                  />
                )}
                {sale.status !== 'cancelled' && (
                  <Button
                    title="Cancelar Venta"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdateStatus('cancelled')}
                    disabled={updating}
                    style={[styles.actionButton, { borderColor: colors.error }]}
                  />
                )}
              </View>
            </View>

            {/* Cambiar estado de pago */}
            <View style={styles.actionGroup}>
              <Text style={styles.actionGroupTitle}>Estado del pago</Text>
              <View style={styles.actionButtons}>
                {sale.payment_status !== 'pending' && (
                  <Button
                    title="Marcar como Pendiente"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdatePaymentStatus('pending')}
                    disabled={updating}
                    style={styles.actionButton}
                  />
                )}
                {sale.payment_status !== 'partial' && (
                  <Button
                    title="Marcar como Parcial"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdatePaymentStatus('partial')}
                    disabled={updating}
                    style={styles.actionButton}
                  />
                )}
                {sale.payment_status !== 'paid' && (
                  <Button
                    title="Marcar como Pagado"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdatePaymentStatus('paid')}
                    disabled={updating}
                    style={styles.actionButton}
                  />
                )}
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botones flotantes */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={handleShare}
        >
          <Ionicons name="share" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.floatingButton, styles.printButton]}
          onPress={handlePrint}
        >
          <Ionicons name="print" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginTop: spacing.lg,
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
  backButtonHeader: {
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statusCard: {
    marginBottom: spacing.lg,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  customerContact: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  paymentInfo: {
    marginBottom: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginLeft: spacing.md,
    flex: 1,
  },
  paymentValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  saleItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  firstSaleItem: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  saleItemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  saleItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  saleItemCode: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  saleItemUnitPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  saleItemDetails: {
    alignItems: 'flex-end',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quantityLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  quantityValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  discountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  discountValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.error,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  totalValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyItemsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  summaryContainer: {
    paddingTop: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.gray[200],
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  totalValueFinal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  notesText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
  additionalInfo: {
    paddingTop: spacing.sm,
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
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  actionsContainer: {
    paddingTop: spacing.sm,
  },
  actionGroup: {
    marginBottom: spacing.lg,
  },
  actionGroupTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'column',
    gap: spacing.md,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  printButton: {
    backgroundColor: colors.info,
  },
  bottomSpacer: {
    height: 100, // Espacio para los botones flotantes
  },
});