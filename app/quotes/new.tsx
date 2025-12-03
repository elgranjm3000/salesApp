// ✅ CÓDIGO COMPLETO: app/quotes/new.tsx
// Integración completa de sale_tax y aliquot de BD

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
  TextInput,
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

// ✨ FUNCIÓN AUXILIAR: Formatear cantidad
const formatQuantity = (quantity: any): string => {
  const num = Number(quantity) || 0;
  
  if (Number.isInteger(num)) {
    return num.toString();
  }
  
  return num.toLocaleString('es-VE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 3
  });
};

export default function NewQuoteScreen(): JSX.Element {
  const { customer_id, preselected_products, quantity, prices } = useLocalSearchParams();

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
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // Formulario
  const [formData, setFormData] = useState({
    valid_until: '',
    terms_conditions: 'Los precios están sujetos a cambios sin previo aviso. Válido por el tiempo especificado.',
    notes: '',
    discount: '0',
  });
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Tracking individual de datos por producto
  const [productInputs, setProductInputs] = useState<
    Record<number, { quantity: string; unit_price: string | null; discount: string }>
  >({});
  
  // Track de precio seleccionado por tipo
  const [selectedPriceType, setSelectedPriceType] = useState<'cost' | 'price' | 'higher_price'>('price');
  
  const [errors, setErrors] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);

  // Track para descuentos por IVA exento
  const [itemExemptions, setItemExemptions] = useState<Record<number, { 
    is_exempt: boolean; 
    discount_percent: number 
  }>>({});

  // ============================================================
  // FUNCIONES AUXILIARES PARA productInputs
  // ============================================================

  const getProductInput = (productId: number, maxPrice?: number | string) => {
    if (!productInputs[productId]) {
      const priceValue = maxPrice ? maxPrice.toString() : null;
      setProductInputs(prev => ({
        ...prev,
        [productId]: {
          quantity: '1',
          unit_price: priceValue,
          discount: '0',
        }
      }));
      return {
        quantity: '1',
        unit_price: priceValue,
        discount: '0',
      };
    }
    return productInputs[productId];
  };

  const updateProductInput = (productId: number, field: string, value: any) => {
    setProductInputs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId] || { quantity: '1', unit_price: null, discount: '0' },
        [field]: value,
      }
    }));
  };

  const updateItemExemption = (productId: number, isExempt: boolean, discountPercent: number = 0) => {
    setItemExemptions(prev => ({
      ...prev,
      [productId]: { is_exempt: isExempt, discount_percent: discountPercent }
    }));
  };

  const getItemExemption = (productId: number) => {
    return itemExemptions[productId] || { is_exempt: false, discount_percent: 0 };
  };

  // ============================================================
  // BCV Y FORMATEO
  // ============================================================

  const fetchBCVRate = async () => {
    try {
      setLoadingRate(true);
      
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
        await AsyncStorage.setItem('bcv_rate', JSON.stringify({
          rate,
          date,
          timestamp: Date.now()
        }));
      } else {
        const cachedRate = await AsyncStorage.getItem('bcv_rate');
        if (cachedRate) {
          const cached = JSON.parse(cachedRate);
          if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
            setBcvRate(cached.rate);
            setRateDate(`${cached.date} (cache)`);
          }
        }
        
        if (!bcvRate) {
          setBcvRate(36.5);
          setRateDate('Tasa aproximada');
        }
      }
      
    } catch (error) {
      console.log('Error al obtener tasa BCV:', error);
      setBcvRate(36.5);
      setRateDate('Tasa aproximada');
    } finally {
      setLoadingRate(false);
    }
  };

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

  const formatBCV = (amount: number) => {
    if (bcvRate) {
      const value = amount * bcvRate;
      return `Bs. ${value.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
    return 'N/A';
  };

  const getPriceByType = (product, priceType: 'cost' | 'price' | 'higher_price') => {
    if (priceType === 'cost') return product.cost;
    if (priceType === 'higher_price') return product.higher_price;
    return product.price;
  };

  // ============================================================
  // EFECTOS
  // ============================================================

  useEffect(() => {
    loadInitialData();
    fetchBCVRate();
  }, []);

  useEffect(() => {
    if (customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === Number(customer_id));
      if (customer) setSelectedCustomer(customer);
    }
  }, [customer_id, customers]);

  useEffect(() => {
    if (preselected_products && products.length > 0) {
      const productIds = preselected_products.split(',').map(id => Number(id.trim()));
      const quantityProducts = quantity.split(',').map(id => Number(id.trim()));
      const pricesArray = prices ? prices.split(',').map(id => Number(id.trim())) : [];
      
      const selectedProducts = products.filter(p => productIds.includes(p.id));
      
      const newItems = selectedProducts.map((product, index) => {
        const qty = quantityProducts[index] || 1;
        const unitPrice = pricesArray[index] || product.price;
        
        // ✨ Auto-detectar exención según sale_tax
        const isExempt = product.sale_tax === 'EX';
        const discountPercent = isExempt ? (product.aliquot || 16) : 0;
        updateItemExemption(product.id, isExempt, discountPercent);
        
        return {
          id: `pre_${product.id}`,
          product_id: product.id,
          product,
          quantity: qty,
          unit_price: unitPrice,
          discount: 0,
          total_price: unitPrice * qty,
        };
      });
      
      setQuoteItems(newItems);
    }
  }, [preselected_products, products]);

  useEffect(() => {
    const filtered = customers.filter(c => 
      c.status === 'active' && 
      c.name.toLowerCase().includes(customerSearch.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customerSearch, customers]);

  useEffect(() => {
    const filtered = products.filter(p => 
      (p.status === 'active') && (
        p.description.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(productSearch.toLowerCase())
      )
    );
    setFilteredProducts(filtered);
  }, [productSearch, products]);

  // ============================================================
  // FUNCIONES DE DATOS
  // ============================================================

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      setSelectedCompany(company);
      
      const [customersRes, productsRes] = await Promise.all([
        api.getCustomers({ per_page: 100, company_id: company?.id }),
        api.getProducts({ per_page: 100, company_id: company?.id }),
      ]);
      
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      
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

  // ============================================================
  // CÁLCULOS
  // ============================================================

  const calculateItemTotal = (quantity, unitPrice, discount) => {
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * (discount / 100);
    return subtotal - discountAmount;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxableBase = 0;

    quoteItems.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = itemSubtotal * (item.discount / 100);
      const itemTotal = itemSubtotal - itemDiscount;
      
      subtotal += itemTotal;
      
      // ✨ Si NO está exento, suma a la base tributaria
      const isExempt = item.product.sale_tax === 'EX';
      if (!isExempt) {
        taxableBase += itemTotal;
      }
    });

    const discountAmount = subtotal * (Number(formData.discount) / 100);
    const finalTaxableBase = taxableBase - discountAmount;
    
    // ✨ IVA solo se calcula sobre lo que NO está exento
    const tax = finalTaxableBase * 0.16;
    const total = subtotal - discountAmount + tax;
    
    return { subtotal, discountAmount, tax, total };
  };

  // ============================================================
  // FUNCIONES DE PRODUCTO
  // ============================================================

  // ✨ CAMBIO 1: selectProduct con auto-detección de sale_tax
  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedPriceType('price');
    updateProductInput(product.id, 'quantity', '1');
    updateProductInput(product.id, 'unit_price', product.price.toString());
    updateProductInput(product.id, 'discount', '0');
    
    // ✨ Auto-detectar si es exento según sale_tax de BD
    const isExempt = product.sale_tax === 'EX';
    const discountPercent = isExempt ? (product.aliquot || 16) : 0;
    updateItemExemption(product.id, isExempt, discountPercent);
    
    setShowProductSelector(false);
    setShowItemModal(true);
  };

  // ✨ CAMBIO 2: editItem con sale_tax y aliquot
  const editItem = (item) => {
    setSelectedProduct(item.product);
    setEditingItemId(item.id);
    updateProductInput(item.product.id, 'quantity', item.quantity.toString());
    updateProductInput(item.product.id, 'unit_price', item.unit_price.toString());
    updateProductInput(item.product.id, 'discount', item.discount.toString());
    
    // ✨ Cargar sale_tax y aliquot de producto
    const isExempt = item.product.sale_tax === 'EX';
    const discountPercent = isExempt ? (item.product.aliquot || 16) : 0;
    updateItemExemption(item.product.id, isExempt, discountPercent);
    
    const priceType = item.unit_price === item.product.cost ? 'cost' :
                     item.unit_price === item.product.higher_price ? 'higher_price' :
                     'price';
    setSelectedPriceType(priceType);
    setShowItemModal(true);
  };

  const saveItem = () => {
    const productInput = getProductInput(selectedProduct.id, selectedProduct.price);
    const quantity = Number(productInput.quantity);
    const unitPrice = Number(productInput.unit_price);
    const discount = Number(productInput.discount);

    if (quantity <= 0 || unitPrice < 0 || discount < 0 || discount > 100) {
      Alert.alert('Error', 'Revisa los valores ingresados');
      return;
    }

    const totalPrice = calculateItemTotal(quantity, unitPrice, discount);

    if (editingItemId) {
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
      const existingItemIndex = quoteItems.findIndex(item => item.product_id === selectedProduct.id);
      
      if (existingItemIndex >= 0) {
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

    setShowItemModal(false);
    setSelectedProduct(null);
    setEditingItemId(null);
    setSelectedPriceType('price');
    updateProductInput(selectedProduct.id, 'quantity', '1');
    updateProductInput(selectedProduct.id, 'unit_price', null);
    updateProductInput(selectedProduct.id, 'discount', '0');
  };

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

  // ✨ CAMBIO 6: saveQuote con sale_tax y aliquot
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
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          discount: item.discount,
          name: item.product?.name,
          // ✨ Usar sale_tax de BD directamente
          buy_tax: item.product.sale_tax === 'EX' ? 1 : 0,
          sale_tax: item.product.sale_tax,
          aliquot: item.product.aliquot,
        })),
        valid_until: formData.valid_until,
        terms_conditions: formData.terms_conditions.trim(),
        notes: formData.notes.trim(),
        discount: Number(formData.discount),
        bcv_rate: bcvRate,
        bcv_date: rateDate,
        status: 'rejected',
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

  const cancelItemModal = () => {
    setShowItemModal(false);
    setSelectedProduct(null);
    setEditingItemId(null);
    setSelectedPriceType('price');
    if (selectedProduct) {
      updateProductInput(selectedProduct.id, 'quantity', '1');
      updateProductInput(selectedProduct.id, 'unit_price', null);
      updateProductInput(selectedProduct.id, 'discount', '0');
    }
  };

  const addProductToQuote = (product: any) => {
    const productInput = getProductInput(product.id, product.price);
    
    const quantity = Number(productInput.quantity) || 1;
    const unitPrice = Number(productInput.unit_price) || getPriceByType(product, 'price');
    const discount = Number(productInput.discount) || 0;

    if (quantity <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    if (discount < 0 || discount > 100) {
      Alert.alert('Error', 'El descuento debe estar entre 0% y 100%');
      return;
    }

    const totalPrice = calculateItemTotal(quantity, unitPrice, discount);

    const existingItemIndex = quoteItems.findIndex(
      i => i.product_id === product.id
    );

    if (existingItemIndex >= 0) {
      setQuoteItems(prev => prev.map((existing, index) => {
        if (index === existingItemIndex) {
          const newQuantity = existing.quantity + quantity;
          const newTotalPrice = calculateItemTotal(
            newQuantity, 
            unitPrice, 
            discount
          );
          return {
            ...existing,
            quantity: newQuantity,
            unit_price: unitPrice,
            discount,
            total_price: newTotalPrice,
          };
        }
        return existing;
      }));
    } else {
      const newItem = {
        id: Date.now().toString(),
        product_id: product.id,
        product: product,
        quantity,
        unit_price: unitPrice,
        discount,
        total_price: totalPrice,
      };
      setQuoteItems(prev => [...prev, newItem]);
    }

    updateProductInput(product.id, 'quantity', '1');
    updateProductInput(product.id, 'unit_price', null);
    updateProductInput(product.id, 'discount', '0');
    
    Alert.alert(
      'Éxito',
      `${product.description} agregado al presupuesto`,
      [{ text: 'OK', onPress: () => {} }],
      { cancelable: false }
    );
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

          <Input
            style={{ marginTop: 20 }}
            label="Válido hasta"
            value={formData.valid_until}
            onChangeText={(value) => setFormData(prev => ({ ...prev, valid_until: value }))}
            error={errors.valid_until}
            editable={false}
          />
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
            quoteItems.map((item) => {
              // ✨ Detectar exención según sale_tax
              const isExempt = item.product.sale_tax === 'EX';
              const exemptionDiscount = isExempt ? (item.quantity * item.unit_price * ((item.product.aliquot || 16) / 100)) : 0;
              
              return (
              <View key={item.id} style={styles.item}>
                <TouchableOpacity 
                  style={styles.itemInfo}
                  onPress={() => editItem(item)}
                >
                  <Text style={styles.itemName}>{item.product?.description}</Text>
                  <Text style={styles.itemDetails}>
                    Cant: {formatQuantity(item.quantity)} • Precio: {formatCurrency(item.unit_price)}
                    {item.discount > 0 && ` • Desc: ${item.discount}%`}
                  </Text>
                  
                  {/* ✨ Mostrar descuento por IVA exento */}
                  {isExempt && (
                    <View style={styles.exemptionContainer}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.exemptionText}>
                        IVA Exento ({item.product.aliquot || 16}%): -{formatCurrency(exemptionDiscount)}
                      </Text>
                    </View>
                  )}
                  
                  <Text style={styles.itemStock}>
                    Stock total: {item.product?.stock}
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
              );
            })
          )}
          {errors.items && <Text style={styles.error}>{errors.items}</Text>}
        </Card>

        {/* Resumen */}
        {quoteItems.length > 0 && (
          <Card style={[styles.card, styles.summaryCard]}>
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

        {/* Configuración */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          
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

      {/* MODAL SELECTOR DE CLIENTES */}
      <Modal visible={showCustomerSelector} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeaderNew}>
            <TouchableOpacity onPress={() => setShowCustomerSelector(false)}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.modalTitleNew}>Seleccionar Cliente</Text>
              <Text style={styles.modalSubtitle}>
                {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalFiltersContainer}>
            <View style={styles.filterInputWrapper}>
              <Input
                placeholder="Buscar por nombre..."
                value={customerSearch}
                onChangeText={setCustomerSearch}
                leftIcon={<Ionicons name="search" size={18} color={colors.text.tertiary} />}
                rightIcon={
                  customerSearch.length > 0 ? (
                    <TouchableOpacity onPress={() => setCustomerSearch('')}>
                      <Ionicons name="close" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                  ) : null
                }
                style={[styles.filterInputModal, { height: 60, paddingVertical: 2 }]}
              />
            </View>
          </View>

          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.customerRowModal}
                onPress={() => {
                  setSelectedCustomer(item);
                  setShowCustomerSelector(false);
                  setErrors(prev => ({ ...prev, customer: '' }));
                }}
                activeOpacity={0.7}
              >
                <View style={styles.customerLeftModal}>
                  <View style={styles.customerAvatarModal}>
                    <Text style={styles.customerAvatarTextModal}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.customerInfoModal}>
                    <Text style={styles.customerNameModal} numberOfLines={1}>
                      {item.name}
                    </Text>
                    
                    {item.document_number && (
                      <View style={styles.infoRowModal}>
                        <Ionicons name="card-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.infoTextModal} numberOfLines={1}>
                          {item.document_type} {item.document_number}
                        </Text>
                      </View>
                    )}
                    
                    {item.email && (
                      <View style={styles.infoRowModal}>
                        <Ionicons name="mail-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.infoTextModal} numberOfLines={1}>
                          {item.email}
                        </Text>
                      </View>
                    )}

                    {item.contact && (
                      <View style={styles.infoRowModal}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.infoTextModal} numberOfLines={1}>
                          {item.contact}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.customersListModal}
            ListEmptyComponent={
              <View style={styles.emptyContainerModal}>
                <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTextModal}>No hay clientes</Text>
                <Text style={styles.emptySubtextModal}>
                  {customerSearch
                    ? 'No se encontraron clientes con ese nombre'
                    : 'No hay clientes registrados'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separatorModal} />}
          />
        </View>
      </Modal>

      {/* MODAL SELECTOR DE PRODUCTOS */}
      <Modal visible={showProductSelector} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeaderProductNew}>
            <TouchableOpacity onPress={() => setShowProductSelector(false)}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.modalTitleProductNew}>Seleccionar Producto</Text>
              <Text style={styles.modalSubtitleProduct}>
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalFiltersContainerProduct}>
            <View style={styles.filterInputWrapper}>
              <Input
                placeholder="Buscar por código o descripción..."
                value={productSearch}
                onChangeText={setProductSearch}
                leftIcon={<Ionicons name="search" size={18} color={colors.text.tertiary} />}
                rightIcon={
                  productSearch.length > 0 ? (
                    <TouchableOpacity onPress={() => setProductSearch('')}>
                      <Ionicons name="close" size={18} color={colors.text.secondary} />
                    </TouchableOpacity>
                  ) : null
                }
                style={[styles.filterInputModalProduct, { height: 60, paddingVertical: 2 }]}
              />
            </View>
          </View>

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const productInput = getProductInput(item.id, item.price);
              const isLowStock = item.stock <= (item.min_stock || 0);
              const isExempt = item.sale_tax === 'EX';
              
              return (
                <Card style={[
                  styles.productCard,
                  isLowStock && styles.productCardLowStock
                  ]}>
                <View style={styles.productRowModalFull}>
                  <View style={styles.productLeftModalFull}>
                    
                    <View style={styles.productInfoModalFull}>

                      {/* ✨ CAMBIO 5: Mostrar sale_tax y aliquot con badges mejorados */}
                      <View style={styles.productMetaBadges}>
                        {/* Badge de Tipo de Venta */}
                        <View style={[
                          styles.metaBadge,
                          isExempt && styles.metaBadgeExempt
                        ]}>
                          <Ionicons 
                            name={isExempt ? "checkmark-circle-outline" : "alert-circle-outline"} 
                            size={12}
                            color={isExempt ? colors.success : colors.warning}
                          />
                          <Text style={[
                            styles.metaBadgeText,
                            isExempt && styles.metaBadgeExemptText
                          ]}>
                            {isExempt ? 'Exento' : item.sale_tax}
                          </Text>
                        </View>
                        
                        {/* Badge de Alícuota */}
                        {item.aliquot && (
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaBadgeText}>{item.aliquot}%</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.productCode}>
                        {item.code}
                      </Text>
                      
                      <Text style={styles.productNameModalFull}>
                        {item.description}
                      </Text>
               
                      
                      {item.category?.description && (
                        <View style={styles.infoRowProductModalFull}>
                          <Ionicons name="folder-outline" size={14} color={colors.text.secondary} />
                          <Text style={styles.infoTextProductModalFull} numberOfLines={1}>
                            {item.category.description}
                          </Text>
                        </View>
                      )}

                      {/* PRECIOS SELECCIONABLES - INDIVIDUAL POR PRODUCTO */}
                      <View style={styles.priceSelectContainerModal}>
                        {/* MÁXIMO */}
                        <TouchableOpacity
                          style={[
                            styles.priceButtonModal,
                            productInput.unit_price === item.price.toString() && styles.priceButtonModalSelected
                          ]}
                          onPress={() => {
                            updateProductInput(item.id, 'unit_price', item.price.toString());
                          }}
                        >
                          <Text style={[
                            styles.priceButtonLabelModal,
                            productInput.unit_price === item.price.toString() && styles.priceButtonLabelModalSelected
                          ]}>
                            Máximo
                          </Text>
                          <Text style={[
                            styles.priceButtonValueModal,
                            productInput.unit_price === item.price.toString() && styles.priceButtonValueModalSelected
                          ]}>
                            {formatCurrency(item.price)}
                          </Text>
                        </TouchableOpacity>

                        {/* OFERTA */}
                        <TouchableOpacity
                          style={[
                            styles.priceButtonModal,
                            productInput.unit_price === item.cost.toString() && styles.priceButtonModalSelected
                          ]}
                          onPress={() => {
                            updateProductInput(item.id, 'unit_price', item.cost.toString());
                          }}
                        >
                          <Text style={[
                            styles.priceButtonLabelModal,
                            productInput.unit_price === item.cost.toString() && styles.priceButtonLabelModalSelected
                          ]}>
                            Oferta
                          </Text>
                          <Text style={[
                            styles.priceButtonValueModal,
                            productInput.unit_price === item.cost.toString() && styles.priceButtonValueModalSelected
                          ]}>
                            {formatCurrency(item.cost)}
                          </Text>
                        </TouchableOpacity>

                        {/* MAYOR */}
                        <TouchableOpacity
                          style={[
                            styles.priceButtonModal,
                            productInput.unit_price === item.higher_price.toString() && styles.priceButtonModalSelected
                          ]}
                          onPress={() => {
                            updateProductInput(item.id, 'unit_price', item.higher_price.toString());
                          }}
                        >
                          <Text style={[
                            styles.priceButtonLabelModal,
                            productInput.unit_price === item.higher_price.toString() && styles.priceButtonLabelModalSelected
                          ]}>
                            Mayor
                          </Text>
                          <Text style={[
                            styles.priceButtonValueModal,
                            productInput.unit_price === item.higher_price.toString() && styles.priceButtonValueModalSelected
                          ]}>
                            {formatCurrency(item.higher_price)}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.infoRowProductModalFull}>
                        <Ionicons name="layers" size={14} color={colors.text.secondary} />
                        <Text style={styles.infoTextProductModalFull} numberOfLines={1}>
                          Disponibilidad: {item.stock}
                        </Text>
                      </View>
                      </View>
                    </View>
                  </View>

                  {/* Cantidad y botón - INDIVIDUAL POR PRODUCTO */}
                  <View style={styles.quantityControlsModalFull}>
                    <View style={styles.quantityRowModal}>
                      {/* MENOS */}
                      <TouchableOpacity
                        style={[
                          styles.quantityButtonModal,
                          productInput.quantity === '0' && styles.quantityButtonModalDisabled
                        ]}
                        onPress={() => {
                          const current = parseInt(productInput.quantity) || 0;
                          updateProductInput(item.id, 'quantity', Math.max(0, current - 1).toString());
                        }}
                        disabled={productInput.quantity === '0'}
                      >
                        <Ionicons 
                          name="remove" 
                          size={16}
                          color={productInput.quantity === '0' ? colors.gray[300] : colors.primary[500]} 
                        />
                      </TouchableOpacity>

                      {/* INPUT CANTIDAD */}
                      <TextInput
                        style={styles.quantityInputModal}
                        value={productInput.quantity}
                        onChangeText={(value) => {
                          const numericValue = value.replace(/[^0-9]/g, '');
                          updateProductInput(item.id, 'quantity', numericValue || '1');
                        }}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.text.tertiary}
                      />

                      {/* MÁS */}
                      <TouchableOpacity
                        style={styles.quantityButtonModal}
                        onPress={() => {
                          const current = parseInt(productInput.quantity) || 0;
                          updateProductInput(item.id, 'quantity', (current + 1).toString());
                        }}
                      >
                        <Ionicons 
                          name="add" 
                          size={16}
                          color={colors.primary[500]} 
                        />
                      </TouchableOpacity>
                    </View>

                    {/* LO QUIERO */}
                    <TouchableOpacity
                      style={styles.wantItButtonModal}
                      onPress={() => addProductToQuote(item)}
                    >
                      <Text style={styles.wantItButtonTextModal}>Lo quiero</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                </Card>
              );
            }}
            contentContainerStyle={styles.productsListModal}
            ListEmptyComponent={
              <View style={styles.emptyContainerProductModal}>
                <Ionicons name="cube-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTextProductModal}>No hay productos</Text>
                <Text style={styles.emptySubtextProductModal}>
                  {productSearch
                    ? 'No se encontraron productos con ese código o descripción'
                    : 'No hay productos disponibles'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separatorProductModal} />}
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
                <>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{selectedProduct.name}</Text>
                    
                    {/* ✨ CAMBIO 3: Mostrar sale_tax y aliquot de BD */}
                    <View style={styles.productMetaInfo}>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Tipo de Venta:</Text>
                        <Text style={[
                          styles.metaValue,
                          selectedProduct.sale_tax === 'EX' && { color: colors.success }
                        ]}>
                          {selectedProduct.sale_tax === 'EX' ? '✓ Exento (EX)' : selectedProduct.sale_tax}
                        </Text>
                      </View>
                      
                      {selectedProduct.aliquot && (
                        <View style={styles.metaRow}>
                          <Text style={styles.metaLabel}>Alícuota:</Text>
                          <Text style={styles.metaValue}>{selectedProduct.aliquot}%</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.productDetails}>
                      Stock total: {selectedProduct.stock}
                    </Text>

                    <View style={styles.priceOptionsContainer}>
                      <Text style={styles.priceOptionsTitle}>Selecciona un precio:</Text>
                      
                      <TouchableOpacity
                        style={[
                          styles.priceOption,
                          selectedPriceType === 'price' && styles.priceOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedPriceType('price');
                          updateProductInput(selectedProduct.id, 'unit_price', selectedProduct.price.toString());
                        }}
                      >
                        <View style={styles.priceOptionContent}>
                          <Text style={styles.priceOptionLabel}>Máximo</Text>
                          <Text style={[
                            styles.priceOptionValue,
                            selectedPriceType === 'price' && styles.priceOptionValueSelected
                          ]}>
                            {formatCurrency(selectedProduct.price)}
                          </Text>
                          {bcvRate && (
                            <Text style={styles.priceOptionBCV}>
                              {formatBCV(selectedProduct.price)}
                            </Text>
                          )}
                        </View>
                        {selectedPriceType === 'price' && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.priceOption,
                          selectedPriceType === 'cost' && styles.priceOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedPriceType('cost');
                          updateProductInput(selectedProduct.id, 'unit_price', selectedProduct.cost.toString());
                        }}
                      >
                        <View style={styles.priceOptionContent}>
                          <Text style={styles.priceOptionLabel}>Oferta</Text>
                          <Text style={[
                            styles.priceOptionValue,
                            selectedPriceType === 'cost' && styles.priceOptionValueSelected
                          ]}>
                            {formatCurrency(selectedProduct.cost)}
                          </Text>
                          {bcvRate && (
                            <Text style={styles.priceOptionBCV}>
                              {formatBCV(selectedProduct.cost)}
                            </Text>
                          )}
                        </View>
                        {selectedPriceType === 'cost' && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.priceOption,
                          selectedPriceType === 'higher_price' && styles.priceOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedPriceType('higher_price');
                          updateProductInput(selectedProduct.id, 'unit_price', selectedProduct.higher_price.toString());
                        }}
                      >
                        <View style={styles.priceOptionContent}>
                          <Text style={styles.priceOptionLabel}>Mayor</Text>
                          <Text style={[
                            styles.priceOptionValue,
                            selectedPriceType === 'higher_price' && styles.priceOptionValueSelected
                          ]}>
                            {formatCurrency(selectedProduct.higher_price)}
                          </Text>
                          {bcvRate && (
                            <Text style={styles.priceOptionBCV}>
                              {formatBCV(selectedProduct.higher_price)}
                            </Text>
                          )}
                        </View>
                        {selectedPriceType === 'higher_price' && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* ✨ CAMBIO 4: Toggle IVA Exento - CON INFORMACIÓN DE BD */}
                  <View style={styles.exemptionToggleContainer}>
                    <View style={styles.exemptionToggleLeft}>
                      <Ionicons 
                        name={selectedProduct.sale_tax === 'EX' ? "checkmark-circle" : "alert-circle-outline"} 
                        size={20} 
                        color={selectedProduct.sale_tax === 'EX' ? colors.success : colors.warning} 
                      />
                      <View>
                        <Text style={styles.exemptionToggleLabel}>
                          {selectedProduct.sale_tax === 'EX' ? 'Producto Exento' : 'Producto Gravable'}
                        </Text>
                        <Text style={styles.exemptionToggleSubtext}>
                          {selectedProduct.sale_tax === 'EX' 
                            ? `Este producto NO tiene IVA (Exento)` 
                            : `IVA: ${selectedProduct.aliquot || 16}%`
                          }
                        </Text>
                      </View>
                    </View>
                    
                    {/* Solo permitir toggle si NO es exento en BD */}
                    {selectedProduct.sale_tax !== 'EX' && (
                      <TouchableOpacity
                        style={[
                          styles.exemptionToggleButton,
                          getItemExemption(selectedProduct?.id || 0).is_exempt && styles.exemptionToggleButtonActive
                        ]}
                        onPress={() => {
                          const current = getItemExemption(selectedProduct.id);
                          updateItemExemption(selectedProduct.id, !current.is_exempt, selectedProduct.aliquot || 16);
                        }}
                      >
                        <View style={[
                          styles.exemptionToggleDot,
                          getItemExemption(selectedProduct?.id || 0).is_exempt && styles.exemptionToggleDotActive
                        ]} />
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

              <Input
                label="Cantidad"
                value={getProductInput(selectedProduct?.id || 0, selectedProduct?.price).quantity}
                onChangeText={(value) => {
                  updateProductInput(selectedProduct.id, 'quantity', value);
                }}
                keyboardType="numeric"
              />

              <Input
                label="Precio unitario (personalizado)"
                value={getProductInput(selectedProduct?.id || 0, selectedProduct?.price).unit_price || ''}
                onChangeText={(value) => updateProductInput(selectedProduct.id, 'unit_price', value)}
                keyboardType="numeric"
              />

              <Input
                label="Descuento (%)"
                value={getProductInput(selectedProduct?.id || 0, selectedProduct?.price).discount}
                onChangeText={(value) => updateProductInput(selectedProduct.id, 'discount', value)}
                keyboardType="numeric"
              />

              <View style={styles.itemPreview}>
                <Text style={styles.previewLabel}>Total del item:</Text>
                <View style={styles.previewAmounts}>
                  <Text style={styles.previewTotal}>
                    {formatCurrency(
                      calculateItemTotal(
                        Number(getProductInput(selectedProduct?.id || 0, selectedProduct?.price).quantity) || 0,
                        Number(getProductInput(selectedProduct?.id || 0, selectedProduct?.price).unit_price) || 0,
                        Number(getProductInput(selectedProduct?.id || 0, selectedProduct?.price).discount) || 0
                      )
                    )}
                  </Text>
                  {bcvRate && (
                    <Text style={styles.previewTotalBCV}>
                      {formatBCV(
                        calculateItemTotal(
                          Number(getProductInput(selectedProduct?.id || 0, selectedProduct?.price).quantity) || 0,
                          Number(getProductInput(selectedProduct?.id || 0, selectedProduct?.price).unit_price) || 0,
                          Number(getProductInput(selectedProduct?.id || 0, selectedProduct?.price).discount) || 0
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

  modalHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    marginTop: spacing.lg,
  },
  modalTitleNew: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  modalFiltersContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    height: 80,
  },
  filterInputWrapper: {
    flex: 1,
  },
  filterInputModal: {
    marginBottom: 0,
  },

  customerRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 88,
  },
  customerLeftModal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerAvatarModal: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerAvatarTextModal: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  customerInfoModal: {
    flex: 1,
    gap: spacing.xs,
  },
  customerNameModal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  infoRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoTextModal: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },

  customersListModal: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  separatorModal: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: spacing.lg,
  },

  emptyContainerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyTextModal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtextModal: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
    maxWidth: 280,
  },

  modalHeaderProductNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    marginTop: spacing.lg,
  },
  modalTitleProductNew: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  modalSubtitleProduct: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  modalFiltersContainerProduct: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    height: 80,
  },
  filterInputModalProduct: {
    marginBottom: 0,
  },

  productRowModalFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 140,
  },
  productLeftModalFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: spacing.md,
  },
  productAvatarModalFull: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  productAvatarTextModalFull: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
    fontFamily: 'monospace',
  },
  productInfoModalFull: {
    flex: 1,
    gap: spacing.xs,
  },
  productNameModalFull: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  infoRowProductModalFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoTextProductModalFull: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    flex: 1,
  },

  priceSelectContainerModal: {
    flexDirection: 'column',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  priceButtonModal: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  priceButtonModalSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
    borderWidth: 2,
  },
  priceButtonLabelModal: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  priceButtonLabelModalSelected: {
    color: colors.primary[500],
  },
  priceButtonValueModal: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  priceButtonValueModalSelected: {
    color: colors.primary[500],
  },

  quantityControlsModalFull: {
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
  },
  quantityRowModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  quantityButtonModal: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  quantityButtonModalDisabled: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[200],
  },
  quantityInputModal: {
    width: 40,
    height: 28,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.sm,
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    backgroundColor: colors.surface,
    paddingVertical: 0,
  },
  wantItButtonModal: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 105,
    alignItems: 'center',
  },
  wantItButtonTextModal: {
    fontSize: 12,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },

  productsListModal: {    
    paddingBottom: 150,
    padding: spacing.md,
  },
  separatorProductModal: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: spacing.lg,
  },

  emptyContainerProductModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyTextProductModal: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtextProductModal: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
    maxWidth: 280,
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
    marginBottom: spacing.md,
  },
  productDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  priceOptionsContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  priceOptionsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  priceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  priceOptionSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  priceOptionContent: {
    flex: 1,
  },
  priceOptionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  priceOptionValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  priceOptionValueSelected: {
    color: colors.primary[500],
  },
  priceOptionBCV: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    opacity: 0.8,
    marginTop: spacing.xs,
  },

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

  // ✨ Estilos para sale_tax y aliquot
  exemptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  exemptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
  exemptionToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.success + '30',
    marginBottom: spacing.lg,
  },
  exemptionToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  exemptionToggleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  exemptionToggleSubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  exemptionToggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gray[300],
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  exemptionToggleButtonActive: {
    backgroundColor: colors.success,
  },
  exemptionToggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  exemptionToggleDotActive: {
    alignSelf: 'flex-end',
  },
  productCard: {
    marginBottom: 10,
    padding: 0,
    borderRadius: borderRadius.md,
  },
  productCardLowStock: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  productCode: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: 2,
    fontFamily: 'monospace',
  },

  // Estilos para badges de sale_tax y aliquot
  productMetaBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.sm,
  },
  metaBadgeExempt: {
    backgroundColor: colors.success + '15',
  },
  metaBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  metaBadgeExemptText: {
    color: colors.success,
  },

  // Estilos para información de producto
  productMetaInfo: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  metaLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  metaValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
});