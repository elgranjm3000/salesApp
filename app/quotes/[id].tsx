import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';
import { formatBcvRate, formatCurrency, formatDateOnly } from '../../utils/helpers';

export default function QuoteDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string>('');

  // ✨ FUNCIÓN PRINCIPAL: Calcular totales agrupados por alícuota
const calculateCorrectTotals = useMemo(() => {
  if (!quote || !quote.items) {
    return {
      taxGroups: {},
      exemptTotal: 0,
      subtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      total: 0,
      hasExemptions: false,
    };
  }

  // ✨ Agrupar impuestos por alícuota
  interface TaxGroup {
    base: number;
    aliquot: number;
    tax: number;
    label: string;
  }

  const taxGroups: Record<number, TaxGroup> = {};
  let exemptTotal = 0;
  let subtotal = 0;
  let totalDiscount = 0;

  (quote.items || []).forEach((item: any) => {
    // ✅ VALIDACIÓN: Asegurar que sean números
    const itemTotal = Number(item.total) || 0;
    const itemDiscount = Number(item.discount_amount) || 0;

    // ✅ VALIDACIÓN: Verificar que NO sean NaN
    if (isNaN(itemTotal)) {
      console.warn('⚠️ item.total es NaN:', item.total);
      item.total = 0;
    }
    if (isNaN(itemDiscount)) {
      console.warn('⚠️ item.discount_amount es NaN:', item.discount_amount);
      item.discount_amount = 0;
    }

    // Determinar tipo de impuesto del producto
    const isExempt = item.sale_tax === 'EX';
    const aliquot = Number(item.aliquot) || 16; // Usar aliquot del producto o default 16

    const itemSubtotal = itemTotal + itemDiscount;

    if (isExempt) {
      // Producto exento
      exemptTotal += itemSubtotal;
    } else {
      // Producto gravado - agrupar por alícuota
      if (!taxGroups[aliquot]) {
        taxGroups[aliquot] = {
          base: 0,
          aliquot: aliquot,
          tax: 0,
          label: `${aliquot}%`
        };
      }
      taxGroups[aliquot].base += itemSubtotal;
      taxGroups[aliquot].tax += itemSubtotal * (aliquot / 100);
    }

    subtotal += itemSubtotal;
    totalDiscount += itemDiscount;
  });

  // Calcular total de impuestos
  let totalTax = 0;
  Object.values(taxGroups).forEach(group => {
    totalTax += group.tax;
  });

  const total = subtotal + totalTax;

  return {
    taxGroups,
    exemptTotal,
    subtotal,
    totalDiscount,
    totalTax,
    total,
    hasExemptions: exemptTotal > 0,
  };
}, [quote]);

  // Función para obtener la tasa BCV
  const fetchBCVRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      if (!data.rates.VES) {
        const bcvResponse = await fetch('https://s3.amazonaws.com/dolartoday/data.json');
        const bcvData = await bcvResponse.json();
        setBcvRate(bcvData.USD.bcv || bcvData.USD.promedio_real);
        setRateDate(new Date().toLocaleDateString());
      } else {
        setBcvRate(data.rates.VES);
        setRateDate(data.date);
      }
    } catch (error) {
      console.log('Error al obtener tasa BCV:', error);
      setBcvRate(36.0);
      setRateDate('Tasa aproximada');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchQuote(),
        fetchBCVRate()
      ]);
    };
    fetchData();
  }, [id]);

  const fetchQuote = async () => {
    try {
      const response = await api.getQuote(Number(id));
      const quoteData = response.data;
      setQuote(response.data);
       if (quoteData.bcv_rate && quoteData.bcv_date) {
        console.log("MONTO DE PRESUPUESTO CON BCV GUARDADO:", quoteData.bcv_rate);
        setBcvRate(quoteData.bcv_rate);
        setRateDate(quoteData.bcv_date);
      } else {
        const currentRate = await fetchCurrentBCVRate();
        setBcvRate(currentRate.rate);
        setRateDate(`${currentRate.date} (actual)`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el presupuesto');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchQuote(),
      fetchBCVRate()
    ]);
    setRefreshing(false);
  };

const formatWithBCV = (amount: number) => {
  const usdFormatted = formatCurrency(amount);
  if (bcvRate) {
    const bcvAmount = `Bs. ${(amount * bcvRate).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    return `${usdFormatted} / ${bcvAmount}`;
  }
  return usdFormatted;
};

  // Generar HTML para el PDF
  const generatePDFHTML = () => {
    const itemsHTML = quote.items?.map((item: any, index: number) => {
      // ✨ Detectar exención según sale_tax de BD
      const isExempt = item.sale_tax === 'EX';
      return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; text-align: left;">${index + 1}</td>
        <td style="padding: 12px; text-align: left;">
          ${item.product?.name || item.name || 'Producto sin nombre'}
          ${isExempt ? '<br><span style="color: #10b981; font-size: 12px; font-weight: bold;">✓ IVA Exento</span>' : ''}
        </td>
        <td style="padding: 12px; text-align: center;">${item.quantity || 0}</td>
        <td style="padding: 12px; text-align: right;">${formatCurrency(item.unit_price || 0)}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold;">${formatCurrency(item.total || 0)}</td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #6b7280;">No hay productos agregados</td></tr>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Presupuesto ${quote.quote_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #374151;
            background: #fff;
          }
          .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
          .header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
          }
          .logo { 
            width: 80px; 
            height: 80px; 
            background: #dbeafe; 
            border-radius: 50%; 
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: #3b82f6;
            font-weight: bold;
          }
          .company-name { 
            font-size: 28px; 
            font-weight: bold; 
            color: #1f2937;
            margin-bottom: 8px;
          }
          .quote-number { 
            font-size: 18px; 
            color: #6b7280;
            font-weight: 500;
          }
          
          .info-section { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 40px; 
            margin-bottom: 40px;
          }
          .info-block h3 { 
            font-size: 16px; 
            font-weight: bold; 
            color: #1f2937;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-block p { 
            margin-bottom: 6px; 
            color: #4b5563;
          }
          
          .exchange-rate {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 30px;
            text-align: center;
          }
          .exchange-rate h4 {
            color: #92400e;
            font-size: 14px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .exchange-rate .rate {
            font-size: 20px;
            font-weight: bold;
            color: #1f2937;
          }
          
          .products-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .products-table th { 
            background: #f3f4f6; 
            padding: 16px 12px; 
            text-align: left; 
            font-weight: bold;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
          }
          .products-table td { 
            padding: 12px; 
            border-bottom: 1px solid #f3f4f6;
          }
          .products-table tbody tr:hover {
            background: #f9fafb;
          }
          
          .summary { 
            background: #f8fafc; 
            border-radius: 12px; 
            padding: 24px;
            border: 1px solid #e2e8f0;
          }
          .summary h3 { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 20px;
            color: #1e293b;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px;
            padding: 4px 0;
          }
          .summary-row.total {
            border-top: 2px solid #3b82f6;
            padding-top: 16px;
            margin-top: 16px;
            font-size: 20px;
            font-weight: bold;
            color: #1e293b;
          }
          .tax-breakdown {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
          }
          .tax-breakdown span:first-child {
            color: #6b7280;
            font-size: 13px;
            flex: 1;
          }
          .tax-breakdown span:last-child {
            font-weight: 600;
            color: #3b82f6;
            font-size: 13px;
          }
          .discount { color: #dc2626; }
          
          .terms {
            margin-top: 40px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
          }
          .terms h4 {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 12px;
            color: #1f2937;
            text-transform: uppercase;
          }
          .terms p {
            font-size: 12px;
            line-height: 1.6;
            color: #4b5563;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="logo">📋</div>
            <div class="company-name">${quote.company?.name || 'Empresa'}</div>
            <div class="quote-number">Presupuesto ${quote.quote_number}</div>
          </div>

          <!-- Información Cliente y Empresa -->
          <div class="info-section">
            <div class="info-block">
              <h3>Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${quote.customer?.name || 'Sin cliente asignado'}</p>
              <p><strong>Email:</strong> ${quote.customer?.email || 'Sin email'}</p>
              <p><strong>Dirección:</strong> ${quote.customer?.address || 'Sin dirección'}</p>
              <p><strong>Documento:</strong> ${quote.customer?.document_type && quote.customer?.document_number ? `${quote.customer.document_type}: ${quote.customer.document_number}` : 'Sin documento'}</p>
            </div>
            <div class="info-block">
              <h3>Detalles del Presupuesto</h3>
              <p><strong>Fecha:</strong> ${formatDateOnly(quote.quote_date) || 'No especificada'}</p>
              <p><strong>Válido hasta:</strong> ${formatDateOnly(quote.valid_until) || 'No especificado'}</p>
              <p><strong>Vendedor:</strong> ${quote.seller?.name || 'Sin vendedor asignado'}</p>
              <p><strong>Descuento general:</strong> ${quote.discount || 0}%</p>
            </div>
          </div>

          ${bcvRate ? `
          <!-- Tasa de Cambio -->
          <div class="exchange-rate">
            <h4>Tasa de Cambio</h4>
            <div class="rate">1 USD = ${formatBcvRate(bcvRate)} Bs.</div>
            <div style="font-size: 12px; margin-top: 8px;">Actualizada: ${rateDate}</div>
          </div>
          ` : ''}

          <!-- Tabla de Productos -->
          <table class="products-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">Precio Unit.</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <!-- Resumen Financiero -->
          <div class="summary">
            <h3>Resumen Financiero</h3>
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(quote.subtotal)}</span>
            </div>

            <!-- ✨ Desglose de impuestos por alícuota -->
            ${Object.values(calculateCorrectTotals.taxGroups).length > 0 ? `
              <div style="border-top: 1px solid #e5e7eb; margin: 16px 0;"></div>
              <h4 style="text-align: center; color: #6b7280; font-size: 14px; margin: 16px 0 8px; font-weight: 600;">Desglose de Impuestos</h4>

              ${Object.values(calculateCorrectTotals.taxGroups)
                .sort((a, b) => b.aliquot - a.aliquot)
                .map(group => `
                  <div class="tax-breakdown">
                    <span>Impuesto ${group.label}:</span>
                    <span>${formatCurrency(group.tax)}</span>
                  </div>
                `).join('')}

              ${calculateCorrectTotals.hasExemptions ? `
                <div class="tax-breakdown">
                  <span>Exento:</span>
                  <span>${formatCurrency(0)}</span>
                </div>
              ` : ''}

              <div style="border-top: 1px solid #e5e7eb; margin: 16px 0;"></div>
            ` : ''}
            <div class="summary-row total">
              <span>TOTAL:</span>
              <div>
                <div>${formatCurrency(quote.total)}</div>
                ${bcvRate ? `<div style="font-size: 14px; color: #6b7280; margin-top: 4px;">${(calculateCorrectTotals.total * bcvRate).toLocaleString('es-VE', { style: 'currency', currency: 'VES' })}</div>` : ''}
              </div>
            </div>
          </div>

          ${quote.terms_conditions ? `
          <!-- Términos y Condiciones -->
          <div class="terms">
            <h4>Términos y Condiciones</h4>
            <p>${quote.terms_conditions}</p>
          </div>
          ` : ''}

          ${quote.notes ? `
          <!-- Observaciones -->
          <div class="terms">
            <h4>Observaciones</h4>
            <p>${quote.notes}</p>
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <p>Presupuesto generado el ${new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Función para generar PDF
  const generatePDF = async () => {
    try {
      setGeneratingPDF(true);

      const html = generatePDFHTML();
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
      });

      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
      return null;
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Función para compartir PDF
  const sharePDF = async () => {
    const pdfUri = await generatePDF();
    if (pdfUri) {
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: `Presupuesto ${quote.quote_number}`,
            UTI: 'com.adobe.pdf'
          });
        }
      } catch (error) {
        console.error('Error sharing PDF:', error);
        Alert.alert('Error', 'No se pudo compartir el PDF');
      }
    }
  };

  // Función para previsualizar PDF
  const previewPDF = async () => {
    const pdfUri = await generatePDF();
    if (pdfUri) {
      try {
        const html = generatePDFHTML();
        await Print.printAsync({
          html,
          width: 612,
          height: 792,
        });
      } catch (error) {
        console.error('Error previewing PDF:', error);
        Alert.alert('Error', 'No se pudo mostrar la vista previa');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Cargando presupuesto..." />
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No se encontró el presupuesto.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Presupuesto {quote.quote_number}</Text>
        </View>
        <Text style={styles.subtitle}> 
          Empresa: {quote.customer?.name || 'Sin cliente asignado'}
        </Text>
        <Text style={styles.subtitle}>
          Representate legal: {quote.company?.name || 'Sin empresa asignada'}
        </Text>
        <Text style={styles.subtitle}>
          Dirección: {quote.customer?.address || 'sin direccion asignada'}
        </Text>
        <Text style={styles.subtitle}>
          Documento: { quote.customer?.document_type && quote.customer?.document_number || 'sin documento asignado' }
        </Text>
        {quote.seller && (
          <Text style={styles.subtitle}>
            Vendedor asignado: {quote.seller.name}
          </Text>
        )}

        <Text style={styles.subtitle}>
          Fecha de creacion: {formatDateOnly(quote.created_at) || 'No especificada'}
        </Text>
        <Text style={styles.subtitle}>
          Fecha de última actualización: {formatDateOnly(quote.updated_at) || 'No especificada'}
        </Text>

        {/* Botones de acción PDF */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.previewButton]} 
            onPress={previewPDF}
            disabled={generatingPDF}
          >
            <Ionicons name="eye" size={20} color={colors.info} />
            <Text style={[styles.actionButtonText, { color: colors.info }]}>
              Ver PDF
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.shareButton]} 
            onPress={sharePDF}
            disabled={generatingPDF}
          >
            <Ionicons name="share" size={20} color={colors.primary[500]} />
            <Text style={[styles.actionButtonText, { color: colors.primary[500] }]}>
              Compartir
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Información de Tasa de Cambio */}
      {bcvRate && (
        <Card style={styles.exchangeCard}>
          <View style={styles.exchangeHeader}>
            <Ionicons name="swap-horizontal" size={20} color={colors.warning} />
            <Text style={styles.exchangeTitle}>Tasa de Cambio</Text>
          </View>
          <Text style={styles.exchangeRate}>
            1 USD = {formatBcvRate(bcvRate)} Bs.
          </Text>
          <Text style={styles.exchangeDate}>
            Actualizada: {rateDate}
          </Text>
        </Card>
      )}

      {/* Información General */}
      <Card style={styles.infoCard}>
        <Text style={[styles.sectionTitle,{textAlign:'center'}]}>Información General</Text>
        <View style={styles.infoRow}>
          <View style={[styles.infoItem]}>
            <Text style={[styles.infoLabel, {textAlign:'center'}]}>Válido hasta:</Text>
            <Text style={[styles.infoValue, {textAlign:'center'}]}>{formatDateOnly(quote.valid_until) || 'No especificado'}</Text>
          </View>
          {/* <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Descuento general:</Text>
            <Text style={styles.infoValue}>{quote.discount || 0}%</Text>
          </View> */}
        </View>
        {/* {quote.terms_conditions && (
          <View style={styles.textSection}>
            <Text style={styles.infoLabel}>Términos y condiciones:</Text>
            <Text style={styles.infoDescription}>{quote.terms_conditions}</Text>
          </View>
        )}*/}
        {quote.notes && (
          <View style={styles.textSection}>
            <Text style={styles.infoLabel}>Observaciones:</Text>
            <Text style={styles.infoDescription}>{quote.notes}</Text>
          </View>
        )}
      </Card>

      {/* Lista de Productos */}
      <Card style={styles.productsCard}>
        <Text style={styles.sectionTitle}>
          Productos ({quote.items?.length || 0})
        </Text>
        {!quote.items || quote.items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.gray[400]} />
            <Text style={styles.emptyItemsText}>No hay productos agregados</Text>
          </View>
        ) : (
          <View style={styles.itemsList}>
            {quote.items.map((item: any, index: number) => {
              // ✨ Detectar exención según sale_tax de BD
              const isExempt = item.buy_tax === 1;
              
              return (
              <View key={item.id || index} style={styles.quoteItem}>
                 <Text style={styles.productCode}>{item.product?.code}</Text>
                <View style={styles.itemHeader}>                 
                  <Text style={styles.itemName}>
                    {item.product?.description || item.description || 'Producto sin nombre'}
                  </Text>
                      {item.product?.category?.description && (
                        <View style={styles.infoRowProductModalFull}>
                          <Ionicons name="folder-outline" size={14} color={colors.text.secondary} />
                          <Text style={styles.infoTextProductModalFull} numberOfLines={1}>
                            {item.product?.category?.description}
                          </Text>
                        </View>
                      )}
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>#{index + 1}</Text>
                  </View>
                </View>
                
                 {/* <View style={styles.productMetaBadges}>
                 
                  <View style={[
                    styles.metaBadge,
                    isExempt && styles.metaBadgeExempt
                  ]}>
                    <Ionicons 
                      name={isExempt ? "checkmark-circle-outline" : "alert-circle-outline"} 
                      size={12}
                      color={isExempt ? colors.success : colors.warning}
                    />
                    <Text style={[
                      styles.metaBadgeText,
                      isExempt && styles.metaBadgeExemptText
                    ]}>
                      {isExempt ? 'Exento' : item.sale_tax}
                    </Text>
                  </View>
                 

                  {item.aliquot && (
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>{item.aliquot}%</Text>
                    </View>
                  )}
                </View> */}
                
                {/* ✨ Mostrar IVA exento si sale_tax = EX */}
                {isExempt && (
                  <View style={styles.exemptionContainer}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.exemptionText}>
                      IVA Exento ({item.aliquot || 16}%)
                    </Text>
                  </View>
                )}
                
                <View style={styles.itemDetails}>
                  <View style={styles.itemDetailRow}>
                    <Text style={styles.itemDetails}>Cant: {parseInt(item.quantity) || 0}</Text>
                  </View>
                  <View style={styles.itemDetailRow}>
                    <Text style={styles.itemDetailLabel}>Precio:</Text>
                    <Text style={styles.itemDetailValue}>
                      {formatWithBCV(item.unit_price || 0)}
                    </Text>
                  </View>
                  {/*{item.discount_percentage > 0 && (
                    <View style={styles.itemDetailRow}>
                      <Text style={styles.itemDetailLabel}>Descuento:</Text>
                      <Text style={[styles.itemDetailValue, styles.discountText]}>
                        -{item.discount_percentage}%
                      </Text>
                    </View>
                  )}*/}
                </View>
                <View style={styles.itemTotalRow}>
                  <Text style={styles.itemTotalLabel}>Total:</Text>
                  <Text style={styles.itemTotalValue}>
                    {formatWithBCV(item.total || 0)}
                  </Text>
                </View>
              </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* Resumen Financiero - CON CÁLCULOS CORRECTOS */}
      <Card style={styles.summaryCard}>
        {/*<Text style={styles.sectionTitle}>Resumen Financiero</Text>*/}
        
        {/* ✨ DESGLOSE: Mostrar solo si hay productos exentos */}
        {calculateCorrectTotals.hasExemptions && (
          <View style={styles.taxBreakdownContainer}>
            <Text style={styles.taxBreakdownTitle}>Desglose de Impuestos:</Text>
            
            {/* Productos gravables */}
            <View style={styles.taxBreakdownRow}>
              <Text style={styles.taxBreakdownLabel}>Base gravable (no exenta):</Text>
              <Text style={styles.taxBreakdownValue}>
                {formatCurrency(calculateCorrectTotals.finalTaxableBase)}
              </Text>
            </View>
            
            {/* Productos exentos */}
            <View style={styles.taxBreakdownRow}>
              <Text style={styles.taxBreakdownLabel}>Base exenta:</Text>
              <Text style={[styles.taxBreakdownValue, { color: colors.success }]}>
                {formatCurrency(calculateCorrectTotals.exemptTotal)}
              </Text>
            </View>
            
            <View style={styles.taxBreakdownDivider} />
          </View>
        )}
        
        {/* RESUMEN: Usando valores RECALCULADOS */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>
            {formatWithBCV(quote.subtotal)}
          </Text>
        </View>
        {/*<View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Descuento:</Text>
          <Text style={[styles.summaryValue, styles.discountText]}>
            -{formatWithBCV(quote.discount_amount)}
          </Text>
        </View>*/}
        {/* ✨ Desglose de impuestos por alícuota */}
        {Object.values(calculateCorrectTotals.taxGroups).length > 0 && (
          <>
            <View style={styles.taxDivider} />
            <Text style={styles.taxSectionTitle}>Desglose de Impuestos</Text>

            {Object.values(calculateCorrectTotals.taxGroups)
              .sort((a, b) => b.aliquot - a.aliquot)
              .map((group) => (
                <View key={group.aliquot} style={styles.taxGroupRow}>
                  <Text style={styles.taxGroupLabel}>Impuesto {group.label}:</Text>
                  <Text style={styles.taxGroupTax}>{formatCurrency(group.tax)}</Text>
                </View>
              ))}

            {calculateCorrectTotals.hasExemptions && (
              <View style={styles.taxGroupRow}>
                <Text style={styles.taxGroupLabel}>Exento:</Text>
                <Text style={styles.taxGroupTax}>{formatCurrency(0)}</Text>
              </View>
            )}

            <View style={styles.taxDivider} />
          </>
        )}
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.summaryLabel}>TOTAL:</Text>
          <View>
            <Text style={styles.summaryValue}>
              {formatWithBCV(quote.total)}
            </Text>
            
          </View>
        </View>
      </Card>
    </ScrollView>
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
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  
  // Botones de acción
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    gap: spacing.xs,
  },
  previewButton: {
    backgroundColor: colors.info + '10',
    borderColor: colors.info + '30',
  },
  shareButton: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  // Exchange Rate Card
  exchangeCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  exchangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  exchangeTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  exchangeRate: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  exchangeDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },

  // Info Card
  infoCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  infoItem: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  textSection: {
    marginTop: spacing.md,
  },
  infoDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },

  // Products Card
  productsCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyItemsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  itemsList: {
    gap: spacing.md,
     
  },
  quoteItem: {
    padding: spacing.lg,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderLeftWidth: 3,
    borderLeftColor: colors.warning 
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  itemName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  itemBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  itemBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[50],
  },
  
  // ✨ Estilos para badges de sale_tax y aliquot
  productMetaBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.sm,
  },
  metaBadgeExempt: {
    backgroundColor: colors.success + '15',
  },
  metaBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  metaBadgeExemptText: {
    color: colors.success,
  },
  
  itemDetails: {
      fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemDetailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  itemDetailValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  itemTotalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  itemTotalValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
  },

  // Summary Card
  summaryCard: {
    margin: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  
  // ✨ Estilos para desglose de impuestos
  taxBreakdownContainer: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.success + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  taxBreakdownTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.success,
    marginBottom: spacing.md,
  },
  taxBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  taxBreakdownLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  taxBreakdownValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  taxBreakdownDivider: {
    height: 1,
    backgroundColor: colors.success + '30',
    marginTop: spacing.md,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.primary[200],
    marginVertical: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
  },
  totalValueUSD: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[600],
    textAlign: 'right',
  },
  totalValueBCV: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  discountText: {
    color: colors.error,
  },

  // ✨ Estilos para IVA Exento
  exemptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.success + '15',
    borderRadius: borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  exemptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.medium,
  },
    productCode: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
    infoRowProductModalFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
   infoTextProductModalFull: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    flex: 1,
  },
  // ✨ Estilos para desglose de impuestos
  taxDivider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
  taxSectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  taxGroupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  taxGroupLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  taxGroupTax: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.info,
  },
});