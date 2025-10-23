import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';

interface Company {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  rif: string;
  address?: string;
  phone?: string;
  email?: string;
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
  created_at: string;
  updated_at: string;
}

interface StatCard {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle?: string;
}

export default function SellerDetailsScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<Seller | null>(null);

  useEffect(() => {
    loadSellerData();
  }, []);

  const loadSellerData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const sellerData = await api.getSeller(Number(id));
      setSeller(sellerData);
    } catch (error) {
      console.error('Error loading seller:', error);
      Alert.alert('Error', 'No se pudo cargar la información del vendedor');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/sellers/${id}/edit`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Vendedor',
      '¿Estás seguro de que quieres eliminar este vendedor? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (seller) {
                await api.deleteSeller(seller.id);
                Alert.alert('Éxito', 'Vendedor eliminado correctamente');
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el vendedor');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Text style={styles.errorText}>No se encontró el vendedor</Text>
        <Text style={styles.errorSubtext}>
          El vendedor que buscas no existe o fue eliminado
        </Text>
        <Button 
          title="Volver" 
          onPress={() => router.back()} 
          style={styles.errorButton}
        />
      </View>
    );
  }

  const statsData: StatCard[] = [
    {
      title: 'Comisión Ventas',
      value: `${seller.percent_sales}%`,
      icon: 'trending-up',
      color: colors.success,
      subtitle: 'Por cada venta realizada',
    },
    {
      title: 'Comisión Cobranza',
      value: `${seller.percent_receivable}%`,
      icon: 'card',
      color: colors.primary[500],
      subtitle: 'Por cobros efectivos',
    },    
    
  ];

  return (
    <View style={styles.container}>
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
          
          <Text style={styles.sellerName}>{seller.user?.name}</Text>
          
          <View style={styles.sellerBasicInfo}>
            {/*<View style={styles.sellerInfoItem}>
              <Ionicons name="qr-code" size={16} color={colors.text.secondary} />
              <Text style={styles.sellerInfoText}>#{seller.code}</Text>
            </View>*/}
            <View style={styles.sellerInfoItem}>
              <Ionicons name="business" size={16} color={colors.text.secondary} />
              <Text style={styles.sellerInfoText}>{seller.company?.name}</Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: seller.seller_status === 'active' ? colors.success + '20' : colors.error + '20' }
            ]}>
              <View style={[
                styles.statusDot,
                { backgroundColor: seller.seller_status === 'active' ? colors.success : colors.error }
              ]} />
              <Text style={[
                styles.statusText,
                { color: seller.seller_status === 'active' ? colors.success : colors.error }
              ]}>
                {seller.seller_status === 'active' ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
            
            {seller.inkeeper && (
              <View style={styles.inkeeperBadge}>
                <Ionicons name="key" size={14} color={colors.warning} />
                <Text style={styles.inkeeperText}>Encargado</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
       {/* <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Ionicons name="create" size={20} color={colors.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>*/}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estadísticas de comisiones */}
        {/*<View style={styles.statsContainer}>
          {statsData.map((stat, index) => (
            <Card key={index} style={styles.statCard}>
              <View style={styles.statHeader}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                  <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statTitle}>{stat.title}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  {stat.subtitle && (
                    <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
                  )}
                </View>
              </View>
            </Card>
          ))}
        </View>*/}

        {/* Información personal */}
        <Card style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={24} color={colors.primary[500]} />
            <Text style={styles.sectionTitle}>Información Personal</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nombre completo</Text>
              <Text style={styles.infoValue}>{seller.user?.name}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{seller.user?.email}</Text>
            </View>
            
            {seller.user?.phone && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Teléfono</Text>
                <Text style={styles.infoValue}>{seller.user.phone}</Text>
              </View>
            )}
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Rol</Text>
              <Text style={styles.infoValue}>
                {seller.user?.role === 'seller' ? 'Vendedor' : seller.user?.role}
              </Text>
            </View>
            
            {seller.user_code && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Código de usuario</Text>
                <Text style={styles.infoValue}>{seller.user_code}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Información de la empresa */}
        <Card style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color={colors.info} />
            <Text style={styles.sectionTitle}>Empresa</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nombre de la empresa</Text>
              <Text style={styles.infoValue}>{seller.company?.name}</Text>
            </View>
            
            {seller.company?.rif && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>RIF</Text>
                <Text style={styles.infoValue}>{seller.company.rif}</Text>
              </View>
            )}
            
            {seller.company?.email && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email corporativo</Text>
                <Text style={styles.infoValue}>{seller.company.email}</Text>
              </View>
            )}
            
            {seller.company?.phone && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Teléfono corporativo</Text>
                <Text style={styles.infoValue}>{seller.company.phone}</Text>
              </View>
            )}
            
            {seller.company?.address && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Dirección</Text>
                <Text style={styles.infoValue}>{seller.company.address}</Text>
              </View>
            )}
            
            {seller.company?.description && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Descripción</Text>
                <Text style={styles.infoValue}>{seller.company.description}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Comisiones detalladas */}
        {/*<Card style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={24} color={colors.success} />
            <Text style={styles.sectionTitle}>Detalle de Comisiones</Text>
          </View>
          
          <View style={styles.commissionsGrid}>
            <View style={styles.commissionRow}>
              <View style={styles.commissionItem}>
                <View style={styles.commissionHeader}>
                  <Ionicons name="trending-up" size={20} color={colors.success} />
                  <Text style={styles.commissionLabel}>Ventas</Text>
                </View>
                <Text style={styles.commissionPercentage}>{seller.percent_sales}%</Text>
              </View>
              
              <View style={styles.commissionItem}>
                <View style={styles.commissionHeader}>
                  <Ionicons name="card" size={20} color={colors.primary[500]} />
                  <Text style={styles.commissionLabel}>Cobranza</Text>
                </View>
                <Text style={styles.commissionPercentage}>{seller.percent_receivable}%</Text>
              </View>
            </View>

            {/*<View style={styles.commissionRow}>
              <View style={styles.commissionItem}>
                <View style={styles.commissionHeader}>
                  <Ionicons name="document-text" size={20} color={colors.warning} />
                  <Text style={styles.commissionLabel}>Nota Débito</Text>
                </View>
                <Text style={styles.commissionPercentage}>{seller.percent_gerencial_debit_note}%</Text>
              </View>
              
              <View style={styles.commissionItem}>
                <View style={styles.commissionHeader}>
                  <Ionicons name="document" size={20} color={colors.info} />
                  <Text style={styles.commissionLabel}>Nota Crédito</Text>
                </View>
                <Text style={styles.commissionPercentage}>{seller.percent_gerencial_credit_note}%</Text>
              </View>
            </View>*/}

            {/*<View style={styles.commissionSingle}>
              <View style={styles.commissionItem}>
                <View style={styles.commissionHeader}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                  <Text style={styles.commissionLabel}>Cheque Devuelto</Text>
                </View>
                <Text style={styles.commissionPercentage}>{seller.percent_returned_check}%</Text>
              </View>
            </View>*/}
          {/*</View>
        </Card> */}

        {/* Descripción */}
       {/*  {seller.description && (
          <Card style={styles.infoCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={24} color={colors.warning} />
              <Text style={styles.sectionTitle}>Descripción</Text>
            </View>
            <Text style={styles.descriptionText}>{seller.description}</Text>
          </Card>
       )} */}

        {/* Información de fechas */}
       {/* <Card style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={24} color={colors.text.secondary} />
            <Text style={styles.sectionTitle}>Historial</Text>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha de registro</Text>
              <Text style={styles.infoValue}>{formatDate(seller.created_at)}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Última actualización</Text>
              <Text style={styles.infoValue}>{formatDate(seller.updated_at)}</Text>
            </View>
          </View>
        </Card>*/}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
    {/*  <TouchableOpacity style={styles.fab} onPress={handleEdit}>
        <Ionicons name="create" size={24} color="white" />
      </TouchableOpacity>]*/}
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,    
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sellerAvatarText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[500],
  },
  sellerName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sellerBasicInfo: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  sellerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sellerInfoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  inkeeperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  inkeeperText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    fontWeight: typography.fontWeight.semibold,
    marginLeft: spacing.xs,
  },
  headerActions: {
    position: 'absolute',
    top: spacing.xl + spacing.md,
    right: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  infoCard: {
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
  infoGrid: {
    gap: spacing.lg,
  },
  infoItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    paddingBottom: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * 1.4,
  },
  commissionsGrid: {
    gap: spacing.md,
  },
  commissionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  commissionSingle: {
    alignItems: 'center',
  },
  commissionItem: {
    flex: 1,
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commissionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  commissionPercentage: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  descriptionText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    lineHeight: typography.fontSize.base * 1.5,
  },
  bottomSpacer: {
    height: 80, // Space for FAB
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});