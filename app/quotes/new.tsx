// ✅ CÓDIGO COMPLETO: app/quotes/new.tsx
// CON BUSCADOR DUAL INTEGRADO (código + descripción)
// Integración completa de sale_tax y aliquot de BD

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [productsPage, setProductsPage] = useState(1);
  const [productsHasMore, setProductsHasMore] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  
  // BCV
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string>('');
  const [loadingRate, setLoadingRate] = useState(false);
  
  // Modales
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // ✨ BUSCADOR DUAL - Búsqueda por código
  const [productCodeSearch, setProductCodeSearch] = useState('');
  // ✨ BUSCADOR DUAL - Búsqueda por descripción
  const [productDescriptionSearch, setProductDescriptionSearch] = useState('');
  
  // ✨ SCANNER - Cámara para código de barras
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');

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
    const bcvAmount = `Bs. ${(amount * bcvRate).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    return `${usdFormatted} / ${bcvAmount}`;
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

  // ✨ BUSCADOR DE CLIENTES OPTIMIZADO
  const filteredCustomers = useMemo(() => {
    const searchNormalized = customerSearch.toLowerCase().trim();

    if (!searchNormalized) {
      return customers.filter(c => c.status === 'active');
    }

    return customers.filter(c =>
      c.status === 'active' &&
      c.name.toLowerCase().includes(searchNormalized)
    );
  }, [customerSearch, customers]);

  // ✨ BUSCADOR DUAL OPTIMIZADO con useMemo y normalización
  const filteredProducts = useMemo(() => {
    // Normalizar términos de búsqueda una sola vez
    const codeSearchNormalized = productCodeSearch.toLowerCase().trim();
    const descriptionSearchNormalized = productDescriptionSearch.toLowerCase().trim();

    // Si no hay búsqueda, retornar todos los productos activos
    if (!codeSearchNormalized && !descriptionSearchNormalized) {
      return products.filter(p => p.status === 'active');
    }

    // Filtrar productos
    return products.filter(p => {
      // Solo productos activos
      if (p.status !== 'active') return false;

      // Coincidencia por código (si hay búsqueda de código)
      if (codeSearchNormalized && !p.code.toLowerCase().includes(codeSearchNormalized)) {
        return false;
      }

      // Coincidencia por descripción/nombre (si hay búsqueda de descripción)
      if (descriptionSearchNormalized) {
        const descLower = p.description.toLowerCase();
        const nameLower = p.name.toLowerCase();
        if (!descLower.includes(descriptionSearchNormalized) &&
            !nameLower.includes(descriptionSearchNormalized)) {
          return false;
        }
      }

      return true;
    });
  }, [productCodeSearch, productDescriptionSearch, products]);

  // ============================================================
  // FUNCIONES DE DATOS
  // ============================================================

  const loadInitialData = async (pageNum: number = 1, loadMore: boolean = false) => {
    try {
      if (!loadMore) setLoading(true);
      else setLoadingMoreProducts(true);

      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      setSelectedCompany(company);

      const [customersRes, productsRes] = await Promise.all([
        pageNum === 1 ? api.getCustomers({ per_page: 100, company_id: company?.id }) : Promise.resolve({ data: customers }),
        api.getProducts({ per_page: 50, page: pageNum, company_id: company?.id }),
      ]);

      const newProducts = productsRes.data || [];

      if (pageNum === 1) {
        setCustomers(customersRes.data || []);
        setProducts(newProducts);

        // Guardar el total de productos disponibles
        const pagination = productsRes.pagination;
        if (pagination) {
          setTotalProductsCount(pagination.total);
        }
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }

      // Verificar si hay más páginas
      const pagination = productsRes.pagination;
      if (pagination) {
        const totalPages = Math.ceil(pagination.total / pagination.per_page);
        setProductsHasMore(pageNum < totalPages);
      } else {
        setProductsHasMore(newProducts.length > 0);
      }

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
      setLoadingMoreProducts(false);
    }
  };

  const loadMoreProducts = async () => {
    if (loadingMoreProducts || !productsHasMore) return;

    const nextPage = productsPage + 1;
    setProductsPage(nextPage);
    await loadInitialData(nextPage, true);
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

    // ✨ Agrupar impuestos por alícuota
    interface TaxGroup {
      base: number;
      aliquot: number;
      tax: number;
      label: string;
    }

    const taxGroups: Record<number, TaxGroup> = {};
    let exemptTotal = 0;

    quoteItems.forEach(item => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = itemSubtotal * (item.discount / 100);
      const itemTotal = itemSubtotal - itemDiscount;

      subtotal += itemTotal;

      // ✨ Determinar tipo de impuesto del producto
      const isExempt = item.product.sale_tax === 'EX';
      const aliquot = item.product.aliquot || 16;

      if (isExempt) {
        // Producto exento
        exemptTotal += itemTotal;
      } else {
        // Producto gravado - agrupar por alícuota
        if (!taxGroups[aliquot]) {
          taxGroups[aliquot] = {
            base: 0,
            aliquot: aliquot,
            tax: 0,
            label: `${aliquot}%`
          };
        }
        taxGroups[aliquot].base += itemTotal;
        taxGroups[aliquot].tax += itemTotal * (aliquot / 100);
      }
    });

    // Calcular total de impuestos
    let totalTax = 0;
    Object.values(taxGroups).forEach(group => {
      totalTax += group.tax;
    });

    // Aplicar descuento global
    const discountAmount = subtotal * (Number(formData.discount) / 100);

    // ✅ Total correcto: subtotal - descuento + impuestos
    const total = subtotal - discountAmount + totalTax;

    return {
      subtotal,
      discountAmount,
      taxGroups,
      exemptTotal,
      totalTax,
      total
    };
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
          discount: 0,
          name: item.product?.name,
          // ✨ Usar sale_tax de BD directamente
          buy_tax: item.product.sale_tax === 'EX' ? 1 : 0,
          sale_tax: item.product.sale_tax,
          aliquot: item.product.aliquot,
        })),
        valid_until: formData.valid_until,
        terms_conditions: 'test terms',
        notes: formData.notes.trim(),
        discount: Number(formData.discount),
        bcv_rate: bcvRate,
        bcv_date: rateDate,
        status: 'draft', // ✅ Cambiado de 'rejected' a 'draft'
      };

      console.log('📤 Enviando quote:', JSON.stringify(quoteData, null, 2));

      const quote = await api.createQuote(quoteData);

      Alert.alert('Éxito', 'Presupuesto creado correctamente');
      router.replace(`/quotes/${quote.data.id}`);

    } catch (error: any) {
      console.error('❌ Error creating quote:', error);

      // ✅ Mostrar detalles del error
      let errorMessage = 'No se pudo crear el presupuesto';

      if (error?.response) {
        console.error('Error response:', error.response.data);

        // Extraer mensaje del servidor
        const serverMessage = error.response.data?.message ||
                             error.response.data?.error ||
                             JSON.stringify(error.response.data);

        errorMessage = `Error ${error.response.status}: ${serverMessage}`;
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      Alert.alert('Error al crear presupuesto', errorMessage, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  };

  // ✨ FUNCIÓN PARA CERRAR MODAL LIMPIANDO BÚSQUEDAS
  const handleCloseProductSelector = () => {
    setShowProductSelector(false);
    setProductCodeSearch('');
    setProductDescriptionSearch('');
  };

  // ✨ SCANNER - Manejar código escaneado
  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permiso Requerido',
          'Se necesita permiso para acceder a la cámara para escanear códigos de barras'
        );
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
  };

  // ✨ SCANNER - Procesar código escaneado
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setProductCodeSearch(data);
    setShowScanner(false);
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
              <Ionicons name="add" size={20} color={colors.primary[50]} />
            </TouchableOpacity>
          </View>

          {quoteItems.length === 0 ? (
            <Text style={styles.emptyText}>No hay productos agregados</Text>
          ) : (
            quoteItems.map((item) => {
              // ✨ Detectar exención según sale_tax
              const isExempt = item.product.sale_tax === 'EX';
              // ✨ Determinar el tipo de precio actual
              const currentPriceType = item.unit_price === item.product.cost ? 'cost' :
                                       item.unit_price === item.product.higher_price ? 'higher_price' : 'price';

              return (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.productCode}>{item.product?.code}</Text>
                  <Text style={styles.productNameModalFull}>{item.product?.description}</Text>
                  {item.product?.category?.description && (
                        <View style={styles.infoRowProductModalFull}>
                          <Ionicons name="folder-outline" size={14} color={colors.text.secondary} />
                          <Text style={styles.infoTextProductModalFull} numberOfLines={1}>
                            {item.product?.category?.description}
                          </Text>
                        </View>
                      )}

                  {/* ✨ Selector de precio */}
                  <View style={styles.priceSelectContainerInline}>
                    <TouchableOpacity
                      style={[
                        styles.priceButtonInline,
                        currentPriceType === 'price' && styles.priceButtonInlineSelected
                      ]}
                      onPress={() => {
                        setQuoteItems(prev => prev.map(i =>
                          i.id === item.id
                            ? { ...i, unit_price: item.product.price, total_price: item.quantity * item.product.price }
                            : i
                        ));
                      }}
                    >
                      <Text style={[
                        styles.priceButtonLabelInline,
                        currentPriceType === 'price' && styles.priceButtonLabelInlineSelected
                      ]}>Máximo</Text>
                      <Text style={[
                        styles.priceButtonValueInline,
                        currentPriceType === 'price' && styles.priceButtonValueInlineSelected
                      ]}>{formatCurrency(item.product.price)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.priceButtonInline,
                        currentPriceType === 'cost' && styles.priceButtonInlineSelected
                      ]}
                      onPress={() => {
                        setQuoteItems(prev => prev.map(i =>
                          i.id === item.id
                            ? { ...i, unit_price: item.product.cost, total_price: item.quantity * item.product.cost }
                            : i
                        ));
                      }}
                    >
                      <Text style={[
                        styles.priceButtonLabelInline,
                        currentPriceType === 'cost' && styles.priceButtonLabelInlineSelected
                      ]}>Oferta</Text>
                      <Text style={[
                        styles.priceButtonValueInline,
                        currentPriceType === 'cost' && styles.priceButtonValueInlineSelected
                      ]}>{formatCurrency(item.product.cost)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.priceButtonInline,
                        currentPriceType === 'higher_price' && styles.priceButtonInlineSelected
                      ]}
                      onPress={() => {
                        setQuoteItems(prev => prev.map(i =>
                          i.id === item.id
                            ? { ...i, unit_price: item.product.higher_price, total_price: item.quantity * item.product.higher_price }
                            : i
                        ));
                      }}
                    >
                      <Text style={[
                        styles.priceButtonLabelInline,
                        currentPriceType === 'higher_price' && styles.priceButtonLabelInlineSelected
                      ]}>Mayor</Text>
                      <Text style={[
                        styles.priceButtonValueInline,
                        currentPriceType === 'higher_price' && styles.priceButtonValueInlineSelected
                      ]}>{formatCurrency(item.product.higher_price)}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* ✨ Mostrar descuento por IVA exento */}
                  {isExempt && (
                    <View style={styles.exemptionContainer}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.exemptionText}>
                       {`IVA Exento (${item.product.aliquot || 16}%)`}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.itemStock}>
                    Disponibilidad: {item.product?.stock}
                  </Text>
                </View>

                {/* ✨ Controles de cantidad y total */}
                <View style={styles.itemActions}>
                  {/* Controles de cantidad */}
                  <View style={styles.quantityContainerInline}>
                    <TouchableOpacity
                      style={styles.quantityButtonInline}
                      onPress={() => {
                        if (item.quantity > 1) {
                          setQuoteItems(prev => prev.map(i =>
                            i.id === item.id
                              ? { ...i, quantity: i.quantity - 1, total_price: (i.quantity - 1) * i.unit_price }
                              : i
                          ));
                        }
                      }}
                      disabled={item.quantity <= 1}
                    >
                      <Ionicons
                        name="remove"
                        size={14}
                        color={item.quantity <= 1 ? colors.gray[300] : colors.primary[500]}
                      />
                    </TouchableOpacity>

                    <Text style={styles.quantityTextInline}>{item.quantity}</Text>

                    <TouchableOpacity
                      style={styles.quantityButtonInline}
                      onPress={() => {
                        setQuoteItems(prev => prev.map(i =>
                          i.id === item.id
                            ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
                            : i
                        ));
                      }}
                    >
                      <Ionicons name="add" size={14} color={colors.primary[500]} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
                    {bcvRate && (
                      <Text style={styles.itemTotalBCV}>
                        {formatBCV(item.total_price)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.actionButtons}>
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
                <Text style={styles.summaryValue}>{formatWithBCV(totals.subtotal)}</Text>               
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

            {/* ✨ Desglose de impuestos por alícuota */}
            {Object.values(totals.taxGroups).length > 0 && (
              <>
                <View style={styles.taxDivider} />
                <Text style={styles.taxSectionTitle}>Desglose de Impuestos</Text>

                {Object.values(totals.taxGroups)
                  .sort((a, b) => b.aliquot - a.aliquot)
                  .map((group) => (
                    <View key={group.aliquot} style={styles.taxGroupRow}>
                      <View style={styles.taxGroupInfo}>
                        <Text style={styles.taxGroupLabel}>Base Gravada {group.label}:</Text>
                        <Text style={styles.taxGroupBase}>{formatCurrency(group.base)}</Text>
                      </View>
                      <Text style={styles.taxGroupTax}>+ {formatCurrency(group.tax)}</Text>
                    </View>
                  ))}

                {totals.exemptTotal > 0 && (
                  <View style={styles.taxGroupRow}>
                    <View style={styles.taxGroupInfo}>
                      <Text style={styles.taxGroupLabel}>Exento:</Text>
                      <Text style={styles.taxGroupBase}>{formatCurrency(totals.exemptTotal)}</Text>
                    </View>
                    <Text style={styles.taxGroupTax}>+ {formatCurrency(0)}</Text>
                  </View>
                )}

                <View style={styles.taxDivider} />
              </>
            )}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <View style={styles.summaryAmounts}>
                <Text style={styles.totalValue}>{formatWithBCV(totals.total)}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Configuración */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Comentarios</Text>
          <Input
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

                    {item.phone && (
                      <View style={styles.infoRowModal}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.text.secondary} />
                        <Text style={styles.infoTextModal}>
                          {item.phone}
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

      {/* ✨ MODAL SELECTOR DE PRODUCTOS - CON BUSCADOR DUAL */}
      <Modal visible={showProductSelector} animationType="slide">
        <View style={styles.modal}>
          <View style={styles.modalHeaderProductNew}>
            <TouchableOpacity onPress={handleCloseProductSelector}>
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.modalTitleProductNew}>Seleccionar Producto</Text>
              <Text style={styles.modalSubtitleProduct}>
                {productCodeSearch || productDescriptionSearch
                  ? `${filteredProducts.length} de ${totalProductsCount} producto${totalProductsCount !== 1 ? 's' : ''}`
                  : `${totalProductsCount} producto${totalProductsCount !== 1 ? 's' : ''}`
                }
              </Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          {/* ✨ BUSCADOR POR CÓDIGO */}
          <View style={styles.modalFiltersContainerProduct}>
            <View style={styles.searchRow}>
              <View style={styles.filterInputWrapper}>
                <Input
                  placeholder="Buscar por código..."
                  value={productCodeSearch}
                  onChangeText={setProductCodeSearch}
                  leftIcon={<Ionicons name="barcode-outline" size={20} color={colors.text.tertiary} />}
                  rightIcon={
                    productCodeSearch.length > 0 ? (
                      <TouchableOpacity onPress={() => setProductCodeSearch('')}>
                        <Ionicons name="close" size={18} color={colors.text.secondary} />
                      </TouchableOpacity>
                    ) : null
                  }
                  style={[styles.filterInputModalProduct, { height: 60, paddingVertical: 2 }]}
                />
              </View>
              <TouchableOpacity
                style={styles.scanButtonProduct}
                onPress={handleOpenScanner}
              >
                <Ionicons name="barcode" size={24} color={colors.text.inverse} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ✨ BUSCADOR POR DESCRIPCIÓN */}
          <View style={styles.modalFiltersContainerProduct}>
            <View style={styles.filterInputWrapper}>
              <Input
                placeholder="Buscar por descripción..."
                value={productDescriptionSearch}
                onChangeText={setProductDescriptionSearch}
                leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
                rightIcon={
                  productDescriptionSearch.length > 0 ? (
                    <TouchableOpacity onPress={() => setProductDescriptionSearch('')}>
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
            onEndReached={loadMoreProducts}
            onEndReachedThreshold={0.3}
            ListFooterComponent={() => loadingMoreProducts ? (
              <View style={styles.loadingMoreContainerProduct}>
                <View style={styles.loadingMoreSpinnerProduct} />
                <Text style={styles.loadingMoreTextProduct}>Cargando más productos...</Text>
              </View>
            ) : productsHasMore && filteredProducts.length > 0 ? null : <View style={styles.endListContainerProduct}>
              <Text style={styles.endListTextProduct}>— No hay más productos —</Text>
            </View>}
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
            ListEmptyComponent={loading ? null :
              <View style={styles.emptyContainerProductModal}>
                <Ionicons name="cube-outline" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTextProductModal}>No hay productos</Text>
                <Text style={styles.emptySubtextProductModal}>
                  {productCodeSearch || productDescriptionSearch
                    ? 'No se encontraron productos con esos filtros'
                    : 'No hay productos disponibles'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separatorProductModal} />}
          />
        </View>
      </Modal>

      {/* ✨ MODAL SCANNER - Escanear código de barras */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Escanear Código de Barras</Text>
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={() => setShowScanner(false)}
            >
              <Ionicons name="close" size={28} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerInstructions}>
                Apunta la cámara al código de barras
              </Text>
            </View>
          </CameraView>
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
    borderLeftWidth: 3,
    borderLeftColor: colors.warning 
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
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  scanButtonProduct: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  
  // ✨ ESTILOS DEL SCANNER
  scannerContainer: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing['2xl'],
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scannerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  closeScannerButton: {
    padding: spacing.sm,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    marginTop: spacing.xl,
    fontSize: typography.fontSize.base,
    color: colors.text.inverse,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },

  // ✨ NUEVOS ESTILOS PARA EDICIÓN EN LÍNEA
  priceSelectContainerInline: {
    flexDirection: 'column', // ← Cambiado a vertical
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  priceButtonInline: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gray[50],
    alignItems: 'flex-start', // ← Alinear a la izquierda
  },
  priceButtonInlineSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
    borderWidth: 2,
  },
  priceButtonLabelInline: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  priceButtonLabelInlineSelected: {
    color: colors.primary[500],
  },
  priceButtonValueInline: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  priceButtonValueInlineSelected: {
    color: colors.primary[500],
  },

  quantityContainerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  quantityButtonInline: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityTextInline: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  loadingMoreContainerProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingMoreSpinnerProduct: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  loadingMoreTextProduct: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  endListContainerProduct: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  endListTextProduct: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  // ✨ Estilos para desglose de impuestos
  taxDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  taxSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  taxGroupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  taxGroupInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taxGroupLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  taxGroupBase: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  taxGroupTax: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.info,
  },
});