import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import type { Customer } from '../../types';
import { formatDate } from '../../utils/helpers';

const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI' },
  { value: 'RUC', label: 'RUC' },
  { value: 'CE', label: 'Carnet de Extranjería' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

export default function CustomerDetailScreen(): JSX.Element {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(mode === 'edit' || id === 'new');
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document_type: 'DNI',
    document_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (id !== 'new') {
        // Cargar cliente existente
        const customerData = await api.getCustomer(Number(id));
        setCustomer(customerData);
        setFormData({
          name: customerData.name,
          email: customerData.email || '',
          phone: customerData.phone || '',
          document_type: customerData.document_type || 'DNI',
          document_number: customerData.document_number || '',
          address: customerData.address || '',
          city: customerData.city || '',
          state: customerData.state || '',
          zip_code: customerData.zip_code || '',
        });
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      Alert.alert('Error', 'No se pudo cargar la información del cliente');
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

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (formData.phone && formData.phone.length < 9) {
      newErrors.phone = 'El teléfono debe tener al menos 9 dígitos';
    }

    if (formData.document_number) {
      if (formData.document_type === 'DNI' && formData.document_number.length !== 8) {
        newErrors.document_number = 'El DNI debe tener 8 dígitos';
      } else if (formData.document_type === 'RUC' && formData.document_number.length !== 11) {
        newErrors.document_number = 'El RUC debe tener 11 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const storedCompany = await AsyncStorage.getItem('selectedCompany');
      const company = storedCompany ? JSON.parse(storedCompany) : null;      
      
      const customerData = {
        company_id: company.id,
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        document_type: formData.document_type || undefined,
        document_number: formData.document_number.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zip_code: formData.zip_code.trim() || undefined,
      };

      let savedCustomer: Customer;
      
      if (id === 'new') {
        savedCustomer = await api.createCustomer(customerData);
        
        Alert.alert('Éxito', 'Cliente creado correctamente');
        router.replace(`/customers/${savedCustomer.data.id}`);
      } else {
        savedCustomer = await api.updateCustomer(Number(id), customerData);
        setCustomer(savedCustomer);
        setEditing(false);
        Alert.alert('Éxito', 'Cliente actualizado correctamente');
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const message = error.response?.data?.message || 'Error al guardar el cliente';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!customer) return;

    Alert.alert(
      'Eliminar Cliente',
      `¿Estás seguro de que quieres eliminar a "${customer.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteCustomer(customer.id);
              Alert.alert('Éxito', 'Cliente eliminado correctamente');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el cliente');
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
        <LoadingSpinner text="Cargando cliente..." />
      </View>
    );
  }

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
              {id === 'new' ? 'Nuevo Cliente' : editing ? 'Editar Cliente' : 'Detalle del Cliente'}
            </Text>
            {customer && (
              <Text style={styles.headerSubtitle}>
                {customer.document_type && customer.document_number 
                  ? `${customer.document_type}: ${customer.document_number}`
                  : 'Sin documento'
                }
              </Text>
            )}
          </View>
        </View>
        
       {/*  {customer && !editing && (
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
        {/* Avatar y info básica */}
        <Card style={styles.avatarCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={colors.primary[500]} />
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.customerName}>
                {customer?.name || formData.name || 'Nuevo Cliente'}
              </Text>
              {customer?.sales_count !== undefined && (
                <Text style={styles.customerStats}>
                  {customer.sales_count} venta{customer.sales_count !== 1 ? 's' : ''}
                </Text>
              )}
              {customer?.created_at && (
                <Text style={styles.customerDate}>
                  Cliente desde {formatDate(customer.created_at)}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Información personal */}
        <Card>
          <Text style={styles.sectionTitle}>Información Personal</Text>
          
          <Input
            label="Nombre Completo *"
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            error={errors.name}
            editable={editing}
            placeholder="Nombre completo del cliente"
            leftIcon={<Ionicons name="person" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            error={errors.email}
            editable={editing}
            placeholder="correo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Teléfono"
            value={formData.phone}
            onChangeText={(value) => updateFormData('phone', value)}
            error={errors.phone}
            editable={editing}
            placeholder="999 999 999"
            keyboardType="phone-pad"
            leftIcon={<Ionicons name="call" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Documento de identidad */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Documento de Identidad</Text>
          
          {/* Selector de tipo de documento */}
          

          <Input
            label="Número de Documento"
            value={formData.document_number}
            onChangeText={(value) => updateFormData('document_number', value)}
            error={errors.document_number}
            editable={editing}
            placeholder="Número de documento"
            keyboardType="numeric"
            leftIcon={<Ionicons name="card" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Dirección */}
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Dirección</Text>
          
          <Input
            label="Dirección"
            value={formData.address}
            onChangeText={(value) => updateFormData('address', value)}
            error={errors.address}
            editable={editing}
            placeholder="Dirección completa"
            multiline
            numberOfLines={2}
            leftIcon={<Ionicons name="location" size={20} color={colors.text.tertiary} />}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Ciudad"
                value={formData.city}
                onChangeText={(value) => updateFormData('city', value)}
                error={errors.city}
                editable={editing}
                placeholder="Ciudad"
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Región/Estado"
                value={formData.state}
                onChangeText={(value) => updateFormData('state', value)}
                error={errors.state}
                editable={editing}
                placeholder="Región"
              />
            </View>
          </View>

          <Input
            label="Código Postal"
            value={formData.zip_code}
            onChangeText={(value) => updateFormData('zip_code', value)}
            error={errors.zip_code}
            editable={editing}
            placeholder="00000"
            keyboardType="numeric"
          />
        </Card>

        {/* Estadísticas del cliente (solo en modo vista) */}
   

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
              title={id === 'new' ? 'Crear Cliente' : 'Guardar Cambios'}
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
    marginTop: spacing.lg
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
  avatarCard: {
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  avatarInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  customerStats: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  customerDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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
  documentTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  documentTypeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.surface,
  },
  documentTypeOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  documentTypeOptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  documentTypeOptionTextSelected: {
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  readOnlyValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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