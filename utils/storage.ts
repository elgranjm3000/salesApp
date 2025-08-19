import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OfflineSale {
  id: string;
  customer_id: number;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
    discount?: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: string;
  notes?: string;
  sale_date: string;
  created_at: string;
}

export interface SyncData {
  last_product_sync?: string;
  last_customer_sync?: string;
  pending_sales?: OfflineSale[];
}

class StorageService {
  // Keys para AsyncStorage
  private static readonly KEYS = {
    OFFLINE_SALES: 'offline_sales',
    LAST_PRODUCT_SYNC: 'last_product_sync',
    LAST_CUSTOMER_SYNC: 'last_customer_sync',
    CACHED_PRODUCTS: 'cached_products',
    CACHED_CUSTOMERS: 'cached_customers',
    APP_SETTINGS: 'app_settings',
  };

  // Ventas offline
  static async saveOfflineSale(sale: OfflineSale): Promise<void> {
    try {
      const existingSales = await this.getOfflineSales();
      const updatedSales = [...existingSales, sale];
      await AsyncStorage.setItem(this.KEYS.OFFLINE_SALES, JSON.stringify(updatedSales));
    } catch (error) {
      console.error('Error saving offline sale:', error);
      throw error;
    }
  }

  static async getOfflineSales(): Promise<OfflineSale[]> {
    try {
      const salesJson = await AsyncStorage.getItem(this.KEYS.OFFLINE_SALES);
      return salesJson ? JSON.parse(salesJson) : [];
    } catch (error) {
      console.error('Error getting offline sales:', error);
      return [];
    }
  }

  static async removeOfflineSale(saleId: string): Promise<void> {
    try {
      const existingSales = await this.getOfflineSales();
      const filteredSales = existingSales.filter(sale => sale.id !== saleId);
      await AsyncStorage.setItem(this.KEYS.OFFLINE_SALES, JSON.stringify(filteredSales));
    } catch (error) {
      console.error('Error removing offline sale:', error);
      throw error;
    }
  }

  static async clearOfflineSales(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.OFFLINE_SALES);
    } catch (error) {
      console.error('Error clearing offline sales:', error);
      throw error;
    }
  }

  // Sincronización
  static async setLastSync(type: 'products' | 'customers', timestamp: string): Promise<void> {
    try {
      const key = type === 'products' ? this.KEYS.LAST_PRODUCT_SYNC : this.KEYS.LAST_CUSTOMER_SYNC;
      await AsyncStorage.setItem(key, timestamp);
    } catch (error) {
      console.error('Error setting last sync:', error);
      throw error;
    }
  }

  static async getLastSync(type: 'products' | 'customers'): Promise<string | null> {
    try {
      const key = type === 'products' ? this.KEYS.LAST_PRODUCT_SYNC : this.KEYS.LAST_CUSTOMER_SYNC;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting last sync:', error);
      return null;
    }
  }

  // Cache de datos
  static async cacheProducts(products: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.CACHED_PRODUCTS, JSON.stringify(products));
    } catch (error) {
      console.error('Error caching products:', error);
      throw error;
    }
  }

  static async getCachedProducts(): Promise<any[]> {
    try {
      const productsJson = await AsyncStorage.getItem(this.KEYS.CACHED_PRODUCTS);
      return productsJson ? JSON.parse(productsJson) : [];
    } catch (error) {
      console.error('Error getting cached products:', error);
      return [];
    }
  }

  static async cacheCustomers(customers: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.CACHED_CUSTOMERS, JSON.stringify(customers));
    } catch (error) {
      console.error('Error caching customers:', error);
      throw error;
    }
  }

  static async getCachedCustomers(): Promise<any[]> {
    try {
      const customersJson = await AsyncStorage.getItem(this.KEYS.CACHED_CUSTOMERS);
      return customersJson ? JSON.parse(customersJson) : [];
    } catch (error) {
      console.error('Error getting cached customers:', error);
      return [];
    }
  }

  // Configuraciones de la app
  static async saveAppSettings(settings: Record<string, any>): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving app settings:', error);
      throw error;
    }
  }

  static async getAppSettings(): Promise<Record<string, any>> {
    try {
      const settingsJson = await AsyncStorage.getItem(this.KEYS.APP_SETTINGS);
      return settingsJson ? JSON.parse(settingsJson) : {};
    } catch (error) {
      console.error('Error getting app settings:', error);
      return {};
    }
  }

  // Utilidades generales
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        this.KEYS.OFFLINE_SALES,
        this.KEYS.LAST_PRODUCT_SYNC,
        this.KEYS.LAST_CUSTOMER_SYNC,
        this.KEYS.CACHED_PRODUCTS,
        this.KEYS.CACHED_CUSTOMERS,
        this.KEYS.APP_SETTINGS,
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  static async getStorageInfo(): Promise<{
    offlineSalesCount: number;
    lastProductSync: string | null;
    lastCustomerSync: string | null;
    cachedProductsCount: number;
    cachedCustomersCount: number;
  }> {
    try {
      const [
        offlineSales,
        lastProductSync,
        lastCustomerSync,
        cachedProducts,
        cachedCustomers,
      ] = await Promise.all([
        this.getOfflineSales(),
        this.getLastSync('products'),
        this.getLastSync('customers'),
        this.getCachedProducts(),
        this.getCachedCustomers(),
      ]);

      return {
        offlineSalesCount: offlineSales.length,
        lastProductSync,
        lastCustomerSync,
        cachedProductsCount: cachedProducts.length,
        cachedCustomersCount: cachedCustomers.length,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        offlineSalesCount: 0,
        lastProductSync: null,
        lastCustomerSync: null,
        cachedProductsCount: 0,
        cachedCustomersCount: 0,
      };
    }
  }

  // Generar ID único para ventas offline
  static generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default StorageService;