// app/quotes/new.tsx - Versión simplificada y funcional

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { formatCurrency } from '../../utils/helpers';

export default function NewQuoteScreen(): JSX.Element {
  const { customer_id, preselected_products } = useLocalSearchParams();

  // Estados principales
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Datos
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [quoteItems, setQuoteItems] = useState([]);
  
  // Modales
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Búsqueda
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  
  // Formulario
  const [formData, setFormData] = useState({
    valid_until: '',
    terms_conditions: 'Los precios están sujetos a cambios sin previo aviso. Válido por el tiempo especificado.',
    notes: '',
    discount: '0',
  });
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [itemData, setItemData] = useState({
    quantity: '1',
    unit_price: '0',
    discount: '0',
  });
  
  const [errors, setErrors] = useState({});

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Preseleccionar cliente
  useEffect(() => {
    if (customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === Number(customer_id));
      if (customer) setSelectedCustomer(customer);
    }
  }, [customer_id, customers]);

  // Preseleccionar productos
  useEffect(() => {
    if (preselected_products && products.length > 0) {
      const productIds = preselected_products.split(',').map(id => Number(id.trim()));
      const selectedProducts = products.filter(p => productIds.includes(p.id));
      
      const newItems = selectedProducts.map(product => ({
        id: `pre_${product.id}`,
        product_id: product.id,
        product,
        quantity: 1,
        unit_price: product.price,
        discount: 0,
        total_price: product.price,
      }));
      
      setQuoteItems(newItems);
    }
  }, [preselected_products, products]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar empresa
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      setSelectedCompany(company);
      
      // Cargar datos
      const [customersRes, productsRes] = await Promise.all([
        api.getCustomers({ per_page: 100 }),
        api.getProducts({ per_page: 100, company_id: company?.id }),
      ]);
      
      setCustomers(customersRes.data.data || []);
      setProducts(productsRes.data.data || []);
      
      // Fecha por defecto (30 días)
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

  // Filtrar búsquedas
  const filteredCustomers = customers.filter(c => 
    c.status === 'active' && 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.status === 'active' && 
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Cálculos
  const calculateItemTotal = (quantity, unitPrice, discount) => {
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    return subtotal - discountAmount;
  };

  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => sum + Number(item.total_price), 0);
    const discountAmount = subtotal * (Number(formData.discount) / 100);
    const tax = (subtotal - discountAmount) * 0.16;
    const total = subtotal - discountAmount + tax;    
    return { subtotal, discountAmount, tax, total };
  };

  // Agregar producto
  const selectProduct = (product) => {
    setSelectedProduct(product);
    setItemData({
      quantity: '1',
      unit_price: product.price.toString(),
      discount: '0',
    });
    setShowProductSelector(false);
    setShowItemModal(true);
  };

  // Guardar item
  const saveItem = () => {
    const quantity = Number(itemData.quantity);
    const unitPrice = Number(itemData.unit_price);
    const discount = Number(itemData.discount);

    if (quantity <= 0 || unitPrice < 0 || discount < 0 || discount > 100) {
      Alert.alert('Error', 'Revisa los valores ingresados');
      return;
    }

    const totalPrice = calculateItemTotal(quantity, unitPrice, discount);

    const newItem = {
      id: Date.now().toString(),
      product_id: selectedProduct.id,
      product: selectedProduct,
      quantity,
      unit_price: unitPrice,
      discount,
      total_price: totalPrice,
    };

    setQuoteItems(prev => [...prev, newItem]);
    setShowItemModal(false);
    setSelectedProduct(null);
  };

  // Eliminar item
  const removeItem = (itemId) => {
    Alert.alert(
      'Eliminar Producto',
      '¿Eliminar este producto del presupuesto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => 
          setQuoteItems(prev => prev.filter(item => item.id !== itemId))
        },
      ]
    );
  };

  // Validar y guardar presupuesto
  const saveQuote = async () => {
    const newErrors = {};

    if (!selectedCustomer) newErrors.customer = 'Selecciona un cliente';
    if (quoteItems.length === 0) newErrors.items = 'Agrega al menos un producto';
    if (!formData.valid_until) newErrors.valid_until = 'Selecciona fecha de validez';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Error', 'Completa todos los campos requeridos');
      return;
    }

    try {
      setSaving(true);
      
      const quoteData = {
        customer_id: selectedCustomer.id,
        company_id: selectedCompany?.id,
        items: quoteItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          name: item.product?.name,
        })),
        valid_until: formData.valid_until,
        terms_conditions: formData.terms_conditions.trim(),
        notes: formData.notes.trim(),
        discount: Number(formData.discount),
      };
      
      const quote = await api.createQuote(quoteData);
      
      Alert.alert('Éxito', 'Presupuesto creado correctamente');
      router.replace(`/quotes/${quote.data.id}`);
      
    } catch (error) {
      console.error('Error creating quote:', error);
      Alert.alert('Error', 'No se pudo crear el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  const totals = calculateTotals();

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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo Presupuesto</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Cliente */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowCustomerSelector(true)}
          >
            <Text style={styles.selectorText}>
              {selectedCustomer ? selectedCustomer.name : 'Seleccionar cliente'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          {errors.customer && <Text style={styles.error}>{errors.customer}</Text>}
        </Card>

        {/* Productos */}
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Productos ({quoteItems.length})</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowProductSelector(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary[500]} />
            </TouchableOpacity>
          </View>

          {quoteItems.length === 0 ? (
            <Text style={styles.emptyText}>No hay productos agregados</Text>
          ) : (
            quoteItems.map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product?.name}</Text>
                  <Text style={styles.itemDetails}>
                    Cant: {item.quantity} • Precio: {formatCurrency(item.unit_price)}
                    {item.discount > 0 && ` • Desc: ${item.discount}%`}
                  </Text>
                </View>
                <View style={styles.itemActions}>
                  <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Ionicons name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          {errors.items && <Text style={styles.error}>{errors.items}</Text>}
        </Card>

        {/* Configuración */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          
          <Input
            label="Válido hasta"
            value={formData.valid_until}
            onChangeText={(value) => setFormData(prev => ({ ...prev, valid_until: value }))}
            error={errors.valid_until}
          />

          <Input
            label="Descuento general (%)"
            value={formData.discount}
            onChangeText={(value) => setFormData(prev => ({ ...prev, discount: value }))}
            keyboardType="numeric"
          />

          <Input
            label="Términos y condiciones"
            value={formData.terms_conditions}
            onChangeText={(value) => setFormData(prev => ({ ...prev, terms_conditions: value }))}
            multiline
            numberOfLines={3}
          />

          <Input
            label="Notas"
            value={formData.notes}
            onChangeText={(value) => setFormData(prev => ({ ...prev, notes: value }))}
            multiline
          />
        </Card>

        {/* Resumen */}
        {quoteItems.length > 0 && (
          <Card style={[styles.card, styles.summaryCard]}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.summaryRow}>
              <Text>Subtotal:</Text>
              <Text>{formatCurrency(totals.subtotal)}</Text>
            </View>
            {totals.discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text>Descuento:</Text>
                <Text style={{ color: colors.error }}>-{formatCurrency(totals.discountAmount)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text>IVA (16%):</Text>
              <Text>{formatCurrency(totals.tax)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.total)}</Text>
            </View>
          </Card>
        )}

        {/* Botones */}
        <View style={styles.buttons}>
          <Button
            title="Cancelar"
            variant="outline"
            onPress={() => router.back()}
            style={styles.button}
          />
          <Button
            title="Crear Presupuesto"
            onPress={saveQuote}
            loading={saving}
            disabled={!selectedCustomer || quoteItems.length === 0}
            style={styles.button}
          />
        </View>
      </ScrollView>

      {/* Modal Selector de Clientes */}
      <Modal visible={showCustomerSelector} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
            <TouchableOpacity onPress={() => setShowCustomerSelector(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <Input
            placeholder="Buscar cliente..."
            value={customerSearch}
            onChangeText={setCustomerSearch}
            style={styles.searchInput}
          />

          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setSelectedCustomer(item);
                  setShowCustomerSelector(false);
                  setErrors(prev => ({ ...prev, customer: '' }));
                }}
              >
                <Text style={styles.modalItemText}>{item.name}</Text>
                {item.email && <Text style={styles.modalItemSubtext}>{item.email}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Modal Selector de Productos */}
      <Modal visible={showProductSelector} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar Producto</Text>
            <TouchableOpacity onPress={() => setShowProductSelector(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <Input
            placeholder="Buscar producto..."
            value={productSearch}
            onChangeText={setProductSearch}
            style={styles.searchInput}
          />

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => selectProduct(item)}
              >
                <Text style={styles.modalItemText}>{item.name}</Text>
                <Text style={styles.modalItemSubtext}>
                  {formatCurrency(item.price)} • Stock: {item.stock}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Modal Configurar Item */}
      <Modal visible={showItemModal} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configurar Producto</Text>
            <TouchableOpacity onPress={() => setShowItemModal(false)}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedProduct && (
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{selectedProduct.name}</Text>
                <Text style={styles.productDetails}>
                  Precio: {formatCurrency(selectedProduct.price)} • Stock: {selectedProduct.stock}
                </Text>
              </View>
            )}

            <Input
              label="Cantidad"
              value={itemData.quantity}
              onChangeText={(value) => setItemData(prev => ({ ...prev, quantity: value }))}
              keyboardType="numeric"
            />

            <Input
              label="Precio unitario"
              value={itemData.unit_price}
              onChangeText={(value) => setItemData(prev => ({ ...prev, unit_price: value }))}
              keyboardType="numeric"
            />

            <Input
              label="Descuento (%)"
              value={itemData.discount}
              onChangeText={(value) => setItemData(prev => ({ ...prev, discount: value }))}
              keyboardType="numeric"
            />

            <View style={styles.itemPreview}>
              <Text>Total: {formatCurrency(
                calculateItemTotal(
                  Number(itemData.quantity) || 0,
                  Number(itemData.unit_price) || 0,
                  Number(itemData.discount) || 0
                )
              )}</Text>
            </View>

            <View style={styles.buttons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowItemModal(false)}
                style={styles.button}
              />
              <Button
                title="Agregar"
                onPress={saveItem}
                style={styles.button}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.primary[50],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
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
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  selectorText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  addButton: {
    padding: spacing.sm,
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.md,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    padding: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  itemDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  itemActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  itemTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.primary[200],
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  totalValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  error: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
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
  },
  searchInput: {
    margin: spacing.lg,
    marginBottom: 0,
  },
  modalItem: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  modalItemSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  modalContent: {
    padding: spacing.lg,
  },
  productInfo: {
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  productName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  productDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  itemPreview: {
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});