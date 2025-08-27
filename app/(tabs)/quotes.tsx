// app/(tabs)/quotes.tsx - Pantalla de presupuestos
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { debounce, formatCurrency } from '../../utils/helpers';

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
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
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

interface QuoteItemProps {
  quote: Quote;
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

const getStatusIcon = (status: Quote['status']) => {
  switch (status) {
    case 'approved':
      return 'checkmark-circle';
    case 'sent':
      return 'paper-plane';
    case 'draft':
      return 'create';
    case 'rejected':
      return 'close-circle';
    case 'expired':
      return 'time';
    default:
      return 'document-text';
  }
};

export default function QuotesScreen(): JSX.Element {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [searchText, quotes]);

  const loadQuotes = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.getQuotes();
      setQuotes(response.data);
    } catch (error) {
      console.log('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = (): void => {
    if (!searchText) {
      setFilteredQuotes(quotes);
      return;
    }

    const filtered = quotes.filter(quote =>
      quote.quote_number.toLowerCase().includes(searchText.toLowerCase()) ||
      quote.customer?.name.toLowerCase().includes(searchText.toLowerCase())
    );
    
    setFilteredQuotes(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

  const deleteQuote = async (quoteId: number): Promise<void> => {
    Alert.alert(
      'Eliminar Presupuesto',
      '¿Estás seguro de que quieres eliminar este presupuesto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteQuote(quoteId);
              loadQuotes();
              Alert.alert('Éxito', 'Presupuesto eliminado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el presupuesto');
            }
          },
        },
      ]
    );
  };

  const duplicateQuote = async (quoteId: number): Promise<void> => {
    try {
      await api.duplicateQuote(quoteId);
      loadQuotes();
      Alert.alert('Éxito', 'Presupuesto duplicado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo duplicar el presupuesto');
    }
  };

  const sendQuote = async (quoteId: number): Promise<void> => {
    try {
      await api.sendQuote(quoteId);
      loadQuotes();
      Alert.alert('Éxito', 'Presupuesto enviado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el presupuesto');
    }
  };

  const QuoteItem: React.FC<QuoteItemProps> = ({ quote }) => {
    const isExpired = 1; //new Date(quote.valid_until) < new Date();
    const daysUntilExpiry = 1; 
    //Math.ceil(
    //  (new Date(quote.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    //);

    return (
      <Card style={styles.quoteCard}>
        <TouchableOpacity
          style={styles.quoteContent}
          onPress={() => router.push(`/quotes/${quote.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.quoteHeader}>
            <View style={styles.quoteNumberContainer}>
              <Ionicons 
                name={getStatusIcon(quote.status)} 
                size={20} 
                color={getStatusColor(quote.status)} 
              />
              <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
            </View>
            <View style={styles.quoteDateContainer}>
              <Text style={styles.quoteDate}>{/*{formatDate(quote.quote_date)} */}</Text>
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Ionicons name="warning" size={12} color={colors.error} />
                  <Text style={styles.expiredText}>Expirado</Text>
                </View>
              )}
              {!isExpired && daysUntilExpiry <= 3 && daysUntilExpiry > 0 && (
                <View style={styles.expiringSoonBadge}>
                  <Ionicons name="time" size={12} color={colors.warning} />
                  <Text style={styles.expiringSoonText}>
                    {daysUntilExpiry} día{daysUntilExpiry !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.quoteBody}>
            <View style={styles.customerInfo}>
              <Ionicons name="person" size={16} color={colors.text.secondary} />
              <Text style={styles.customerName}>
                {quote?.name || 'Cliente no especificado'}
              </Text>
            </View>

            <View style={styles.quoteDetails}>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: getStatusColor(quote.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText, 
                    { color: getStatusColor(quote.status) }
                  ]}>
                    {getStatusText(quote.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.quoteTotal}>{formatCurrency(quote.total)}</Text>
            </View>
          </View>

          <View style={styles.quoteFooter}>
            <View style={styles.validUntil}>
              <Ionicons name="calendar" size={14} color={colors.text.secondary} />
              {/* <Text style={styles.validUntilText}>
                Válido hasta {formatDate(quote.valid_until)}
              </Text> */}
            </View>
            
            <View style={styles.quoteActions}>
              {quote.status === 'draft' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => sendQuote(quote.id)}
                >
                  <Ionicons name="paper-plane" size={16} color={colors.info} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => duplicateQuote(quote.id)}
              >
                <Ionicons name="copy" size={16} color={colors.warning} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/quotes/${quote.id}?mode=edit`)}
              >
                <Ionicons name="create" size={16} color={colors.primary[500]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => deleteQuote(quote.id)}
              >
                <Ionicons name="trash" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderItem: ListRenderItem<Quote> = ({ item }) => (
    <QuoteItem quote={item} />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No hay presupuestos</Text>
      <Button
        title="Nuevo Presupuesto"
        variant="outline"
        onPress={() => router.push('/quotes/new')}
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
            <Text style={styles.title}>Presupuestos</Text>
            <Text style={styles.subtitle}>{filteredQuotes.length} presupuestos</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/quotes/new')}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros rápidos */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContainer}
        >
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Borradores</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Enviados</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Text style={styles.filterChipText}>Aprobados</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.filterChip, styles.filterChipWarning]}>
            <Text style={[styles.filterChipText, { color: colors.warning }]}>Por Expirar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar presupuestos..."
          onChangeText={debouncedSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      {/* Lista de presupuestos */}
      <FlatList
        data={filteredQuotes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadQuotes} />
        }
        contentContainerStyle={styles.quotesList}
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
  filtersContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
  },
  filtersScrollContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[300],
  },
  filterChipWarning: {
    backgroundColor: colors.warning + '10',
    borderColor: colors.warning + '30',
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  quotesList: {
    padding: spacing.lg,
  },
  quoteCard: {
    marginBottom: spacing.md,
  },
  quoteContent: {
    padding: spacing.md,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quoteNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quoteNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  quoteDateContainer: {
    alignItems: 'flex-end',
  },
  quoteDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  expiredText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  expiringSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  expiringSoonText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  quoteBody: {
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
  quoteDetails: {
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
  quoteTotal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  quoteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  validUntil: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validUntilText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  quoteActions: {
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