import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { debounce } from '../../utils/helpers';

interface Seller {
  id: number;
  user_id: number;
  company_id: number;
  code: string;
  description?: string;
  percent_sales: number;
  percent_receivable: number;
  inkeeper: boolean;
  seller_status: 'active' | 'inactive';
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  company?: {
    id: number;
    name: string;
  };
}

interface SellerItemProps {
  seller: Seller;
}

export default function SellersScreen(): JSX.Element {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchByDescription, setSearchByDescription] = useState<string>('');
  const [searchByCode, setSearchByCode] = useState<string>('');

  useEffect(() => {
    loadSellers();
  }, []);

  useEffect(() => {
    filterSellers();
  }, [searchByDescription, searchByCode, sellers]);

  const loadSellers = async (): Promise<void> => {
    console.log('Loading sellers...');
    try {
      setLoading(true);
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      console.log('Selected Company:', company.id);
      const response = await api.getSellers({ company_id: company.id });
      const sellersData = response.data?.data || response.data || [];
      setSellers(sellersData);
    } catch (error) {
      console.log('Error loading sellers:', error);
      Alert.alert('Error', 'No se pudieron cargar los vendedores');
    } finally {
      setLoading(false);
    }
  };

  const filterSellers = (): void => {
    let filtered = sellers;

    // Filtrar por descripción
    if (searchByDescription) {
      filtered = filtered.filter(seller =>
        seller.description?.toLowerCase().includes(searchByDescription.toLowerCase()) ||
        seller.user?.name.toLowerCase().includes(searchByDescription.toLowerCase())
      );
    }

    // Filtrar por código
    if (searchByCode) {
      filtered = filtered.filter(seller =>
        seller.code.toLowerCase().includes(searchByCode.toLowerCase())
      );
    }
    
    setFilteredSellers(filtered);
  };

  const debouncedSearchDescription = debounce((text: string) => {
    setSearchByDescription(text);
  }, 300);

  const debouncedSearchCode = debounce((text: string) => {
    setSearchByCode(text);
  }, 300);

  const clearFilters = (): void => {
    setSearchByDescription('');
    setSearchByCode('');
  };

  const deleteSeller = async (sellerId: number): Promise<void> => {
    Alert.alert(
      'Eliminar Vendedor',
      '¿Estás seguro de que quieres eliminar este vendedor?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteSeller(sellerId);
              loadSellers();
              Alert.alert('Éxito', 'Vendedor eliminado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el vendedor');
            }
          },
        },
      ]
    );
  };

  const SellerRow: React.FC<SellerItemProps> = ({ seller }) => {
    return (
      <TouchableOpacity
        style={styles.sellerRow}
        onPress={() => router.push(`/sellers/${seller.id}`)}
        activeOpacity={0.7}
      >
        {/* Avatar y nombre */}
        <View style={styles.sellerLeft}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>
              {seller.user?.name.charAt(0).toUpperCase() || 'S'}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {seller.user?.name || 'Sin nombre'}
            </Text>
            <Text style={styles.sellerDescription} numberOfLines={1}>
              {seller.description || 'Sin descripción'}
            </Text>
          </View>
        </View>

        {/* Código */}
        <View style={styles.sellerCenter}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeText}>{seller.code}</Text>
          </View>
        </View>

        {/* Estado y acciones */}
        <View style={styles.sellerRight}>
          <View style={[
            styles.statusDot,
            { backgroundColor: seller.seller_status === 'active' ? colors.success : colors.error }
          ]} />
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem: ListRenderItem<Seller> = ({ item }) => (
    <SellerRow seller={item} />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No hay vendedores</Text>
      <Text style={styles.emptySubtext}>
        {searchByDescription || searchByCode
          ? 'No se encontraron vendedores con los filtros aplicados'
          : 'Comienza creando tu primer vendedor para gestionar las ventas'}
      </Text>
      {(searchByDescription || searchByCode) && (
        <Button
          title="Limpiar filtros"
          variant="outline"
          onPress={clearFilters}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );

  const hasActiveFilters = searchByDescription || searchByCode;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Vendedores</Text>
            <Text style={styles.subtitle}>
              {filteredSellers.length} de {sellers.length} vendedor{sellers.length !== 1 ? 'es' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Filtros de búsqueda - En una sola fila */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          <View style={styles.filterInputWrapper}>
            <Input
              placeholder="Descripción..."
              onChangeText={debouncedSearchDescription}
              leftIcon={<Ionicons name="search" size={18} color={colors.text.tertiary} />}
              style={styles.filterInput}
            />
          </View>
          <View style={styles.filterInputWrapper}>
            <Input
              placeholder="Código..."
              onChangeText={debouncedSearchCode}
              leftIcon={<Ionicons name="keypad-outline" size={18} color={colors.text.tertiary} />}
              style={styles.filterInput}
            />
          </View>
        </View>
        
        {hasActiveFilters && (
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={clearFilters}
          >
            <Ionicons name="close-circle" size={16} color={colors.primary[500]} />
            <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de vendedores */}
      <FlatList
        data={filteredSellers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSellers} />
        }
        contentContainerStyle={styles.sellersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  // Contenedor de filtros separado del header
  filtersContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  filterInputWrapper: {
    flex: 1,
  },
  filterInput: {
    marginBottom: 0,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  clearFiltersText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  sellersList: {
    flexGrow: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 72,
  },
  sellerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sellerAvatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sellerDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  sellerCenter: {
    marginRight: spacing.md,
  },
  codeBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  codeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  sellerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray[100],
    marginHorizontal: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
    maxWidth: 280,
  },
});