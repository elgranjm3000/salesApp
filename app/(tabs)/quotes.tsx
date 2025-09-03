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
import { debounce, formatCurrency, formatDate } from '../../utils/helpers';

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
  onEdit: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
  onDuplicate: (quote: Quote) => void;
  onSend: (quote: Quote) => void;
}

interface StatusFilterProps {
  selectedStatus: Quote['status'] | 'all';
  onSelectStatus: (status: Quote['status'] | 'all') => void;
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
      return 'create-outline';
    case 'rejected':
      return 'close-circle';
    case 'expired':
      return 'time-outline';
    default:
      return 'document-text-outline';
  }
};

const StatusFilter: React.FC<StatusFilterProps> = ({
  selectedStatus,
  onSelectStatus,
}) => {
  const statusOptions = [
    { value: 'all', label: 'Todos', icon: 'list' },
    { value: 'draft', label: 'Borradores', icon: 'create-outline' },
    { value: 'sent', label: 'Enviados', icon: 'paper-plane' },
    { value: 'approved', label: 'Aprobados', icon: 'checkmark-circle' },
    { value: 'rejected', label: 'Rechazados', icon: 'close-circle' },
    { value: 'expired', label: 'Expirados', icon: 'time-outline' },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersScrollContainer}
    >
      {statusOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.filterChip,
            selectedStatus === option.value && styles.filterChipActive
          ]}
          onPress={() => onSelectStatus(option.value as Quote['status'] | 'all')}
        >
          <Ionicons 
            name={option.icon as any} 
            size={16} 
            color={selectedStatus === option.value ? colors.text.inverse : colors.text.secondary} 
          />
          <Text style={[
            styles.filterChipText,
            selectedStatus === option.value && styles.filterChipActiveText
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default function QuotesScreen(): JSX.Element {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<Quote['status'] | 'all'>('all');

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [searchText, quotes, selectedStatus]);

  const loadQuotes = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.getQuotes();
      setQuotes(response.data || []);
    } catch (error) {
      console.log('Error loading quotes:', error);
      Alert.alert('Error', 'No se pudo cargar los presupuestos');
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = (): void => {
    let filtered = quotes;

    // Filtrar por estado
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(quote => quote.status === selectedStatus);
    }

    // Filtrar por texto de búsqueda
    if (searchText) {
      filtered = filtered.filter(quote =>
        quote.quote_number.toLowerCase().includes(searchText.toLowerCase()) ||
        quote.customer?.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setFilteredQuotes(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

  const handleDeleteQuote = async (quote: Quote): Promise<void> => {
    Alert.alert(
      'Eliminar Presupuesto',
      `¿Estás seguro de que quieres eliminar el presupuesto #${quote.quote_number}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteQuote(quote.id);
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

  const handleDuplicateQuote = async (quote: Quote): Promise<void> => {
    try {
      await api.duplicateQuote(quote.id);
      loadQuotes();
      Alert.alert('Éxito', 'Presupuesto duplicado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo duplicar el presupuesto');
    }
  };

  const handleSendQuote = async (quote: Quote): Promise<void> => {
    Alert.alert(
      'Enviar Presupuesto',
      `¿Enviar el presupuesto #${quote.quote_number} a ${quote.customer?.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            try {
              await api.sendQuote(quote.id);
              loadQuotes();
              Alert.alert('Éxito', 'Presupuesto enviado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo enviar el presupuesto');
            }
          },
        },
      ]
    );
  };

  const handleEditQuote = (quote: Quote) => {
    router.push(`/quotes/${quote.id}?mode=edit`);
  };

  const isQuoteExpired = (validUntil: string): boolean => {
    return new Date(validUntil) < new Date();
  };

  const getDaysUntilExpiry = (validUntil: string): number => {
    const today = new Date();
    const expiryDate = new Date(validUntil);
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const QuoteItem: React.FC<QuoteItemProps> = ({ quote, onEdit, onDelete, onDuplicate, onSend }) => {
    const isExpired = isQuoteExpired(quote.valid_until);
    const daysUntilExpiry = getDaysUntilExpiry(quote.valid_until);
    const isExpiringSoon = !isExpired && daysUntilExpiry <= 3 && daysUntilExpiry > 0;

    return (
      <Card style={[
        styles.quoteCard,
        isExpired && styles.expiredCard
      ]}>
        <TouchableOpacity>
          <View style={styles.quoteHeader}>
            <View style={styles.quoteNumberContainer}>
                 {/*<View style={styles.statusIconContainer}>
             <Ionicons 
                  name={getStatusIcon(quote.status)} 
                  size={20} 
                  color={getStatusColor(quote.status)} 
                />
              </View>*/}
              <View>
                <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
                <Text style={styles.quoteDate}>{formatDate(quote.quote_date)}</Text>
              </View>
            </View>
            
            <View style={styles.quoteStatusContainer}>
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
              
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Ionicons name="warning" size={12} color={colors.error} />
                  <Text style={styles.expiredText}>Expirado</Text>
                </View>
              )}
              
              {isExpiringSoon && (
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
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>
                  {quote.customer?.name || 'Cliente no especificado'}
                </Text>
                {quote.customer?.email && (
                  <Text style={styles.customerEmail}>{quote.customer.email}</Text>
                )}
              </View>
            </View>

            <View style={styles.quoteAmountContainer}>
              <Text style={styles.quoteTotal}>{formatCurrency(quote.total)}</Text>
              <Text style={styles.itemsCount}>
                {quote.items?.length || 0} producto{(quote.items?.length || 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.quoteFooter}>
            <View style={styles.validUntilContainer}>
              <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.validUntilText}>
                Válido hasta {formatDate(quote.valid_until)}
              </Text>
            </View>
            
            {/*<View style={styles.quoteActions}>
              {quote.status === 'draft' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.sendActionButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onSend(quote);
                  }}
                >
                  <Ionicons name="paper-plane" size={16} color={colors.info} />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDuplicate(quote);
                }}
              >
                <Ionicons name="copy-outline" size={16} color={colors.warning} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onEdit(quote);
                }}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary[500]} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteActionButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(quote);
                }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>*/}
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderItem: ListRenderItem<Quote> = ({ item }) => (
    <QuoteItem 
      quote={item} 
      onEdit={handleEditQuote}
      onDelete={handleDeleteQuote}
      onDuplicate={handleDuplicateQuote}
      onSend={handleSendQuote}
    />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>
        {searchText || selectedStatus !== 'all'
          ? 'No se encontraron presupuestos con los filtros aplicados'
          : 'No hay presupuestos creados'
        }
      </Text>
      {!searchText && selectedStatus === 'all' && (
        <Button
          title="Crear Presupuesto"
          variant="outline"
          onPress={() => router.push('/quotes/new')}
          style={{ marginTop: spacing.lg }}
        />
      )}
      {(searchText || selectedStatus !== 'all') && (
        <Button
          title="Limpiar Filtros"
          variant="outline"
          onPress={() => {
            setSearchText('');
            setSelectedStatus('all');
          }}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );

  const getQuotesSummary = () => {
    const total = quotes.length;
    const drafts = quotes.filter(q => q.status === 'draft').length;
    const sent = quotes.filter(q => q.status === 'sent').length;
    const approved = quotes.filter(q => q.status === 'approved').length;
    const expired = quotes.filter(q => isQuoteExpired(q.valid_until)).length;

    return { total, drafts, sent, approved, expired };
  };

  const summary = getQuotesSummary();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Presupuestos</Text>
            <Text style={styles.subtitle}>
              {filteredQuotes.length} presupuesto{filteredQuotes.length !== 1 ? 's' : ''}
              {searchText && ' (filtrados)'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/quotes/new')}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.drafts}</Text>
            <Text style={styles.summaryLabel}>Borradores</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.sent}</Text>
            <Text style={styles.summaryLabel}>Enviados</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{summary.approved}</Text>
            <Text style={styles.summaryLabel}>Aprobados</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: colors.error }]}>{summary.expired}</Text>
            <Text style={styles.summaryLabel}>Expirados</Text>
          </View>
        </View>
      </View>

      {/* Filtros por estado */}
      <View style={styles.filtersContainer}>
        <StatusFilter
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar presupuestos por número o cliente..."
          onChangeText={debouncedSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          rightIcon={
            (searchText || selectedStatus !== 'all') ? (
              <TouchableOpacity onPress={() => {
                setSearchText('');
                setSelectedStatus('all');
              }}>
                <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            ) : undefined
          }
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
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
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
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filtersScrollContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  filterChipActiveText: {
    color: colors.text.inverse,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  quotesList: {
    padding: spacing.lg,
  },
  separator: {
    height: spacing.sm,
  },
  quoteCard: {
    marginBottom: 0,
  },
  expiredCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    backgroundColor: colors.error + '05',
  },
  quoteContent: {
    padding: spacing.lg,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  quoteNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
  quoteStatusContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  expiredText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginLeft: spacing.xs,
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
  quoteBody: {
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
  customerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
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
  quoteAmountContainer: {
    alignItems: 'flex-end',
  },
  quoteTotal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  itemsCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  quoteFooter: {
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
  quoteActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  sendActionButton: {
    backgroundColor: colors.info + '10',
    borderColor: colors.info + '30',
  },
  deleteActionButton: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '30',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});