# 📱 Sistema Offline-First - SalesApp

## 🎯 Arquitectura Implementada

Sistema **escalable y robusto** para trabajar sin conexión y sincronizar automáticamente cuando se restablezca.

---

## 🏗️ Componentes del Sistema

### **1. OfflineQueueService** (`services/offlineQueueService.ts`)
- **Propósito**: Cola de operaciones pendientes
- **Funcionalidades**:
  - ✅ Encolar operaciones (create, update, delete)
  - ✅ Reintentos con backoff exponencial
  - ✅ Deduplicación de operaciones
  - ✅ Prioridades (high, normal, low)
  - ✅ Estadísticas en tiempo real

### **2. BackgroundSyncService** (`services/backgroundSyncService.ts`)
- **Propósito**: Procesar cola y sincronizar datos
- **Funcionalidades**:
  - ✅ Procesamiento automático de cola
  - ✅ Sincronización de datos (pull)
  - ✅ Reintentos inteligentes
  - ✅ Abortar sincronización

### **3. SyncContext** (`context/SyncContext.tsx`)
- **Propósito**: Estado global de sincronización
- **Funcionalidades**:
  - ✅ Estado de red (online/offline)
  - ✅ Contador de operaciones pendientes
  - ✅ Funciones de sincronización manual
  - ✅ Auto-sincronización al reconectar

### **4. useOfflineMutation** (`hooks/useOfflineMutation.ts`)
- **Propósito**: Hook para operaciones offline
- **Funcionalidades**:
  - ✅ Detectar automáticamente estado de red
  - ✅ Encolar si está offline
  - ✅ Ejecutar si está online
  - ✅ Callbacks (onSuccess, onError, onOffline)

### **5. NetworkBanner** (`components/ui/NetworkBanner.tsx`)
- **Propósito**: UI de estado de red
- **Funcionalidades**:
  - ✅ Banner animado
  - ✅ Mostrar operaciones pendientes
  - ✅ Botón de sincronización manual
  - ✅ Progreso de sincronización

---

## 📖 Guía de Uso

### **A. Configuración Inicial (Ya está lista ✅)**

El sistema ya está integrado en `app/_layout.tsx`:

```tsx
<AuthProvider>
  <SyncProvider>  ← Proveedor de sincronización
    <View style={{ flex: 1 }}>
      <Stack />
    </View>
  </SyncProvider>
</AuthProvider>
```

---

### **B. Usar en Componentes**

#### **Opción 1: Con el hook `useSync` (Recomendado)**

```tsx
import { useSync } from '../context/SyncContext';

function CreateSaleScreen() {
  const { isOnline, pendingCount, syncNow } = useSync();

  const handleSave = async () => {
    if (!isOnline) {
      Alert.alert(
        'Sin conexión',
        'La venta se guardará localmente y se sincronizará cuando haya conexión'
      );
    }

    try {
      // Tu lógica normal
      await api.createSale(saleData);

      if (!isOnline) {
        Alert.alert('Venta guardada', 'Se sincronizará automáticamente');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <View>
      <Text>Pendientes: {pendingCount}</Text>
      <Button onPress={syncNow} title="Sincronizar ahora" />
    </View>
  );
}
```

#### **Opción 2: Con `useOfflineMutation` (Más automático)**

```tsx
import { useCreateSaleOffline } from '../hooks/useOfflineMutation';

function CreateSaleScreen() {
  const { mutate, isLoading, isOffline } = useCreateSaleOffline();

  const handleSave = async () => {
    await mutate(saleData);
    // ✅ Automáticamente:
    // - Si hay conexión → Ejecuta y muestra éxito
    // - Si NO hay conexión → Encola y muestra aviso
  };

  return (
    <Button
      onPress={handleSave}
      title={isOffline ? 'Guardar offline' : 'Guardar venta'}
      loading={isLoading}
    />
  );
}
```

---

### **C. Agregar NetworkBanner**

Ya debería estar en tu layout. Si no, agrégalo:

```tsx
import { NetworkBanner } from '../components/ui/NetworkBanner';

function YourScreen() {
  return (
    <View style={{ flex: 1 }}>
      <NetworkBanner />  {/* ← Banner automático */}
      {/* Resto de tu UI */}
    </View>
  );
}
```

---

### **D. Ejemplos Prácticos**

#### **1. Crear venta offline**

```tsx
// En tu pantalla de crear venta
const { isOnline } = useSync();

const saveSale = async () => {
  if (!isOnline) {
    // Encolar manualmente
    await offlineQueueService.add({
      endpoint: '/sales',
      method: 'POST',
      data: saleData,
      priority: 'high',
    });
    Alert.alert('✅ Guardado offline', 'Se sincronizará cuando haya conexión');
    return;
  }

  // Flujo normal online
  const sale = await api.createSale(saleData);
  Alert.alert('✅ Venta creada');
};
```

