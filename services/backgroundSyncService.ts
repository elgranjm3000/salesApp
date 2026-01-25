/**
 * BackgroundSyncService - Sincronización automática en segundo plano
 *
 * Características:
 * - Procesa cola de operaciones offline
 * - Reintentos con backoff exponencial
 * - Sincronización de datos (pull)
 * - Logging detallado
 */

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineQueueService, QueuedOperation } from './offlineQueueService';
import { api } from './api';

interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ operation: string; error: string }>;
  timestamp: string;
}

interface SyncOptions {
  showProgress?: boolean;
  onProgress?: (current: number, total: number) => void;
  onComplete?: (result: SyncResult) => void;
}

/**
 * Servicio de Sincronización en Segundo Plano
 */
export class BackgroundSyncService {
  private isProcessing = false;
  private abortController: AbortController | null = null;
  private readonly SYNC_STATE_KEY = 'sync_state';

  /**
   * Procesar toda la cola de operaciones pendientes
   */
  async processQueue(options: SyncOptions = {}): Promise<SyncResult> {
    // Evitar múltiples procesos simultáneos
    if (this.isProcessing) {
      console.log('⏸️ Ya hay una sincronización en progreso');
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [],
        timestamp: new Date().toISOString(),
      };
    }

    // Verificar conexión
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📡 Sin conexión, omitiendo sincronización');
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [{ operation: 'queue', error: 'No hay conexión' }],
        timestamp: new Date().toISOString(),
      };
    }

    this.isProcessing = true;
    await offlineQueueService.setProcessing(true);
    this.abortController = new AbortController();

    const result: SyncResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      console.log('🔄 Iniciando sincronización...');

      // Obtener cola
      const queue = await offlineQueueService.getQueue();

      if (queue.length === 0) {
        console.log('✅ Cola vacía, nada que sincronizar');
        return result;
      }

      console.log(`📦 Procesando ${queue.length} operaciones...`);

      // Guardar estado de sincronización
      await this.saveSyncState({ active: true, total: queue.length, current: 0 });

      // Procesar cada operación
      for (let i = 0; i < queue.length; i++) {
        // Verificar si se abortó
        if (this.abortController?.signal.aborted) {
          console.log('⏹️ Sincronización abortada');
          break;
        }

        const operation = queue[i];

        // Reportar progreso
        options.onProgress?.(i + 1, queue.length);

        try {
          await this.processOperation(operation);
          await offlineQueueService.complete(operation.id);
          result.processed++;
          console.log(`✅ [${i + 1}/${queue.length}] ${operation.method} ${operation.endpoint}`);
        } catch (error: any) {
          await offlineQueueService.fail(operation.id, error);
          result.failed++;
          result.errors.push({
            operation: `${operation.method} ${operation.endpoint}`,
            error: error?.message || 'Unknown error',
          });
          console.error(`❌ [${i + 1}/${queue.length}] ${operation.method} ${operation.endpoint}:`, error?.message);
        }

        // Pequeña pausa entre operaciones para no saturar
        await this.delay(100);
      }

      // Actualizar estado final
      await this.saveSyncState({ active: false, total: 0, current: 0 });

      console.log('🎉 Sincronización completada:', result);
      options.onComplete?.(result);

      return result;

    } catch (error: any) {
      console.error('❌ Error en sincronización:', error);
      result.success = false;
      result.errors.push({ operation: 'sync', error: error?.message });
      return result;

    } finally {
      this.isProcessing = false;
      await offlineQueueService.setProcessing(false);
      this.abortController = null;
    }
  }

  /**
   * Procesar una operación individual
   */
  private async processOperation(operation: QueuedOperation): Promise<any> {
    // Backoff exponencial según reintentos
    if (operation.retries > 0) {
      const delayMs = Math.min(1000 * Math.pow(2, operation.retries), 30000); // Max 30s
      await this.delay(delayMs);
    }

    // Ejecutar operación según método
    switch (operation.method) {
      case 'POST':
        return await api.client.post(operation.endpoint, operation.data);

      case 'PUT':
        return await api.client.put(operation.endpoint, operation.data);

      case 'PATCH':
        return await api.client.patch(operation.endpoint, operation.data);

      case 'DELETE':
        return await api.client.delete(operation.endpoint);

      default:
        throw new Error(`Método no soportado: ${operation.method}`);
    }
  }

  /**
   * Sincronizar datos desde el servidor (pull)
   */
  async syncData(types: ('products' | 'customers' | 'quotes' | 'sales')[] = ['products', 'customers']): Promise<void> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📡 Sin conexión, omitiendo sync de datos');
      return;
    }

    try {
      console.log('🔄 Sync de datos:', types);

      // Obtener company_id
      const companyJson = await AsyncStorage.getItem('selectedCompany');
      const company = companyJson ? JSON.parse(companyJson) : null;
      const company_id = company?.id;

      // Sincronizar cada tipo
      for (const type of types) {
        try {
          let response: any;

          switch (type) {
            case 'products':
              response = await api.syncProducts();
              if (response?.products) {
                await AsyncStorage.setItem('cached_products', JSON.stringify(response.products));
              }
              break;

            case 'customers':
              response = await api.syncCustomers();
              if (response?.customers) {
                await AsyncStorage.setItem('cached_customers', JSON.stringify(response.customers));
              }
              break;

            case 'quotes':
              const quotes = await api.getQuotes({ company_id });
              await AsyncStorage.setItem('cached_quotes', JSON.stringify(quotes.data));
              break;

            case 'sales':
              const sales = await api.getSales({ company_id });
              await AsyncStorage.setItem('cached_sales', JSON.stringify(sales.data));
              break;
          }

          // Actualizar timestamp de último sync
          await AsyncStorage.setItem(`last_${type}_sync`, new Date().toISOString());
          console.log(`✅ ${type} sincronizados`);
        } catch (error) {
          console.error(`❌ Error sincronizando ${type}:`, error);
        }
      }

      console.log('🎉 Sync de datos completado');
    } catch (error) {
      console.error('❌ Error en sync de datos:', error);
    }
  }

  /**
   * Sincronización completa (cola + datos)
   */
  async fullSync(options?: SyncOptions): Promise<SyncResult> {
    console.log('🔄 Iniciando sincronización completa...');

    // Primero procesar cola (push)
    const queueResult = await this.processQueue(options);

    // Luego sincronizar datos (pull)
    if (queueResult.success) {
      await this.syncData(['products', 'customers', 'quotes', 'sales']);
    }

    return queueResult;
  }

  /**
   * Abortar sincronización actual
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      console.log('⏹️ Sincronización abortada');
    }
  }

  /**
   * Verificar si hay sincronización activa
   */
  isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Obtener estado de sincronización
   */
  async getSyncState(): Promise<{ active: boolean; total: number; current: number }> {
    try {
      const stateJson = await AsyncStorage.getItem(this.SYNC_STATE_KEY);
      return stateJson ? JSON.parse(stateJson) : { active: false, total: 0, current: 0 };
    } catch (error) {
      return { active: false, total: 0, current: 0 };
    }
  }

  /**
   * Guardar estado de sincronización
   */
  private async saveSyncState(state: { active: boolean; total: number; current: number }): Promise<void> {
    await AsyncStorage.setItem(this.SYNC_STATE_KEY, JSON.stringify(state));
  }

  /**
   * Delay auxiliar
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const backgroundSyncService = new BackgroundSyncService();
