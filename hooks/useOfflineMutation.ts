/**
 * useOfflineMutation - Hook para operaciones con soporte offline
 *
 * Uso:
 * const { mutate, isLoading, isOffline } = useOfflineMutation(
 *   api.createSale,
 *   {
 *     onSuccess: (data) => console.log('Venta creada:', data),
 *     onError: (error) => console.error('Error:', error),
 *     onOffline: (data) => Alert.alert('Guardado offline', 'Se sincronizará cuando haya conexión'),
 *   }
 * );
 */

import { useState, useCallback } from 'react';
import { useSync } from '../context/SyncContext';
import { offlineQueueService } from '../services/offlineQueueService';

interface OfflineMutationOptions<TData, TVariables, TError = any> {
  // Función de mutación online
  mutationFn: (variables: TVariables) => Promise<TData>;

  // Callbacks
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onOffline?: (variables: TVariables) => void;

  // Configuración de la cola
  priority?: 'high' | 'normal' | 'low';
  maxRetries?: number;

  // Endpoint para reconstructción en cola
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

interface MutationResult<TData> {
  mutate: (variables: any) => Promise<void>;
  isLoading: boolean;
  isOffline: boolean;
  error: any;
  data: TData | null;
}

/**
 * Hook para mutaciones con soporte offline
 */
export function useOfflineMutation<TData = any, TVariables = any, TError = any>(
  options: OfflineMutationOptions<TData, TVariables, TError>
): MutationResult<TData> {
  const { isOnline, syncNow } = useSync();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TError | null>(null);
  const [data, setData] = useState<TData | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!isOnline) {
          // 📡 OFFLINE: Encolar operación
          console.log('📡 Sin conexión, guardando operación en cola...');

          const operationId = await offlineQueueService.add({
            operation: options.method === 'DELETE' ? 'delete' :
                       options.method === 'PUT' || options.method === 'PATCH' ? 'update' : 'create',
            endpoint: options.endpoint,
            method: options.method,
            data: variables,
            priority: options.priority || 'normal',
            maxRetries: options.maxRetries || 3,
          });

          console.log('✅ Operación encolada con ID:', operationId);

          // Callback onOffline
          options.onOffline?.(variables);

          // Datos temporales con ID de operación
          setData({
            id: operationId,
            offline: true,
            pending: true,
            ...variables,
          } as unknown as TData);

        } else {
          // 🌐 ONLINE: Ejecutar inmediatamente
          console.log('🌐 Conectado, ejecutando operación...');

          const result = await options.mutationFn(variables);
          setData(result);
          options.onSuccess?.(result, variables);
        }
      } catch (err: any) {
        console.error('❌ Error en mutación:', err);
        setError(err);
        options.onError?.(err, variables);
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline, options]
  );

  return {
    mutate,
    isLoading,
    isOffline: !isOnline,
    error,
    data,
  };
}

/**
 * Hook especializado para crear ventas offline
 */
export function useCreateSaleOffline() {
  return useOfflineMutation(
    async (data: any) => {
      // Aquí iría la llamada real a la API
      const { api } = await import('../services/api');
      return (await api.createSale(data)).data;
    },
    {
      endpoint: '/sales',
      method: 'POST',
      priority: 'high', // Las ventas son prioritarias
      onSuccess: (data) => {
        console.log('✅ Venta creada exitosamente:', data);
      },
      onError: (error) => {
        console.error('❌ Error al crear venta:', error);
      },
      onOffline: (data) => {
        console.log('📡 Venta guardada offline:', data);
      },
    }
  );
}

/**
 * Hook especializado para crear presupuestos offline
 */
export function useCreateQuoteOffline() {
  return useOfflineMutation(
    async (data: any) => {
      const { api } = await import('../services/api');
      return (await api.createQuote(data)).data;
    },
    {
      endpoint: '/quotes',
      method: 'POST',
      priority: 'normal',
      onSuccess: (data) => {
        console.log('✅ Presupuesto creado exitosamente:', data);
      },
      onError: (error) => {
        console.error('❌ Error al crear presupuesto:', error);
      },
      onOffline: (data) => {
        console.log('📡 Presupuesto guardado offline:', data);
      },
    }
  );
}

/**
 * Hook especializado para crear clientes offline
 */
export function useCreateCustomerOffline() {
  return useOfflineMutation(
    async (data: any) => {
      const { api } = await import('../services/api');
      return (await api.createCustomer(data)).data;
    },
    {
      endpoint: '/customers',
      method: 'POST',
      priority: 'normal',
      onSuccess: (data) => {
        console.log('✅ Cliente creado exitosamente:', data);
      },
      onError: (error) => {
        console.error('❌ Error al crear cliente:', error);
      },
      onOffline: (data) => {
        console.log('📡 Cliente guardado offline:', data);
      },
    }
  );
}