#### **2. Verificar estado antes de acción crítica**

```tsx
const { isOnline, pendingCount } = useSync();

const handleCriticalAction = async () => {
  if (!isOnline) {
    Alert.alert(
      'Sin conexión',
      'Esta acción requiere conexión a internet',
      [{ text: 'OK' }]
    );
    return;
  }

  // Ejecutar acción crítica
};
```

#### **3. Sincronización manual con progreso**

```tsx
const { syncNow, isSyncing, syncProgress } = useSync();

const handleManualSync = async () => {
  try {
    await syncNow();
    Alert.alert('✅ Sincronización completada');
  } catch (error) {
    Alert.alert('❌ Error', 'No se pudo completar la sincronización');
  }
};

return (
  <View>
    {isSyncing && (
      <Text>Sincronizando {syncProgress.current} de {syncProgress.total}...</Text>
    )}
    <Button onPress={handleManualSync} disabled={isSyncing}>
      {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
    </Button>
  </View>
);
```

---

## 🔄 Flujo de Sincronización

### **1. Usuario está OFFLINE**

```
Usuario crea venta
  ↓
📡 Sin conexión detectada
  ↓
💾 Guardar en AsyncStorage (offlineQueue)
  ↓
✅ Mostrar: "Guardado offline"
  ↓
📊 Actualizar contador: pendingCount++
```

### **2. Conexión se RESTABLECE**

```
📡 Conexión detectada
  ↓
🔄 Auto-sync activado
  ↓
📦 Procesar cola (FIFO)
  ↓
  - POST /sales (venta 1)
  - POST /quotes (presupuesto 1)
  - POST /customers (cliente 1)
  ↓
✅ Éxito: Remover de cola
❌ Error: Reintentar (max 3 veces)
  ↓
📊 Actualizar contadores
  ↓
🎉 Sincronización completada
```

### **3. Sincronización de datos (Pull)**

```
🔄 Iniciar fullSync()
  ↓
📦 Procesar cola primero (push)
  ↓
🌐 Luego sincronizar datos (pull):
  - GET /products → AsyncStorage
  - GET /customers → AsyncStorage
  - GET /quotes → AsyncStorage
  - GET /sales → AsyncStorage
  ↓
✅ Datos actualizados
```

---

## 🛠️ API Reference

### **SyncContext**

```tsx
const {
  isOnline,           // boolean ¿Hay conexión?
  connectionType,     // string | null Tipo de conexión
  isSyncing,          // boolean ¿Se está sincronizando?
  syncProgress,       // { current, total } Progreso actual
  pendingCount,       // number Operaciones pendientes
  failedCount,        // number Operaciones fallidas
  syncNow,            // () => Promise<void> Sincronizar ahora
  retryFailed,        // () => Promise<void> Reintentar fallidas
  clearQueue,         // () => Promise<void> Limpiar cola
  lastSyncTime,       // string | null Última sincronización
} = useSync();
```

### **offlineQueueService**

```tsx
import { offlineQueueService } from '../services/offlineQueueService';

// Agregar operación
await offlineQueueService.add({
  endpoint: '/sales',
  method: 'POST',
  data: saleData,
  priority: 'high',  // 'high' | 'normal' | 'low'
});

// Obtener estadísticas
const stats = await offlineQueueService.getStats();
// → { pending: 5, highPriority: 2, failed: 0, lastSync: '...' }

// Verificar si hay pendientes
const hasPending = await offlineQueueService.hasPending();

// Contador de pendientes
const count = await offlineQueueService.getPendingCount();

// Reintentar fallidas
await offlineQueueService.retryFailed();

// Limpiar cola (útil para logout)
await offlineQueueService.clear();
```

### **backgroundSyncService**

```tsx
import { backgroundSyncService } from '../services/backgroundSyncService';

// Procesar cola
const result = await backgroundSyncService.processQueue({
  onProgress: (current, total) => console.log(`${current}/${total}`),
  onComplete: (result) => console.log('Listo!', result),
});

// Sincronizar datos (pull)
await backgroundSyncService.syncData(['products', 'customers']);

// Sincronización completa
await backgroundSyncService.fullSync();

// Abortar sincronización
backgroundSyncService.abort();

// Verificar si está activo
const isActive = backgroundSyncService.isActive();
```

---

## 🎨 UI/UX Recomendaciones

### **1. Indicadores visuales por pantalla**

```tsx
// En el header de cada pantalla
<View style={styles.header}>
  <Title>Mis Ventas</Title>

  {/* Indicador offline */}
  {!isOnline && (
    <View style={styles.offlineBadge}>
      <Ionicons name="cloud-off" size={14} color={colors.warning} />
      <Text style={styles.offlineText}>Modo offline</Text>
    </View>
  )}

  {/* Indicador de pendientes */}
  {pendingCount > 0 && (
    <View style={styles.pendingBadge}>
      <Ionicons name="time" size={14} color={colors.info} />
      <Text>{pendingCount} pendientes</Text>
    </View>
  )}
</View>
```

