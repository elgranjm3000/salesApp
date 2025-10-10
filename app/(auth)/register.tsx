// app/(auth)/register.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { borderRadius, colors, spacing, typography } from '../../theme/design';

type Step = 1 | 2 | 3 | 4;

interface CompanyData {
  company_id?: number;
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  license?: string;
  rif?: string;
}

interface RifType {
  id: string;
  label: string;
}

// Tipos de RIF disponibles
const RIF_TYPES: RifType[] = [
  { id: 'V', label: 'V - Venezolano' },
  { id: 'E', label: 'E - Extranjero' },
  { id: 'J', label: 'J - Jurídico' },
  { id: 'G', label: 'G - Gubernamental' }
];

export default function RegisterScreen(): JSX.Element {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Email y RIF
  const [email, setEmail] = useState('');
  const [rifType, setRifType] = useState('');
  const [rifNumber, setRifNumber] = useState('');
  const [showRifPicker, setShowRifPicker] = useState(false);
  
  // Step 2: Datos de la empresa encontrada
  const [companyData, setCompanyData] = useState<CompanyData>({});
  
  // Step 3: Código de validación
  const [validationCode, setValidationCode] = useState('');
  
  // Step 4: Datos del usuario
  const [userData, setUserData] = useState({
    password: '',
    password_confirmation: '',
    validation_token: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearErrors = () => setErrors({});

  // PASO 1: Verificar información de la empresa
  const handleCheckCompanyInfo = async (): Promise<void> => {
    clearErrors();
    
    if (!email.trim()) {
      setErrors({ email: 'El email es requerido' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Ingresa un email válido' });
      return;
    }
    
    if (!rifType) {
      setErrors({ rif: 'Seleccione el tipo de Rif' });
      return;
    }
    
    if (!rifNumber.trim()) {
      setErrors({ rif: 'Ingrese el número de Rif' });
      return;
    }

    const fullRif = `${rifType}${rifNumber}`;

    try {
      setLoading(true);
      const response = await api.checkCompanyInfo({ email: email.trim(), rif: fullRif });
      
      if (response.success) {
        setCompanyData(response.data);
        setCurrentStep(2);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al verificar la información';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'COMPANY_NOT_FOUND') {
        Alert.alert(
          'Empresa no encontrada',
          'Comuníquese con el call center para registrar su empresa',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },    
            {
              text: 'WhatsApp',
              onPress: () => Linking.openURL('https://wa.me/584142441226')
            }
          ]
        );
      } else if (errorCode === 'COMPANY_ALREADY_HAS_USER') {
        Alert.alert('Empresa ya registrada', 'Esta empresa ya tiene un usuario registrado en el sistema');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // PASO 2: Confirmar registro de empresa
  const handleConfirmRegistration = async (confirm: boolean): Promise<void> => {
    if (!confirm) {
      router.replace('/(auth)/login');
      return;
    }

    try {
      setLoading(true);
      const response = await api.confirmCompanyRegistration({
        company_id: companyData.company_id!,
        confirm: true
      });
      
      if (response.success) {
        Alert.alert(
          'Código enviado',
          `Se ha enviado un código de validación a ${response.data.email}`,
          [{ text: 'OK', onPress: () => setCurrentStep(3) }]
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al enviar el código';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // PASO 3: Validar código
  const handleValidateCode = async (): Promise<void> => {
    clearErrors();
    
    if (!validationCode.trim()) {
      setErrors({ validationCode: 'El código de validación es requerido' });
      return;
    }
    
    if (validationCode.length !== 6) {
      setErrors({ validationCode: 'El código debe tener exactamente 6 caracteres' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.validateCompanyCode({
        company_id: companyData.company_id!,
        email: email,
        validation_code: validationCode
      });
      
      if (response.success) {
        setUserData(prev => ({ ...prev, validation_token: response.data.validation_token }));
        Alert.alert(
          'Código validado',
          'Ahora puede crear su clave de acceso',
          [{ text: 'Continuar', onPress: () => setCurrentStep(4) }]
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al validar el código';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'EMAIL_MISMATCH') {
        Alert.alert('Error', 'El correo no coincide con el de la empresa');
      } else if (errorCode === 'INVALID_CODE') {
        Alert.alert('Código inválido', 'El código de validación es inválido o ha expirado');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // PASO 4: Completar registro
  const handleCompleteRegistration = async (): Promise<void> => {
    clearErrors();
    const newErrors: Record<string, string> = {};

    if (!userData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (userData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (!userData.password_confirmation) {
      newErrors.password_confirmation = 'Confirma tu contraseña';
    } else if (userData.password !== userData.password_confirmation) {
      newErrors.password_confirmation = 'Las contraseñas no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      const response = await api.completeCompanyRegistration({
        validation_token: userData.validation_token,
        company_id: companyData.company_id!,
        email: email,
        password: userData.password,
        password_confirmation: userData.password_confirmation,
      });
      
      if (response.success) {
        Alert.alert(
          'Registro Exitoso',
          'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al completar el registro';
      const errorCode = error.response?.data?.code;
      
      if (errorCode === 'INVALID_TOKEN') {
        Alert.alert('Sesión expirada', 'El token de validación ha expirado. Inicie el proceso nuevamente.');
        setCurrentStep(1);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Componente para selector de tipo de RIF
  const renderRifPicker = () => (
    <Modal
      visible={showRifPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRifPicker(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowRifPicker(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Seleccione tipo de Rif</Text>
            <TouchableOpacity onPress={() => setShowRifPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={RIF_TYPES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  setRifType(item.id);
                  setShowRifPicker(false);
                  clearErrors();
                }}
              >
                <Text style={styles.pickerItemText}>{item.label}</Text>
                {rifType === item.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary[500]} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderStep1 = () => (
    <View style={styles.formContent}>
      <Text style={styles.sectionSubtitle}>
        Ingrese su email y Rif para validar que su empresa esté registrada en el sistema
      </Text>
      
      <Input
        label="Email *"
        placeholder="tu@empresa.com"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        leftIcon={<Ionicons name="mail" size={20} color={colors.text.tertiary} />}
      />

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Rif *</Text>
        
        <View style={styles.rifContainer}>
          <TouchableOpacity
            style={[styles.rifTypeButton, errors.rif && styles.rifTypeButtonError]}
            onPress={() => setShowRifPicker(true)}
          >
            <Text style={[styles.rifTypeText, !rifType && styles.rifTypePlaceholder]}>
              {rifType || 'Tipo'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.text.secondary} />
          </TouchableOpacity>

          <Input
            placeholder="123456789"
            value={rifNumber}
            onChangeText={setRifNumber}
            keyboardType="default"
            style={styles.rifNumberInput}
          />
        </View>
        {errors.rif && <Text style={styles.inputError}>{errors.rif}</Text>}
      </View>

      <Button
        title="Validar Empresa"
        onPress={handleCheckCompanyInfo}
        loading={loading}
        style={styles.actionButton}
      />
      
      {renderRifPicker()}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.formContent}>
      <Text style={styles.sectionSubtitle}>
        Se encontró la siguiente información de su empresa:
      </Text>
      
      <View style={styles.companyInfo}>
        <View style={styles.infoRowColumn}>
          <View style={styles.infoHeader}>
            <Ionicons name="business" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Nombre de la empresa:</Text>
          </View>
          <Text style={styles.infoValue}>{companyData.name}</Text>
        </View>
        
        <View style={styles.infoRowColumn}>
          <View style={styles.infoHeader}>
            <Ionicons name="mail" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Email:</Text>            
          </View>
          <Text style={styles.infoValue}>{companyData.email}</Text>
        </View>
        
        <View style={styles.infoRowColumn}>
          <View style={styles.infoHeader}>
            <Ionicons name="call" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Teléfono:</Text>
          </View>
          <Text style={styles.infoValue}>{companyData.phone}</Text>
        </View>
        
        <View style={styles.infoRowColumn}>
          <View style={styles.infoHeader}>
            <Ionicons name="location" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Dirección:</Text>
          </View>
          <Text style={styles.infoValue}>{companyData.address}</Text>
        </View>
        
        <View style={styles.infoRowColumn}>
          <View style={styles.infoHeader}>
            <Ionicons name="card" size={20} color={colors.text.secondary} />
            <Text style={styles.infoLabel}>Rif:</Text>
          </View>
          <Text style={styles.infoValue}>{companyData.rif}</Text>
        </View>
      </View>

      <Text style={styles.confirmQuestion}>¿Desea registrar esta compañía?</Text>
      
      <View style={styles.buttonRow}>
        <Button
          title="Sí, Continuar"
          onPress={() => handleConfirmRegistration(true)}
          loading={loading}
          style={[styles.actionButton, { flex: 1, marginRight: spacing.sm }]}
        />
        <Button
          title="No, Cancelar"
          onPress={() => handleConfirmRegistration(false)}
          variant="outline"
          style={[styles.actionButton, { flex: 1, marginLeft: spacing.sm }]}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.formContent}>
      <Text style={styles.sectionSubtitle}>
        Hemos enviado un código de 6 dígitos a su correo electrónico. Ingrese el código para continuar.
      </Text>
      
      <Input
        label="Código de Validación *"
        placeholder="123456"
        value={validationCode}
        onChangeText={setValidationCode}
        error={errors.validationCode}
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
        leftIcon={<Ionicons name="shield-checkmark" size={20} color={colors.text.tertiary} />}
      />

      <Text style={styles.codeInfo}>
        <Ionicons name="time" size={16} color={colors.text.secondary} />
        {' '}El código expira en 15 minutos
      </Text>

      <Button
        title="Validar Código"
        onPress={handleValidateCode}
        loading={loading}
        style={styles.actionButton}
      />
      
      <TouchableOpacity 
        onPress={() => setCurrentStep(1)}
        style={styles.backLink}
      >
        <Text style={styles.backLinkText}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.formContent}>
      <Text style={styles.sectionSubtitle}>
        Complete la información para crear su contraseña y finalizar su registro
      </Text>      

      <Input
        label="Contraseña *"
        placeholder="Mínimo 8 caracteres"
        value={userData.password}
        onChangeText={(value) => setUserData(prev => ({ ...prev, password: value }))}
        error={errors.password}
        secureTextEntry
        leftIcon={<Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />}
      />

      <Input
        label="Confirmar Contraseña *"
        placeholder="Repite tu contraseña"
        value={userData.password_confirmation}
        onChangeText={(value) => setUserData(prev => ({ ...prev, password_confirmation: value }))}
        error={errors.password_confirmation}
        secureTextEntry
        leftIcon={<Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />}
      />

      <Button
        title="Aceptar"
        onPress={handleCompleteRegistration}
        loading={loading}
        style={styles.actionButton}
      />
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            step <= currentStep && styles.stepCircleActive,
            step < currentStep && styles.stepCircleCompleted
          ]}>
            {step < currentStep ? (
              <Ionicons name="checkmark" size={16} color="white" />
            ) : (
              <Text style={[
                styles.stepNumber,
                step <= currentStep && styles.stepNumberActive
              ]}>{step}</Text>
            )}
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              step < currentStep && styles.stepLineCompleted
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Validar Empresa';
      case 2: return 'Confirmar Datos';
      case 3: return 'Código de Validación';
      case 4: return 'Crear Contraseña';
      default: return 'Registro';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={32} color={colors.primary[500]} />
          </View>
          <Text style={styles.subtitle}>Registro de Empresa</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStepIndicator()}
        
        {/* Título del paso - SIN bordes/card */}
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>{getStepTitle()}</Text>
        </View>
        
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    paddingTop: 25,
    paddingLeft: 15,
    alignSelf: 'flex-start',
    padding: spacing.xs,
    
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize['2xl'],
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray[300],
  },
  stepCircleActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  stepCircleCompleted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  stepNumberActive: {
    color: 'white',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.xs,
  },
  stepLineCompleted: {
    backgroundColor: colors.success,
  },
  // Título del paso - sin bordes ni card
  stepTitleContainer: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  stepTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  formContent: {
    // Sin card, sin bordes, sin padding extra
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  inputError: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  // Estilos para el selector de RIF
  rifContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rifTypeButton: {
    width: 80,
    height: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  rifTypeButtonError: {
    borderColor: colors.error,
  },
  rifTypeText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  rifTypePlaceholder: {
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.normal,
  },
  rifNumberInput: {
    flex: 1,
    marginLeft: 0, 
  },
  // Modal para selector de RIF
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 50,
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '50%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  pickerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    
  },
  pickerItemText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  companyInfo: {
    backgroundColor: colors.gray[50],
    padding: spacing.xs,
    borderRadius: borderRadius.md,
   
  },
  infoRowColumn: {
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginLeft: spacing.sm + 20,
  },
  confirmQuestion: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    marginTop: spacing.sm,
  },
  codeInfo: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  backLink: {
    alignSelf: 'center',
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  backLinkText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing.xl,
  },
});