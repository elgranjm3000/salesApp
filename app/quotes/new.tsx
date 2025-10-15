// app/quotes/new.tsx - Versión con integración BCV

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
//import DateTimePicker from '@react-native-community/datetimepicker';

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
  const { customer_id, preselected_products, quantity } = useLocalSearchParams();

  // Estados principales
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Datos
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [quoteItems, setQuoteItems] = useState([]);
  
  // BCV
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string>('');
  const [loadingRate, setLoadingRate] = useState(false);
  
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
  const [editingItemId, setEditingItemId] = useState(null);

  // Función para obtener la tasa BCV
  const fetchBCVRate = async () => {
    try {
      setLoadingRate(true);
      
      // Intenta múltiples APIs para mayor confiabilidad
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

      // API 2: Fixer.io (alternativa)
      if (!rate) {
        try {
          const response2 = await fetch('https://api.fixer.io/latest?access_key=YOUR_API_KEY&symbols=VES');
          const data2 = await response2.json();
          if (data2.rates?.VES) {
            rate = data2.rates.VES;
            date = data2.date || new Date().toLocaleDateString();
          }
        } catch (error) {
          console.log('API 2 falló:', error);
        }
      }

      // API 3: DolarToday (específica para Venezuela)
      if (!rate) {
        try {
          const response3 = await fetch('https://s3.amazonaws.com/dolartoday/data.json');
          const data3 = await response3.json();
          if (data3.USD?.bcv) {
            rate = data3.USD.bcv;
            date = 'DolarToday';
          }
        } catch (error) {
          console.log('API 3 falló:', error);
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
        // Intentar cargar desde cache
        const cachedRate = await AsyncStorage.getItem('bcv_rate');
        if (cachedRate) {
          const cached = JSON.parse(cachedRate);
          // Si el cache es de menos de 24 horas, usarlo
          if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
            setBcvRate(cached.rate);
            setRateDate(`${cached.date} (cache)`);
          }
        }
        
        // Si no hay cache válido, usar tasa de respaldo
        if (!bcvRate) {
          setBcvRate(36.5); // Actualizar según necesidad
          setRateDate('Tasa aproximada');
        }
      }
      
    } catch (error) {
      console.log('Error al obtener tasa BCV:', error);
      // Tasa de respaldo
      setBcvRate(36.5);
      setRateDate('Tasa aproximada');
    } finally {
      setLoadingRate(false);
    }
  };

  // Función para formatear montos con BCV
  const formatWithBCV = (amount: number) => {
    const usdFormatted = formatCurrency(amount);
    if (bcvRate) {
      const bcvAmount = (amount * bcvRate).toLocaleString('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return `${usdFormatted}\n${bcvAmount}`;
    }
    return usdFormatted;
  };

  // Función para mostrar solo BCV
  const formatBCV = (amount: number) => {
    if (bcvRate) {
      return (amount * bcvRate).toLocaleString('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return 'N/A';
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    fetchBCVRate();
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
      const quatityProducts = quantity.split(',').map(id => Number(id.trim()));
      const selectedProducts = products.filter(p => productIds.includes(p.id));
      console.log('cantidad Preselected products:', quatityProducts);
      
      const newItems = selectedProducts.map((product, index) => {
        const quantity = quatityProducts[index] || 1;
        return {
          id: `pre_${product.id}`,
          product_id: product.id,
          product,
          quantity,
          unit_price: product.price,
          discount: 0,
          total_price: product.price * quantity,
        };
      });
      
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
        api.getCustomers({ per_page: 100, company_id: company?.id }),
        api.getProducts({ per_page: 100, company_id: company?.id }),
      ]);
      
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      
      // Fecha por defecto (30 días)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 1);
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
    (p.status === 'active') && 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Función auxiliar para obtener stock disponible
  const getAvailableStock = (product) => {
    const existingItem = quoteItems.find(item => 
      item.product_id === product.id && item.id !== editingItemId
    );
    return product.stock - (existingItem ? existingItem.quantity : 0);
  };

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
    const availableStock = getAvailableStock(product);
    
    if (availableStock <= 0) {
      Alert.alert(
        'Sin stock disponible',
        'Ya has agregado todo el stock disponible de este producto al presupuesto.'
      );
      return;
    }

    setSelectedProduct(product);
    setItemData({
      quantity: '1',
      unit_price: product.price.toString(),
      discount: '0',
    });
    setShowProductSelector(false);
    setShowItemModal(true);
  };

  // Editar item existente
  const editItem = (item) => {
    setSelectedProduct(item.product);
    setEditingItemId(item.id);
    setItemData({
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      discount: item.discount.toString(),
    });
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

    // Validar stock disponible
    const availableStock = getAvailableStock(selectedProduct);
    
    if (quantity > availableStock) {
      Alert.alert(
        'Stock insuficiente', 
        `Solo hay ${availableStock} unidades disponibles para este producto.`
      );
      return;
    }

    const totalPrice = calculateItemTotal(quantity, unitPrice, discount);

    if (editingItemId) {
      // Editando un item existente
      setQuoteItems(prev => prev.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            quantity,
            unit_price: unitPrice,
            discount,
            total_price: totalPrice,
          };
        }
        return item;
      }));
    } else {
      // Verificar si el producto ya existe
      const existingItemIndex = quoteItems.findIndex(item => item.product_id === selectedProduct.id);
      
      if (existingItemIndex >= 0) {
        // Si el producto ya existe, sumar cantidades
        setQuoteItems(prev => prev.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + quantity;
            const newTotalPrice = calculateItemTotal(newQuantity, unitPrice, discount);
            return {
              ...item,
              quantity: newQuantity,
              unit_price: unitPrice,
              discount,
              total_price: newTotalPrice,
            };
          }
          return item;
        }));
      } else {
        // Si es un producto nuevo, agregarlo
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
      }
    }

    // Resetear estados
    setShowItemModal(false);
    setSelectedProduct(null);
    setEditingItemId(null);
    setItemData({
      quantity: '1',
      unit_price: '0',
      discount: '0',
    });
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
        bcv_rate: bcvRate,
        bcv_date: rateDate,
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

  // Cancelar edición de modal
  const cancelItemModal = () => {
    setShowItemModal(false);
    setSelectedProduct(null);
    setEditingItemId(null);
    setItemData({
      quantity: '1',
      unit_price: '0',
      discount: '0',
    });
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
        {/* Tasa BCV */}
        {bcvRate && (
          <Card style={styles.exchangeCard}>
            <View style={styles.exchangeHeader}>
              <Ionicons name="swap-horizontal" size={18} color={colors.warning} />
              <Text style={styles.exchangeTitle}>Tasa de Cambio</Text>
              <TouchableOpacity 
                onPress={fetchBCVRate} 
                style={styles.refreshButton}
                disabled={loadingRate}
              >
                <Ionicons 
                  name="refresh" 
                  size={16} 
                  color={loadingRate ? colors.gray[400] : colors.warning} 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.exchangeRate}>
              1 USD = {bcvRate.toFixed(2)} Bs.
            </Text>
            <Text style={styles.exchangeDate}>
              {loadingRate ? 'Actualizando...' : `Actualizada: ${rateDate}`}
            </Text>
          </Card>
        )}

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
                <TouchableOpacity 
                  style={styles.itemInfo}
                  onPress={() => editItem(item)}
                >
                  <Text style={styles.itemName}>{item.product?.name}</Text>
                  <Text style={styles.itemDetails}>
                    Cant: {item.quantity} • Precio: {formatCurrency(item.unit_price)}
                    {item.discount > 0 && ` • Desc: ${item.discount}%`}
                  </Text>
                  <Text style={styles.itemStock}>
                    Stock disponible: {getAvailableStock(item.product) + item.quantity}
                  </Text>
                </TouchableOpacity>
                <View style={styles.itemActions}>
                  <View style={styles.priceContainer}>
                    <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
                    {bcvRate && (
                      <Text style={styles.itemTotalBCV}>
                        {formatBCV(item.total_price)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => editItem(item)}>
                      <Ionicons name="create-outline" size={16} color={colors.primary[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeItem(item.id)}>
                      <Ionicons name="trash" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
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
            editable={false}
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
            label="Observaciones"
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
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <View style={styles.summaryAmounts}>
                <Text style={styles.summaryValue}>{formatCurrency(totals.subtotal)}</Text>
                {bcvRate && (
                  <Text style={styles.summaryValueBCV}>{formatBCV(totals.subtotal)}</Text>
                )}
              </View>
            </View>
            
            {totals.discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Descuento:</Text>
                <View style={styles.summaryAmounts}>
                  <Text style={[styles.summaryValue, { color: colors.error }]}>
                    -{formatCurrency(totals.discountAmount)}
                  </Text>
                  {bcvRate && (
                    <Text style={[styles.summaryValueBCV, { color: colors.error }]}>
                      -{formatBCV(totals.discountAmount)}
                    </Text>
                  )}
                </View>
              </View>
            )}
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>IVA (16%):</Text>
              <View style={styles.summaryAmounts}>
                <Text style={styles.summaryValue}>{formatCurrency(totals.tax)}</Text>
                {bcvRate && (
                  <Text style={styles.summaryValueBCV}>{formatBCV(totals.tax)}</Text>
                )}
              </View>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <View style={styles.summaryAmounts}>
                <Text style={styles.totalValue}>{formatCurrency(totals.total)}</Text>
                {bcvRate && (
                  <Text style={styles.totalValueBCV}>{formatBCV(totals.total)}</Text>
                )}
              </View>
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
            renderItem={({ item }) => {
              const availableStock = getAvailableStock(item);
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    availableStock <= 0 && styles.modalItemDisabled
                  ]}
                  onPress={() => selectProduct(item)}
                  disabled={availableStock <= 0}
                >
                  <View style={styles.productModalItem}>
                    <View style={styles.productModalInfo}>
                      <Text style={[
                        styles.modalItemText,
                        availableStock <= 0 && styles.modalItemTextDisabled
                      ]}>
                        {item.name} 
                      </Text>
                      <Text style={[
                        styles.modalItemSubtext,
                        availableStock <= 0 && styles.modalItemTextDisabled
                      ]}>
                        Codigo:  {item.code} • Stock total: {item.stock} • Disponible: {availableStock}
                      </Text>
                      {availableStock <= 0 && (
                        <Text style={styles.noStockText}>Sin stock disponible</Text>
                      )}
                    </View>
                    <View style={styles.productModalPrice}>
                      <Text style={styles.modalItemPrice}>
                        {formatCurrency(item.price)}
                      </Text>
                      {bcvRate && (
                        <Text style={styles.modalItemPriceBCV}>
                          {formatBCV(item.price)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      {/* Modal Configurar Item */}
      <Modal visible={showItemModal} animationType="slide">
       <ScrollView>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItemId ? 'Editar Producto' : 'Configurar Producto'}
            </Text>
            <TouchableOpacity onPress={cancelItemModal}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedProduct && (
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{selectedProduct.name}</Text>
                <View style={styles.productPriceInfo}>
                  <View>
                    <Text style={styles.productDetails}>
                      Precio: {formatCurrency(selectedProduct.price)}
                    </Text>
                    {bcvRate && (
                      <Text style={styles.productDetailsBCV}>
                        {formatBCV(selectedProduct.price)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.productDetails}>
                    Stock total: {selectedProduct.stock} • Disponible: {getAvailableStock(selectedProduct)}
                  </Text>
                </View>
              </View>
            )}

            <Input
              label={`Cantidad (Máx: ${selectedProduct ? getAvailableStock(selectedProduct) : 0})`}
              value={itemData.quantity}
              onChangeText={(value) => {
                setItemData(prev => ({ ...prev, quantity: value }));
              }}
              keyboardType="numeric"
              error={
                selectedProduct && Number(itemData.quantity) > getAvailableStock(selectedProduct)
                  ? `Máximo disponible: ${getAvailableStock(selectedProduct)}`
                  : undefined
              }
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
              <Text style={styles.previewLabel}>Total del item:</Text>
              <View style={styles.previewAmounts}>
                <Text style={styles.previewTotal}>
                  {formatCurrency(
                    calculateItemTotal(
                      Number(itemData.quantity) || 0,
                      Number(itemData.unit_price) || 0,
                      Number(itemData.discount) || 0
                    )
                  )}
                </Text>
                {bcvRate && (
                  <Text style={styles.previewTotalBCV}>
                    {formatBCV(
                      calculateItemTotal(
                        Number(itemData.quantity) || 0,
                        Number(itemData.unit_price) || 0,
                        Number(itemData.discount) || 0
                      )
                    )}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.buttons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={cancelItemModal}
                style={styles.button}
              />
              <Button
                title={editingItemId ? 'Actualizar' : 'Agregar'}
                onPress={saveItem}
                style={styles.button}
                disabled={
                  selectedProduct && Number(itemData.quantity) > getAvailableStock(selectedProduct)
                }
              />
            </View>
          </View>
        </View>
        </ScrollView> 
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
    marginTop: spacing.lg
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

  // Exchange Rate Card
  exchangeCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  exchangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  exchangeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
    marginLeft: spacing.xs,
    flex: 1,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  exchangeRate: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  exchangeDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  card: {
    marginBottom: spacing.lg,
  },
  summaryCard: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
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
  itemStock: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  itemTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  itemTotalBCV: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Summary Styles
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  summaryAmounts: {
    alignItems: 'flex-end',
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  summaryValueBCV: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.primary[200],
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  totalValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  totalValueBCV: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    marginTop: spacing.xs,
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
    marginBottom: 50,
  },
  button: {
    flex: 1,
  },

  // Modal Styles
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
  modalItemDisabled: {
    opacity: 0.5,
  },
  modalItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  modalItemTextDisabled: {
    color: colors.text.secondary,
  },
  modalItemSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  noStockText: {
    fontSize: typography.fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Product Modal Item
  productModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productModalInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  productModalPrice: {
    alignItems: 'flex-end',
  },
  modalItemPrice: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  modalItemPriceBCV: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    opacity: 0.8,
    marginTop: spacing.xs,
  },

  // Modal Content
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
    marginBottom: spacing.md,
  },
  productPriceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  productDetailsBCV: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    opacity: 0.8,
  },

  // Item Preview
  itemPreview: {
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  previewLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  previewAmounts: {
    alignItems: 'center',
  },
  previewTotal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  previewTotalBCV: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
});