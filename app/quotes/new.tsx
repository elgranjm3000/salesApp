import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { formatCurrency } from '../../utils/helpers';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  status: 'active' | 'inactive';
}

interface Company {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
}

interface Product {
  id: number;
  name: string;
  code: string;
  price: number;
  cost?: number;
  stock: number;
  status: 'active' | 'inactive';
}

interface QuoteItem {
  id: string;
  product_id: number;
  product?: Product;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

interface CustomerSelectorProps {
  visible: boolean;
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
  loading: boolean;
  searchText: string;
  onSearchChange: (text: string) => void;
}

interface ProductSelectorProps {
  visible: boolean;
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  loading: boolean;
  searchText: string;
  onSearchChange: (text: string) => void;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  visible,
  customers,
  onSelect,
  onClose,
  loading,
  searchText,
  onSearchChange,
}) => {
  const renderCustomer: ListRenderItem<Customer> = ({ item }) => (
    <TouchableOpacity
      style={styles.selectorItem}
      onPress={() => onSelect(item)}
    >
      <View style={styles.selectorItemContent}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.selectorItemInfo}>
          <Text style={styles.selectorItemName}>{item.name}</Text>
          {item.email && (
            <Text style={styles.selectorItemDescription}>{item.email}</Text>
          )}
          {item.phone && (
            <Text style={styles.selectorItemPhone}>{item.phone}</Text>
          )}
          {item.document_number && (
            <Text style={styles.selectorItemDocument}>
              {item.document_type}-{item.document_number}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalSearchContainer}>
          <Input
            placeholder="Buscar clientes..."
            value={searchText}
            onChangeText={onSearchChange}
            leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
            style={{ marginBottom: 0 }}
          />
        </View>

        {loading ? (
          <LoadingSpinner text="Buscando clientes..." />
        ) : (
          <FlatList
            data={customers.filter(c => 
              c.status === 'active' && 
              c.name.toLowerCase().includes(searchText.toLowerCase())
            )}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCustomer}
            style={styles.selectorList}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="person" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyStateText}>No se encontraron clientes</Text>
                <Button
                  title="Crear Cliente"
                  variant="outline"
                  onPress={() => {
                    onClose();
                    router.push('/customers/new');
                  }}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary[50],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  selectorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorButtonText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  selectorButtonLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  selectorButtonValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    marginLeft: spacing.xs,
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyItemsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  itemCode: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  itemActionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  itemDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  itemDetailValue: {
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  itemTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  percentSymbol: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  currencySymbol: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
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
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.primary[300],
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  summaryTotalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  summaryTotalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  bottomSpacer: {
    height: spacing.xl,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalSearchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  selectorList: {
    flex: 1,
  },
  selectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  selectorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorItemInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  selectorItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  selectorItemDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  selectorItemPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  selectorItemDocument: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    marginTop: spacing.xs,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  productPrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  productStock: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Item modal styles
  itemModalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  productInfoCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.primary[50],
  },
  productInfoName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  productInfoCode: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  productInfoStock: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  itemFormCard: {
    marginBottom: spacing.lg,
  },
  itemPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  itemPreviewLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  itemPreviewValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  itemModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 'auto',
  },
  itemCancelButton: {
    flex: 1,
  },
  itemSaveButton: {
    flex: 2,
  },
});

