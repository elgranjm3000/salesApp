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
import type { Customer } from '../../types';
import { debounce } from '../../utils/helpers';

interface CustomerItemProps {
  customer: Customer;
}

export default function CustomersScreen(): JSX.Element {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchText, customers]);

  const loadCustomers = async (): Promise<void> => {
    try {
      setLoading(true);
      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;
      let response
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
    if (!searchText) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      customer.phone?.includes(searchText) ||
      customer.document_number?.includes(searchText)
    );
    
    setFilteredCustomers(filtered);
  };

  const debouncedSearch = debounce((text: string) => {
    setSearchText(text);
  }, 300);

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

  const CustomerItem: React.FC<CustomerItemProps> = ({ customer }) => {
    return (
      <Card style={styles.customerCard}>
        <TouchableOpacity
          style={styles.customerContent}
          onPress={() => router.push(`/customers/${customer.id}`)}
          activeOpacity={0.8}
        >         
          
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customer.name}</Text>
            {customer.email && (
              <View style={styles.contactRow}>
                <Ionicons name="mail" size={14} color={colors.text.secondary} />
                <Text style={styles.contactText}>{customer.email}</Text>
              </View>
            )}
            {customer.phone && (
              <View style={styles.contactRow}>
                <Ionicons name="call" size={14} color={colors.text.secondary} />
                <Text style={styles.contactText}>{customer.phone}</Text>
              </View>
            )}
            {customer.document_number && (
              <View style={styles.contactRow}>
                <Ionicons name="card" size={14} color={colors.text.secondary} />
                <Text style={styles.contactText}>
                  {customer.document_type} {customer.document_number}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.customerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/quotes/new?customer_id=${customer.id}`)}
            >
              <Text style={{ color: colors.primary[500] }}>Crear{'\n'}presupuesto</Text>
            </TouchableOpacity>
            
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderItem: ListRenderItem<Customer> = ({ item }) => (
    <CustomerItem customer={item} />
  );

  const renderEmpty = (): JSX.Element => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyText}>No hay clientes</Text>
      <Button
        title="Agregar Cliente"
        variant="outline"
        onPress={() => router.push('/customers/new')}
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
            <Text style={styles.title}>Clientes</Text>
            <Text style={styles.subtitle}>{filteredCustomers.length} clientes</Text>
          </View>
         
        </View>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar clientes..."
          onChangeText={debouncedSearch}
          leftIcon={<Ionicons name="search" size={20} color={colors.text.tertiary} />}
          style={{ marginBottom: 0 }}
        />
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
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  customersList: {
    padding: spacing.md,
  },
  customerCard: {
    marginBottom: spacing.sm,
  },
  customerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    
  },
  customerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,    
  },
  contactText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  customerActions: {
    flexDirection: 'column',
    marginLeft: spacing.md,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});