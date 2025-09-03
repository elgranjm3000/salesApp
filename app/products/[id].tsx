
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import type { Category, Product } from '../../types';

export default function ProductDetailScreen(): JSX.Element {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(mode === 'edit' || id === 'new');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price: '',
    cost: '',
    stock: '',
    min_stock: '',
    category_id: '',
    barcode: '',
    weight: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar categorías
      const categoriesData = await api.getCategories();
      setCategories(categoriesData.data);

      if (id !== 'new') {
        // Cargar producto existente
        const productData = await api.getProduct(Number(id));          

        setProduct(productData);
        setFormData({
          name: productData.name,
          code: productData.code,
          description: productData.description || '',
          price: productData.price.toString(),
          cost: productData.cost?.toString() || '',
          stock: productData.stock.toString(),
          min_stock: productData.min_stock.toString(),
          category_id: productData.category_id.toString(),
          barcode: productData.barcode || '',
          weight: productData.weight?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudo cargar la información');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'El código es requerido';
    }

    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'La categoría es requerida';
    }

    if (!formData.stock || Number(formData.stock) < 0) {
      newErrors.stock = 'El stock debe ser mayor o igual a 0';
    }

    if (!formData.min_stock || Number(formData.min_stock) < 0) {
      newErrors.min_stock = 'El stock mínimo debe ser mayor o igual a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const productData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
        cost: formData.cost ? Number(formData.cost) : undefined,
        stock: Number(formData.stock),
        min_stock: Number(formData.min_stock),
        category_id: Number(formData.category_id),
        barcode: formData.barcode.trim() || undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
      };

      let savedProduct: Product;
      
      if (id === 'new') {
        savedProduct = await api.createProduct(productData);
        Alert.alert('Éxito', 'Producto creado correctamente');
        router.replace(`/products/${savedProduct.id}`);
      } else {
        savedProduct = await api.updateProduct(Number(id), productData);
        setProduct(savedProduct);
        setEditing(false);
        Alert.alert('Éxito', 'Producto actualizado correctamente');
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      const message = error.response?.data?.message || 'Error al guardar el producto';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de que quieres eliminar "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProduct(product.id);
              Alert.alert('Éxito', 'Producto eliminado correctamente');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          },
        },
      ]
    );
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando producto..." />
      </View>
    );
  }

  const isLowStock = product && product.stock <= product.min_stock;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>
              {id === 'new' ? 'Nuevo Producto' : editing ? 'Editar Producto' : 'Detalle del Producto'}
            </Text>
            {product && (
              <Text style={styles.headerSubtitle}>#{product.code}</Text>
            )}
          </View>
        </View>
        
        {/* {product && !editing && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create" size={20} color={colors.primary[500]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )} */}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Imagen del producto */}
        <Card style={styles.imageCard}>
          <View style={styles.imageContainer}>
            {product?.image ? (
              <Image source={{ uri: product.image }} style={styles.productImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={48} color={colors.text.tertiary} />
                <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
              </View>
            )}
            {isLowStock && (
              <View style={styles.lowStockBadge}>
                <Ionicons name="warning" size={16} color={colors.text.inverse} />
                <Text style={styles.lowStockText}>Stock Bajo</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Información básica */}
        <Card>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          
          <Input
            label="Nombre *"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            error={errors.name}
            editable={editing}
            placeholder="Nombre del producto"
          />

          <Input
            label="Código *"
            value={formData.code}
            onChangeText={(value) => updateFormData('code', value)}
            error={errors.code}
            editable={editing}
            placeholder="Código único del producto"
          />

          <Input
            label="Descripción"
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            error={errors.description}
            editable={editing}
            placeholder="Descripción del producto"
            multiline
            numberOfLines={3}
          />

          {/* Selector de categoría */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Categoría *</Text>
            {editing ? (
              <View style={styles.categorySelector}>
                {Array.isArray(categories) &&  categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      formData.category_id === category.id.toString() && styles.categoryOptionSelected
                    ]}
                    onPress={() => updateFormData('category_id', category.id.toString())}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      formData.category_id === category.id.toString() && styles.categoryOptionTextSelected
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.readOnlyValue}>
                {product?.category?.name || 'No especificada'}
              </Text>
            )}
            {errors.category_id && (
              <Text style={styles.errorText}>{errors.category_id}</Text>
            )}
          </View>
        </Card>

        {/* Precios y costos */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Precios y Costos</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Precio de Venta *"
                value={formData.price}
                onChangeText={(value) => updateFormData('price', value)}
                error={errors.price}
                editable={editing}
                keyboardType="numeric"
                placeholder="0.00"
                leftIcon={<Text style={styles.currencySymbol}>S/</Text>}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Costo"
                value={formData.cost}
                onChangeText={(value) => updateFormData('cost', value)}
                error={errors.cost}
                editable={editing}
                keyboardType="numeric"
                placeholder="0.00"
                leftIcon={<Text style={styles.currencySymbol}>S/</Text>}
              />
            </View>
          </View>

          {!editing && product && (
            <View style={styles.profitInfo}>
              <Text style={styles.profitLabel}>Margen de ganancia:</Text>
              <Text style={styles.profitValue}>
                {product.cost 
                  ? `${((product.price - product.cost) / product.price * 100).toFixed(1)}%`
                  : 'No calculado'
                }
              </Text>
            </View>
          )}
        </Card>

        {/* Inventario */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Inventario</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Stock Actual *"
                value={formData.stock}
                onChangeText={(value) => updateFormData('stock', value)}
                error={errors.stock}
                editable={editing}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Stock Mínimo *"
                value={formData.min_stock}
                onChangeText={(value) => updateFormData('min_stock', value)}
                error={errors.min_stock}
                editable={editing}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </Card>

        {/* Información adicional */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Información Adicional</Text>
          
          <Input
            label="Código de Barras"
            value={formData.barcode}
            onChangeText={(value) => updateFormData('barcode', value)}
            error={errors.barcode}
            editable={editing}
            placeholder="Código de barras"
          />

          <Input
            label="Peso (kg)"
            value={formData.weight}
            onChangeText={(value) => updateFormData('weight', value)}
            error={errors.weight}
            editable={editing}
            keyboardType="numeric"
            placeholder="0.0"
          />
        </Card>

        {editing && (
          <View style={styles.actions}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={() => {
                if (id === 'new') {
                  router.back();
                } else {
                  setEditing(false);
                  loadData(); // Recargar datos originales
                }
              }}
              style={styles.cancelButton}
            />
            <Button
              title={id === 'new' ? 'Crear Producto' : 'Guardar Cambios'}
              onPress={handleSave}
              loading={saving}
              style={styles.saveButton}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  imageCard: {
    marginBottom: spacing.lg,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  lowStockBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  lowStockText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.inverse,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.surface,
  },
  categoryOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  categoryOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  categoryOptionTextSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  readOnlyValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  currencySymbol: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  profitInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  profitLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  profitValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});