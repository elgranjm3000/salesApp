import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';

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
import type { Customer } from '../../types';
import { debounce } from '../../utils/helpers';

interface CustomerItemProps {
  customer: Customer;
}

export default function CustomersScreen(): JSX.Element {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchByName, setSearchByName] = useState<string>('');
  const [searchByDocument, setSearchByDocument] = useState<string>('');
  const [ searchByContact, setSearchByContact ] = useState<string>('');

  useEffect(() => {
    loadCustomers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [])
  );

  useEffect(() => {
    filterCustomers();
  }, [searchByContact, searchByName, searchByDocument, customers]);

  const loadCustomers = async (): Promise<void> => {
    try {
      setLoading(true);
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      let response;
      if (company) {
        response = await api.getCustomers({ company_id: company.id });
      } else {
        response = await api.getCustomers();
      }
      setCustomers(response.data);
    } catch (error) {
      console.log('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = (): void => {
    let filtered = customers;

    // Filtrar por nombre
    if (searchByName) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchByName.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchByName.toLowerCase())
      );
    }

    // Filtrar por documento
    if (searchByDocument) {
      filtered = filtered.filter(customer =>
        customer.document_number?.toLowerCase().includes(searchByDocument.toLowerCase())
      );
    }

    if (searchByContact) {
      filtered = filtered.filter(customer =>
        customer.contact?.toLowerCase().includes(searchByContact.toLowerCase())
      );
    }


    
    
    setFilteredCustomers(filtered);
  };

  const debouncedSearchName = debounce((text: string) => {
    setSearchByName(text);
  }, 300);

  const debouncedSearchDocument = debounce((text: string) => {
    setSearchByDocument(text);
  }, 300);

    const debouncedSearchContact= debounce((text: string) => {
    setSearchByContact(text);
  }, 300);

  const clearFilters = (): void => {
    setSearchByName('');
    setSearchByDocument('');
    setSearchByContact('');
  };

  const deleteCustomer = async (customerId: number): Promise<void> => {
    Alert.alert(
      'Eliminar Cliente',
      '¿Estás seguro de que quieres eliminar este cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCustomer(customerId);
              loadCustomers();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el cliente');
            }
          },
        },
      ]
    );
  };

  const CustomerRow: React.FC<CustomerItemProps> = ({ customer }) => {
    return (
      <TouchableOpacity
        style={styles.customerRow}
        onPress={() => router.push(`/customers/${customer.id}`)}
        activeOpacity={0.7}
      >
        {/* Avatar y datos del cliente */}
        <View style={styles.customerLeft}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {customer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            {/* Nombre */}
            <Text style={styles.customerName} numberOfLines={1}>
              {customer.name}
            </Text>
            
            {/* Documento */}
            {customer.document_number && (
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {customer.document_type} {customer.document_number}
                </Text>
              </View>
            )}
            
            {/* Email */}
            {customer.email && (
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {customer.email}
                </Text>
              </View>
            )}

            {customer.contact && (
              <View style={styles.infoRow}>
                <Ionicons name="person-circle-outline" size={14} color={colors.text.secondary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {customer.contact}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Acción y flecha */}
        <View style={styles.customerRight}>
          <TouchableOpacity
            style={styles.quoteButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/quotes/new?customer_id=${customer.id}`);
            }}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem: ListRenderItem<Customer> = ({ item }) => (
    <CustomerRow customer={item} />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No hay clientes</Text>
      <Text style={styles.emptySubtext}>
        {searchByName || searchByDocument
          ? 'No se encontraron clientes con los filtros aplicados'
          : 'No hay clientes registrados en este momento'}
      </Text>
      {(searchByName || searchByDocument) && (
        <Button
          title="Limpiar filtros"
          variant="outline"
          onPress={clearFilters}
          style={{ marginTop: spacing.lg }}
        />
      )}
    </View>
  );

  const hasActiveFilters = searchByName || searchByDocument;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Clientes</Text>
            <Text style={styles.subtitle}>
              {filteredCustomers.length} de {customers.length} cliente{customers.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Filtros de búsqueda - En una sola fila */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          <View style={styles.filterInputWrapper}>
            <Input
              placeholder="Descripción"
              onChangeText={debouncedSearchName}
              leftIcon={<Ionicons name="search" size={18} color={colors.text.tertiary} />}
              style={[styles.filterInput,{height: 60, paddingVertical: 2}]}
            />
          </View>
        </View>
        <View style={[styles.filtersRow,{marginTop:20}]}>
          <View style={styles.filterInputWrapper}>
            <Input
              placeholder="Código"
              onChangeText={debouncedSearchDocument}
              leftIcon={<Ionicons name="card-outline" size={18} color={colors.text.tertiary} />}
              style={[styles.filterInput,{height: 60, paddingVertical: 2}]}
            />
          </View>
        </View>

        {/*<View style={[styles.filtersRow,{marginTop:20}]}>
          <View style={styles.filterInputWrapper}>
            <Input
              placeholder="Contacto"
              onChangeText={debouncedSearchContact}
              leftIcon={<Ionicons name="person-circle-outline" size={18} color={colors.text.tertiary} />}
              style={styles.filterInput}
            />
          </View>
        </View>*/}
        
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

      {/* Lista de clientes */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadCustomers} />
        }
        contentContainerStyle={styles.customersList}
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
    marginTop: spacing.lg
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
  customersList: {
    flexGrow: 1,
    paddingBottom:100
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 88,
  },
  customerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerAvatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  customerInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  customerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
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