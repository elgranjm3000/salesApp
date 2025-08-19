import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Clipboard,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Button } from '../../../components/ui/Button';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { api } from '../../../services/api';
import { colors, spacing, typography } from '../../../theme/design';
import type { Sale } from '../../../types';
import { formatCurrency, formatDate } from '../../../utils/helpers';

const { width } = Dimensions.get('window');

export default function PrintSaleScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'receipt' | 'a4' | 'card'>('receipt');

  useEffect(() => {
    loadSale();
  }, [id]);

  useEffect(() => {
    if (sale) {
      generateHTML();
    }
  }, [sale, selectedFormat]);

  const loadSale = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const saleData = await api.getSale(Number(id));
      setSale(saleData);
    } catch (error) {
      console.error('Error loading sale:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la venta');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const generateHTML = () => {
    if (!sale) return;

    const getStatusText = (status: Sale['status']) => {
      switch (status) {
        case 'completed': return 'Completada';
        case 'pending': return 'Pendiente';
        case 'cancelled': return 'Cancelada';
        default: return status;
      }
    };

    const getPaymentStatusText = (status: Sale['payment_status']) => {
      switch (status) {
        case 'paid': return 'Pagado';
        case 'pending': return 'Pendiente';
        case 'partial': return 'Parcial';
        default: return status;
      }
    };

    const getPaymentMethodText = (method: Sale['payment_method']) => {
      switch (method) {
        case 'cash': return 'Efectivo';
        case 'card': return 'Tarjeta';
        case 'transfer': return 'Transferencia';
        case 'credit': return 'Crédito';
        default: return method;
      }
    };

    // Estilos CSS según el formato seleccionado
    const getFormatStyles = () => {
      switch (selectedFormat) {
        case 'receipt':
          return `
            body { max-width: 80mm; font-size: 12px; }
            .company-name { font-size: 18px; }
            .sale-number { font-size: 16px; }
          `;
        case 'a4':
          return `
            body { max-width: 210mm; font-size: 14px; padding: 20px; }
            .company-name { font-size: 24px; }
            .sale-number { font-size: 20px; }
            .items-table th, .items-table td { padding: 10px 5px; font-size: 12px; }
          `;
        case 'card':
          return `
            body { max-width: 54mm; font-size: 10px; padding: 5px; }
            .company-name { font-size: 14px; }
            .sale-number { font-size: 12px; }
            .items-table th, .items-table td { padding: 2px 1px; font-size: 8px; }
          `;
        default:
          return '';
      }
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Venta ${sale.sale_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 0 auto;
            padding: 10px;
          }
          
          ${getFormatStyles()}
          
          .receipt {
            width: 100%;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .company-name {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .company-info {
            font-size: 0.9em;
            color: #666;
          }
          
          .sale-info {
            margin-bottom: 15px;
          }
          
          .sale-number {
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 0.9em;
          }
          
          .info-label {
            font-weight: bold;
          }
          
          .customer-section {
            margin-bottom: 15px;
            padding: 8px;
            background-color: #f8f8f8;
            border: 1px solid #ddd;
          }
          
          .section-title {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          
          .items-table th,
          .items-table td {
            padding: 5px 2px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          
          .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .item-name {
            font-weight: bold;
          }
          
          .item-code {
            color: #666;
            font-size: 0.8em;
          }
          
          .quantity {
            text-align: center;
          }
          
          .price {
            text-align: right;
          }
          
          .totals-section {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-bottom: 15px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          
          .total-row.final {
            font-weight: bold;
            font-size: 1.2em;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          
          .payment-section {
            margin-bottom: 15px;
            text-align: center;
          }
          
          .status-badges {
            display: flex;
            justify-content: space-around;
            margin-bottom: 10px;
            flex-wrap: wrap;
            gap: 5px;
          }
          
          .status-badge {
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
          }
          
          .status-completed { background-color: #d4edda; color: #155724; }
          .status-pending { background-color: #fff3cd; color: #856404; }
          .status-cancelled { background-color: #f8d7da; color: #721c24; }
          
          .payment-paid { background-color: #d4edda; color: #155724; }
          .payment-pending { background-color: #fff3cd; color: #856404; }
          .payment-partial { background-color: #d1ecf1; color: #0c5460; }
          
          .notes-section {
            margin-bottom: 15px;
            padding: 8px;
            background-color: #f8f8f8;
            border-left: 3px solid #007bff;
          }
          
          .footer {
            text-align: center;
            font-size: 0.9em;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <!-- Header -->
          <div class="header">
            <div class="company-name">Sales App</div>
            <div class="company-info">
              Sistema de Ventas Inteligente<br>
              Tel: (01) 123-4567<br>
              ventas@salesapp.com
            </div>
          </div>
          
          <!-- Sale Info -->
          <div class="sale-info">
            <div class="sale-number">VENTA ${sale.sale_number}</div>
            
            <div class="info-row">
              <span class="info-label">Fecha:</span>
              <span>${formatDate(sale.sale_date)}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Vendedor:</span>
              <span>${sale.user?.name || 'No especificado'}</span>
            </div>
          </div>
          
          <!-- Status Badges -->
          <div class="status-badges">
            <span class="status-badge status-${sale.status}">
              ${getStatusText(sale.status)}
            </span>
            <span class="status-badge payment-${sale.payment_status}">
              ${getPaymentStatusText(sale.payment_status)}
            </span>
          </div>
          
          <!-- Customer Info -->
          ${sale.customer ? `
          <div class="customer-section">
            <div class="section-title">CLIENTE</div>
            <div><strong>${sale.customer.name}</strong></div>
            ${sale.customer.email ? `<div>${sale.customer.email}</div>` : ''}
            ${sale.customer.phone ? `<div>${sale.customer.phone}</div>` : ''}
            ${sale.customer.document_number ? `
              <div>${sale.customer.document_type}: ${sale.customer.document_number}</div>
            ` : ''}
          </div>
          ` : ''}
          
          <!-- Items -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 45%;">Producto</th>
                <th style="width: 15%;">Cant.</th>
                <th style="width: 20%;">P.Unit</th>
                <th style="width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items?.map(item => `
                <tr>
                  <td>
                    <div class="item-name">${item.product?.name || 'Producto'}</div>
                    <div class="item-code">#${item.product?.code || 'N/A'}</div>
                  </td>
                  <td class="quantity">${item.quantity}</td>
                  <td class="price">${formatCurrency(item.unit_price)}</td>
                  <td class="price">${formatCurrency(item.total_price)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(sale.subtotal)}</span>
            </div>
            
            ${sale.discount > 0 ? `
            <div class="total-row">
              <span>Descuento:</span>
              <span>-${formatCurrency(sale.discount)}</span>
            </div>
            ` : ''}
            
            <div class="total-row">
              <span>IGV (18%):</span>
              <span>${formatCurrency(sale.tax)}</span>
            </div>
            
            <div class="total-row final">
              <span>TOTAL:</span>
              <span>${formatCurrency(sale.total)}</span>
            </div>
          </div>
          
          <!-- Payment Info -->
          <div class="payment-section">
            <div class="section-title">MÉTODO DE PAGO</div>
            <div style="font-weight: bold; margin-top: 5px;">
              ${getPaymentMethodText(sale.payment_method)}
            </div>
          </div>
          
          <!-- Notes -->
          ${sale.notes ? `
          <div class="notes-section">
            <div class="section-title">NOTAS</div>
            <div>${sale.notes}</div>
          </div>
          ` : ''}
          
          <!-- Footer -->
          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div style="margin-top: 5px;">
              Generado el ${formatDate(new Date().toISOString())}
            </div>
            <div style="margin-top: 10px; font-size: 0.8em;">
              Sistema desarrollado con Sales App<br>
              www.salesapp.com
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    setHtmlContent(html);
  };

  const handleCopyToClipboard = async () => {
    if (!sale) return;

    try {
      const saleText = `
📋 VENTA ${sale.sale_number}
📅 Fecha: ${formatDate(sale.sale_date)}
👤 Cliente: ${sale.customer?.name || 'No especificado'}
👨‍💼 Vendedor: ${sale.user?.name || 'No especificado'}

📦 PRODUCTOS:
${sale.items?.map(item => 
  `• ${item.product?.name || 'Producto'} x${item.quantity} - ${formatCurrency(item.total_price)}`
).join('\n') || ''}

💰 RESUMEN:
💵 Subtotal: ${formatCurrency(sale.subtotal)}
${sale.discount > 0 ? `🏷️ Descuento: -${formatCurrency(sale.discount)}\n` : ''}📊 IGV (18%): ${formatCurrency(sale.tax)}
💰 TOTAL: ${formatCurrency(sale.total)}

💳 Método de pago: ${sale.payment_method === 'cash' ? 'Efectivo' : 
                     sale.payment_method === 'card' ? 'Tarjeta' : 
                     sale.payment_method === 'transfer' ? 'Transferencia' : 
                     sale.payment_method === 'credit' ? 'Crédito' : sale.payment_method}

🔄 Estado: ${sale.status === 'completed' ? 'Completada' : 
             sale.status === 'pending' ? 'Pendiente' : 
             sale.status === 'cancelled' ? 'Cancelada' : sale.status}

💸 Pago: ${sale.payment_status === 'paid' ? 'Pagado' : 
           sale.payment_status === 'pending' ? 'Pendiente' : 
           sale.payment_status === 'partial' ? 'Parcial' : sale.payment_status}

${sale.notes ? `📝 Notas: ${sale.notes}\n` : ''}
---
Generado por Sales App
      `.trim();

      await Clipboard.setString(saleText);
      
      Alert.alert(
        'Información Copiada',
        'La información de la venta ha sido copiada al portapapeles. Ahora puedes pegarla en cualquier aplicación.',
        [
          { text: 'OK' },
          { 
            text: 'Ver Información', 
            onPress: () => Alert.alert('Venta Copiada', saleText)
          }
        ]
      );
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'No se pudo copiar la información al portapapeles');
    }
  };

  const handleShowInfo = () => {
    if (!sale) return;

    const basicInfo = `Venta: ${sale.sale_number}\nTotal: ${formatCurrency(sale.total)}\nCliente: ${sale.customer?.name || 'No especificado'}`;
    
    Alert.alert(
      'Información de la Venta',
      basicInfo,
      [
        { text: 'Cerrar' },
        { text: 'Copiar Todo', onPress: handleCopyToClipboard }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando venta..." />
      </View>
    );
  }

  if (!sale || !htmlContent) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>No se pudo cargar la información de la venta</Text>
        <Button
          title="Volver"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.headerTitle}>Vista de Recibo</Text>
            <Text style={styles.headerSubtitle}>Venta {sale.sale_number}</Text>
          </View>
        </View>
      </View>

      {/* Preview */}
      <View style={styles.previewContainer}>
        <WebView
          source={{ html: htmlContent }}
          style={styles.webview}
          scalesPageToFit={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <LoadingSpinner text="Generando vista previa..." />
            </View>
          )}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsScroll}
        >
          <Button
            title="📋 Copiar Info"
            onPress={handleCopyToClipboard}
            style={styles.actionButton}
            size="sm"
          />
          
          <Button
            title="ℹ️ Ver Info"
            variant="outline"
            onPress={handleShowInfo}
            style={styles.actionButton}
            size="sm"
          />
          
          <Button
            title="🔄 Recargar"
            variant="ghost"
            onPress={() => generateHTML()}
            style={styles.actionButton}
            size="sm"
          />
        </ScrollView>
      </View>

      {/* Format Options */}
      <View style={styles.formatOptions}>
        <Text style={styles.formatTitle}>Formato de Vista</Text>
        <View style={styles.formatButtons}>
          <TouchableOpacity 
            style={[
              styles.formatButton, 
              selectedFormat === 'receipt' && styles.formatButtonActive
            ]}
            onPress={() => setSelectedFormat('receipt')}
          >
            <Ionicons 
              name="receipt" 
              size={20} 
              color={selectedFormat === 'receipt' ? colors.primary[500] : colors.text.secondary} 
            />
            <Text style={[
              styles.formatButtonText,
              { color: selectedFormat === 'receipt' ? colors.primary[500] : colors.text.secondary }
            ]}>
              Recibo (80mm)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.formatButton, 
              selectedFormat === 'a4' && styles.formatButtonActive
            ]}
            onPress={() => setSelectedFormat('a4')}
          >
            <Ionicons 
              name="document" 
              size={20} 
              color={selectedFormat === 'a4' ? colors.primary[500] : colors.text.secondary} 
            />
            <Text style={[
              styles.formatButtonText,
              { color: selectedFormat === 'a4' ? colors.primary[500] : colors.text.secondary }
            ]}>
              A4 Completo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.formatButton, 
              selectedFormat === 'card' && styles.formatButtonActive
            ]}
            onPress={() => setSelectedFormat('card')}
          >
            <Ionicons 
              name="card" 
              size={20} 
              color={selectedFormat === 'card' ? colors.primary[500] : colors.text.secondary} 
            />
            <Text style={[
              styles.formatButtonText,
              { color: selectedFormat === 'card' ? colors.primary[500] : colors.text.secondary }
            ]}>
              Tarjeta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
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
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  previewContainer: {
    flex: 1,
    margin: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  actionsContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingVertical: spacing.md,
  },
  actionsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    minWidth: 120,
  },
  formatOptions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    padding: spacing.lg,
  },
  formatTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  formatButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  formatButton: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    minWidth: 80,
  },
  formatButtonActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  formatButtonText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
});