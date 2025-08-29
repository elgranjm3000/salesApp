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
import { Card } from '../../components/ui/Card';
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
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    loadSellers();
  }, []);

  useEffect(() => {
    filterSellers();
  }, [searchText, sellers]);

  const loadSellers = async (): Promise<void> => {
    console.log('Loading sellers...');
    try {
      setLoading(true);
       const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      console.log('Selected Company:', company.id);
      const response = await api.getSellers({ company_id: company.id });
      // Corregir la estructura de respuesta - a veces viene en data.data, a veces solo en data
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
    if (!searchText) {
      setFilteredSellers(sellers);
      return;
    }

    const filtered = sellers.filter(seller =>
      seller.user?.name.toLowerCase().includes(searchText.toLowerCase()) ||
      seller.code.toLowerCase().includes(searchText.toLowerCase()) ||
      seller.company?.name.toLowerCase().includes(searchText.toLowerCase())
    );
    
    setFilteredSellers(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

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

  const SellerItem: React.FC<SellerItemProps> = ({ seller }) => {
    return (
      <Card style={styles.sellerCard}>
        <TouchableOpacity
          style={styles.sellerContent}
          onPress={() => router.push(`/sellers/${seller.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.sellerHeader}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>
                {seller.user?.name.charAt(0).toUpperCase() || 'S'}
              </Text>
            </View>
            <View style={styles.sellerMainInfo}>
              <Text style={styles.sellerName}>{seller.user?.name || 'Sin nombre'}</Text>
              <Text style={styles.sellerCode}>#{seller.code}</Text>
              <Text style={styles.sellerCompany}>{seller.company?.name || 'Sin empresa'}</Text>
            </View>
            <View style={styles.sellerStatus}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: seller.seller_status === 'active' ? colors.success + '20' : colors.error + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: seller.seller_status === 'active' ? colors.success : colors.error }
                ]}>
                  {seller.seller_status === 'active' ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sellerDetails}>
            <View style={styles.sellerDetailItem}>
              <Ionicons name="mail" size={14} color={colors.text.secondary} />
              <Text style={styles.sellerDetailText}>
                {seller.user?.email || 'Sin email'}
              </Text>
            </View>
            {seller.user?.phone && (
              <View style={styles.sellerDetailItem}>
                <Ionicons name="call" size={14} color={colors.text.secondary} />
                <Text style={styles.sellerDetailText}>{seller.user.phone}</Text>
              </View>
            )}
          </View>

          <View style={styles.sellerCommissions}>
            <View style={styles.commissionItem}>
              <Text style={styles.commissionLabel}>Comisión Ventas:</Text>
              <Text style={styles.commissionValue}>{seller.percent_sales}%</Text>
            </View>
            <View style={styles.commissionItem}>
              <Text style={styles.commissionLabel}>Comisión Cobranza:</Text>
              <Text style={styles.commissionValue}>{seller.percent_receivable}%</Text>
            </View>
            {seller.inkeeper && (
              <View style={styles.inkeeperBadge}>
                <Ionicons name="key" size={12} color={colors.warning} />
                <Text style={styles.inkeeperText}>Encargado</Text>
              </View>
            )}
          </View>

          <View style={styles.sellerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/sellers/${seller.id}/edit`);
              }}
            >
              <Ionicons name="create" size={18} color={colors.primary[500]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/sellers/${seller.id}`);
              }}
            >
              <Ionicons name="eye" size={18} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteSeller(seller.id);
              }}
            >
              <Ionicons name="trash" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderItem: ListRenderItem<Seller> = ({ item }) => (
    <SellerItem seller={item} />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No hay vendedores registrados</Text>
      <Text style={styles.emptySubtext}>
        Comienza creando tu primer vendedor para gestionar las ventas
      </Text>
      <Button
        title="Crear Vendedor"
        variant="outline"
        onPress={() => router.push('/sellers/new')}
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
            <Text style={styles.title}>Vendedores</Text>
            <Text style={styles.subtitle}>
              {filteredSellers.length} vendedor{filteredSellers.length !== 1 ? 'es' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/sellers/new')}
          >
            <Ionicons name="add" size={24} color={colors.text.inverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros rápidos */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersContent}>
          <TouchableOpacity style={styles.filterChip}>
            <Ionicons name="people" size={16} color={colors.text.secondary} />
            <Text style={styles.filterChipText}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.filterChipText}>Activos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterChip}>
            <Ionicons name="key" size={16} color={colors.warning} />
            <Text style={styles.filterChipText}>Encargados</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar vendedores..."
          onChangeText={debouncedSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          style={{ marginBottom: 0 }}
        />
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
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  headerContent: {
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
    marginTop: 2,
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
  filtersContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  filtersContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  sellersList: {
    padding: spacing.lg,
  },
  sellerCard: {
    marginBottom: spacing.md,
  },
  sellerContent: {
    padding: spacing.md,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sellerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sellerAvatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  sellerMainInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sellerCode: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  sellerCompany: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  sellerStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  sellerDetails: {
    marginBottom: spacing.md,
  },
  sellerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sellerDetailText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  sellerCommissions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  commissionItem: {
    alignItems: 'center',
  },
  commissionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  commissionValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },
  inkeeperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  inkeeperText: {
    fontSize: typography.fontSize.xs,
    color: colors.warning,
    marginLeft: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  sellerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
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
    marginBottom: spacing.lg,
  },
});