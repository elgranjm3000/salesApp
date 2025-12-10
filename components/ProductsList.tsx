import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    FlatList,
    ListRenderItem,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { borderRadius, colors, spacing, typography } from '../theme/design';
import type { Product } from '../types';
import { debounce, formatCurrency } from '../utils/helpers';

interface ProductsListProps {
  products: Product[];
  loading: boolean;
  onRefresh?: () => void;
  selectedProducts?: Set<number>;
  productQuantities?: Record<number, number>;
  selectedPrices?: Record<number, 'cost' | 'price' | 'higher_price'>;
  onToggleSelect?: (product: Product) => void;
  onQuantityChange?: (product: Product, change: number) => void;
  onQuantityInputChange?: (product: Product, value: string) => void;
  onSelectPrice?: (productId: number, priceType: 'cost' | 'price' | 'higher_price') => void;
  onCreateQuote?: (product: Product) => void;
  emptyMessage?: string;
}

interface ProductItemProps {
  product: Product;
  isSelected: boolean;
  onToggleSelect: (product: Product) => void;
  quantity: number;
  onQuantityChange: (product: Product, change: number) => void;
  selectedPrice: 'cost' | 'price' | 'higher_price';
  onSelectPrice: (productId: number, priceType: 'cost' | 'price' | 'higher_price') => void;
  onQuantityInputChange: (product: Product, value: string) => void;
  onCreateQuote: (product: Product) => void;
}

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

  useEffect(() => {
    setInputValue(quantity > 0 ? quantity.toString() : '');
  }, [quantity]);

  const handleSelectPrice = (priceType: 'cost' | 'price' | 'higher_price') => {
    onSelectPrice(product.id, priceType);
    if (!isSelected) {
      onToggleSelect(product);
    }
  };

  const handleInputChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setInputValue(numericValue);
  };

  const handleInputBlur = () => {
    onQuantityInputChange(product, inputValue);
  };

  return (
    <Card
      style={[
        styles.productCard,
        isSelected && styles.productCardSelected,
        isLowStock && styles.productCardLowStock
      ]}
    >
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
          <Text style={styles.productName} numberOfLines={2}>
            {product.description}
          </Text>
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
              <Text
                style={[
                  styles.priceButtonLabel,
                  selectedPrice === 'cost' && styles.priceButtonLabelSelected
                ]}
              >
                Máximo
              </Text>
              <Text
                style={[
                  styles.priceButtonValue,
                  selectedPrice === 'cost' && styles.priceButtonValueSelected
                ]}
              >
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
              <Text
                style={[
                  styles.priceButtonLabel,
                  selectedPrice === 'price' && styles.priceButtonLabelSelected
                ]}
              >
                Oferta
              </Text>
              <Text
                style={[
                  styles.priceButtonValue,
                  selectedPrice === 'price' && styles.priceButtonValueSelected
                ]}
              >
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
              <Text
                style={[
                  styles.priceButtonLabel,
                  selectedPrice === 'higher_price' && styles.priceButtonLabelSelected
                ]}
              >
                Mayor
              </Text>
              <Text
                style={[
                  styles.priceButtonValue,
                  selectedPrice === 'higher_price' && styles.priceButtonValueSelected
                ]}
              >
                {formatCurrency(product.higher_price)}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.stockContainer,
              isLowStock && styles.lowStockContainer
            ]}
          >
            <Ionicons
              name="layers"
              size={12}
              color={isLowStock ? colors.warning : colors.text.secondary}
            />
            <Text
              style={[
                styles.stockText,
                isLowStock && styles.lowStockText
              ]}
            >
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

export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  loading,
  onRefresh,
  selectedProducts = new Set(),
  productQuantities = {},
  selectedPrices = {},
  onToggleSelect = () => {},
  onQuantityChange = () => {},
  onQuantityInputChange = () => {},
  onSelectPrice = () => {},
  onCreateQuote = () => {},
  emptyMessage = 'No hay productos disponibles'
}) => {
  const [codeSearch, setCodeSearch] = useState<string>('');
  const [descriptionSearch, setDescriptionSearch] = useState<string>('');
  const [localCodeSearch, setLocalCodeSearch] = useState<string>('');
  const [localDescriptionSearch, setLocalDescriptionSearch] = useState<string>('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);

  // ✨ Debounced search functions
  const debouncedCodeSearch = useCallback(
    debounce((text: string) => {
      setCodeSearch(text);
    }, 150),
    []
  );

  const debouncedDescriptionSearch = useCallback(
    debounce((text: string) => {
      setDescriptionSearch(text);
    }, 150),
    []
  );

  // ✨ Filter products whenever search terms or products change
  useEffect(() => {
    let filtered = products;

    if (codeSearch) {
      filtered = filtered.filter(product =>
        product.code.toLowerCase().includes(codeSearch.toLowerCase())
      );
    }

    if (descriptionSearch) {
      filtered = filtered.filter(product =>
        product.description.toLowerCase().includes(descriptionSearch.toLowerCase()) ||
        product.name.toLowerCase().includes(descriptionSearch.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [codeSearch, descriptionSearch, products]);

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

  const renderItem: ListRenderItem<Product> = ({ item }) => (
    <ProductItem
      product={item}
      isSelected={selectedProducts.has(item.id)}
      onToggleSelect={onToggleSelect}
      quantity={productQuantities[item.id] || 0}
      onQuantityChange={onQuantityChange}
      selectedPrice={selectedPrices[item.id] || 'cost'}
      onSelectPrice={onSelectPrice}
      onQuantityInputChange={onQuantityInputChange}
      onCreateQuote={onCreateQuote}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>
        {codeSearch || descriptionSearch
          ? 'No se encontraron productos con los filtros aplicados'
          : emptyMessage
        }
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ✨ Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
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

        <View style={styles.searchInputContainer}>
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

      {/* ✨ Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
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
});

export default ProductsList;