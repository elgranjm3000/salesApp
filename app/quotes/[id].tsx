import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { formatCurrency, formatDateOnly } from '../../utils/helpers';

interface ExchangeRateResponse {
  USD: {
    BCV: number;
    date: string;
  };
}

export default function QuoteDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string>('');

  // Función para obtener la tasa BCV
  const fetchBCVRate = async () => {
    try {
      // API gratuita para obtener tasa del BCV
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      // Si no tiene VES (Bolívar Venezolano), usar API alternativa
      if (!data.rates.VES) {
        // API alternativa específica para Venezuela
        const bcvResponse = await fetch('https://s3.amazonaws.com/dolartoday/data.json');
        const bcvData = await bcvResponse.json();
        setBcvRate(bcvData.USD.bcv || bcvData.USD.promedio_real);
        setRateDate(new Date().toLocaleDateString());
      } else {
        setBcvRate(data.rates.VES);
        setRateDate(data.date);
      }
    } catch (error) {
      console.log('Error al obtener tasa BCV:', error);
      // Tasa de respaldo (actualizar manualmente si es necesario)
      setBcvRate(36.0); // Tasa aproximada como respaldo
      setRateDate('Tasa aproximada');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchQuote(),
        fetchBCVRate()
      ]);
    };
    fetchData();
  }, [id]);

  const fetchQuote = async () => {
    try {
      const response = await api.getQuote(Number(id));
      setQuote(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchQuote(),
      fetchBCVRate()
    ]);
    setRefreshing(false);
  };

  const formatWithBCV = (amount: number) => {
    const usdFormatted = formatCurrency(amount);
    if (bcvRate) {
      const bcvAmount = (amount * bcvRate).toLocaleString('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2
      });
      return `${usdFormatted} / ${bcvAmount}`;
    }
    return usdFormatted;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando presupuesto..." />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No se encontró el presupuesto.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Presupuesto #{quote.id}</Text>
          <Text style={styles.subtitle}>
            {quote.customer?.name || 'Sin cliente asignado'}
          </Text>
          <Text style={styles.subtitle}>
            {quote.company?.name || 'Sin empresa asignada'}
          </Text>
        </View>
      </View>

      {/* Información de Tasa de Cambio */}
      {bcvRate && (
        <Card style={styles.exchangeCard}>
          <View style={styles.exchangeHeader}>
            <Ionicons name="swap-horizontal" size={20} color={colors.warning} />
            <Text style={styles.exchangeTitle}>Tasa de Cambio</Text>
          </View>
          <Text style={styles.exchangeRate}>
            1 USD = {bcvRate.toFixed(2)} Bs.
          </Text>
          <Text style={styles.exchangeDate}>
            Actualizada: {rateDate}
          </Text>
        </Card>
      )}

      {/* Información General */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Información General</Text>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Válido hasta:</Text>
            <Text style={styles.infoValue}>{formatDateOnly(quote.valid_until) || 'No especificado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Descuento general:</Text>
            <Text style={styles.infoValue}>{quote.discount || 0}%</Text>
          </View>
        </View>
        
        {quote.terms_conditions && (
          <View style={styles.textSection}>
            <Text style={styles.infoLabel}>Términos y condiciones:</Text>
            <Text style={styles.infoDescription}>{quote.terms_conditions}</Text>
          </View>
        )}
        
        {quote.notes && (
          <View style={styles.textSection}>
            <Text style={styles.infoLabel}>Notas adicionales:</Text>
            <Text style={styles.infoDescription}>{quote.notes}</Text>
          </View>
        )}
      </Card>

      {/* Lista de Productos */}
      <Card style={styles.productsCard}>
        <Text style={styles.sectionTitle}>
          Productos ({quote.items?.length || 0})
        </Text>
        
        {!quote.items || quote.items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.gray[400]} />
            <Text style={styles.emptyItemsText}>No hay productos agregados</Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {quote.items.map((item: any, index: number) => (
              <View key={item.id || index} style={styles.quoteItem}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>
                    {item.product?.name || item.name || 'Producto sin nombre'}
                  </Text>
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>#{index + 1}</Text>
                  </View>
                </View>
                
                <View style={styles.itemDetails}>
                  <View style={styles.itemDetailRow}>
                    <Text style={styles.itemDetailLabel}>Cantidad:</Text>
                    <Text style={styles.itemDetailValue}>{item.quantity || 0}</Text>
                  </View>
                  
                  <View style={styles.itemDetailRow}>
                    <Text style={styles.itemDetailLabel}>Precio unitario:</Text>
                    <Text style={styles.itemDetailValue}>
                      {formatWithBCV(item.unit_price || 0)}
                    </Text>
                  </View>
                  
                  {item.discount_percentage > 0 && (
                    <View style={styles.itemDetailRow}>
                      <Text style={styles.itemDetailLabel}>Descuento:</Text>
                      <Text style={[styles.itemDetailValue, styles.discountText]}>
                        -{item.discount_percentage}%
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.itemTotalRow}>
                  <Text style={styles.itemTotalLabel}>Total:</Text>
                  <Text style={styles.itemTotalValue}>
                    {formatWithBCV(item.total || 0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Resumen Financiero */}
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Resumen Financiero</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>
            {formatWithBCV(quote.subtotal || 0)}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Descuento:</Text>
          <Text style={[styles.summaryValue, styles.discountText]}>
            -{formatWithBCV(quote.discount_amount || 0)}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>IVA:</Text>
          <Text style={styles.summaryValue}>
            {formatWithBCV(quote.tax || 0)}
          </Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL:</Text>
          <View>
            <Text style={styles.totalValueUSD}>
              {formatCurrency(quote.total || 0)}
            </Text>
            {bcvRate && (
              <Text style={styles.totalValueBCV}>
                {((quote.total || 0) * bcvRate).toLocaleString('es-VE', {
                  style: 'currency',
                  currency: 'VES',
                  minimumFractionDigits: 2
                })}
              </Text>
            )}
          </View>
        </View>
      </Card>
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
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  
  // Exchange Rate Card
  exchangeCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  exchangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  exchangeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  exchangeRate: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  exchangeDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Info Card
  infoCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  infoItem: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  textSection: {
    marginTop: spacing.md,
  },
  infoDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },

  // Products Card
  productsCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyItemsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  itemsList: {
    gap: spacing.md,
  },
  quoteItem: {
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  itemName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  itemBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  itemBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  itemDetails: {
    marginBottom: spacing.md,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemDetailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  itemDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  itemTotalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  itemTotalValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },

  // Summary Card
  summaryCard: {
    margin: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  divider: {
    height: 1,
    backgroundColor: colors.primary[200],
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  totalValueUSD: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
    textAlign: 'right',
  },
  totalValueBCV: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  discountText: {
    color: colors.error,
  },
});