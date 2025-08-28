import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    ListRenderItem,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { api } from '../../../services/api';
import { borderRadius, colors, spacing, typography } from '../../../theme/design';

interface Company {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
}

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'active' | 'inactive';
}

interface Seller {
  id: number;
  user_id: number;
  company_id: number;
  code: string;
  description?: string;
  percent_sales: number;
  percent_receivable: number;
  inkeeper: boolean;
  user_code?: string;
  percent_gerencial_debit_note: number;
  percent_gerencial_credit_note: number;
  percent_returned_check: number;
  seller_status: 'active' | 'inactive';
  user?: User;
  company?: Company;
}

interface CompanySelectorProps {
  visible: boolean;
  companies: Company[];
  selectedCompany: Company | null;
  onSelect: (company: Company) => void;
  onClose: () => void;
  loading: boolean;
}

interface UserSelectorProps {
  visible: boolean;
  users: User[];
  selectedUser: User | null;
  onSelect: (user: User) => void;
  onClose: () => void;
  loading: boolean;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({
  visible,
  companies,
  selectedCompany,
  onSelect,
  onClose,
  loading,
}) => {
  const renderCompany: ListRenderItem<Company> = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.selectorItem,
        selectedCompany?.id === item.id && styles.selectorItemSelected
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.selectorItemContent}>
        <Ionicons name="business" size={20} color={colors.primary[500]} />
        <View style={styles.selectorItemInfo}>
          <Text style={styles.selectorItemName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.selectorItemDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
      {selectedCompany?.id === item.id && (
        <Ionicons name="checkmark" size={20} color={colors.primary[500]} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Seleccionar Empresa</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <LoadingSpinner text="Cargando empresas..." />
        ) : (
          <FlatList
            data={companies.filter(c => c.status === 'active')}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCompany}
            style={styles.selectorList}
          />
        )}
      </View>
    </Modal>
  );
};

const UserSelector: React.FC<UserSelectorProps> = ({
  visible,
  users,
  selectedUser,
  onSelect,
  onClose,
  loading,
}) => {
  const renderUser: ListRenderItem<User> = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.selectorItem,
        selectedUser?.id === item.id && styles.selectorItemSelected
      ]}
      onPress={() => onSelect(item)}
    >
      <View style={styles.selectorItemContent}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.selectorItemInfo}>
          <Text style={styles.selectorItemName}>{item.name}</Text>
          <Text style={styles.selectorItemDescription}>{item.email}</Text>
          {item.phone && (
            <Text style={styles.selectorItemPhone}>{item.phone}</Text>
          )}
        </View>
      </View>
      {selectedUser?.id === item.id && (
        <Ionicons name="checkmark" size={20} color={colors.primary[500]} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Seleccionar Usuario</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <LoadingSpinner text="Cargando usuarios..." />
        ) : (
          <FlatList
            data={users.filter(u => u.status === 'active' && u.role === 'seller')}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUser}
            style={styles.selectorList}
          />
        )}
      </View>
    </Modal>
  );
};

