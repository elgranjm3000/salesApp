import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { formatCurrency } from '../../utils/helpers';

export default function QuoteDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await api.getQuote(Number(id));
        setQuote(response);
      } catch (error) {
        Alert.alert('Error', 'No se pudo cargar el presupuesto');
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [id]);

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
    <ScrollView style={styles.container}>
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
            Cliente: {quote.customer?.name || 'Sin cliente'}
          </Text>
          <Text style={styles.subtitle}>
            Empresa: {quote.company?.name || 'Sin empresa'}
          </Text>
        </View>
      </View>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Productos</Text>
        {!quote.items || quote.items.length === 0 ? (
          <Text style={styles.emptyItemsText}>No hay productos agregados</Text>
        ) : (
          <View style={styles.itemsList}>
            {quote.items.map((item: any) => (
              <View key={item.id} style={styles.quoteItem}>
                <Text style={styles.itemName}>{item.product?.name || item.name}</Text>
                <Text style={styles.itemDetail}>Cantidad: {item.quantity}</Text>
                <Text style={styles.itemDetail}>Precio: {formatCurrency(item.unit_price)}</Text>
                {item.discount > 0 && (
                  <Text style={styles.itemDetail}>Descuento: {item.discount}%</Text>
                )}
                <Text style={styles.itemTotal}>
                  Total: {formatCurrency(item.total_price)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Detalles</Text>
        <Text>Válido hasta: {quote.valid_until}</Text>
        <Text>Descuento general: {quote.discount}%</Text>
        <Text>Términos: {quote.terms_conditions}</Text>
        <Text>Notas: {quote.notes}</Text>
      </Card>

      <Card style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Resumen</Text>
        <Text>Subtotal: {formatCurrency(quote.subtotal)}</Text>
        <Text>Descuento: {formatCurrency(quote.discount_amount ?? 0)}</Text>
        <Text>IVA: {formatCurrency(quote.tax)}</Text>
        <Text style={styles.summaryTotalLabel}>Total: {formatCurrency(quote.total)}</Text>
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
  },
  formCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  itemsList: {
    gap: spacing.md,
  },
  quoteItem: {
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  itemTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  summaryCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  summaryTotalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
    marginTop: spacing.sm,
  },
  emptyItemsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});