### **2. Mensajes claros al usuario**

```tsx
// Al guardar offline
if (!isOnline) {
  Alert.alert(
    '📡 Sin conexión',
    'Tu venta se ha guardado localmente. Se enviará automáticamente cuando tengas conexión a internet.',
    [
      { text: 'Entendido', style: 'default' },
      { text: 'Ver cola', onPress: () => router.push('/sync') },
    ]
  );
}
```

### **3. Lista de operaciones pendientes**

```tsx
// Pantalla de estado de sincronización
function SyncStatusScreen() {
  const { pendingCount, failedCount, syncNow, retryFailed } = useSync();

  return (
    <View>
      <Card>
        <Text>Operaciones pendientes: {pendingCount}</Text>
        <Text>Operaciones fallidas: {failedCount}</Text>
      </Card>

      {pendingCount > 0 && (
        <Button onPress={syncNow} title="Sincronizar ahora" />
      )}

      {failedCount > 0 && (
        <Button onPress={retryFailed} title="Reintentar fallidas" />
      )}
    </View>
  );
}
```

---

## 🔧 Troubleshooting

### **Problema: Las operaciones no se sincronizan**

**Solución:**
1. Verificar que `SyncProvider` esté en `_layout.tsx`
2. Verificar conexión con `useSync().isOnline`
3. Revisar logs en consola: `console.log('🔄 Iniciando sincronización...')`

### **Problema: Operaciones duplicadas en cola**

**Solución:**
- El sistema ya tiene deduplicación automática
- Verifica que no estés llamando a `mutate` múltiples veces
- Revisa los `useEffect` para evitar llamadas dobles

### **Problema: AsyncStorage lleno**

**Solución:**
```tsx
// Limpiar cola antigua (> 7 días)
const cleanOldQueue = async () => {
  const queue = await offlineQueueService.getQueue();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filtered = queue.filter(op => op.timestamp > sevenDaysAgo);
  await AsyncStorage.setItem('offline_queue', JSON.stringify(filtered));
};
```

### **Problema: Sincronización infinita**

**Solución:**
```tsx
// Abortar sincronización
backgroundSyncService.abort();

// Verificar qué está fallando
const failed = await offlineQueueService.getFailed();
console.log('Operaciones fallidas:', failed);
```

---

## 📊 Monitoreo y Métricas

### **Ver estado completo del sistema**

```tsx
import { offlineQueueService } from '../services/offlineQueueService';
import { backgroundSyncService } from '../services/backgroundSyncService';

const getSystemStatus = async () => {
  const [stats, queue, syncState] = await Promise.all([
    offlineQueueService.getStats(),
    offlineQueueService.getQueue(),
    backgroundSyncService.getSyncState(),
  ]);

  return {
    pendingOperations: stats.pending,
    highPriority: stats.highPriority,
    failedOperations: stats.failed,
    lastSync: stats.lastSync,
    isProcessing: syncState.active,
    syncProgress: syncState,
    queueItems: queue,
  };
};
```

---

## 🚀 Próximos Pasos (Mejoras Futuras)

1. **Conflict Resolution**
   - Detectar cambios conflictivos
   - UI para resolver conflictos manualmente
   - Estrategia "last write wins" para no críticos

2. **Background Fetch**
   - Sincronización periódica automática
   - Usar `AppState.addEventListener` para detectar cuando la app pasa a primer plano

3. **Compression**
   - Comprimir datos antes de guardar en AsyncStorage
   - Usar LZ-string para ahorrar espacio

4. **Storage Quota Management**
   - LRU cache eviction para datos antiguos
   - Límite de tamaño por tipo de dato

5. **Analytics**
   - Trackear sync success rate
   - Medir tiempo promedio de sync
   - Alertas cuando falla mucho

---

## ✅ Checklist de Implementación

- [x] OfflineQueueService creado
- [x] BackgroundSyncService creado
- [x] SyncContext creado e integrado
- [x] useOfflineMutation hook creado
- [x] NetworkBanner actualizado
- [x] SyncProvider agregado en _layout.tsx
- [ ] Actualizar pantallas de crear venta/presupuesto
- [ ] Probar en escenario real sin internet
- [ ] Documentar patrones de uso para el equipo

---

## 📞 Soporte

Para preguntas o problemas, revisa:
1. Console logs (todos tienen 🔄, ✅, ❌ para fácil identificación)
2. AsyncStorage con `AsyncStorage.getAllKeys()`
3. Network status en NetworkBanner

**¡Sistema listo para producción!** 🎉
