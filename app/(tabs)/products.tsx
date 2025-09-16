import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
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
import type { Category, Product } from '../../types';
import { debounce, formatCurrency } from '../../utils/helpers';

interface ProductItemProps {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (product: Product) => void;
  selectionMode: boolean;
  onCreateQuote: (product: Product) => void;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: Category | null;
  onSelectCategory: (category: Category | null) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => (
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
    
    {categories.map((category) => (
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
);

export default function ProductsScreen(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Estados para selección múltiple
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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
        api.getCategories()
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

    // Filtrar por categoría
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category_id === selectedCategory.id
      );
    }

    // Filtrar por texto de búsqueda
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

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedProducts([]);
    }
  };

  const toggleProductSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const isSelected = prev.find(p => p.id === product.id);
      if (isSelected) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const generateQuote = () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un producto para generar el presupuesto');
      return;
    }

    const selectedProductIds = selectedProducts.map(p => p.id).join(',');
    router.push(`/quotes/new?preselected_products=${selectedProductIds}`);
  };

  const createQuoteFromProduct = (product: Product) => {
    router.push(`/quotes/new?preselected_products=${product.id}`);
  };

  const ProductItem: React.FC<ProductItemProps> = ({ 
    product, 
    isSelected, 
    onToggleSelect, 
    selectionMode,
    onCreateQuote 
  }) => {
    const isLowStock = product.stock <= (product.min_stock || 0);
    const hasWholesalePrice = product.cost && product.cost > 0;
    
    const handlePress = () => {
      if (selectionMode) {
        onToggleSelect(product);
      } else {
        router.push(`/products/${product.id}`);
      }
    };

    return (
      <Card style={[
        styles.productCard,
        isSelected && styles.productCardSelected,
        isLowStock && styles.productCardLowStock
      ]}>
        <TouchableOpacity
          style={styles.productContent}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          {selectionMode && (
            <View style={styles.selectionIndicator}>
              <Ionicons 
                name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                size={24} 
                color={isSelected ? colors.primary[500] : colors.gray[400]} 
              />
            </View>
          )}

          <View style={styles.productImageContainer}>
            {/* {product.image ? (
              <Image source={{ uri: product.image }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube" size={32} color={colors.text.tertiary} />
              </View>
            )}*/}
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Ionicons name="warning" size={12} color={colors.text.inverse} />
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
             #{product.code}
            </Text>
            <Text style={styles.productCode}> {product.name}</Text>
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

            <View style={styles.productFooter}>
              <View style={[
                styles.stockContainer,
                isLowStock && styles.lowStockContainer
              ]}>
                <Ionicons 
                  name="layers" 
                  size={14} 
                  color={isLowStock ? colors.warning : colors.text.secondary} 
                />
                <Text style={[
                  styles.stockText,
                  isLowStock && styles.lowStockText
                ]}>
                  Stock: {product.stock}
                </Text>
              </View>

              {!selectionMode && (
                <TouchableOpacity
                  style={styles.quoteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onCreateQuote(product);
                  }}
                >
                  <Ionicons name="document-text" size={16} color={colors.primary[500]} />
                  <Text style={styles.quoteButtonText}>Cotizar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>          
        </TouchableOpacity>
      </Card>
    );
  };

  const renderItem: ListRenderItem<Product> = ({ item }) => (
    <ProductItem 
      product={item} 
      isSelected={selectedProducts.some(p => p.id === item.id)}
      onToggleSelect={toggleProductSelection}
      selectionMode={selectionMode}
      onCreateQuote={createQuoteFromProduct}
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Catálogo de Productos</Text>
            <Text style={styles.subtitle}>
              {filteredProducts.length} productos
              {selectedProducts.length > 0 && ` • ${selectedProducts.length} seleccionados`}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.selectionButton,
              selectionMode && styles.selectionButtonActive
            ]}
            onPress={toggleSelectionMode}
          >
            <Ionicons 
              name={selectionMode ? "close" : "checkmark-circle-outline"} 
              size={20} 
              color={selectionMode ? colors.text.inverse : colors.primary[500]} 
            />
            <Text style={[
              styles.selectionButtonText,
              selectionMode && styles.selectionButtonTextActive
            ]}>
              {selectionMode ? 'Cancelar' : 'Seleccionar \n productos'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros de categoría */}
      <View style={styles.filtersContainer}>
            <Text style={{marginLeft:30}}>Departamento:</Text>
      </View>
      <View style={styles.filtersContainer}>
        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar por nombre, código o departamento..."
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

      {/* Botón flotante para generar presupuesto */}
      {selectionMode && selectedProducts.length > 0 && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={styles.generateQuoteButton}
            onPress={generateQuote}
          >
            <Ionicons name="document-text" size={24} color={colors.text.inverse} />
            <Text style={styles.generateQuoteButtonText}>
              Generar Presupuesto ({selectedProducts.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
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
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  selectionButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  selectionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    marginLeft: spacing.xs,
  },
  selectionButtonTextActive: {
    color: colors.text.inverse,
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  productsList: {
    padding: spacing.lg,
  },
  row: {
    justifyContent: 'space-between',
  },
  productCard: {
    marginBottom: 0,
  },
  productCardSelected: {
    borderWidth: 1,
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  productCardLowStock: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  productContent: {
    padding: spacing.md,
  },
  selectionIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowStockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.warning,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    alignItems: 'center',
  },
  productName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    minHeight: 40,
  },
  productCode: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontFamily: 'monospace',
  },
  productCategory: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  priceContainer: {
    width: '100%',
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  wholesalePrice: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.info,
  },
  retailPrice: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  productFooter: {
    width: '100%',
    gap: spacing.sm,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.sm,
  },
  lowStockContainer: {
    backgroundColor: colors.warning + '20',
  },
  stockText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  lowStockText: {
    color: colors.warning,
    fontWeight: typography.fontWeight.bold,
  },
  quoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  quoteButtonText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    marginLeft: spacing.xs,
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
    marginBottom: spacing.lg,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  generateQuoteButton: {
    backgroundColor: colors.primary[500],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  generateQuoteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
    marginLeft: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  }
});