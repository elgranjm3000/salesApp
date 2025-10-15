// app/(tabs)/products.tsx - Versión con controles horizontales
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
import { Button } from '../../components/ui/Button';
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
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
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
  // Ordenar categorías alfabéticamente
  const sortedCategories = [...categories].sort((a, b) => 
    a.description.localeCompare(b.description)
  );

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
            !selectedCategory && styles.categoryChipActive
          ]}
          onPress={() => onSelectCategory(null)}
        >
          <Text style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipActiveText
          ]}>
            Todos
          </Text>
        </TouchableOpacity>
        
        {sortedCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory?.id === category.id && styles.categoryChipActive
            ]}
            onPress={() => onSelectCategory(category)}
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
    </View>
  );
};

export default function ProductsScreen(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Estados para cantidades de productos
  const [productQuantities, setProductQuantities] = useState<Record<number, number>>({});
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  // Estados para escáner
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

   useFocusEffect(
    useCallback(() => {
      loadData();
      setSelectedProducts(new Set());
      setProductQuantities({});      
      setSearchText('');
      setSelectedCategory(null);
    }, [])
  );

  useEffect(() => {
    filterProducts();
  }, [searchText, products, selectedCategory]);

  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      
      const [productsResponse, categoriesResponse] = await Promise.all([
        api.getProducts({ company_id: company?.id }),
        api.getCategories({ company_id: company?.id })
      ]);

      setProducts(productsResponse.data || []);
      setCategories(categoriesResponse.data || []);
    } catch (error) {
      console.log('Error loading data:', error);
      Alert.alert('Error', 'No se pudo cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = (): void => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category_id === selectedCategory.id
      );
    }

    if (searchText) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchText.toLowerCase()) ||
        product.code.toLowerCase().includes(searchText.toLowerCase()) ||
        product.category?.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    setFilteredProducts(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(product.id)) {
        newSet.delete(product.id);
        // Limpiar cantidad al deseleccionar
        setProductQuantities(prevQty => {
          const newQty = { ...prevQty };
          delete newQty[product.id];
          return newQty;
        });
      } else {
        newSet.add(product.id);
        // Establecer cantidad inicial en 1
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
    const newQty = Math.max(0, Math.min(product.stock, currentQty + change));
    
    if (newQty > 0) {
      setProductQuantities(prev => ({
        ...prev,
        [product.id]: newQty
      }));
      // Asegurar que el producto esté seleccionado
      setSelectedProducts(prev => new Set(prev).add(product.id));
    } else {
      // Si la cantidad llega a 0, deseleccionar
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
    const clampedValue = Math.max(0, Math.min(product.stock, numValue));
    
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
      // Agregar producto con cantidad 1
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
        
        return {
          product_id: product.id,
          quantity: productQuantities[id] || 1,
          unit_price: product.price,
        };
      })
      .filter(p => p !== null);

    if (selectedProductsArray.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un producto para generar el presupuesto');
      return;
    }

    const selectedProductIds = selectedProductsArray.map(p => p.product_id).join(',');
    const quantity = selectedProductsArray.map(p => p.quantity).join(',');
    console.log('Selected Product IDs:', quantity);
    router.push(`/quotes/new?preselected_products=${selectedProductIds}&quantity=${quantity}`);
  };

  const createQuoteFromSingleProduct = (product: Product) => {
    const quantity = productQuantities[product.id] || 1;
    
    const productData = [{
      product_id: product.id,
      quantity: quantity,
      unit_price: product.price,
    }];
    
    console.log('Navigating to quote creation with:', productData);
    
    router.push(`/quotes/new?preselected_products=${productData[0].product_id}&quantity=${productData[0].quantity}`);
  };

  const ProductItem: React.FC<ProductItemProps> = ({ 
    product, 
    isSelected,
    onToggleSelect,
    quantity,
    onQuantityChange
  }) => {
    const isLowStock = product.stock <= (product.min_stock || 0);
    const hasWholesalePrice = product.cost && product.cost > 0;
    const [inputValue, setInputValue] = useState(quantity > 0 ? quantity.toString() : '');

    // Actualizar el valor del input cuando cambie la cantidad externa
    useEffect(() => {
      setInputValue(quantity > 0 ? quantity.toString() : '');
    }, [quantity]);

    const handleInputChange = (text: string) => {
      // Permitir solo números
      const numericValue = text.replace(/[^0-9]/g, '');
      setInputValue(numericValue);
    };

    const handleInputBlur = () => {
      handleQuantityInputChange(product, inputValue);
    };

    return (
      <Card style={[
        styles.productCard,
        isSelected && styles.productCardSelected,
        isLowStock && styles.productCardLowStock
      ]}>
        <View style={styles.productContent}>
          {/* Checkbox de selección */}
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

          {/* Información del producto */}
          <View style={styles.productInfo}>
            <Text style={styles.productCode} numberOfLines={1}>
              {product.code}
            </Text>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productCategory}>
              {product.category?.description || 'Sin categoría'}
            </Text>
            
            <View style={styles.priceContainer}>
              {hasWholesalePrice && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Mayor:</Text>
                  <Text style={styles.wholesalePrice}>
                    {formatCurrency(product.cost)}
                  </Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Oferta:</Text>
                <Text style={styles.retailPrice}>
                  {formatCurrency(product.price)}
                </Text>
              </View>
            </View>

            {/* Disponibilidad */}
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

          {/* Controles de cantidad - AHORA HORIZONTALES */}
          <View style={styles.quantityControls}>
            {/* Fila de controles +/- y cantidad */}
          
          

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
                maxLength={4}
                selectTextOnFocus={true}
              />

              <TouchableOpacity
                style={[
                  styles.quantityControlButton,
                  quantity >= product.stock && styles.quantityControlButtonDisabled
                ]}
                onPress={() => onQuantityChange(product, 1)}
                disabled={quantity >= product.stock}
              >
                <Ionicons 
                  name="add" 
                  size={16}
                  color={quantity >= product.stock ? colors.gray[300] : colors.primary[500]} 
                />
              </TouchableOpacity>
            </View>



  {/* Botón "Lo quiero" debajo */}
            <TouchableOpacity
              style={styles.wantItButton}
              onPress={() => createQuoteFromSingleProduct(product)}
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
    />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>
        {searchText || selectedCategory 
          ? 'No se encontraron productos con los filtros aplicados' 
          : 'No hay productos disponibles'
        }
      </Text>
      {searchText || selectedCategory ? (
        <Button
          title="Limpiar Filtros"
          variant="outline"
          onPress={() => {
            setSearchText('');
            setSelectedCategory(null);
          }}
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );

  const selectedCount = selectedProducts.size;
  const totalItems = Array.from(selectedProducts).reduce((sum, productId) => {
    return sum + (productQuantities[productId] || 0);
  }, 0);

  return (
    <View style={styles.container}>
      {/* Header con buscador */}
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo de Productos</Text>
        
        {/* Buscador con Escáner */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Input
              placeholder="Buscar por nombre, código o documento..."
              onChangeText={debouncedSearch}
              leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
              rightIcon={
                (selectedCategory || searchText) ? (
                  <TouchableOpacity onPress={() => {
                    setSearchText('');
                    setSelectedCategory(null);
                  }}>
                    <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ) : undefined
              }
              style={{ marginBottom: 0 }}
            />
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleOpenScanner}
          >
            <Ionicons name="barcode" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de selección (cuando hay productos seleccionados) */}
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
                    {/*<QuickAction
                      title="Crear Presupuesto"
                      icon="add-circle"
                      color={colors.primary[500]}
                      onPress={generateQuote}
                    />*/}
        </View>
      )}

      {/* Departamentos antes de la lista */}
     

      {/* Lista de productos */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} />
        }
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

       <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Modal de Escáner */}
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
  },
  searchInputContainer: {
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
  // CONTROLES DE CANTIDAD - CONTENEDOR VERTICAL
  quantityControls: {
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // FILA HORIZONTAL PARA +, INPUT, -
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
  // Estilos del Escáner
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
});