import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    ListRenderItem,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { Customer, Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';

interface SaleItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total: number;
}

interface CustomerSelectorProps {
  visible: boolean;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer) => void;
  onClose: () => void;
  loading: boolean;
}

interface ProductSelectorProps {
  visible: boolean;
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
  loading: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  visible,
  customers,
  selectedCustomer,
  onSelect,
  onClose,
  loading,
}) => {
  const [search, setSearch] = useState('');
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.email?.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone?.includes(search)
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
        
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          style={{ margin: spacing.lg }}
        />

        {loading ? (
          <LoadingSpinner text="Cargando clientes..." />
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.customerItem,
                  selectedCustomer?.id === item.id && styles.customerItemSelected
                ]}
                onPress={() => onSelect(item)}
              >
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{item.name}</Text>
                  {item.email && (
                    <Text style={styles.customerDetail}>{item.email}</Text>
                  )}
                  {item.phone && (
                    <Text style={styles.customerDetail}>{item.phone}</Text>
                  )}
                </View>
                {selectedCustomer?.id === item.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary[500]} />
                )}
              </TouchableOpacity>
            )}
            style={styles.customerList}
          />
        )}
      </View>
    </Modal>
  );
};

const ProductSelector: React.FC<ProductSelectorProps> = ({
  visible,
  products,
  onSelect,
  onClose,
  loading,
}) => {
  const [search, setSearch] = useState('');
  
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.code.toLowerCase().includes(search.toLowerCase())
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
        
        <Input
          placeholder="Buscar producto..."
          value={search}
          onChangeText={setSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          style={{ margin: spacing.lg }}
        />

        {loading ? (
          <LoadingSpinner text="Cargando productos..." />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productItem}
                onPress={() => onSelect(item)}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productCode}>#{item.code}</Text>
                  <Text style={styles.productPrice}>{formatCurrency(item.price)}</Text>
                </View>
                <View style={styles.productStock}>
                  <Text style={styles.stockText}>Stock: {item.stock}</Text>
                  {item.stock <= item.min_stock && (
                    <Ionicons name="warning" size={16} color={colors.warning} />
                  )}
                </View>
              </TouchableOpacity>
            )}
            style={styles.productList}
          />
        )}
      </View>
    </Modal>
  );
};

