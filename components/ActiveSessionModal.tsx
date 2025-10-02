// components/ActiveSessionModal.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { colors, spacing, typography } from '../theme/design';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface ActiveSessionInfo {
  device_name: string;
  device_type: string;
  ip_address: string;
  last_activity: string;
  login_time: string;
}

interface ActiveSessionModalProps {
  visible: boolean;
  sessionInfo: ActiveSessionInfo | null;
  onForceLogin: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ActiveSessionModal({
  visible,
  sessionInfo,
  onForceLogin,
  onCancel,
  loading = false,
}: ActiveSessionModalProps): JSX.Element {
  if (!sessionInfo) return <></>;

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return 'phone-portrait';
      case 'tablet':
        return 'tablet-portrait';
      case 'web':
        return 'desktop';
      default:
        return 'hardware-chip';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Card style={styles.modal}>
          {/* Icono de advertencia */}
          <View style={styles.iconContainer}>
            <Ionicons name="warning" size={64} color={colors.warning} />
          </View>

          {/* Título */}
          <Text style={styles.title}>Sesión Activa Detectada</Text>
          
          {/* Descripción */}
          <Text style={styles.description}>
            Ya existe una sesión activa en otro dispositivo. Si continúa, la sesión anterior será cerrada automáticamente.
          </Text>

          {/* Información de la sesión activa */}
          <View style={styles.sessionInfo}>
            <View style={styles.infoRow}>
              <Ionicons 
                name={getDeviceIcon(sessionInfo.device_type)} 
                size={20} 
                color={colors.text.secondary} 
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Dispositivo</Text>
                <Text style={styles.infoValue}>{sessionInfo.device_name}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Dirección IP</Text>
                <Text style={styles.infoValue}>{sessionInfo.ip_address}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Última actividad</Text>
                <Text style={styles.infoValue}>
                  {formatDate(sessionInfo.last_activity)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={20} color={colors.text.secondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Inicio de sesión</Text>
                <Text style={styles.infoValue}>
                  {formatDate(sessionInfo.login_time)}
                </Text>
              </View>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.buttonContainer}>
            <Button
              title="Cerrar sesión anterior"
              onPress={onForceLogin}
              loading={loading}
              style={styles.forceButton}
            />
            
            <TouchableOpacity 
              onPress={onCancel}
              style={styles.cancelButton}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* Advertencia de seguridad */}
          <View style={styles.securityWarning}>
            <Ionicons name="shield-checkmark" size={16} color={colors.text.secondary} />
            <Text style={styles.securityWarningText}>
              Si no reconoce este dispositivo, le recomendamos cambiar su contraseña
            </Text>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  sessionInfo: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  buttonContainer: {
    gap: spacing.md,
  },
  forceButton: {
    backgroundColor: colors.warning,
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semibold,
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  securityWarningText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flex: 1,
    textAlign: 'center',
  },
});