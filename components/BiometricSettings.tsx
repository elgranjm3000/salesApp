// components/BiometricSettings.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme/design';

export function BiometricSettings(): JSX.Element {
  const { 
    isBiometricSupported, 
    isBiometricEnabled, 
    enableBiometric, 
    disableBiometric 
  } = useAuth();
  
  const [loading, setLoading] = useState(false);

  const handleToggleBiometric = async (value: boolean): Promise<void> => {
    if (loading) return;

    setLoading(true);

    if (value) {
      const result = await enableBiometric();
      
      if (!result.success) {
        Alert.alert('Error', result.message || 'No se pudo activar la biometría');
      } else {
        Alert.alert('¡Listo!', 'Huella dactilar activada correctamente');
      }
    } else {
      Alert.alert(
        'Desactivar Biometría',
        '¿Estás seguro de que deseas desactivar la autenticación con huella dactilar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desactivar',
            style: 'destructive',
            onPress: () => disableBiometric(),
          },
        ]
      );
    }

    setLoading(false);
  };

  if (!isBiometricSupported) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={styles.iconContainer}>
            <Ionicons name="finger-print" size={24} color={colors.gray[400]} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Huella Dactilar</Text>
            <Text style={styles.subtitle}>
              No disponible en este dispositivo
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleToggleBiometric(!isBiometricEnabled)}
        disabled={loading}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="finger-print" 
            size={24} 
            color={isBiometricEnabled ? colors.primary[500] : colors.gray[400]} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Huella Dactilar</Text>
          <Text style={styles.subtitle}>
            {isBiometricEnabled 
              ? 'Iniciación de sesión rápida activada'
              : 'Activa para iniciar sesión más rápido'
            }
          </Text>
        </View>
        <Switch
          value={isBiometricEnabled}
          onValueChange={handleToggleBiometric}
          disabled={loading}
          trackColor={{
            false: colors.gray[300],
            true: colors.primary[200],
          }}
          thumbColor={isBiometricEnabled ? colors.primary[500] : colors.gray[400]}
        />
      </TouchableOpacity>

      {isBiometricEnabled && (
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={16} color={colors.text.secondary} />
          <Text style={styles.infoText}>
            Tu huella dactilar se usa solo para acceder a esta aplicación. 
            No se comparte ni almacena en nuestros servidores.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: 8,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
});