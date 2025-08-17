import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    ListRenderItem,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import type { Product } from '../../types';
import { debounce, formatCurrency } from '../../utils/helpers';

interface ProductItemProps {
  product: Product;
}

export default function ProductsScreen(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchText, products]);

  const loadProducts = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await api.getProducts();
      setProducts(response.data);
    } catch (error) {
      console.log('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = (): void => {
    if (!searchText) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchText.toLowerCase()) ||
      product.code.toLowerCase().includes(searchText.toLowerCase())
    );
    
    setFilteredProducts(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

  const deleteProduct = async (productId: number): Promise<void> => {
    Alert.alert(
      'Eliminar Producto',
      '¿Estás seguro de que quieres eliminar este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProduct(productId);
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          },
        },
      ]
    );
  };

  const ProductItem: React.FC<ProductItemProps> = ({ product }) => {
    const isLowStock = product.stock <= product.min_stock;

    return (
      <Card style={styles.productCard}>
        <TouchableOpacity
          style={styles.productContent}
          onPress={() => router.push(`/products/${product.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.productImageContainer}>
            {product.image ? (
              <Image source={{ uri: product.image }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Ionicons name="cube" size={32} color={colors.text.tertiary} />
              </View>
            )}
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Ionicons name="warning" size={12} color={colors.text.inverse} />
              </View>
            )}
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
            <Text style={styles.productCode}>#{product.code}</Text>
            <Text style={styles.productCategory}>{product.category?.name}</Text>
            
            <View style={styles.productFooter}>
              <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
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
                  {product.stock}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.productActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/products/${product.id}?mode=edit`)}
            >
              <Ionicons name="create" size={18} color={colors.primary[500]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteProduct(product.id)}
            >
              <Ionicons name="trash" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderItem: ListRenderItem<Product> = ({ item }) => (
    <ProductItem product={item} />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No hay productos</Text>
      <Button
        title="Agregar Producto"
        variant="outline"
        onPress={() => router.push('/products/new')}
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Productos</Text>
            <Text style={styles.subtitle}>{filteredProducts.length} productos</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/products/new')}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar productos..."
          onChangeText={debouncedSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          style={{ marginBottom: 0 }}
        />
      </View>

      {/* Lista de productos */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadProducts} />
        }
        contentContainerStyle={styles.productsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
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
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: 2,
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
  profileButton: {
    padding: spacing.xs,
  },
  addButton: {
    backgroundColor: colors.primary[500],
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  metricsContainer: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricHeader: {
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metricTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  chartContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  chart: {
    marginVertical: spacing.md,
    borderRadius: 16,
  },
  quickActionsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    color: colors.text.primary,
  },
  recentSalesContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  seeAllText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.semibold,
  },
  saleItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleNumber: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  saleCustomer: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  saleDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  productsList: {
    padding: spacing.lg,
  },
  productCard: {
    marginBottom: spacing.md,
  },
  productContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
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
})