export default function EditSellerScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [seller, setSeller] = useState<Seller | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [showUserSelector, setShowUserSelector] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    percent_sales: '5.0',
    percent_receivable: '3.0',
    inkeeper: false,
    user_code: '',
    percent_gerencial_debit_note: '2.5',
    percent_gerencial_credit_note: '2.0',
    percent_returned_check: '1.5',
    seller_status: 'active' as 'active' | 'inactive',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [sellerResponse, companiesResponse, usersResponse] = await Promise.all([
        api.getSeller(Number(id)),
        api.getCompanies({ per_page: 100 }),
        api.getUsers({ role: 'seller', per_page: 100 }),
      ]);
      
      const sellerData = sellerResponse;
      setSeller(sellerData);
      setCompanies(companiesResponse.data);
      setUsers(usersResponse.data);

      // Setear los datos del formulario
      setFormData({
        code: sellerData.code,
        description: sellerData.description || '',
        percent_sales: sellerData.percent_sales.toString(),
        percent_receivable: sellerData.percent_receivable.toString(),
        inkeeper: sellerData.inkeeper,
        user_code: sellerData.user_code || '',
        percent_gerencial_debit_note: sellerData.percent_gerencial_debit_note.toString(),
        percent_gerencial_credit_note: sellerData.percent_gerencial_credit_note.toString(),
        percent_returned_check: sellerData.percent_returned_check.toString(),
        seller_status: sellerData.seller_status,
      });

      // Buscar y setear el usuario y empresa seleccionados
      const selectedUserData = usersResponse.data.find(u => u.id === sellerData.user_id);
      const selectedCompanyData = companiesResponse.data.find(c => c.id === sellerData.company_id);
      
      if (selectedUserData) setSelectedUser(selectedUserData);
      if (selectedCompanyData) setSelectedCompany(selectedCompanyData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudo cargar la información del vendedor');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedUser) {
      newErrors.user = 'Debes seleccionar un usuario';
    }

    if (!selectedCompany) {
      newErrors.company = 'Debes seleccionar una empresa';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'El código del vendedor es requerido';
    }

    const percentSales = Number(formData.percent_sales);
    if (isNaN(percentSales) || percentSales < 0 || percentSales > 100) {
      newErrors.percent_sales = 'El porcentaje de ventas debe estar entre 0 y 100';
    }

    const percentReceivable = Number(formData.percent_receivable);
    if (isNaN(percentReceivable) || percentReceivable < 0 || percentReceivable > 100) {
      newErrors.percent_receivable = 'El porcentaje de cobranza debe estar entre 0 y 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !seller) return;

    try {
      setSaving(true);
      
      const sellerData = {
        code: formData.code.trim(),
        description: formData.description.trim() || undefined,
        percent_sales: Number(formData.percent_sales),
        percent_receivable: Number(formData.percent_receivable),
        inkeeper: formData.inkeeper,
        user_code: formData.user_code.trim() || undefined,
        percent_gerencial_debit_note: Number(formData.percent_gerencial_debit_note),
        percent_gerencial_credit_note: Number(formData.percent_gerencial_credit_note),
        percent_returned_check: Number(formData.percent_returned_check),
        seller_status: formData.seller_status,
      };

      await api.updateSeller(seller.id, sellerData);
      Alert.alert('Éxito', 'Vendedor actualizado correctamente');
      router.back();
    } catch (error: any) {
      console.error('Error updating seller:', error);
      const message = error.response?.data?.message || 'Error al actualizar el vendedor';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando vendedor..." />
      </View>
    );
  }

  if (!seller) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>No se pudo cargar el vendedor</Text>
        <Button title="Volver" onPress={() => router.back()} />
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
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="person" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Editar Vendedor</Text>
          <Text style={styles.subtitle}>{seller.user?.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información básica */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          
          <Input
            label="Código del Vendedor *"
            placeholder="VEN-001"
            value={formData.code}
            onChangeText={(value) => updateFormData('code', value)}
            error={errors.code}
            autoCapitalize="characters"
            leftIcon={<Ionicons name="qr-code" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Descripción"
            placeholder="Descripción del vendedor"
            value={formData.description}
            onChangeText={(value) => updateFormData('description', value)}
            error={errors.description}
            multiline
            numberOfLines={3}
            leftIcon={<Ionicons name="document-text" size={20} color={colors.text.tertiary} />}
          />

          <Input
            label="Código de Usuario"
            placeholder="Código interno (opcional)"
            value={formData.user_code}
            onChangeText={(value) => updateFormData('user_code', value)}
            error={errors.user_code}
            leftIcon={<Ionicons name="key" size={20} color={colors.text.tertiary} />}
          />
        </Card>

        {/* Comisiones */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Comisiones (%)</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Ventas *"
                placeholder="5.0"
                value={formData.percent_sales}
                onChangeText={(value) => updateFormData('percent_sales', value)}
                error={errors.percent_sales}
                keyboardType="decimal-pad"
                leftIcon={<Text style={styles.percentSymbol}>%</Text>}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Cobranza *"
                placeholder="3.0"
                value={formData.percent_receivable}
                onChangeText={(value) => updateFormData('percent_receivable', value)}
                error={errors.percent_receivable}
                keyboardType="decimal-pad"
                leftIcon={<Text style={styles.percentSymbol}>%</Text>}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Nota Débito Gerencial"
                placeholder="2.5"
                value={formData.percent_gerencial_debit_note}
                onChangeText={(value) => updateFormData('percent_gerencial_debit_note', value)}
                keyboardType="decimal-pad"
                leftIcon={<Text style={styles.percentSymbol}>%</Text>}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Nota Crédito Gerencial"
                placeholder="2.0"
                value={formData.percent_gerencial_credit_note}
                onChangeText={(value) => updateFormData('percent_gerencial_credit_note', value)}
                keyboardType="decimal-pad"
                leftIcon={<Text style={styles.percentSymbol}>%</Text>}
              />
            </View>
          </View>

          <Input
            label="Cheque Devuelto"
            placeholder="1.5"
            value={formData.percent_returned_check}
            onChangeText={(value) => updateFormData('percent_returned_check', value)}
            keyboardType="decimal-pad"
            leftIcon={<Text style={styles.percentSymbol}>%</Text>}
          />
        </Card>

        {/* Configuración */}
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Configuración</Text>
          
          {/* Switch para encargado */}
          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={[
                styles.switchButton,
                formData.inkeeper && styles.switchButtonActive
              ]}
              onPress={() => updateFormData('inkeeper', !formData.inkeeper)}
            >
              <Ionicons 
                name={formData.inkeeper ? 'checkmark-circle' : 'ellipse-outline'} 
                size={24} 
                color={formData.inkeeper ? colors.primary[500] : colors.text.secondary} 
              />
              <View style={styles.switchContent}>
                <Text style={styles.switchTitle}>Encargado</Text>
                <Text style={styles.switchDescription}>
                  Este vendedor tendrá permisos de encargado
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Estado */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>Estado del Vendedor</Text>
            <View style={styles.statusOptions}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.seller_status === 'active' && styles.statusOptionSelected
                ]}
                onPress={() => updateFormData('seller_status', 'active')}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={formData.seller_status === 'active' ? colors.success : colors.text.secondary} 
                />
                <Text style={[
                  styles.statusText,
                  formData.seller_status === 'active' && styles.statusTextSelected
                ]}>
                  Activo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.seller_status === 'inactive' && styles.statusOptionSelected
                ]}
                onPress={() => updateFormData('seller_status', 'inactive')}
              >
                <Ionicons 
                  name="close-circle" 
                  size={24} 
                  color={formData.seller_status === 'inactive' ? colors.error : colors.text.secondary} 
                />
                <Text style={[
                  styles.statusText,
                  formData.seller_status === 'inactive' && styles.statusTextSelected
                ]}>
                  Inactivo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Botones */}
        <View style={styles.actions}>
          <Button
            title="Cancelar"
            variant="outline"
            onPress={() => router.back()}
            style={styles.cancelButton}
          />
          <Button
            title="Actualizar Vendedor"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          />
        </View>

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.error,
    marginVertical: spacing.lg,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  percentSymbol: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  switchContainer: {
    marginBottom: spacing.lg,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  switchButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  switchContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  switchTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  switchDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  statusContainer: {
    marginBottom: spacing.md,
  },
  statusTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  statusOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  statusText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  statusTextSelected: {
    color: colors.primary[600],
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

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  selectorList: {
    flex: 1,
  },
  selectorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  selectorItemSelected: {
    backgroundColor: colors.primary[50],
  },
  selectorItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectorItemInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  selectorItemName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  selectorItemDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  selectorItemPhone: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
});