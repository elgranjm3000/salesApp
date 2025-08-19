import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { colors, spacing, typography } from '../../theme/design';
import StorageService from '../../utils/storage';

export const NetworkBanner: React.FC = () => {
  const networkStatus = useNetworkStatus();
  const [offlineSalesCount, setOfflineSalesCount] = useState(0);
  const [bannerHeight] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    loadOfflineSalesCount();
  }, []);

  useEffect(() => {
    const shouldShow = !networkStatus.isConnected || offlineSalesCount > 0;
    
    if (shouldShow !== isVisible) {
      setIsVisible(shouldShow);
      
      Animated.timing(bannerHeight, {
        toValue: shouldShow ? 50 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [networkStatus.isConnected, offlineSalesCount, isVisible]);

  const loadOfflineSalesCount = async () => {
    try {
      const sales = await StorageService.getOfflineSales();
      setOfflineSalesCount(sales.length);
    } catch (error) {
      console.error('Error loading offline sales count:', error);
    }
  };

  const getBannerConfig = () => {
    if (!networkStatus.isConnected) {
      return {
        backgroundColor: colors.warning,
        icon: 'wifi-off' as keyof typeof Ionicons.glyphMap,
        text: 'Sin conexión - Modo offline activo',
        textColor: colors.text.inverse,
      };
    }
    
    if (offlineSalesCount > 0) {
      return {
        backgroundColor: colors.info,
        icon: 'cloud-upload' as keyof typeof Ionicons.glyphMap,
        text: `${offlineSalesCount} venta${offlineSalesCount > 1 ? 's' : ''} pendiente${offlineSalesCount > 1 ? 's' : ''} de sincronizar`,
        textColor: colors.text.inverse,
      };
    }

    return null;
  };

  const bannerConfig = getBannerConfig();

  if (!bannerConfig) return null;

  return (
    <Animated.View style={[styles.container, { 
      height: bannerHeight,
      backgroundColor: bannerConfig.backgroundColor 
    }]}>
      <View style={styles.content}>
        <Ionicons 
          name={bannerConfig.icon} 
          size={16} 
          color={bannerConfig.textColor} 
        />
        <Text style={[styles.text, { color: bannerConfig.textColor }]}>
          {bannerConfig.text}
        </Text>
        
        {offlineSalesCount > 0 && networkStatus.isConnected && (
          <TouchableOpacity 
            style={styles.syncButton}
            onPress={() => {
              // Aquí puedes implementar la lógica de sincronización
              console.log('Sync offline sales');
            }}
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
    height: 50,
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
});