import { Alert } from 'react-native';

// =================== FORMATEO DE MONEDA ===================

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
};

// =================== FORMATEO DE FECHAS ===================

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatDateOnly = (date: string | Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateShort = (date: string | Date): string => {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(new Date(date));
};

export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const target = new Date(date);
  const diffTime = now.getTime() - target.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
};

export const getDateRange = (range: 'today' | 'week' | 'month' | 'quarter' | 'year'): { from: string; to: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case 'today':
      return {
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
    
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return {
        from: weekStart.toISOString().split('T')[0],
        to: weekEnd.toISOString().split('T')[0],
      };
    
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: monthStart.toISOString().split('T')[0],
        to: monthEnd.toISOString().split('T')[0],
      };
    
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
      return {
        from: quarterStart.toISOString().split('T')[0],
        to: quarterEnd.toISOString().split('T')[0],
      };
    
    case 'year':
      return {
        from: `${now.getFullYear()}-01-01`,
        to: `${now.getFullYear()}-12-31`,
      };
    
    default:
      return {
        from: today.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      };
  }
};

// =================== VALIDACIONES ===================

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string, country: string = 'VE'): boolean => {
  const cleanPhone = phone.replace(/\s|-|\(|\)/g, '');
  
  switch (country) {
    case 'VE':
      // Formato venezolano: 0424-123-4567
      const venezuelanRegex = /^0(412|414|416|424|426)\d{7}$/;
      return venezuelanRegex.test(cleanPhone);
    
    case 'US':
      // Formato estadounidense: +1-555-123-4567
      const usRegex = /^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
      return usRegex.test(cleanPhone);
    
    default:
      // Validación básica: al menos 10 dígitos
      return /^\d{10,15}$/.test(cleanPhone);
  }
};

export const validateDocument = (document: string, type: 'DNI' | 'RUC' | 'CE' | 'PASSPORT'): boolean => {
  const cleanDoc = document.replace(/\D/g, '');
  
  switch (type) {
    case 'DNI':
      return cleanDoc.length === 8;
    case 'RUC':
      return cleanDoc.length === 11;
    case 'CE':
      return cleanDoc.length >= 9 && cleanDoc.length <= 12;
    case 'PASSPORT':
      return document.length >= 6 && document.length <= 12;
    default:
      return false;
  }
};

export const validatePrice = (price: string | number): boolean => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice >= 0;
};

export const validateStock = (stock: string | number): boolean => {
  const numStock = typeof stock === 'string' ? parseInt(stock) : stock;
  return !isNaN(numStock) && numStock >= 0 && Number.isInteger(numStock);
};

export const validateDiscount = (discount: string | number): boolean => {
  const numDiscount = typeof discount === 'string' ? parseFloat(discount) : discount;
  return !isNaN(numDiscount) && numDiscount >= 0 && numDiscount <= 100;
};

// =================== DEBOUNCE Y UTILIDADES ===================

export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const generateQuoteNumber = (prefix: string = 'COT'): string => {
  const now = new Date();
  const year = now.getFullYear().toString().substr(2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const time = now.getTime().toString().substr(-4);
  
  return `${prefix}-${year}${month}${day}-${time}`;
};

// =================== CÁLCULOS COMERCIALES ===================

export const calculateItemTotal = (quantity: number, unitPrice: number, discount: number = 0): number => {
  const subtotal = quantity * unitPrice;
  const discountAmount = subtotal * (discount / 100);
  return subtotal - discountAmount;
};

export const calculateTax = (amount: number, taxRate: number = 16): number => {
  return amount * (taxRate / 100);
};

export const calculateQuoteTotals = (items: {
  quantity: number;
  unit_price: number;
  discount?: number;
}[], globalDiscount: number = 0, taxRate: number = 16) => {
  const itemsTotal = items.reduce((sum, item) => {
    return sum + calculateItemTotal(item.quantity, item.unit_price, item.discount || 0);
  }, 0);
  
  const globalDiscountAmount = itemsTotal * (globalDiscount / 100);
  const subtotal = itemsTotal - globalDiscountAmount;
  const tax = calculateTax(subtotal, taxRate);
  const total = subtotal + tax;
  
  return {
    itemsTotal,
    globalDiscountAmount,
    subtotal,
    tax,
    total,
    taxRate,
  };
};

export const calculateProfitMargin = (sellPrice: number, costPrice: number): number => {
  if (costPrice <= 0) return 0;
  return ((sellPrice - costPrice) / sellPrice) * 100;
};

export const calculateMarkup = (sellPrice: number, costPrice: number): number => {
  if (costPrice <= 0) return 0;
  return ((sellPrice - costPrice) / costPrice) * 100;
};

// =================== FORMATEO DE TEXTO ===================

export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const capitalizeWords = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const formatProductCode = (code: string): string => {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

export const generateInitials = (name: string): string => {
  return name.split(' ')
    .map(n => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength - 3) + '...';
};

// =================== UTILIDADES DE ARRAYS ===================

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterBy = <T>(array: T[], filters: Partial<Record<keyof T, any>>): T[] => {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true;
      return item[key as keyof T] === value;
    });
  });
};

export const searchIn = <T>(array: T[], query: string, fields: (keyof T)[]): T[] => {
  if (!query.trim()) return array;
  
  const searchQuery = query.toLowerCase();
  return array.filter(item => {
    return fields.some(field => {
      const fieldValue = String(item[field]).toLowerCase();
      return fieldValue.includes(searchQuery);
    });
  });
};

