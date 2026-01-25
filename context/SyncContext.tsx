/**
 * SyncContext - Proveedor global de estado de sincronización
 *
 * Proporciona a toda la app:
 * - Estado de conexión
 * - Número de operaciones pendientes
 * - Funciones para sincronizar manualmente
 * - Auto-sincronización cuando se restablece la conexión
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineQueueService } from '../services/offlineQueueService';
import { backgroundSyncService } from '../services/backgroundSyncService';

interface SyncContextType {
  // Estado de red
  isOnline: boolean;
  connectionType: string | null;

  // Estado de sincronización
  isSyncing: boolean;
  syncProgress: { current: number; total: number };
  pendingCount: number;
  failedCount: number;

  // Acciones
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;
  clearQueue: () => Promise<void>;

  // Métricas
  lastSyncTime: string | null;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

/**
 * Provider de sincronización offline
 */
export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  /**
   * Actualizar contador de pendientes
   */
  const updatePendingCount = useCallback(async () => {
    try {
      const stats = await offlineQueueService.getStats();
      setPendingCount(stats.pending);
      setFailedCount(stats.failed);
      setLastSyncTime(stats.lastSync);
    } catch (error) {
      console.error('❌ Error al actualizar contadores:', error);
    }
  }, []);

  /**
   * Sincronizar ahora manualmente
   */
  const syncNow = useCallback(async () => {
    if (isSyncing) {
      console.log('⏸️ Ya hay una sincronización en progreso');
      return;
    }

    if (!isOnline) {
      console.log('📡 Sin conexión, no se puede sincronizar');
      return;
    }

    try {
      setIsSyncing(true);
      console.log('🔄 Iniciando sincronización manual...');

      await backgroundSyncService.fullSync({
        onProgress: (current, total) => {
          setSyncProgress({ current, total });
        },
        onComplete: async (result) => {
          console.log('✅ Sincronización completada:', result);
          await updatePendingCount();
        },
      });

    } catch (error) {
      console.error('❌ Error en sincronización manual:', error);
    } finally {
      setIsSyncing(false);
      setSyncProgress({ current: 0, total: 0 });
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  /**
   * Reintentar operaciones fallidas
   */
  const retryFailed = useCallback(async () => {
    try {
      const retried = await offlineQueueService.retryFailed();
      console.log(`🔄 ${retried} operaciones reintentadas`);

      // Si hay operaciones para reintentar, sincronizar
      if (retried > 0 && isOnline) {
        await syncNow();
      }

      await updatePendingCount();
    } catch (error) {
      console.error('❌ Error al reintentar operaciones fallidas:', error);
    }
  }, [isOnline, syncNow, updatePendingCount]);

  /**
   * Limpiar toda la cola
   */
  const clearQueue = useCallback(async () => {
    try {
      await offlineQueueService.clear();
      await updatePendingCount();
      console.log('🗑️ Cola limpiada');
    } catch (error) {
      console.error('❌ Error al limpiar cola:', error);
    }
  }, [updatePendingCount]);

  /**
   * Manejar cambio de estado de red
   */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = isOnline;
      const nowOnline = state.isConnected ?? false;

      setIsOnline(nowOnline);
      setConnectionType(state.type);

      console.log(`📡 Estado de red: ${nowOnline ? 'CONECTADO' : 'DESCONECTADO'}`);

      // Si se restableció la conexión, auto-sincronizar
      if (!wasOnline && nowOnline) {
        console.log('🎉 Conexión restablecida, iniciando auto-sync...');
        (async () => {
          await updatePendingCount();

          // Solo auto-sincronizar si hay pendientes
          const stats = await offlineQueueService.getStats();
          if (stats.pending > 0) {
            await syncNow();
          } else {
            // Sincronizar datos aunque no haya operaciones pendientes
            await backgroundSyncService.syncData(['products', 'customers']);
          }
        })();
      }
    });

    // Estado inicial
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
      setConnectionType(state.type);
    });

    // Actualizar contadores periódicamente
    const interval = setInterval(updatePendingCount, 30000); // Cada 30s

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOnline, syncNow, updatePendingCount]);

  /**
   * Context value
   */
  const value: SyncContextType = {
    isOnline,
    connectionType,
    isSyncing,
    syncProgress,
    pendingCount,
    failedCount,
    syncNow,
    retryFailed,
    clearQueue,
    lastSyncTime,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

/**
 * Hook para usar el contexto de sincronización
 */
export const useSync = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync debe usarse dentro de SyncProvider');
  }
  return context;
};

/**
 * Hook para verificar estado de red rápidamente
 */
export const useNetworkStatus = () => {
  const { isOnline, connectionType } = useSync();
  return { isConnected: isOnline, connectionType };
};