const ProductSelector: React.FC<ProductSelectorProps> = ({
  visible,
  products,
  onSelect,
  onClose,
  loading,
  searchText,
  onSearchChange,
}) => {
  const renderProduct: ListRenderItem<Product> = ({ item }) => (
    <TouchableOpacity
      style={styles.selectorItem}
      onPress={() => onSelect(item)}
    >
      <View style={styles.selectorItemContent}>
        <View style={styles.productIcon}>
          <Ionicons name="cube" size={20} color={colors.primary[500]} />
        </View>
        <View style={styles.selectorItemInfo}>
          <Text style={styles.selectorItemName}>{item.name}</Text>
          <Text style={styles.selectorItemDescription}>Código: {item.code}</Text>
          <View style={styles.productDetails}>
            <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
            <Text style={styles.productStock}>Stock: {item.stock}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Seleccionar Producto</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalSearchContainer}>
          <Input
            placeholder="Buscar productos..."
            value={searchText}
            onChangeText={onSearchChange}
            leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
            style={{ marginBottom: 0 }}
          />
        </View>

        {loading ? (
          <LoadingSpinner text="Buscando productos..." />
        ) : (
          <FlatList
            data={products.filter(p => 
              p.status === 'active' && 
              (p.name.toLowerCase().includes(searchText.toLowerCase()) ||
               p.code.toLowerCase().includes(searchText.toLowerCase()))
            )}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            style={styles.selectorList}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="cube" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyStateText}>No se encontraron productos</Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

export default function NewQuoteScreen(): JSX.Element {
  const { customer_id, company_id } = useLocalSearchParams<{ 
    customer_id?: string; 
    company_id?: string; 
  }>();

  const { user } = useAuth();


  useEffect(() => {
    const loadSelectedCompany = async () => {
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      setSelectedCompany(company);
      
    };
    loadSelectedCompany();
  }, [customer_id, company_id]);

 const [selectedProductForItem, setSelectedProductForItem] = useState<Product | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [productSearchText, setProductSearchText] = useState('');
  
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  const [formData, setFormData] = useState({
    valid_until: '',
    terms_conditions: 'Los precios están sujetos a cambios sin previo aviso. Válido por el tiempo especificado.',
    notes: '',
    discount: '0',
  });

  const [itemFormData, setItemFormData] = useState({
    quantity: '1',
    unit_price: '0',
    discount: '0',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (customer_id && customers.length > 0) {
      const preSelectedCustomer = customers.find(c => c.id === Number(customer_id));
      if (preSelectedCustomer) {
        setSelectedCustomer(preSelectedCustomer);
      }
    }
  }, [customer_id, customers]);

  useEffect(() => {
    if (company_id && companies.length > 0) {
      

      const preSelectedCompany = companies.find(c => c.id === Number(company_id));
      
      if (preSelectedCompany) {
        setSelectedCompany(preSelectedCompany);
      }
    }
  }, [company_id, companies]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersResponse, companiesResponse, productsResponse] = await Promise.all([
        api.getCustomers({ per_page: 100,  }),
        api.getCompanies({ per_page: 100 }),
        api.getProducts({ per_page: 100 }),
      ]);
       
      
      //setCustomers(customersResponse.data);
      setCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : []);
      setCompanies(companiesResponse.data);
      //setProducts(productsResponse.data);
      setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : []);
      // Configurar fecha de validez por defecto (30 días)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        valid_until: validUntil.toISOString().split('T')[0]
      }));
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudo cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (quantity: number, unitPrice: number, discount: number): number => {
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    return subtotal - discountAmount;
  };

  const calculateQuoteTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => sum + item.total_price, 0);
    const discountAmount = subtotal * (Number(formData.discount) / 100);
    const tax = (subtotal - discountAmount) * 0.16; // 16% IVA
    const total = subtotal - discountAmount + tax;

    return {
      subtotal,
      discountAmount,
      tax,
      total
    };
  };

  const addOrUpdateItem = (product: Product) => {
    console.log(product);
    setEditingItem(null);
    setSelectedProductForItem(product); // Guardar producto seleccionado
    setItemFormData({
      quantity: '1',
      unit_price: product.price.toString(),
      discount: '0',
    });
    setShowItemModal(true);
    setShowProductSelector(false);
  };

  const handleSaveItem = () => {
    const quantity = Number(itemFormData.quantity);
    const unitPrice = Number(itemFormData.unit_price);
    const discount = Number(itemFormData.discount);
    

    if (quantity <= 0 || unitPrice < 0 || discount < 0 || discount > 100) {
      Alert.alert('Error', 'Verifique los valores ingresados');
      return;
    }

    const totalPrice = calculateItemTotal(quantity, unitPrice, discount);

    if (editingItem) {
      // Editar item existente
      setQuoteItems(prev =>
        prev.map(item =>
          item.id === editingItem.id
            ? {
                ...item,
                quantity,
                unit_price: unitPrice,
                discount,
                total_price: totalPrice,
              }
            : item
        )
      );
    } else if (selectedProductForItem) {
        console.log('Adding new item for product:', selectedProductForItem);
      // Agregar nuevo item
      const newItem: QuoteItem = {
        id: Date.now().toString(),
        product_id: selectedProductForItem.id,
        product : selectedProductForItem,
        quantity,
        unit_price: unitPrice,
        discount,
        total_price: totalPrice,
      };
      setQuoteItems(prev => [...prev, newItem]);
    }

    setShowItemModal(false);
    setEditingItem(null);
    setSelectedProductForItem(null);
  };

  const editItem = (item: QuoteItem) => {
    setEditingItem(item);
    setItemFormData({
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      discount: item.discount.toString(),
    });
    setShowItemModal(true);
  };

  const removeItem = (itemId: string) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Estás seguro de que quieres eliminar este producto del presupuesto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => setQuoteItems(prev => prev.filter(item => item.id !== itemId)),
        },
      ]
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedCustomer) {
      newErrors.customer = 'Debes seleccionar un cliente';
    }

    if (quoteItems.length === 0) {
      newErrors.items = 'Debes agregar al menos un producto';
    }

    if (!formData.valid_until) {
      newErrors.valid_until = 'Debes especificar la fecha de validez';
    }

    const discount = Number(formData.discount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      newErrors.discount = 'El descuento debe estar entre 0 y 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const quoteData = {
        customer_id: selectedCustomer!.id,
        company_id: selectedCompany?.id,
        items: quoteItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          name: item.product?.name,
        })),
        valid_until: formData.valid_until,
        terms_conditions: formData.terms_conditions.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        discount: Number(formData.discount),
      };
      const quote = await api.createQuote(quoteData);
      Alert.alert('Éxito', 'Presupuesto creado correctamente');
      router.replace(`/quotes/${quote.id}`);
    } catch (error: any) {
      console.error('Error creating quote:', error);
      const message = error.response?.data?.message || 'Error al crear el presupuesto';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const totals = calculateQuoteTotals();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Nuevo Presupuesto</Text>
          <Text style={styles.subtitle}>Crea un presupuesto para tu cliente</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selección de cliente */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowCustomerSelector(true)}
          >
            <View style={styles.selectorButtonContent}>
              <Ionicons name="person" size={20} color={colors.primary[500]} />
              <View style={styles.selectorButtonText}>
                <Text style={styles.selectorButtonLabel}>Cliente</Text>
                <Text style={styles.selectorButtonValue}>
                  {selectedCustomer ? selectedCustomer.name : 'Seleccionar cliente'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          
          {errors.customer && (
            <Text style={styles.errorText}>{errors.customer}</Text>
          )}
        </Card>

        {/* Productos */}
        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Productos</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowProductSelector(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary[500]} />
              <Text style={styles.addButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {quoteItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <Ionicons name="cube-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyItemsText}>No hay productos agregados</Text>
              <Button
                title="Agregar Producto"
                variant="outline"
                onPress={() => setShowProductSelector(true)}
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : (
            <View style={styles.itemsList}>
              {quoteItems.map((item) => (
                <View key={item.id} style={styles.quoteItem}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.product?.name}</Text>
                      <Text style={styles.itemCode}>Código: {item.product?.code}</Text>
                    </View>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.itemActionButton}
                        onPress={() => editItem(item)}
                      >
                        <Ionicons name="create" size={16} color={colors.primary[500]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.itemActionButton}
                        onPress={() => removeItem(item.id)}
                      >
                        <Ionicons name="trash" size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemDetail}>
                      Cantidad: <Text style={styles.itemDetailValue}>{item.quantity}</Text>
                    </Text>
                    <Text style={styles.itemDetail}>
                      Precio: <Text style={styles.itemDetailValue}>{formatCurrency(item.unit_price)}</Text>
                    </Text>
                    {item.discount > 0 && (
                      <Text style={styles.itemDetail}>
                        Descuento: <Text style={styles.itemDetailValue}>{item.discount}%</Text>
                      </Text>
                    )}
                    <Text style={styles.itemTotal}>
                      Total: {formatCurrency(item.total_price)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {errors.items && (
            <Text style={styles.errorText}>{errors.items}</Text>
          )}
        </Card>

        {/* Configuración del presupuesto */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Detalles del Presupuesto</Text>
          
          <Input
            label="Válido hasta *"
            value={formData.valid_until}
            onChangeText={(value) => updateFormData('valid_until', value)}
            error={errors.valid_until}
            placeholder="YYYY-MM-DD"
            leftIcon={<Ionicons name="calendar" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Descuento General (%)"
            value={formData.discount}
            onChangeText={(value) => updateFormData('discount', value)}
            error={errors.discount}
            placeholder="0"
            keyboardType="decimal-pad"
            leftIcon={<Text style={styles.percentSymbol}>%</Text>}
          />

          <Input
            label="Términos y Condiciones"
            value={formData.terms_conditions}
            onChangeText={(value) => updateFormData('terms_conditions', value)}
            error={errors.terms_conditions}
            multiline
            numberOfLines={3}
            placeholder="Términos y condiciones del presupuesto"
            leftIcon={<Ionicons name="document-text" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Notas"
            value={formData.notes}
            onChangeText={(value) => updateFormData('notes', value)}
            error={errors.notes}
            multiline
            numberOfLines={2}
            placeholder="Notas adicionales (opcional)"
            leftIcon={<Ionicons name="chatbubble" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Resumen */}
        {quoteItems.length > 0 && (
          <Card style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.subtotal)}</Text>
            </View>
            
            {totals.discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Descuento ({formData.discount}%):</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  -{formatCurrency(totals.discountAmount)}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>IVA (16%):</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.tax)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total:</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(totals.total)}</Text>
            </View>
          </Card>
        )}

        {/* Botones */}
        <View style={styles.actions}>
          <Button
            title="Cancelar"
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
          <Button
            title="Crear Presupuesto"
            onPress={handleSave}
            loading={saving}
            disabled={quoteItems.length === 0}
            style={styles.saveButton}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modales */}
      <CustomerSelector
        visible={showCustomerSelector}
        customers={customers}
        onSelect={(customer) => {
          setSelectedCustomer(customer);
          setShowCustomerSelector(false);
          if (errors.customer) {
            setErrors(prev => ({ ...prev, customer: '' }));
          }
        }}
        onClose={() => setShowCustomerSelector(false)}
        loading={false}
        searchText={customerSearchText}
        onSearchChange={setCustomerSearchText}
      />

      <ProductSelector
        visible={showProductSelector}
        products={products}
        onSelect={addOrUpdateItem}
        onClose={() => setShowProductSelector(false)}
        loading={false}
        searchText={productSearchText}
        onSearchChange={setProductSearchText}
      />

      {/* Modal para editar item */}
      <Modal visible={showItemModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Editar Producto' : 'Configurar Producto'}
            </Text>
            <TouchableOpacity onPress={() => setShowItemModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.itemModalContent}>
             {(editingItem?.product || selectedProductForItem) && (
            <Card style={styles.productInfoCard}>
              <Text style={styles.productInfoName}>
                {editingItem?.product?.name || selectedProductForItem?.name}
              </Text>
              <Text style={styles.productInfoCode}>
                Código: {editingItem?.product?.code || selectedProductForItem?.code}
              </Text>
              <Text style={styles.productInfoStock}>
                Stock disponible: {editingItem?.product?.stock ?? selectedProductForItem?.stock}
              </Text>
            </Card>
          )}

            <Card style={styles.itemFormCard}>
              <Input
                label="Cantidad *"
                value={itemFormData.quantity}
                onChangeText={(value) => setItemFormData(prev => ({ ...prev, quantity: value }))}
                keyboardType="numeric"
                placeholder="1"
                leftIcon={<Ionicons name="layers" size={20} color={colors.text.tertiary} />}
              />

              <Input
                label="Precio Unitario *"
                value={itemFormData.unit_price}
                onChangeText={(value) => setItemFormData(prev => ({ ...prev, unit_price: value }))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                leftIcon={<Text style={styles.currencySymbol}>$</Text>}
              />

              <Input
                label="Descuento (%)"
                value={itemFormData.discount}
                onChangeText={(value) => setItemFormData(prev => ({ ...prev, discount: value }))}
                keyboardType="decimal-pad"
                placeholder="0"
                leftIcon={<Text style={styles.percentSymbol}>%</Text>}
              />

              {/* Vista previa del total */}
              <View style={styles.itemPreview}>
                <Text style={styles.itemPreviewLabel}>Total del item:</Text>
                <Text style={styles.itemPreviewValue}>
                  {formatCurrency(
                    calculateItemTotal(
                      Number(itemFormData.quantity) || 0,
                      Number(itemFormData.unit_price) || 0,
                      Number(itemFormData.discount) || 0
                    )
                  )}
                </Text>
              </View>
            </Card>

            <View style={styles.itemModalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowItemModal(false)}
                style={styles.itemCancelButton}
              />
              <Button
                title={editingItem ? 'Actualizar' : 'Agregar'}
                onPress={() => handleSaveItem()}
                style={styles.itemSaveButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}