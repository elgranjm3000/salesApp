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
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { debounce, formatCurrency, formatDate } from '../../utils/helpers';

// ✨ TIPOS DE FILTROS
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

interface QuoteItemProps {
  quote: Quote;
  onEdit: (quote: Quote) => void;
  onDelete: (quote: Quote) => void;
  onDuplicate: (quote: Quote) => void;
  onSend: (quote: Quote) => void;
  bcvRate: number | null;
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

const formatWithBCV = (amount: number, bcvRate: number | null) => {
  const usdFormatted = formatCurrency(amount);
  if (bcvRate) {
    const bcvAmount = (amount * bcvRate).toLocaleString('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return `${usdFormatted}\n${bcvAmount}`;
  }
  return usdFormatted;
};

// ✨ NUEVO: COMPONENTE DE FILTROS AGRUPADOS
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
    { value: 'draft', label: 'Borradores', icon: 'create-outline' },
    { value: 'sent', label: 'Enviados', icon: 'paper-plane' },
    { value: 'approved', label: 'Aprobados', icon: 'checkmark-circle' },
    { value: 'rejected', label: 'Rechazados', icon: 'close-circle' },
    { value: 'expired', label: 'Expirados', icon: 'time-outline' },
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

  // Obtener label del botón
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
      {/* Botón principal de filtros */}
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

      {/* Modal de filtros agrupados */}
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
            {/* Header */}
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
              {/* Sección: ESTADO */}
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

              {/* Sección: VENDEDOR */}
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
                    {/* Opción: Todos */}
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

                    {/* Vendedores */}
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

              {/* Sección: FECHA */}
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

                {/* Fechas personalizadas */}
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

              {/* Botón Limpiar */}
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
  const [searchById, setSearchById] = useState<string>('');
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState<boolean>(false);
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string>('');

  // ✨ ESTADO UNIFICADO DE FILTROS
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
  }, [searchText, quotes, filters, searchById]);

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
          setRateDate(`${cached.date} (cache)`);
          return;
        }
      }

      let rate = null;
      let date = '';

      try {
        const response1 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data1 = await response1.json();
        if (data1.rates?.VES) {
          rate = data1.rates.VES;
          date = data1.date || new Date().toLocaleDateString();
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
            date = 'DolarToday';
          }
        } catch (error) {
          console.log('API 2 falló:', error);
        }
      }

      if (rate) {
        setBcvRate(rate);
        setRateDate(date);
        await AsyncStorage.setItem('bcv_rate', JSON.stringify({
          rate,
          date,
          timestamp: Date.now()
        }));
      } else {
        setBcvRate(36.5);
        setRateDate('Tasa aproximada');
      }
    } catch (error) {
      console.log('Error al obtener tasa BCV:', error);
      setBcvRate(36.5);
      setRateDate('Tasa aproximada');
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

    // Filtrar por estado
    if (filters.status !== 'all') {
      filtered = filtered.filter(quote => quote.status === filters.status);
    }

    // Filtrar por vendedor
    if (filters.seller) {
      filtered = filtered.filter(quote => quote.user_seller_id === filters.seller?.user_id);
    }

    // Filtrar por texto de búsqueda
    if (searchText) {
      filtered = filtered.filter(quote =>
        quote.customer?.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtrar por ID de presupuesto
    if (searchById) {
      filtered = filtered.filter(quote =>
        quote.quote_number.toLowerCase().includes(searchById.toLowerCase()) ||
        quote.id.toString().includes(searchById)
      );
    }

    // Filtrar por fecha
    if (filters.dateFilter !== 'all') {
      filtered = filtered.filter(quote => isDateInRange(quote.created_at));
    }

    // Ordenar por fecha de creación
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setFilteredQuotes(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

  const debouncedSearchById = debounce((text: string) => {
    setSearchById(text);
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
    try {
      await api.sendQuote(quote.id);
      loadQuotes();
      Alert.alert('Éxito', 'Presupuesto enviado correctamente');
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el presupuesto');
    }
  };

  const handleEditQuote = (quote: Quote): void => {
    router.push(`/quotes/${quote.id}`);
  };

  const renderQuoteItem: ListRenderItem<Quote> = ({ item }) => {
    const isExpired = new Date(item.valid_until) < new Date();
    const expiringSoon = !isExpired && (new Date(item.valid_until).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000;

    return (
      <Card style={[styles.quoteCard, isExpired && styles.expiredCard]}>
        <View style={styles.quoteHeader}>
          <View style={styles.quoteNumberContainer}>
            <Text style={styles.quoteNumber}>#{item.quote_number}</Text>
            <Text style={styles.quoteDate}>{formatDate(item.quote_date)}</Text>
          </View>
          <View style={styles.quoteStatusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Ionicons name={getStatusIcon(item.status)} size={14} color={getStatusColor(item.status)} style={{ marginRight: spacing.xs }} />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
            {isExpired && (
              <View style={styles.expiredBadge}>
                <Ionicons name="alert-circle" size={12} color={colors.error} />
                <Text style={styles.expiredText}>Expirado</Text>
              </View>
            )}
            {expiringSoon && !isExpired && (
              <View style={styles.expiringSoonBadge}>
                <Ionicons name="alert-circle" size={12} color={colors.warning} />
                <Text style={styles.expiringSoonText}>Próximo a expirar</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.quoteBody}>
          <View style={styles.customerInfo}>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{item.customer?.name}</Text>
              <Text style={styles.customerEmail}>{item.customer?.email || 'Sin email'}</Text>
              {item.user && <Text style={styles.sellerText}>Por: {item.user.name}</Text>}
            </View>
          </View>

          <View style={styles.quoteAmountContainer}>
            <View style={styles.amountDisplay}>
              <Text style={styles.quoteTotal}>{formatWithBCV(item.total, bcvRate)}</Text>
              <Text style={styles.itemsCount}>{item.items?.length || 0} artículos</Text>
            </View>
          </View>
        </View>

        <View style={styles.quoteFooter}>
          <View style={styles.validUntilContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.validUntilText}>Válido hasta: {formatDate(item.valid_until)}</Text>
          </View>
          {/*<View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <TouchableOpacity onPress={() => handleEditQuote(item)}>
              <Ionicons name="create-outline" size={20} color={colors.primary[500]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSendQuote(item)}>
              <Ionicons name="send-outline" size={20} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDuplicateQuote(item)}>
              <Ionicons name="duplicate-outline" size={20} color={colors.primary[500]} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteQuote(item)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>*/}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>

      <View style={styles.headerContent}>
          {/* Header */}
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
      

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar cliente o presupuesto..."
          onChangeText={debouncedSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
        />
      </View>

      {/* ✨ FILTROS AGRUPADOS */}
      <View style={styles.filtersContainer}>
        <CombinedFilters
          filters={filters}
          onFiltersChange={setFilters}
          sellers={sellers}
          loadingSellers={loadingSellers}
        />
      </View>

      {/* Lista de presupuestos */}
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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

  // ✨ ESTILOS DEL MODAL DE FILTROS
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

  // ✨ SECCIONES DE FILTROS
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

  // Quote card styles
  quotesList: {
    padding: spacing.lg,
    marginBottom: 250,
    paddingBottom: 150,
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
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  quoteNumberContainer: {
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
  quoteStatusContainer: {
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
    marginLeft: spacing.xs,
  },
  quoteAmountContainer: {
    alignItems: 'flex-end',
  },
  amountDisplay: {
    alignItems: 'flex-end',
  },
  quoteTotal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});