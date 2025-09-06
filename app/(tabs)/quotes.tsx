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
bcvRate: number | null;
}

interface StatusFilterProps {
selectedStatus: Quote['status'] | 'all';
onSelectStatus: (status: Quote['status'] | 'all') => void;
}

interface DateFilterProps {
selectedDateFilter: string;
customDateFrom: string;
customDateTo: string;
onSelectDateFilter: (filter: string) => void;
onSetCustomDates: (from: string, to: string) => void;
showDateModal: boolean;
onToggleDateModal: () => void;
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

// Función para formatear con BCV
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

const DateFilter: React.FC<DateFilterProps> = ({
selectedDateFilter,
customDateFrom,
customDateTo,
onSelectDateFilter,
onSetCustomDates,
showDateModal,
onToggleDateModal,
}) => {
const dateOptions = [
{ value: 'all', label: 'Todas las fechas', icon: 'calendar-outline' },
{ value: 'today', label: 'Hoy', icon: 'today-outline' },
{ value: 'yesterday', label: 'Ayer', icon: 'arrow-back-outline' },
{ value: 'this_month', label: 'Este mes', icon: 'calendar' },
{ value: 'last_month', label: 'Mes anterior', icon: 'arrow-back-circle-outline' },
{ value: 'custom', label: 'Personalizado', icon: 'options-outline' },
];

const getDateFilterLabel = () => {
const option = dateOptions.find(opt => opt.value === selectedDateFilter);
if (selectedDateFilter === 'custom' && customDateFrom && customDateTo) {
return `${formatDate(customDateFrom)} - ${formatDate(customDateTo)}`;
}
return option?.label || 'Todas las fechas';
};

return (
<>
<TouchableOpacity
style={[
styles.filterChip,
selectedDateFilter !== 'all' && styles.filterChipActive
]}
onPress={onToggleDateModal}
>
<Ionicons 
name="calendar-outline" 
size={16} 
color={selectedDateFilter !== 'all' ? colors.text.inverse : colors.text.secondary} 
/>
<Text style={[
styles.filterChipText,
selectedDateFilter !== 'all' && styles.filterChipActiveText
]}>
{getDateFilterLabel()}
</Text>
<Ionicons 
name="chevron-down" 
size={14} 
color={selectedDateFilter !== 'all' ? colors.text.inverse : colors.text.secondary} 
/>
</TouchableOpacity>

{/* Modal de filtro de fechas */}
<Modal visible={showDateModal} animationType="slide" presentationStyle="pageSheet">
<View style={styles.modal}>
<View style={styles.modalHeader}>
<Text style={styles.modalTitle}>Filtrar por fecha</Text>
<TouchableOpacity onPress={onToggleDateModal}>
<Ionicons name="close" size={24} color={colors.text.primary} />
</TouchableOpacity>
</View>

<ScrollView style={styles.modalContent}>
{dateOptions.map((option) => (
<TouchableOpacity
key={option.value}
style={[
styles.dateOption,
selectedDateFilter === option.value && styles.dateOptionActive
]}
onPress={() => {
onSelectDateFilter(option.value);
if (option.value !== 'custom') {
onToggleDateModal();
}
}}
>
<Ionicons 
name={option.icon as any} 
size={20} 
color={selectedDateFilter === option.value ? colors.primary[500] : colors.text.secondary} 
/>
<Text style={[
styles.dateOptionText,
selectedDateFilter === option.value && styles.dateOptionTextActive
]}>
{option.label}
</Text>
{selectedDateFilter === option.value && (
<Ionicons name="checkmark" size={20} color={colors.primary[500]} />
)}
</TouchableOpacity>
))}

{selectedDateFilter === 'custom' && (
<View style={styles.customDateContainer}>
<Input
label="Fecha desde"
value={customDateFrom}
onChangeText={(value) => onSetCustomDates(value, customDateTo)}
placeholder="YYYY-MM-DD"
/>
<Input
label="Fecha hasta"
value={customDateTo}
onChangeText={(value) => onSetCustomDates(customDateFrom, value)}
placeholder="YYYY-MM-DD"
/>
<Button
title="Aplicar fechas personalizadas"
onPress={onToggleDateModal}
disabled={!customDateFrom || !customDateTo}
/>
</View>
)}
</ScrollView>
</View>
</Modal>
</>
);
};

export default function QuotesScreen(): JSX.Element {
const [quotes, setQuotes] = useState<Quote[]>([]);
const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
const [loading, setLoading] = useState<boolean>(true);
const [searchText, setSearchText] = useState<string>('');
const [selectedStatus, setSelectedStatus] = useState<Quote['status'] | 'all'>('all');

// BCV
const [bcvRate, setBcvRate] = useState<number | null>(null);
const [rateDate, setRateDate] = useState<string>('');

// Filtros de fecha
const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
const [customDateFrom, setCustomDateFrom] = useState<string>('');
const [customDateTo, setCustomDateTo] = useState<string>('');
const [showDateModal, setShowDateModal] = useState<boolean>(false);

// Filtro por ID
const [searchById, setSearchById] = useState<string>('');

useEffect(() => {
loadQuotes();
fetchBCVRate();
}, []);

useEffect(() => {
filterQuotes();
}, [searchText, quotes, selectedStatus, selectedDateFilter, customDateFrom, customDateTo, searchById]);

// Función para obtener la tasa BCV
const fetchBCVRate = async () => {
try {
// Intentar cargar desde cache primero
const cachedRate = await AsyncStorage.getItem('bcv_rate');
if (cachedRate) {
const cached = JSON.parse(cachedRate);
// Si el cache es de menos de 24 horas, usarlo
if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
setBcvRate(cached.rate);
setRateDate(`${cached.date} (cache)`);
return;
}
}

// Si no hay cache válido, obtener nueva tasa
let rate = null;
let date = '';

try {
// API 1: ExchangeRate-API
const response1 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
const data1 = await response1.json();
if (data1.rates?.VES) {
rate = data1.rates.VES;
date = data1.date || new Date().toLocaleDateString();
}
} catch (error) {
console.log('API 1 falló:', error);
}

// API 2: DolarToday (alternativa)
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
// Guardar en cache local
await AsyncStorage.setItem('bcv_rate', JSON.stringify({
rate,
date,
timestamp: Date.now()
}));
} else {
// Tasa de respaldo
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

// Función para filtrar por fecha
const isDateInRange = (dateStr: string): boolean => {
const date = new Date(dateStr);
const today = new Date();
today.setHours(0, 0, 0, 0);

switch (selectedDateFilter) {
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
if (!customDateFrom || !customDateTo) return true;
const fromDate = new Date(customDateFrom);
const toDate = new Date(customDateTo);
toDate.setHours(23, 59, 59, 999);
return date >= fromDate && date <= toDate;
default:
return true;
}
};

const filterQuotes = (): void => {
let filtered = quotes;

// Filtrar por estado
if (selectedStatus !== 'all') {
filtered = filtered.filter(quote => quote.status === selectedStatus);
}

// Filtrar por texto de búsqueda (nombre de cliente)
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
if (selectedDateFilter !== 'all') {
filtered = filtered.filter(quote => isDateInRange(quote.created_at));
}

// Ordenar por fecha de creación (más recientes primero)
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

const clearAllFilters = () => {
setSearchText('');
setSearchById('');
setSelectedStatus('all');
setSelectedDateFilter('all');
setCustomDateFrom('');
setCustomDateTo('');
};

const hasActiveFilters = searchText || searchById || selectedStatus !== 'all' || selectedDateFilter !== 'all';

const QuoteItem: React.FC<QuoteItemProps> = ({ quote, onEdit, onDelete, onDuplicate, onSend, bcvRate }) => {
const isExpired = isQuoteExpired(quote.valid_until);
const daysUntilExpiry = getDaysUntilExpiry(quote.valid_until);
const isExpiringSoon = !isExpired && daysUntilExpiry <= 3 && daysUntilExpiry > 0;

return (
<Card style={[
styles.quoteCard,
isExpired && styles.expiredCard 
]}>
<TouchableOpacity
onPress={() => router.push(`/quotes/${quote.id}`)}
>
<View style={styles.quoteHeader}>
<View style={styles.quoteNumberContainer}>
<View>
<Text style={styles.quoteNumber}>{quote.id}</Text>
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
<View style={styles.amountDisplay}>
<Text style={styles.quoteTotal}>{formatCurrency(quote.total)}</Text>
{bcvRate && (
<Text style={styles.quoteTotalBCV}>
{(quote.total * bcvRate).toLocaleString('es-VE', {
style: 'currency',
currency: 'VES',
minimumFractionDigits: 0,
maximumFractionDigits: 0
})}
</Text>
)}
</View>
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
bcvRate={bcvRate}
/>
);

const renderEmpty = (): JSX.Element => (
<View style={styles.emptyContainer}>
<Ionicons name="document-text-outline" size={64} color={colors.text.tertiary} />
<Text style={styles.emptyText}>
{hasActiveFilters
? 'No se encontraron presupuestos con los filtros aplicados'
: 'No hay presupuestos creados'
}
</Text>
{!hasActiveFilters ? (
<Button
title="Crear Presupuesto"
variant="outline"
onPress={() => router.push('/quotes/new')}
style={{ marginTop: spacing.lg }}
/>
) : (
<Button
title="Limpiar Filtros"
variant="outline"
onPress={clearAllFilters}
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
{hasActiveFilters && ' (filtrados)'}
</Text>
</View>
<View style={styles.headerActions}>
<TouchableOpacity
style={styles.refreshButton}
onPress={fetchBCVRate}
>
<Ionicons name="refresh" size={20} color={colors.primary[500]} />
</TouchableOpacity>
<TouchableOpacity
style={styles.addButton}
onPress={() => router.push('/quotes/new')}
>
<Ionicons name="add" size={24} color={colors.text.inverse} />
</TouchableOpacity>
</View>
</View>

{/* BCV Rate Display */}
{bcvRate && (
<View style={styles.bcvContainer}>
<Ionicons name="swap-horizontal" size={14} color={colors.warning} />
<Text style={styles.bcvText}>
1 USD = {bcvRate.toFixed(2)} Bs. • {rateDate}
</Text>
</View>
)}

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

{/* Filtros */}
<View style={styles.filtersContainer}>
<StatusFilter
selectedStatus={selectedStatus}
onSelectStatus={setSelectedStatus}
/>
<View style={styles.dateFilterContainer}>
<DateFilter
selectedDateFilter={selectedDateFilter}
customDateFrom={customDateFrom}
customDateTo={customDateTo}
onSelectDateFilter={setSelectedDateFilter}
onSetCustomDates={(from, to) => {
setCustomDateFrom(from);
setCustomDateTo(to);
}}
showDateModal={showDateModal}
onToggleDateModal={() => setShowDateModal(!showDateModal)}
/>
</View>
</View>

{/* Buscadores */}
<View style={styles.searchContainer}>
<Input
placeholder="Buscar por cliente..."
onChangeText={debouncedSearch}
leftIcon={<Ionicons name="person-outline" size={20} color={colors.text.tertiary} />}
style={styles.searchInput}
/>
<Input
placeholder="Buscar por ID o número..."
onChangeText={debouncedSearchById}
leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
rightIcon={
hasActiveFilters ? (
<TouchableOpacity onPress={clearAllFilters}>
<Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
</TouchableOpacity>
) : undefined
}
style={styles.searchInput}
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
marginBottom: spacing.md,
},
headerActions: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.sm,
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
refreshButton: {
padding: spacing.sm,
backgroundColor: colors.primary[50],
borderRadius: borderRadius.md,
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

// BCV Container
bcvContainer: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
paddingVertical: spacing.xs,
backgroundColor: colors.warning + '10',
borderBottomWidth: 1,
borderBottomColor: colors.warning + '20',
},
bcvText: {
fontSize: typography.fontSize.xs,
color: colors.warning,
marginLeft: spacing.xs,
fontWeight: typography.fontWeight.medium,
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

// Date Filter
dateFilterContainer: {
paddingHorizontal: spacing.lg,
paddingTop: spacing.sm,
},
modal: {
flex: 1,
backgroundColor: colors.background,
},
modalHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
padding: spacing.lg,
backgroundColor: colors.surface,
borderBottomWidth: 1,
borderBottomColor: colors.gray[100],
},
modalTitle: {
fontSize: typography.fontSize.lg,
fontWeight: typography.fontWeight.bold,
color: colors.text.primary,
},
modalContent: {
flex: 1,
padding: spacing.lg,
},
dateOption: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: spacing.lg,
paddingHorizontal: spacing.md,
borderBottomWidth: 1,
borderBottomColor: colors.gray[100],
},
dateOptionActive: {
backgroundColor: colors.primary[50],
},
dateOptionText: {
fontSize: typography.fontSize.base,
color: colors.text.primary,
marginLeft: spacing.md,
flex: 1,
},
dateOptionTextActive: {
color: colors.primary[500],
fontWeight: typography.fontWeight.semibold,
},
customDateContainer: {
marginTop: spacing.lg,
paddingTop: spacing.lg,
borderTopWidth: 1,
borderTopColor: colors.gray[200],
},

searchContainer: {
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
backgroundColor: colors.surface,
borderBottomWidth: 1,
borderBottomColor: colors.gray[100],
gap: spacing.sm,
},
searchInput: {
marginBottom: 0,
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
marginBottom: spacing.lg,
textAlign: 'center',
},
});