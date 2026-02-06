import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../theme/design';
import { formatCurrency, formatDate } from '../utils/helpers';

interface Quote {
  id: number;
  quote_number: string;
  customer_id: number;
  customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    document_number?: string;
  };
  user_id: number;
  user?: {
    id: number;
    name: string;
  };
  company_id?: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  valid_until: string;
  quote_date: string;
  items?: QuoteItem[];
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  id: number;
  quote_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
}

interface QuoteItemCardProps {
  quote: Quote;
  bcvRate: number | null;
  onCardPress?: () => void;
  isModal?: boolean; // Para usar en modal (sin acciones adicionales)
}

const getStatusColor = (status: Quote['status']) => {
  switch (status) {
    case 'approved':
      return colors.success;
    case 'sent':
      return colors.info;
    case 'draft':
      return colors.warning;
    case 'rejected':
      return colors.error;
    case 'expired':
      return colors.gray[500];
    default:
      return colors.text.secondary;
  }
};

const getStatusText = (status: Quote['status']) => {
  switch (status) {
    case 'approved':
      return 'Facturado';
    case 'sent':
      return 'Enviado';
    case 'draft':
      return 'Borrador';
    case 'rejected':
      return 'No facturado';
    case 'expired':
      return 'Expirado';
    default:
      return status;
  }
};

const getStatusIcon = (status: Quote['status']) => {
  switch (status) {
    case 'approved':
      return 'checkmark-circle';
    case 'sent':
      return 'paper-plane';
    case 'draft':
      return 'create-outline';
    case 'rejected':
      return 'close-circle';
    case 'expired':
      return 'time-outline';
    default:
      return 'document-text-outline';
  }
};

const formatWithBCV = (amount: number, bcvRate: number | null) => {
  const usdFormatted = formatCurrency(amount);
  if (bcvRate) {
    const bcvAmount = `Bs. ${(amount * bcvRate).toLocaleString('es-VE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
    return `${usdFormatted}\n${bcvAmount}`;
  }
  return usdFormatted;
};

const formatItemCount = (count: number): string => {
  return `${count} ${count === 1 ? 'artículo' : 'artículos'}`;
};

export const QuoteItemCard: React.FC<QuoteItemCardProps> = ({
  quote,
  bcvRate,
  onCardPress,
  isModal = false
}) => {
  const isExpired = new Date(quote.valid_until) < new Date();
  const expiringSoon = !isExpired && (new Date(quote.valid_until).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000;

  const handlePress = () => {
    if (onCardPress) {
      onCardPress();
    } else {
      router.push(`/quotes/${quote.id}`);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={[styles.card, isExpired && styles.expiredCard]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.numberContainer}>
            <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
            <Text style={styles.quoteDate}>{formatDate(quote.quote_date)}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quote.status) + '20' }]}>
              <Ionicons 
                name={getStatusIcon(quote.status)} 
                size={14} 
                color={getStatusColor(quote.status)} 
                style={{ marginRight: spacing.xs }} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(quote.status) }]}>
                {getStatusText(quote.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.customerInfo}>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{quote.customer?.name}</Text>
              <Text style={styles.customerEmail}>
                {quote.customer?.document_number || 'sin documento'}
              </Text>
              <Text style={styles.customerEmail}>
                {quote.customer?.phone || 'S/N'}
              </Text>
              {quote.user && (
                <Text style={styles.sellerText}>Por: {quote.user.name}</Text>
              )}
            </View>
          </View>

          <View style={styles.amountContainer}>
            <View style={styles.amountDisplay}>
              <Text style={styles.quoteTotal}>
                {formatWithBCV(quote.total, bcvRate).split('\n')[0]}
              </Text>
              {bcvRate && formatWithBCV(quote.total, bcvRate).split('\n')[1] && (
                <Text style={styles.quoteTotalBCV}>
                  {formatWithBCV(quote.total, bcvRate).split('\n')[1]}
                </Text>
              )}
              <Text style={styles.itemsCount}>
                {formatItemCount(quote.items?.length || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.validUntilContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.validUntilText}>
              Válido hasta: {formatDate(quote.valid_until)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  expiredCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    backgroundColor: colors.error + '05',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  numberContainer: {
    flex: 1,
  },
  quoteNumber: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  quoteDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  expiringSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  expiringSoonText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.bold,
  },
  body: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  customerEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  sellerText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountDisplay: {
    alignItems: 'flex-end',
  },
  quoteTotal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
    textAlign: 'right',
  },
  quoteTotalBCV: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  itemsCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  validUntilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  validUntilText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
});

export default QuoteItemCard;