// =================== MANEJO DE ERRORES ===================

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.data?.errors) {
    const errors = error.response.data.errors;
    const firstError = Object.values(errors)[0];
    return Array.isArray(firstError) ? firstError[0] : String(firstError);
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Ha ocurrido un error inesperado';
};

export const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void => {
  Alert.alert(title, message);
};

export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Confirmar', style: 'default', onPress: onConfirm },
    ]
  );
};

export const showDeleteAlert = (
  itemName: string,
  onConfirm: () => void,
  onCancel?: () => void
): void => {
  Alert.alert(
    'Confirmar Eliminación',
    `¿Estás seguro de que quieres eliminar "${itemName}"? Esta acción no se puede deshacer.`,
    [
      { text: 'Cancelar', style: 'cancel', onPress: onCancel },
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]
  );
};

// =================== UTILIDADES DE STATUS ===================

export const getQuoteStatusInfo = (status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired') => {
  const statusMap = {
    draft: {
      label: 'Borrador',
      color: '#f59e0b',
      backgroundColor: '#fef3c7',
      icon: 'create-outline',
    },
    sent: {
      label: 'Enviado',
      color: '#3b82f6',
      backgroundColor: '#dbeafe',
      icon: 'paper-plane',
    },
    approved: {
      label: 'Aprobado',
      color: '#10b981',
      backgroundColor: '#d1fae5',
      icon: 'checkmark-circle',
    },
    rejected: {
      label: 'Rechazado',
      color: '#ef4444',
      backgroundColor: '#fee2e2',
      icon: 'close-circle',
    },
    expired: {
      label: 'Expirado',
      color: '#6b7280',
      backgroundColor: '#f3f4f6',
      icon: 'time-outline',
    },
  };
  
  return statusMap[status] || statusMap.draft;
};

export const isQuoteExpired = (validUntil: string): boolean => {
  return new Date(validUntil) < new Date();
};

export const isQuoteExpiringSoon = (validUntil: string, days: number = 3): boolean => {
  const expiryDate = new Date(validUntil);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= days && diffDays > 0;
};

export const getDaysUntilExpiry = (validUntil: string): number => {
  const expiryDate = new Date(validUntil);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// =================== UTILIDADES DE STOCK ===================

export const getStockStatus = (currentStock: number, minStock: number) => {
  if (currentStock <= 0) {
    return {
      status: 'out_of_stock',
      label: 'Sin Stock',
      color: '#ef4444',
      backgroundColor: '#fee2e2',
      icon: 'alert-circle',
    };
  }
  
  if (currentStock <= minStock) {
    return {
      status: 'low_stock',
      label: 'Stock Bajo',
      color: '#f59e0b',
      backgroundColor: '#fef3c7',
      icon: 'warning',
    };
  }
  
  return {
    status: 'in_stock',
    label: 'En Stock',
    color: '#10b981',
    backgroundColor: '#d1fae5',
    icon: 'checkmark-circle',
  };
};

export const calculateStockValue = (products: { stock: number; cost?: number; price: number }[]): {
  totalUnits: number;
  totalCostValue: number;
  totalRetailValue: number;
} => {
  return products.reduce((acc, product) => {
    const units = product.stock;
    const costValue = units * (product.cost || product.price);
    const retailValue = units * product.price;
    
    return {
      totalUnits: acc.totalUnits + units,
      totalCostValue: acc.totalCostValue + costValue,
      totalRetailValue: acc.totalRetailValue + retailValue,
    };
  }, {
    totalUnits: 0,
    totalCostValue: 0,
    totalRetailValue: 0,
  });
};

// =================== UTILIDADES DE FORMATO ===================

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// =================== UTILIDADES DE COLORES ===================

export const generateColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

export const getContrastColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

// =================== UTILIDADES DE EXPORTACIÓN ===================

export const convertToCSV = (data: any[], headers: string[]): string => {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return String(value);
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
};

export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  // Esta función sería implementada específicamente para cada plataforma
  console.log('Download file:', { content, filename, mimeType });
};

// =================== UTILIDADES DE CACHE ===================

export const createCacheKey = (...parts: (string | number)[]): string => {
  return parts.join('-').toLowerCase();
};

export const isDataStale = (timestamp: string, maxAge: number = 300000): boolean => {
  const dataTime = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - dataTime) > maxAge;
};

// =================== UTILIDADES DE PERFORMANCE ===================

export const measurePerformance = <T>(name: string, fn: () => T): T => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  if (__DEV__) {
    console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`);
  }
  
  return result;
};

export const batchProcess = <T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 10
): Promise<R[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const results: R[] = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await processor(batch);
        results.push(...batchResults);
      }
      
      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
};

// =================== CONSTANTES ÚTILES ===================

export const CURRENCY_SYMBOLS = {
  USD: 'USD',
  EUR: '€',
  GBP: '£',
  VES: 'Bs.',
  COP: 'COP',
  PEN: 'S/',
} as const;

export const DOCUMENT_TYPES = {
  DNI: 'DNI',
  RUC: 'RUC',
  CE: 'Carnet de Extranjería',
  PASSPORT: 'Pasaporte',
} as const;

export const QUOTE_STATUSES = {
  draft: 'Borrador',
  sent: 'Enviado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  expired: 'Expirado',
} as const;

export const DATE_RANGES = {
  today: 'Hoy',
  week: 'Esta Semana',
  month: 'Este Mes',
  quarter: 'Este Trimestre',
  year: 'Este Año',
} as const;