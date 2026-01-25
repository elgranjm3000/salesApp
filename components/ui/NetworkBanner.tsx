/**
 * NetworkBanner - Banner de estado de red con sincronización funcional
 *
 * Muestra:
 * - Estado de conexión (online/offline)
 * - Operaciones pendientes de sincronizar
 * - Botón de sincronización manual
 * - Progreso de sincronización
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSync } from '../../context/SyncContext';
import { colors, spacing, typography } from '../../theme/design';

export const NetworkBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncProgress, syncNow } = useSync();
  const [bannerHeight] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const shouldShow = !isOnline || pendingCount > 0 || isSyncing;

    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);

      Animated.timing(bannerHeight, {
        toValue: shouldShow ? 60 : 0, // Aumentado a 60 para más espacio
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isOnline, pendingCount, isSyncing, isVisible]);

  const getBannerConfig = () => {
    if (!isOnline) {
      return {
        backgroundColor: colors.warning,
        icon: 'wifi-off' as keyof typeof Ionicons.glyphMap,
        text: 'Sin conexión - Modo offline activo',
        textColor: colors.text.inverse,
        showSync: false,
      };
    }

    if (isSyncing) {
      const { current, total } = syncProgress;
      return {
        backgroundColor: colors.info,
        icon: 'sync' as keyof typeof Ionicons.glyphMap,
        text: `Sincronizando... (${current}/${total})`,
        textColor: colors.text.inverse,
        showSync: false,
      };
    }

    if (pendingCount > 0) {
      return {
        backgroundColor: colors.primary[500],
        icon: 'cloud-upload' as keyof typeof Ionicons.glyphMap,
        text: `${pendingCount} operación${pendingCount > 1 ? 'es' : ''} pendiente${pendingCount > 1 ? 's' : ''}`,
        textColor: colors.text.inverse,
        showSync: true,
      };
    }

    return null;
  };

  const handleSync = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Error al sincronizar:', error);
    }
  };

  const bannerConfig = getBannerConfig();

  if (!bannerConfig) return null;

  // Animar icono si está sincronizando
  const IconComponent = isSyncing ? Animated.createAnimatedComponent(Ionicons) : Ionicons;

  return (
    <Animated.View style={[styles.container, {
      height: bannerHeight,
      backgroundColor: bannerConfig.backgroundColor
    }]}>
      <View style={styles.content}>
        <IconComponent
          name={bannerConfig.icon}
          size={18}
          color={bannerConfig.textColor}
          style={isSyncing && styles.spinningIcon}
        />
        <Text style={[styles.text, { color: bannerConfig.textColor }]}>
          {bannerConfig.text}
        </Text>

        {bannerConfig.showSync && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            activeOpacity={0.7}
          >
            <Text style={styles.syncButtonText}>Sincronizar</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    height: 60,
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.sm,
    flex: 1,
    textAlign: 'center',
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  syncButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  spinningIcon: {
    // Animación de rotación podría agregarse aquí
  },
});