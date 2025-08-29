import { Ionicons } from '@expo/vector-icons';
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

export default function EditSellerScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [seller, setSeller] = useState<Seller | null>(null);

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
      const sellerData = await api.getSeller(Number(id));
      
      setSeller(sellerData);

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

    const percentDebitNote = Number(formData.percent_gerencial_debit_note);
    if (isNaN(percentDebitNote) || percentDebitNote < 0 || percentDebitNote > 100) {
      newErrors.percent_gerencial_debit_note = 'El porcentaje debe estar entre 0 y 100';
    }

    const percentCreditNote = Number(formData.percent_gerencial_credit_note);
    if (isNaN(percentCreditNote) || percentCreditNote < 0 || percentCreditNote > 100) {
      newErrors.percent_gerencial_credit_note = 'El porcentaje debe estar entre 0 y 100';
    }

    const percentReturnedCheck = Number(formData.percent_returned_check);
    if (isNaN(percentReturnedCheck) || percentReturnedCheck < 0 || percentReturnedCheck > 100) {
      newErrors.percent_returned_check = 'El porcentaje debe estar entre 0 y 100';
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
      Alert.alert('Éxito', 'Vendedor actualizado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={64} color={colors.error} />
        </View>
        <Text style={styles.errorText}>No se pudo cargar el vendedor</Text>
        <Text style={styles.errorSubtext}>
          Por favor, verifica la conexión e intenta nuevamente
        </Text>
        <Button 
          title="Volver" 
          onPress={() => router.back()} 
          style={styles.errorButton}
        />
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
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>
              {seller.user?.name.charAt(0).toUpperCase() || 'S'}
            </Text>
          </View>
          <Text style={styles.title}>Editar Vendedor</Text>
          <Text style={styles.subtitle}>{seller.user?.name}</Text>
          <View style={styles.sellerInfo}>
            <View style={styles.sellerInfoItem}>
              <Ionicons name="business" size={16} color={colors.text.secondary} />
              <Text style={styles.sellerInfoText}>{seller.company?.name}</Text>
            </View>
            <View style={styles.sellerInfoItem}>
              <Ionicons name="qr-code" size={16} color={colors.text.secondary} />
              <Text style={styles.sellerInfoText}>#{seller.code}</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información básica */}
        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Información Básica</Text>
          </View>
          
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

        {/* Comisiones principales */}
        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={24} color={colors.success} />
            <Text style={styles.sectionTitle}>Comisiones Principales</Text>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Comisión Ventas *"
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
                label="Comisión Cobranza *"
                placeholder="3.0"
                value={formData.percent_receivable}
                onChangeText={(value) => updateFormData('percent_receivable', value)}
                error={errors.percent_receivable}
                keyboardType="decimal-pad"
                leftIcon={<Text style={styles.percentSymbol}>%</Text>}
              />
            </View>
          </View>
        </Card>

        {/* Comisiones gerenciales */}
        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document" size={24} color={colors.warning} />
            <Text style={styles.sectionTitle}>Comisiones Gerenciales</Text>
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="Nota Débito Gerencial"
                placeholder="2.5"
                value={formData.percent_gerencial_debit_note}
                onChangeText={(value) => updateFormData('percent_gerencial_debit_note', value)}
                error={errors.percent_gerencial_debit_note}
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
                error={errors.percent_gerencial_credit_note}
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
            error={errors.percent_returned_check}
            keyboardType="decimal-pad"
            leftIcon={<Text style={styles.percentSymbol}>%</Text>}
          />
        </Card>

        {/* Configuración */}
        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={24} color={colors.info} />
            <Text style={styles.sectionTitle}>Configuración</Text>
          </View>
          
          {/* Switch para encargado */}
          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={[
                styles.switchButton,
                formData.inkeeper && styles.switchButtonActive
              ]}
              onPress={() => updateFormData('inkeeper', !formData.inkeeper)}
            >
              <View style={styles.switchIcon}>
                <Ionicons 
                  name={formData.inkeeper ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={24} 
                  color={formData.inkeeper ? colors.primary[500] : colors.text.secondary} 
                />
              </View>
              <View style={styles.switchContent}>
                <Text style={styles.switchTitle}>Permisos de Encargado</Text>
                <Text style={styles.switchDescription}>
                  Este vendedor tendrá permisos adicionales de administración
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
                  formData.seller_status === 'active' && styles.statusOptionActive
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
                  formData.seller_status === 'active' && { color: colors.success }
                ]}>
                  Activo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formData.seller_status === 'inactive' && styles.statusOptionInactive
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
                  formData.seller_status === 'inactive' && { color: colors.error }
                ]}>
                  Inactivo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Información del usuario (solo lectura) */}
        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={24} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Información del Usuario</Text>
          </View>
          
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Nombre</Text>
            <Text style={styles.readOnlyValue}>{seller.user?.name}</Text>
          </View>

          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Email</Text>
            <Text style={styles.readOnlyValue}>{seller.user?.email}</Text>
          </View>

          {seller.user?.phone && (
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Teléfono</Text>
              <Text style={styles.readOnlyValue}>{seller.user.phone}</Text>
            </View>
          )}

          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyLabel}>Estado del Usuario</Text>
            <View style={styles.statusBadge}>
              <View style={[
                styles.statusDot,
                { backgroundColor: seller.user?.status === 'active' ? colors.success : colors.error }
              ]} />
              <Text style={[
                styles.statusBadgeText,
                { color: seller.user?.status === 'active' ? colors.success : colors.error }
              ]}>
                {seller.user?.status === 'active' ? 'Activo' : 'Inactivo'}
              </Text>
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
            title="Actualizar"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
            leftIcon={<Ionicons name="save" size={20} color="white" />}
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
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  errorIcon: {
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: typography.fontSize.base * 1.5,
  },
  errorButton: {
    minWidth: 120,
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
  sellerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sellerAvatarText: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  sellerInfo: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  sellerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sellerInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  formCard: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
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
  switchIcon: {
    marginRight: spacing.md,
  },
  switchContent: {
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
    lineHeight: typography.fontSize.sm * 1.4,
  },
  statusContainer: {
    marginTop: spacing.md,
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
    gap: spacing.sm,
  },
  statusOptionActive: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  statusOptionInactive: {
    borderColor: colors.error,
    backgroundColor: colors.error + '10',
  },
  statusText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  readOnlyField: {
    marginBottom: spacing.lg,
  },
  readOnlyLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  readOnlyValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
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