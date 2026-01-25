// app/(tabs)/products.tsx - CON DUAL SEARCH Y PRECIO MÁXIMO POR DEFECTO
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { Category, Product } from '../../types';
import { debounce, formatCurrency } from '../../utils/helpers';

interface ProductItemProps {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (product: Product) => void;
  quantity: number;
  onQuantityChange: (product: Product, quantity: number) => void;
  selectedPrice: 'cost' | 'price' | 'higher_price';
  onSelectPrice: (productId: number, priceType: 'cost' | 'price' | 'higher_price') => void;
  onQuantityInputChange: (product: Product, value: string) => void;
  onCreateQuote: (product: Product) => void;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
}

interface QuickActionProps {
  title: string;
  icon: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({ 
    title, 
    icon, 
    onPress, 
    color = colors.primary[500],
    disabled = false
  }) => (
    <TouchableOpacity 
      style={[styles.quickAction, disabled && styles.quickActionDisabled]} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color={colors.text.inverse} />
      </View>
      <Text style={styles.quickActionText} numberOfLines={2}>{title}</Text>
    </TouchableOpacity>
  );

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  const sortedCategories = [...categories].sort((a, b) => 
    a.description.localeCompare(b.description)
  );

  const filteredCategories = sortedCategories.filter(category =>
    category.description.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectCategory = (category: Category | null) => {
    onSelectCategory(category);
    setShowSearchModal(false);
    setSearchText('');
  };

  return (
    <View style={styles.categoriesSection}>
      <Text style={styles.departmentsTitle}>DEPARTAMENTOS</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            styles.searchChip,
            !selectedCategory && styles.categoryChipActive
          ]}
          onPress={() => setShowSearchModal(true)}
        >
          <Ionicons 
            name="search" 
            size={15} 
            color={!selectedCategory ? colors.text.inverse : colors.text.primary}
          />
        </TouchableOpacity>
        
