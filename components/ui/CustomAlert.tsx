// components/ui/CustomAlert.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../theme/design';

interface CustomAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  buttons?: CustomAlertButton[];
  onClose: () => void;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  icon = 'alert-circle',
  iconColor = colors.error,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
}) => {
  const handleButtonPress = (button: CustomAlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.alertContainer}>
            {/* Icono */}
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name={icon as any} size={48} color={iconColor} />
            </View>

            {/* Título */}
            <Text style={styles.title}>{title}</Text>

            {/* Mensaje */}
            <Text style={styles.message}>{message}</Text>

            {/* Botones */}
            <View style={styles.buttonsContainer}>
              {buttons.map((button, index) => {
                const isCancel = button.style === 'cancel';
                const isDestructive = button.style === 'destructive';
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isCancel && styles.buttonCancel,
                      buttons.length === 1 && styles.buttonSingle,
                    ]}
                    onPress={() => handleButtonPress(button)}
                  >
                    <Text style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                    ]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Hook personalizado para usar el CustomAlert más fácilmente
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: string;
    iconColor?: string;
    buttons?: CustomAlertButton[];
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (config: Omit<typeof alertConfig, 'visible'>) => {
    setAlertConfig({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      icon={alertConfig.icon}
      iconColor={alertConfig.iconColor}
      buttons={alertConfig.buttons}
      onClose={hideAlert}
    />
  );

  return {
    showAlert,
    hideAlert,
    AlertComponent,
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  alertContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: colors.gray[100],
  },
  buttonSingle: {
    flex: 1,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.inverse,
  },
  buttonTextCancel: {
    color: colors.text.primary,
  },
  buttonTextDestructive: {
    color: colors.error,
  },
});