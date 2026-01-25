// app/(tabs)/quotes/index.tsx - Listado usando QuoteItemCard
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { QuoteItemCard } from '../../components/Quoteitemcard'; // ✨ IMPORT
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { debounce } from '../../utils/helpers';

interface FilterState {
  status: Quote['status'] | 'all';
  seller: Seller | null;
  dateFilter: string;
  customDateFrom: string;
  customDateTo: string;
}

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

interface Seller {
  id: number;
  user_id: number;
  company_id: number;
  code: string;
  description?: string;
  percent_sales: number;
  percent_receivable: number;
  seller_status: 'active' | 'inactive';
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
}

interface CombinedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sellers: Seller[];
  loadingSellers: boolean;
}

const CombinedFilters: React.FC<CombinedFiltersProps> = ({
  filters,
  onFiltersChange,
  sellers,
  loadingSellers,
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sellerSearch, setSellerSearch] = useState('');

  const statusOptions = [
    { value: 'all', label: 'Todos', icon: 'list' },
    { value: 'approved', label: 'Aprobados', icon: 'checkmark-circle' },
    { value: 'rejected', label: 'No aprobado', icon: 'close-circle' },
  ];

  const dateOptions = [
    { value: 'all', label: 'Todas las fechas', icon: 'calendar-outline' },
    { value: 'today', label: 'Hoy', icon: 'today-outline' },
    { value: 'yesterday', label: 'Ayer', icon: 'arrow-back-outline' },
    { value: 'this_month', label: 'Este mes', icon: 'calendar' },
    { value: 'last_month', label: 'Mes anterior', icon: 'arrow-back-circle-outline' },
    { value: 'custom', label: 'Personalizado', icon: 'options-outline' },
  ];

  const filteredSellers = sellers.filter(seller =>
    seller.user?.name.toLowerCase().includes(sellerSearch.toLowerCase()) ||
    seller.code.toLowerCase().includes(sellerSearch.toLowerCase())
  );

  const getFilterLabel = () => {
    const activeFilters = [];
    if (filters.status !== 'all') activeFilters.push('Estado');
    if (filters.seller) activeFilters.push('Vendedor');
    if (filters.dateFilter !== 'all') activeFilters.push('Fecha');

    if (activeFilters.length === 0) return 'Todos';
    return `Filtros (${activeFilters.length})`;
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.filterChip,
          (filters.status !== 'all' || filters.seller || filters.dateFilter !== 'all') && styles.filterChipActive
        ]}
        onPress={() => setShowFilterModal(true)}
      >
        <Ionicons
          name="filter"
          size={16}
          color={(filters.status !== 'all' || filters.seller || filters.dateFilter !== 'all') ? colors.text.inverse : colors.text.secondary}
        />
        <Text style={[
          styles.filterChipText,
          (filters.status !== 'all' || filters.seller || filters.dateFilter !== 'all') && styles.filterChipActiveText
        ]}>
          {getFilterLabel()}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color={(filters.status !== 'all' || filters.seller || filters.dateFilter !== 'all') ? colors.text.inverse : colors.text.secondary}
        />
      </TouchableOpacity>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            style={styles.filterModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Estado</Text>
                <View style={styles.filterOptions}>
                  {statusOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters.status === option.value && styles.filterOptionActive
                      ]}
                      onPress={() => {
                        onFiltersChange({ ...filters, status: option.value as Quote['status'] | 'all' });
                      }}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={18}
                        color={filters.status === option.value ? colors.primary[500] : colors.text.secondary}
                        style={styles.filterOptionIcon}
                      />
                      <Text style={[
                        styles.filterOptionText,
                        filters.status === option.value && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {filters.status === option.value && (
                        <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Vendedor</Text>
                <View style={styles.filterSearchContainer}>
                  <Ionicons name="search" size={16} color={colors.text.secondary} />
                  <TextInput
                    style={styles.filterSearchInput}
                    placeholder="Buscar vendedor..."
                    placeholderTextColor={colors.text.secondary}
                    value={sellerSearch}
                    onChangeText={setSellerSearch}
                  />
                </View>

                {loadingSellers ? (
                  <Text style={styles.filterLoadingText}>Cargando vendedores...</Text>
                ) : (
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        !filters.seller && styles.filterOptionActive
                      ]}
                      onPress={() => {
                        onFiltersChange({ ...filters, seller: null });
                        setSellerSearch('');
                      }}
                    >
                      <Ionicons
                        name="people"
                        size={18}
                        color={!filters.seller ? colors.primary[500] : colors.text.secondary}
                        style={styles.filterOptionIcon}
                      />
                      <Text style={[
                        styles.filterOptionText,
                        !filters.seller && styles.filterOptionTextActive
                      ]}>
                        Todos los vendedores
                      </Text>
                      {!filters.seller && (
                        <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                      )}
                    </TouchableOpacity>

                    {filteredSellers.map((seller) => (
                      <TouchableOpacity
                        key={seller.id}
                        style={[
                          styles.filterOption,
                          filters.seller?.id === seller.id && styles.filterOptionActive
                        ]}
                        onPress={() => {
                          onFiltersChange({ ...filters, seller });
                          setSellerSearch('');
                        }}
                      >
                        <View style={styles.sellerAvatar}>
                          <Text style={styles.sellerAvatarText}>
                            {seller.user?.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.filterSellerInfo}>
                          <Text style={[
                            styles.filterOptionText,
                            filters.seller?.id === seller.id && styles.filterOptionTextActive
                          ]}>
                            {seller.user?.name}
                          </Text>
                          <Text style={styles.filterSellerCode}>#{seller.code}</Text>
                        </View>
                        {filters.seller?.id === seller.id && (
                          <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Fecha</Text>
                <View style={styles.filterOptions}>
                  {dateOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filters.dateFilter === option.value && styles.filterOptionActive
                      ]}
                      onPress={() => {
                        onFiltersChange({ ...filters, dateFilter: option.value });
                      }}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={18}
                        color={filters.dateFilter === option.value ? colors.primary[500] : colors.text.secondary}
                        style={styles.filterOptionIcon}
                      />
                      <Text style={[
                        styles.filterOptionText,
                        filters.dateFilter === option.value && styles.filterOptionTextActive
                      ]}>
                        {option.label}
                      </Text>
                      {filters.dateFilter === option.value && (
                        <Ionicons name="checkmark" size={18} color={colors.primary[500]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {filters.dateFilter === 'custom' && (
                  <View style={styles.customDateContainer}>
                    <Input
                      label="Desde"
                      value={filters.customDateFrom}
                      onChangeText={(value) => onFiltersChange({ ...filters, customDateFrom: value })}
                      placeholder="YYYY-MM-DD"
                    />
                    <Input
                      label="Hasta"
                      value={filters.customDateTo}
                      onChangeText={(value) => onFiltersChange({ ...filters, customDateTo: value })}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                )}
              </View>

              {(filters.status !== 'all' || filters.seller || filters.dateFilter !== 'all') && (
                <Button
                  title="Limpiar todos los filtros"
                  variant="outline"
                  onPress={() => {
                    onFiltersChange({
                      status: 'all',
                      seller: null,
                      dateFilter: 'all',
                      customDateFrom: '',
                      customDateTo: ''
                    });
                  }}
                  style={{ marginVertical: spacing.md }}
                />
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default function QuotesScreen(): JSX.Element {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [localDocumentSearch, setLocalDocumentSearch] = useState<string>('');
  const [searchByDocument, setSearchByDocument] = useState<string>('');
  const [searchById, setSearchById] = useState<string>('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState<boolean>(false);
  const [bcvRate, setBcvRate] = useState<number | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    seller: null,
    dateFilter: 'all',
    customDateFrom: '',
    customDateTo: ''
  });

  useEffect(() => {
    loadQuotes();
    loadSellers();
    fetchBCVRate();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [searchText, quotes, filters, searchById, searchByDocument]);

  const loadSellers = async (): Promise<void> => {
    try {
      setLoadingSellers(true);
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;

      if (company) {
        const response = await api.getSellers({ company_id: company.id });
        setSellers(response.data?.data || response.data || []);
      } else {
        const response = await api.getSellers();
        setSellers(response.data?.data || response.data || []);
      }
    } catch (error) {
      console.log('Error loading sellers:', error);
    } finally {
      setLoadingSellers(false);
    }
  };

  const fetchBCVRate = async () => {
    try {
      const cachedRate = await AsyncStorage.getItem('bcv_rate');
      if (cachedRate) {
        const cached = JSON.parse(cachedRate);
        if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          setBcvRate(cached.rate);
          return;
        }
      }

      let rate = null;

      try {
        const response1 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data1 = await response1.json();
        if (data1.rates?.VES) {
          rate = data1.rates.VES;
        }
      } catch (error) {
        console.log('API 1 falló:', error);
      }

      if (!rate) {
        try {
          const response2 = await fetch('https://s3.amazonaws.com/dolartoday/data.json');
          const data2 = await response2.json();
          if (data2.USD?.bcv) {
            rate = data2.USD.bcv;
          }
        } catch (error) {
          console.log('API 2 falló:', error);
        }
      }

      if (rate) {
        setBcvRate(rate);
        await AsyncStorage.setItem('bcv_rate', JSON.stringify({
          rate,
          timestamp: Date.now()
        }));
      } else {
        setBcvRate(36.5);
      }
    } catch (error) {
      console.log('Error al obtener tasa BCV:', error);
      setBcvRate(36.5);
    }
  };

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

  const isDateInRange = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filters.dateFilter) {
      case 'all':
        return true;
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        return dateStr.startsWith(todayStr);
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return dateStr.startsWith(yesterdayStr);
      case 'this_month':
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      case 'last_month':
        const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
        const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
      case 'custom':
        if (!filters.customDateFrom || !filters.customDateTo) return true;
        const fromDate = new Date(filters.customDateFrom);
        const toDate = new Date(filters.customDateTo);
        toDate.setHours(23, 59, 59, 999);
        return date >= fromDate && date <= toDate;
      default:
        return true;
    }
  };

  const filterQuotes = (): void => {
    let filtered = quotes;

    if (filters.status !== 'all') {
      filtered = filtered.filter(quote => quote.status === filters.status);
    }

    if (filters.seller) {
      filtered = filtered.filter(quote => quote.user_id === filters.seller?.user_id);
    }

    if (searchText) {
      filtered = filtered.filter(quote =>
        quote.customer?.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (searchByDocument) {
      filtered = filtered.filter(quote =>
        quote.quote_number?.toLowerCase().includes(searchByDocument.toLowerCase())
      );
    }

    if (searchById) {
      filtered = filtered.filter(quote =>
        quote.quote_number.toLowerCase().includes(searchById.toLowerCase()) ||
        quote.id.toString().includes(searchById)
      );
    }

    if (filters.dateFilter !== 'all') {
      filtered = filtered.filter(quote => isDateInRange(quote.created_at));
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setFilteredQuotes(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 150);

  const debouncedSearchByDocument = debounce((text: string) => {
    setSearchByDocument(text);
  }, 150);

  const debouncedSearchById = debounce((text: string) => {
    setSearchById(text);
  }, 300);

  const handleSearchChange = (text: string) => {
    setLocalSearch(text);
    debouncedSearch(text);
  };

  const handleDocumentSearchChange = (text: string) => {
    setLocalDocumentSearch(text);
    debouncedSearchByDocument(text);
  };

  // ✨ Componente render usando QuoteItemCard
  const renderQuoteItem: ListRenderItem<Quote> = ({ item }) => (
    <QuoteItemCard
      quote={item}
      bcvRate={bcvRate}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Presupuestos</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/quotes/new')}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar por nombre..."
          value={localSearch}
          onChangeText={handleSearchChange}
          leftIcon={<Ionicons name="search" size={18} color={colors.text.tertiary} />}
          rightIcon={
            localSearch.length > 0 ? (
              <TouchableOpacity onPress={() => {
                setLocalSearch('');
                setSearchText('');
              }}>
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            ) : null
          }
          style={styles.compactInput}
        />
      </View>

      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar por documento..."
          value={localDocumentSearch}
          onChangeText={handleDocumentSearchChange}
          leftIcon={<Ionicons name="card-outline" size={18} color={colors.text.tertiary} />}
          rightIcon={
            localDocumentSearch.length > 0 ? (
              <TouchableOpacity onPress={() => {
                setLocalDocumentSearch('');
                setSearchByDocument('');
              }}>
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            ) : null
          }
          style={styles.compactInput}
        />
      </View>

      <View style={styles.filtersContainer}>
        <CombinedFilters
          filters={filters}
          onFiltersChange={setFilters}
          sellers={sellers}
          loadingSellers={loadingSellers}
        />
      </View>

      <FlatList
        data={filteredQuotes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderQuoteItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadQuotes} />}
        contentContainerStyle={styles.quotesList}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyText}>
              {filteredQuotes.length === 0 && quotes.length > 0
                ? 'No se encontraron presupuestos con los filtros aplicados'
                : 'No hay presupuestos disponibles'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
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
    marginHorizontal: spacing.xs,
  },
  filterChipActiveText: {
    color: colors.text.inverse,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filterModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  filterModalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filterSectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterOptions: {
    gap: spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  filterOptionActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  filterOptionIcon: {
    marginRight: spacing.md,
  },
  filterOptionText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    flex: 1,
  },
  filterOptionTextActive: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },
  filterSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterSearchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  filterLoadingText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  filterSellerInfo: {
    flex: 1,
  },
  filterSellerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  filterSellerCode: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  customDateContainer: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  sellerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sellerAvatarText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  quotesList: {
    padding: spacing.lg,
    marginBottom: 250,
    paddingBottom: 150,
  },
  separator: {
    height: spacing.sm,
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
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
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

  // ✨ Estilo compacto para inputs de búsqueda
  compactInput: {
    marginBottom: 0,
  },
});