        {sortedCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory?.id === category.id && styles.categoryChipActive
            ]}
            onPress={() => handleSelectCategory(category)}
          >
            <Text style={[
              styles.categoryChipText,
              selectedCategory?.id === category.id && styles.categoryChipActiveText
            ]}>
              {category.description}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buscar Departamento</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowSearchModal(false);
                  setSearchText('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons 
                name="search" 
                size={20} 
                color={colors.text.secondary}
                style={styles.searchInputIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Escribe el nombre del departamento..."
                placeholderTextColor={colors.text.secondary}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchText !== '' && (
                <TouchableOpacity 
                  onPress={() => setSearchText('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name="close-circle" 
                    size={20} 
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.allDepartmentsOption}
              onPress={() => handleSelectCategory(null)}
            >
              <View style={styles.optionContent}>
                <Text style={styles.optionText}>Ver todos</Text>
                <Text style={styles.optionSubtext}>Mostrar todos los departamentos</Text>
              </View>
              {!selectedCategory && (
                <View style={styles.checkmark}>
                  <Ionicons 
                    name="checkmark" 
                    size={20} 
                    color={colors.primary[500]}
                  />
                </View>
              )}
            </TouchableOpacity>

            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryOption}
                  onPress={() => handleSelectCategory(item)}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>{item.description}</Text>
                  </View>
                  {selectedCategory?.id === item.id && (
                    <View style={styles.checkmark}>
                      <Ionicons 
                        name="checkmark" 
                        size={20} 
                        color={colors.primary[500]}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                searchText !== '' && (
                  <View style={styles.emptyState}>
                    <Ionicons 
                      name="search-outline" 
                      size={40} 
                      color={colors.text.secondary}
                      style={styles.emptyIcon}
                    />
                    <Text style={styles.emptyText}>
                      No se encontraron departamentos con "{searchText}"
                    </Text>
                  </View>
                )
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default function ProductsScreen(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);
  const [codeSearch, setCodeSearch] = useState<string>('');
  const [descriptionSearch, setDescriptionSearch] = useState<string>('');
  const [localCodeSearch, setLocalCodeSearch] = useState<string>('');
  const [localDescriptionSearch, setLocalDescriptionSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState<Record<number, 'cost' | 'price' | 'higher_price'>>({});

  useEffect(() => {
    loadData();
  }, []);

   useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      setLoadingMore(false);
      loadData(1, false);
      setSelectedProducts(new Set());
      setProductQuantities({});
      setCodeSearch('');
      setLocalCodeSearch('');
      setDescriptionSearch('');
      setLocalDescriptionSearch('');
      setSelectedCategory(null);
    }, [])
  );

  useEffect(() => {
    filterProducts();
  }, [codeSearch, descriptionSearch, products, selectedCategory]);

  const loadMoreProducts = async (): Promise<void> => {
    if (loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await loadData(nextPage, true);
  };

  const loadData = async (pageNum: number = 1, loadMore: boolean = false): Promise<void> => {
    try {
      if (!loadMore) setLoading(true);
      else setLoadingMore(true);

      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;

      // ✅ Validar que haya empresa seleccionada
      if (!company) {
        console.warn('⚠️ No hay empresa seleccionada');
        Alert.alert(
          'Empresa no seleccionada',
          'Por favor selecciona una empresa primero desde el Dashboard.',
          [
            { text: 'Ir al Dashboard', onPress: () => router.replace('/(tabs)') }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('🔄 Cargando productos para empresa:', company.name, 'ID:', company.id, 'Página:', pageNum);

      const [productsResponse, categoriesResponse] = await Promise.all([
        api.getProducts({ company_id: company.id, page: pageNum, per_page: 50 }),
        pageNum === 1 ? api.getCategories({ company_id: company.id }) : Promise.resolve({ data: categories })
      ]);

      const newProducts = productsResponse.data || [];
      console.log('✅ Productos cargados:', newProducts.length, 'Total:', productsResponse.pagination?.total);

      if (pageNum === 1) {
        setProducts(newProducts);
        setCategories(categoriesResponse.data || []);

        // Inicializar precios por defecto a 'price' (máximo)
        const defaultPrices: Record<number, 'cost' | 'price' | 'higher_price'> = {};
        newProducts.forEach(product => {
          defaultPrices[product.id] = 'cost'; // 'price' es el máximo
        });
        setSelectedPrices(defaultPrices);

        // Guardar el total de productos disponibles
        const pagination = productsResponse.pagination;
        if (pagination) {
          setTotalProductsCount(pagination.total);
        }
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }

      // Verificar si hay más páginas
      const pagination = productsResponse.pagination;
      if (pagination) {
        const totalPages = Math.ceil(pagination.total / pagination.per_page);
        setHasMore(pageNum < totalPages);
      } else {
        setHasMore(newProducts.length > 0);
      }

      // ✅ Validar que se cargaron productos (solo en primera carga)
      if (pageNum === 1 && newProducts.length === 0) {
        Alert.alert(
          'Sin productos',
          'No hay productos disponibles para esta empresa. Contacta al administrador.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Error loading data:', error);

      // ✅ Mostrar mensaje específico del error
      const errorMessage = error?.response?.data?.message || error?.message || 'Error al cargar la información';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filterProducts = (): void => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category_id === selectedCategory.id
      );
    }

    // Búsqueda por código
    if (codeSearch) {
      filtered = filtered.filter(product =>
        product.code.toLowerCase().includes(codeSearch.toLowerCase())
      );
    }

    // Búsqueda por descripción
    if (descriptionSearch) {
      filtered = filtered.filter(product =>
        product.description.toLowerCase().includes(descriptionSearch.toLowerCase()) ||
        product.name.toLowerCase().includes(descriptionSearch.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  };

  const debouncedCodeSearch = debounce((text: string) => {
    setCodeSearch(text);
  }, 150);

  const debouncedDescriptionSearch = debounce((text: string) => {
    setDescriptionSearch(text);
  }, 150);

  const handleCodeSearchChange = (text: string) => {
    setLocalCodeSearch(text);
    debouncedCodeSearch(text);
  };

  const handleDescriptionSearchChange = (text: string) => {
    setLocalDescriptionSearch(text);
    debouncedDescriptionSearch(text);
  };

  const handleClearCodeSearch = () => {
    setLocalCodeSearch('');
    setCodeSearch('');
  };

  const handleClearDescriptionSearch = () => {
    setLocalDescriptionSearch('');
    setDescriptionSearch('');
  };

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(product.id)) {
        newSet.delete(product.id);
        setProductQuantities(prevQty => {
          const newQty = { ...prevQty };
          delete newQty[product.id];
          return newQty;
        });
      } else {
        newSet.add(product.id);
        setProductQuantities(prevQty => ({
          ...prevQty,
          [product.id]: 1
        }));
      }
      return newSet;
    });
  };

  const handleQuantityChange = (product: Product, change: number) => {
    const currentQty = productQuantities[product.id] || 0;
    const newQty = Math.max(0, currentQty + change);
    
    if (newQty > 0) {
      setProductQuantities(prev => ({
        ...prev,
        [product.id]: newQty
      }));
      setSelectedProducts(prev => new Set(prev).add(product.id));
    } else {
      setProductQuantities(prev => {
        const newQty = { ...prev };
        delete newQty[product.id];
        return newQty;
      });
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  const handleQuantityInputChange = (product: Product, value: string) => {
    const numValue = parseInt(value) || 0;
    const clampedValue = Math.max(0, numValue);
    
    if (clampedValue > 0) {
      setProductQuantities(prev => ({
        ...prev,
        [product.id]: clampedValue
      }));
      setSelectedProducts(prev => new Set(prev).add(product.id));
    } else {
      setProductQuantities(prev => {
        const newQty = { ...prev };
        delete newQty[product.id];
        return newQty;
      });
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  const handleSelectPrice = (productId: number, priceType: 'cost' | 'price' | 'higher_price') => {
    setSelectedPrices(prev => ({
      ...prev,
      [productId]: priceType
    }));
  };

  const handleCreateQuoteFromProduct = (product: Product) => {
    const quantity = productQuantities[product.id] || 1;
    const priceType = selectedPrices[product.id] || 'price';
    const unitPrice = priceType === 'cost' ? product.cost : 
                     priceType === 'higher_price' ? product.higher_price : 
                     product.price;
    
    console.log('Creating quote:', {
      product_id: product.id,
      quantity,
      unitPrice,
      priceType
    });
    
    router.push(`/quotes/new?preselected_products=${product.id}&quantity=${quantity}&prices=${unitPrice}`);
  };

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

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    
    const foundProduct = products.find(p => 
      p.code.toLowerCase() === data.toLowerCase() ||
      p.barcode?.toLowerCase() === data.toLowerCase()
    );

    if (foundProduct) {
      setShowScanner(false);
      setSelectedProducts(prev => new Set(prev).add(foundProduct.id));
      setProductQuantities(prev => ({
        ...prev,
        [foundProduct.id]: (prev[foundProduct.id] || 0) + 1
      }));
      Alert.alert(
        'Producto Agregado',
        `${foundProduct.name} agregado al presupuesto`
      );
    } else {
      Alert.alert(
        'Producto No Encontrado',
        `El código "${data}" no corresponde a ningún producto en el catálogo.`,
        [
          {
            text: 'Escanear Otro',
            onPress: () => setScanned(false),
          },
          {
            text: 'Cerrar',
            onPress: () => setShowScanner(false),
          },
        ]
      );
    }
  };

  const generateQuote = () => {
  const selectedProductsArray = Array.from(selectedProducts)
    .map(id => {
      const product = products.find(p => p.id === id);
      if (!product) return null;
      
      const priceType = selectedPrices[id] || 'price';
      const unitPrice = priceType === 'cost' ? product.cost : 
                       priceType === 'higher_price' ? product.higher_price : 
                       product.price;
      
      return {
        product_id: product.id,
        quantity: productQuantities[id] || 1,
        unit_price: unitPrice,
      };
    })
    .filter(p => p !== null);

  if (selectedProductsArray.length === 0) {
    Alert.alert('Error', 'Selecciona al menos un producto para generar el presupuesto');
    return;
  }

  const selectedProductIds = selectedProductsArray.map(p => p.product_id).join(',');
  const quantity = selectedProductsArray.map(p => p.quantity).join(',');
  const prices = selectedProductsArray.map(p => p.unit_price).join(',');
  
  router.push(`/quotes/new?preselected_products=${selectedProductIds}&quantity=${quantity}&prices=${prices}`);
};

const ProductItem: React.FC<ProductItemProps> = ({ 
  product, 
  isSelected,
  onToggleSelect,
  quantity,
  onQuantityChange,
  selectedPrice,
  onSelectPrice,
  onQuantityInputChange,
  onCreateQuote
}) => {
  const isLowStock = product.stock <= (product.min_stock || 0);
  const [inputValue, setInputValue] = useState(quantity > 0 ? quantity.toString() : '');

  const handleSelectPrice = (priceType: 'cost' | 'price' | 'higher_price') => {
    onSelectPrice(product.id, priceType);
    if (!isSelected) {
      onToggleSelect(product);
    }
  };

  useEffect(() => {
    setInputValue(quantity > 0 ? quantity.toString() : '');
  }, [quantity]);

  const handleInputChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setInputValue(numericValue);
  };

  const handleInputBlur = () => {
    onQuantityInputChange(product, inputValue);
  };

  const getSelectedPriceValue = () => {
    if (selectedPrice === 'cost') return product.cost;
    if (selectedPrice === 'higher_price') return product.higher_price;
    return product.price;
  };

  return (
    <Card style={[
      styles.productCard,
      isSelected && styles.productCardSelected,
      isLowStock && styles.productCardLowStock
    ]}>
      <View style={styles.productContent}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => onToggleSelect(product)}
        >
          <Ionicons 
            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={isSelected ? colors.primary[500] : colors.gray[400]} 
          />
        </TouchableOpacity>

        <View style={styles.productInfo}>
          <Text style={styles.productCode} numberOfLines={1}>
            {product.code}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>{product.description}</Text>
          <Text style={styles.productCategory}>
            {product.category?.description || 'Sin categoría'}
          </Text>
          
          <View style={styles.priceSelectContainer}>
            <TouchableOpacity
              style={[
                styles.priceButton,
                selectedPrice === 'cost' && styles.priceButtonSelected
              ]}
              onPress={() => handleSelectPrice('cost')}
            >
              <Text style={[
                styles.priceButtonLabel,
                selectedPrice === 'cost' && styles.priceButtonLabelSelected
              ]}>
                Máximo
              </Text>
              <Text style={[
                styles.priceButtonValue,
                selectedPrice === 'cost' && styles.priceButtonValueSelected
              ]}>
                {formatCurrency(product.price)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priceButton,
                selectedPrice === 'price' && styles.priceButtonSelected
              ]}
              onPress={() => handleSelectPrice('price')}
            >
              <Text style={[
                styles.priceButtonLabel,
                selectedPrice === 'price' && styles.priceButtonLabelSelected
              ]}>
                Oferta
              </Text>
              <Text style={[
                styles.priceButtonValue,
                selectedPrice === 'price' && styles.priceButtonValueSelected
              ]}>
                {formatCurrency(product.cost)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.priceButton,
                selectedPrice === 'higher_price' && styles.priceButtonSelected
              ]}
              onPress={() => handleSelectPrice('higher_price')}
            >
              <Text style={[
                styles.priceButtonLabel,
                selectedPrice === 'higher_price' && styles.priceButtonLabelSelected
              ]}>
                Mayor
              </Text>
              <Text style={[
                styles.priceButtonValue,
                selectedPrice === 'higher_price' && styles.priceButtonValueSelected
              ]}>
                {formatCurrency(product.higher_price)}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[
            styles.stockContainer,
            isLowStock && styles.lowStockContainer
          ]}>
            <Ionicons 
              name="layers" 
              size={12} 
              color={isLowStock ? colors.warning : colors.text.secondary} 
            />
            <Text style={[
              styles.stockText,
              isLowStock && styles.lowStockText
            ]}>
              Disponibilidad: {product.stock}
            </Text>
          </View>
        </View>

        <View style={styles.quantityControls}>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={[
                styles.quantityControlButton,
                quantity === 0 && styles.quantityControlButtonDisabled
              ]}
              onPress={() => onQuantityChange(product, -1)}
              disabled={quantity === 0}
            >
              <Ionicons 
                name="remove" 
                size={16}
                color={quantity === 0 ? colors.gray[300] : colors.primary[500]} 
              />
            </TouchableOpacity>

            <TextInput
              style={styles.quantityInput}
              value={inputValue}
              onChangeText={handleInputChange}
              onBlur={handleInputBlur}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              selectTextOnFocus={true}
            />

            <TouchableOpacity
              style={styles.quantityControlButton}
              onPress={() => onQuantityChange(product, 1)}
            >
              <Ionicons 
                name="add" 
                size={16}
                color={colors.primary[500]} 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.wantItButton}
            onPress={() => onCreateQuote(product)}
          >
            <Text style={styles.wantItButtonText}>Lo quiero</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

  const renderItem: ListRenderItem<Product> = ({ item }) => (
    <ProductItem 
      product={item} 
      isSelected={selectedProducts.has(item.id)}
      onToggleSelect={toggleProductSelection}
      quantity={productQuantities[item.id] || 0}
      onQuantityChange={handleQuantityChange}
      selectedPrice={selectedPrices[item.id] || 'price'}
      onSelectPrice={handleSelectPrice}
      onQuantityInputChange={handleQuantityInputChange}
      onCreateQuote={handleCreateQuoteFromProduct}
    />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>
        {codeSearch || descriptionSearch || selectedCategory 
          ? 'No se encontraron productos con los filtros aplicados' 
          : 'No hay productos disponibles'
        }
      </Text>
    </View>
  );

  const selectedCount = selectedProducts.size;
  const totalItems = Array.from(selectedProducts).reduce((sum, productId) => {
    return sum + (productQuantities[productId] || 0);
  }, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo de Productos</Text>
        
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainerSearch}>
            <Input
              placeholder="Buscar por código..."
              value={localCodeSearch}
              onChangeText={handleCodeSearchChange}
              leftIcon={<Ionicons name="barcode-outline" size={20} color={colors.text.tertiary} />}
              rightIcon={
                localCodeSearch.length > 0 ? (
                  <TouchableOpacity onPress={handleClearCodeSearch}>
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                ) : null
              }
              style={{ marginBottom: spacing.xs }}
            />
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleOpenScanner}
          >
            <Ionicons name="barcode" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputContainerSearch}>
            <Input
              placeholder="Buscar por descripción..."
              value={localDescriptionSearch}
              onChangeText={handleDescriptionSearchChange}
              leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
              rightIcon={
                localDescriptionSearch.length > 0 ? (
                  <TouchableOpacity onPress={handleClearDescriptionSearch}>
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                ) : null
              }
              style={{ marginBottom: 0 }}
            />
          </View>
        </View>
      </View>

      {selectedCount > 0 && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionInfo}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary[500]} />
            <Text style={styles.selectionText}>
              {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createQuoteButton}
            onPress={generateQuote}
          >
            <Ionicons name="add-circle" size={18} color={colors.text.inverse} />
            <Text style={styles.createQuoteButtonText}>Crear presupuesto</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => {
            setPage(1);
            setHasMore(true);
            loadData(1, false);
          }} />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.3}
        ListFooterComponent={() => loadingMore ? (
          <View style={styles.loadingMoreContainer}>
            <View style={styles.loadingMoreSpinner} />
            <Text style={styles.loadingMoreText}>Cargando más productos...</Text>
          </View>
        ) : hasMore && filteredProducts.length > 0 ? null : <View style={styles.endListContainer}>
          <Text style={styles.endListText}>— No hay más productos —</Text>
        </View>}
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? null : renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <Modal
        visible={showScanner}
        animationType="slide"
        onRequestClose={() => setShowScanner(false)}
      >
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
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  searchInputContainerSearch: {
    flex: 1,
  },
  scanButton: {
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
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[200],
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  createQuoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  createQuoteButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
    categoriesSection: {
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray[100],
      paddingBottom: 110,
    },
  departmentsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  categoriesScrollContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  categoryChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  categoryChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  categoryChipActiveText: {
    color: colors.text.inverse,
  },
  searchChip: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quantityControls: {
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 60,
  },
  quantityControlButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  quantityControlButtonDisabled: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[200],
  },
  quantityInput: {
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
  wantItButton: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 105,
    alignItems: 'center',
  },
  wantItButtonText: {
    fontSize: 13,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  separator: {
    height: spacing.sm,
  },
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
  quickActionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
  },
  quickActionDisabled: {
    opacity: 0.6,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    color: colors.text.primary,
  },

  productsList: {
    padding: spacing.md,
    paddingBottom: 150,
  },
  productCard: {
    marginBottom: 0,
    padding: 0,
  },
  productCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  productCardLowStock: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  productContent: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
    
  },
  checkboxContainer: {
    padding: spacing.xs,
    justifyContent: 'flex-start',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  productCode: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  productCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  priceContainer: {
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  wholesalePrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.info,
  },
  retailPrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  lowStockContainer: {
    backgroundColor: 'transparent',
  },
  stockText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  lowStockText: {
    color: colors.warning,
    fontWeight: typography.fontWeight.semibold,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    height: 44,
    gap: spacing.sm,
  },
  searchInputIcon: {
    color: colors.text.secondary,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  allDepartmentsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[50],
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  optionSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyIcon: {
    marginBottom: spacing.md,
    opacity: 0.5,
  },

  priceSelectContainer: {
    flexDirection: 'column',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    justifyContent: 'space-between',
  },
  priceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  priceButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
    borderWidth: 2,
  },
  priceButtonLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  priceButtonLabelSelected: {
    color: colors.primary[500],
  },
  priceButtonValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: 2,
  },
  priceButtonValueSelected: {
    color: colors.primary[500],
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  loadingMoreSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  loadingMoreText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  endListContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  endListText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});