import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
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
  const [printing, setPrinting] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    loadSale();
  }, [id]);

  useEffect(() => {
    if (sale) {
      generateHTML();
    }
  }, [sale]);

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
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
            font-size: 12px;
          }
          
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
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .company-info {
            font-size: 10px;
            color: #666;
          }
          
          .sale-info {
            margin-bottom: 15px;
          }
          
          .sale-number {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 11px;
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
            font-size: 12px;
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
            font-size: 10px;
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
            font-size: 9px;
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
            font-size: 14px;
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
          }
          
          .status-badge {
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 9px;
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
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
          
          .qr-section {
            text-align: center;
            margin: 15px 0;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 5px;
            }
            
            .no-print {
              display: none;
            }
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
              Impreso el ${formatDate(new Date().toISOString())}
            </div>
            <div style="margin-top: 10px; font-size: 9px;">
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

  const handlePrint = async () => {
    if (!htmlContent) return;

    try {
      setPrinting(true);

      const options = {
        html: htmlContent,
        width: 612,
        height: 792,
        base64: false,
      };

      const { uri } = await Print.printToFileAsync(options);

      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      } else {
        await Print.printAsync({
          html: htmlContent,
          printerUrl: undefined, // Para usar el selector de impresora del sistema
        });
      }

      Alert.alert('Éxito', 'Documento enviado a imprimir correctamente');
    } catch (error) {
      console.error('Error printing:', error);
      Alert.alert('Error', 'No se pudo imprimir el documento');
    } finally {
      setPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!htmlContent) return;

    try {
      setPrinting(true);

      const options = {
        html: htmlContent,
        width: 612,
        height: 792,
        base64: false,
      };

      const { uri } = await Print.printToFileAsync(options);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      } else {
        Alert.alert('Info', 'Archivo PDF generado correctamente');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setPrinting(false);
    }
  };

  const handleSavePDF = async () => {
    if (!htmlContent || !sale) return;

    try {
      setPrinting(true);
      
      const fileName = `venta_${sale.sale_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      const options = {
        html: htmlContent,
        width: 612,
        height: 792,
        base64: false,
      };

      const { uri } = await Print.printToFileAsync(options);
      
      // En una implementación real, aquí guardarías el archivo en el dispositivo
      // Por ejemplo, usando expo-file-system para mover el archivo a Documents
      
      Alert.alert(
        'PDF Generado', 
        `El archivo ${fileName} ha sido generado correctamente`,
        [
          { text: 'OK' },
          {
            text: 'Compartir',
            onPress: () => {
              if (Sharing.isAvailableAsync()) {
                Sharing.shareAsync(uri, {
                  UTI: '.pdf',
                  mimeType: 'application/pdf',
                });
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error saving PDF:', error);
      Alert.alert('Error', 'No se pudo guardar el PDF');
    } finally {
      setPrinting(false);
    }
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
            <Text style={styles.headerTitle}>Vista de Impresión</Text>
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
            title="🖨️ Imprimir"
            onPress={handlePrint}
            loading={printing}
            style={styles.actionButton}
            size="sm"
          />
          
          <Button
            title="📄 Exportar PDF"
            variant="outline"
            onPress={handleExportPDF}
            loading={printing}
            style={styles.actionButton}
            size="sm"
          />
          
          <Button
            title="💾 Guardar PDF"
            variant="outline"
            onPress={handleSavePDF}
            loading={printing}
            style={styles.actionButton}
            size="sm"
          />
          
          <Button
            title="📤 Compartir"
            variant="ghost"
            onPress={handleExportPDF}
            loading={printing}
            style={styles.actionButton}
            size="sm"
          />
        </ScrollView>
      </View>

      {/* Format Options */}
      <View style={styles.formatOptions}>
        <Text style={styles.formatTitle}>Opciones de Formato</Text>
        <View style={styles.formatButtons}>
          <TouchableOpacity style={styles.formatButton}>
            <Ionicons name="receipt" size={20} color={colors.primary[500]} />
            <Text style={styles.formatButtonText}>Recibo (80mm)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.formatButton}>
            <Ionicons name="document" size={20} color={colors.text.secondary} />
            <Text style={[styles.formatButtonText, { color: colors.text.secondary }]}>
              A4 Completo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.formatButton}>
            <Ionicons name="card" size={20} color={colors.text.secondary} />
            <Text style={[styles.formatButtonText, { color: colors.text.secondary }]}>
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
  backButton: {
    marginTop: spacing.lg,
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
  formatButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    marginTop: spacing.xs,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
});