export default function NewSaleScreen(): JSX.Element {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer' | 'credit'>('cash');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('');
  
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersResponse, productsResponse] = await Promise.all([
        api.getCustomers({ per_page: 100 }),
        api.getProducts({ per_page: 100 }),
      ]);
      
      setCustomers(customersResponse.data);
      setProducts(productsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudo cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    const existingItem = saleItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setSaleItems(items =>
        items.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unit_price,
              }
            : item
        )
      );
    } else {
      const newItem: SaleItem = {
        product,
        quantity: 1,
        unit_price: product.price,
        total: product.price,
      };
      setSaleItems(items => [...items, newItem]);
    }
    
    setShowProductSelector(false);
  };

  const updateItemQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setSaleItems(items =>
      items.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              total: quantity * item.unit_price,
            }
          : item
      )
    );
  };

  const removeItem = (productId: number) => {
    setSaleItems(items => items.filter(item => item.product.id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = discount ? Number(discount) : 0;
    const tax = (subtotal - discountAmount) * 0.18; // IGV 18%
    const total = subtotal + tax - discountAmount;

    return { subtotal, tax, total, discountAmount };
  };

  const handleSave = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Debes seleccionar un cliente');
      return;
    }

    if (saleItems.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un producto');
      return;
    }

    try {
      setSaving(true);
      const { subtotal, tax, total, discountAmount } = calculateTotals();

      const saleData = {
        customer_id: selectedCustomer.id,
        items: saleItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: 0,
        })),
        payment_method: paymentMethod,
        discount: discountAmount,
        notes: notes.trim() || undefined,
      };

      const sale = await api.createSale(saleData);
      Alert.alert('Éxito', 'Venta creada correctamente');
      router.replace(`/sales/${sale.id}`);
    } catch (error: any) {
      console.error('Error creating sale:', error);
      const message = error.response?.data?.message || 'Error al crear la venta';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  const renderSaleItem: ListRenderItem<SaleItem> = ({ item }) => (
    <View style={styles.saleItem}>
      <View style={styles.saleItemInfo}>
        <Text style={styles.saleItemName}>{item.product.name}</Text>
        <Text style={styles.saleItemCode}>#{item.product.code}</Text>
        <Text style={styles.saleItemPrice}>{formatCurrency(item.unit_price)}</Text>
      </View>
      
      <View style={styles.saleItemControls}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateItemQuantity(item.product.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={16} color={colors.text.primary} />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateItemQuantity(item.product.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={16} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.saleItemTotal}>{formatCurrency(item.total)}</Text>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeItem(item.product.id)}
        >
          <Ionicons name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Venta</Text>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Cliente seleccionado */}
          <Card style={styles.customerCard}>
            <TouchableOpacity
              style={styles.customerSelector}
              onPress={() => setShowCustomerSelector(true)}
            >
              <View style={styles.customerSelectorContent}>
                <Ionicons name="person" size={20} color={colors.primary[500]} />
                <View style={styles.customerSelectorText}>
                  <Text style={styles.customerSelectorLabel}>Cliente</Text>
                  <Text style={styles.customerSelectorValue}>
                    {selectedCustomer ? selectedCustomer.name : 'Seleccionar cliente'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          </Card>

          {/* Lista de productos */}
          <Card style={styles.itemsCard}>
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsTitle}>Productos ({saleItems.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowProductSelector(true)}
              >
                <Ionicons name="add" size={20} color={colors.text.inverse} />
              </TouchableOpacity>
            </View>

            {saleItems.length > 0 ? (
              <View style={styles.itemsListContainer}>
                <FlatList
                  data={saleItems}
                  keyExtractor={(item) => item.product.id.toString()}
                  renderItem={renderSaleItem}
                  style={styles.itemsList}
                  nestedScrollEnabled={true}
                  scrollEnabled={false}
                />
              </View>
            ) : (
              <View style={styles.emptyItems}>
                <Ionicons name="cube" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyItemsText}>No hay productos agregados</Text>
              </View>
            )}
          </Card>

          {/* Totales */}
          <Card style={styles.totalsCard}>
            <Text style={styles.totalsTitle}>Resumen</Text>
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            
            <Input
              label="Descuento"
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="0.00"
              leftIcon={<Text style={styles.currencySymbol}>S/</Text>}
            />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IGV (18%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
            </View>
            
            <View style={[styles.totalRow, styles.totalRowFinal]}>
              <Text style={styles.totalLabelFinal}>Total:</Text>
              <Text style={styles.totalValueFinal}>{formatCurrency(total)}</Text>
            </View>
          </Card>

          {/* Método de pago */}
          <Card style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>Método de Pago</Text>
            <View style={styles.paymentMethods}>
              {[
                { value: 'cash', label: 'Efectivo', icon: 'cash' },
                { value: 'card', label: 'Tarjeta', icon: 'card' },
                { value: 'transfer', label: 'Transferencia', icon: 'wallet' },
                { value: 'credit', label: 'Crédito', icon: 'time' },
              ].map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.paymentMethod,
                    paymentMethod === method.value && styles.paymentMethodSelected
                  ]}
                  onPress={() => setPaymentMethod(method.value as any)}
                >
                  <Ionicons 
                    name={method.icon as any} 
                    size={20} 
                    color={paymentMethod === method.value ? colors.primary[500] : colors.text.secondary} 
                  />
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === method.value && styles.paymentMethodTextSelected
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Notas */}
          <Card style={styles.notesCard}>
            <Input
              label="Notas (opcional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Agregar notas a la venta..."
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Botón de guardar */}
          <Button
            title="Crear Venta"
            onPress={handleSave}
            loading={saving}
            disabled={!selectedCustomer || saleItems.length === 0}
            style={styles.saveButton}
          />
          
          {/* Espaciado inferior para scroll */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Modales */}
      <CustomerSelector
        visible={showCustomerSelector}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelect={setSelectedCustomer}
        onClose={() => setShowCustomerSelector(false)}
        loading={false}
      />

      <ProductSelector
        visible={showProductSelector}
        products={products}
        onSelect={addProduct}
        onClose={() => setShowProductSelector(false)}
        loading={false}
      />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  customerCard: {
    marginBottom: spacing.lg,
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerSelectorText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  customerSelectorLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  customerSelectorValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  itemsCard: {
    marginBottom: spacing.lg,
    maxHeight: 300,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  itemsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsList: {
    maxHeight: 200,
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
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  saleItemInfo: {
    flex: 1,
  },
  saleItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  saleItemCode: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  saleItemPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  saleItemControls: {
    alignItems: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quantityButton: {
    backgroundColor: colors.gray[100],
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: spacing.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  saleItemTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.sm,
  },
  removeButton: {
    padding: spacing.xs,
  },
  totalsCard: {
    marginBottom: spacing.lg,
  },
  totalsTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  totalLabelFinal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  totalValueFinal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  currencySymbol: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  paymentCard: {
    marginBottom: spacing.lg,
  },
  paymentTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paymentMethod: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.surface,
  },
  paymentMethodSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  paymentMethodText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  paymentMethodTextSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  notesCard: {
    marginBottom: spacing.lg,
  },
  saveButton: {
    marginBottom: spacing.xl,
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
  customerList: {
    flex: 1,
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  customerItemSelected: {
    backgroundColor: colors.primary[50],
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  customerDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  productList: {
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  productCode: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  productPrice: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
  },
  productStock: {
    alignItems: 'flex-end',
  },
  stockText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
});