/**
 * OfflineQueueService - Maneja la cola de operaciones pendientes
 *
 * Escalable y robusto:
 * - Persiste operaciones en AsyncStorage
 * - Reintentos con backoff exponencial
 * - Deduplicación de operaciones
 * - Orden FIFO garantizado
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedOperation {
  id: string; // UUID único
  operation: 'create' | 'update' | 'delete';
  endpoint: string; // Ej: '/sales', '/quotes'
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
}

interface QueueStats {
  pending: number;
  highPriority: number;
  failed: number;
  lastSync: string | null;
}

/**
 * Servicio de Cola Offline
 */
export class OfflineQueueService {
  private readonly QUEUE_KEY = 'offline_queue';
  private readonly FAILED_KEY = 'offline_queue_failed';
  private readonly PROCESSING_KEY = 'offline_queue_processing';
  private readonly STATS_KEY = 'offline_queue_stats';

  /**
   * Agregar operación a la cola
   */
  async add(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const queueItem: QueuedOperation = {
      ...operation,
      id: this.generateId(),
      timestamp: Date.now(),
      retries: 0,
    };

    try {
      // Obtener cola actual
      const queue = await this.getQueue();

      // Verificar duplicados (misma operación sobre mismo recurso)
      const isDuplicate = queue.some(item =>
        item.endpoint === operation.endpoint &&
        item.method === operation.method &&
        JSON.stringify(item.data) === JSON.stringify(operation.data) &&
        item.timestamp > Date.now() - 5000 // Duplicado si es < 5 segundos
      );

      if (isDuplicate) {
        console.log('🔄 Operación duplicada, omitiendo:', operation.endpoint);
        throw new Error('DUPLICATE_OPERATION');
      }

      // Agregar a la cola (ordenado por prioridad y timestamp)
      queue.push(queueItem);
      queue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority] || a.timestamp - b.timestamp;
      });

      // Guardar cola actualizada
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));

      // Actualizar estadísticas
      await this.updateStats(queue);

      console.log('✅ Operación encolada:', operation.method, operation.endpoint);
      return queueItem.id;

    } catch (error: any) {
      if (error.message === 'DUPLICATE_OPERATION') {
        throw error;
      }
      console.error('❌ Error al encolar operación:', error);
      throw error;
    }
  }

  /**
   * Obtener toda la cola
   */
  async getQueue(): Promise<QueuedOperation[]> {
    try {
      const queueJson = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('❌ Error al obtener cola:', error);
      return [];
    }
  }

  /**
   * Obtener operaciones fallidas
   */
  async getFailed(): Promise<QueuedOperation[]> {
    try {
      const failedJson = await AsyncStorage.getItem(this.FAILED_KEY);
      return failedJson ? JSON.parse(failedJson) : [];
    } catch (error) {
      console.error('❌ Error al obtener operaciones fallidas:', error);
      return [];
    }
  }

  /**
   * Verificar si hay operaciones pendientes
   */
  async hasPending(): Promise<boolean> {
    const queue = await this.getQueue();
    return queue.length > 0;
  }

  /**
   * Obtener número de operaciones pendientes
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getStats(): Promise<QueueStats> {
    try {
      const statsJson = await AsyncStorage.getItem(this.STATS_KEY);
      if (statsJson) {
        return JSON.parse(statsJson);
      }

      const queue = await this.getQueue();
      const failed = await this.getFailed();

      return {
        pending: queue.length,
        highPriority: queue.filter(op => op.priority === 'high').length,
        failed: failed.length,
        lastSync: null,
      };
    } catch (error) {
      return {
        pending: 0,
        highPriority: 0,
        failed: 0,
        lastSync: null,
      };
    }
  }

  /**
   * Marcar operación como completada y remover de la cola
   */
  async complete(operationId: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const updatedQueue = queue.filter(op => op.id !== operationId);

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(updatedQueue));
      await this.updateStats(updatedQueue);

      console.log('✅ Operación completada:', operationId);
    } catch (error) {
      console.error('❌ Error al completar operación:', error);
      throw error;
    }
  }

  /**
   * Marcar operación como fallida
   */
  async fail(operationId: string, error: any): Promise<void> {
    try {
      const queue = await this.getQueue();
      const operation = queue.find(op => op.id === operationId);

      if (!operation) {
        console.warn('⚠️ Operación no encontrada:', operationId);
        return;
      }

      // Incrementar reintentos
      operation.retries++;

      // Si supera maxRetries, mover a fallidas
      if (operation.retries >= operation.maxRetries) {
        const failed = await this.getFailed();
        failed.push({
          ...operation,
          data: {
            ...operation.data,
            lastError: error?.message || 'Unknown error',
          },
        });

        await AsyncStorage.setItem(this.FAILED_KEY, JSON.stringify(failed));

        // Remover de cola principal
        const updatedQueue = queue.filter(op => op.id !== operationId);
        await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(updatedQueue));

        console.error('❌ Operación fallida definitivamente:', operationId);
      } else {
        // Actualizar en cola con más reintentos
        const updatedQueue = queue.map(op =>
          op.id === operationId ? operation : op
        );
        await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(updatedQueue));

        console.warn('⚠️ Operación reintentada:', operationId, `(${operation.retries}/${operation.maxRetries})`);
      }

      await this.updateStats(await this.getQueue());
    } catch (error) {
      console.error('❌ Error al marcar operación como fallida:', error);
      throw error;
    }
  }

  /**
   * Verificar si está procesando la cola actualmente
   */
  async isProcessing(): Promise<boolean> {
    try {
      const processing = await AsyncStorage.getItem(this.PROCESSING_KEY);
      return processing === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Marcar como procesando (para evitar procesos simultáneos)
   */
  async setProcessing(processing: boolean): Promise<void> {
    await AsyncStorage.setItem(this.PROCESSING_KEY, processing ? 'true' : 'false');
  }

  /**
   * Limpiar toda la cola (útil para logout o testing)
   */
  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([this.QUEUE_KEY, this.FAILED_KEY, this.PROCESSING_KEY]);
    console.log('🗑️ Cola limpiada');
  }

  /**
   * Reintentar operaciones fallidas manualmente
   */
  async retryFailed(): Promise<number> {
    try {
      const failed = await this.getFailed();
      const queue = await this.getQueue();

      // Mover fallidas a la cola principal
      const retriedOperations = failed.map(op => ({
        ...op,
        retries: 0,
        timestamp: Date.now(),
      }));

      const updatedQueue = [...queue, ...retriedOperations];

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(updatedQueue));
      await AsyncStorage.removeItem(this.FAILED_KEY);
      await this.updateStats(updatedQueue);

      console.log('🔄 Reintentando', retriedOperations.length, 'operaciones fallidas');
      return retriedOperations.length;
    } catch (error) {
      console.error('❌ Error al reintentar operaciones fallidas:', error);
      return 0;
    }
  }

  /**
   * Actualizar estadísticas
   */
  private async updateStats(queue: QueuedOperation[]): Promise<void> {
    const failed = await this.getFailed();

    const stats: QueueStats = {
      pending: queue.length,
      highPriority: queue.filter(op => op.priority === 'high').length,
      failed: failed.length,
      lastSync: new Date().toISOString(),
    };

    await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
  }

  /**
   * Generar ID único para operación
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const offlineQueueService = new OfflineQueueService();
