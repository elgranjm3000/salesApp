import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isBiometricSupported: boolean;
  isBiometricEnabled: boolean;
}

type AuthAction =
  | { type: 'LOADING' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_TOKEN'; payload: { user: User; token: string } }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_BIOMETRIC_SUPPORT'; payload: { isSupported: boolean; isEnabled: boolean } }
  | { type: 'ENABLE_BIOMETRIC' }
  | { type: 'DISABLE_BIOMETRIC' };

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithBiometric: () => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshToken: () => Promise<void>;
  enableBiometric: () => Promise<{ success: boolean; message?: string }>;
  disableBiometric: () => Promise<void>;
  checkBiometricSupport: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialState: AuthState = {
  user: null,
  token: null,
  loading: true,
  error: null,
  isBiometricSupported: false,
  isBiometricEnabled: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      // NO cambiar isBiometricEnabled aquí - mantener configuración
      return {
        ...state,
        user: null,
        token: null,
        loading: false,
        error: null,
      };
    case 'RESTORE_TOKEN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_BIOMETRIC_SUPPORT':
      return {
        ...state,
        isBiometricSupported: action.payload.isSupported,
        isBiometricEnabled: action.payload.isEnabled,
      };
    case 'ENABLE_BIOMETRIC':
      return {
        ...state,
        isBiometricEnabled: true,
      };
    case 'DISABLE_BIOMETRIC':
      return {
        ...state,
        isBiometricEnabled: false,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async (): Promise<void> => {
    await checkBiometricSupport();
    await restoreToken();
  };

  const checkBiometricSupport = async (): Promise<void> => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const biometricEnabled = await AsyncStorage.getItem('biometric_enabled') === 'true';
      
      console.log('Biometric check:', { compatible, enrolled, biometricEnabled });
      
      dispatch({
        type: 'SET_BIOMETRIC_SUPPORT',
        payload: {
          isSupported: compatible && enrolled,
          isEnabled: biometricEnabled && compatible && enrolled,
        }
      });
    } catch (error) {
      console.error('Error checking biometric support:', error);
      dispatch({
        type: 'SET_BIOMETRIC_SUPPORT',
        payload: { isSupported: false, isEnabled: false }
      });
    }
  };

  const restoreToken = async (): Promise<void> => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userString = await AsyncStorage.getItem('user');
      
      if (token && userString) {
        const user: User = JSON.parse(userString);
        
        // Verificar que el token siga siendo válido
        try {
          const currentUser = await api.me();
          dispatch({
            type: 'RESTORE_TOKEN',
            payload: { token, user: currentUser },
          });
          
          // Actualizar datos del usuario en storage
          await AsyncStorage.setItem('user', JSON.stringify(currentUser));
        } catch (error) {
          // Token expirado o inválido
          await AsyncStorage.multiRemove(['token', 'user']);
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('Error restoring token:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      dispatch({ type: 'LOADING' });
      
      const response = await api.login({ email, password });
      
      // Adaptarse a diferentes estructuras de respuesta
      const userData = response.data?.user || response.user;
      const tokenData = response.data?.token || response.token;

      if (!userData || !tokenData) {
        throw new Error('Datos de respuesta inválidos');
      }

      // Guardar credenciales para biometría
      await AsyncStorage.multiSet([
        ['token', tokenData],
        ['user', JSON.stringify(userData)],
        ['user_credentials', JSON.stringify({ email, password })] // Para biometría
      ]);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: userData, token: tokenData },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Error de login';
      dispatch({
        type: 'LOGIN_ERROR',
        payload: message,
      });
      return { success: false, message };
    }
  };

  const loginWithBiometric = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('Attempting biometric login...', { 
        supported: state.isBiometricSupported, 
        enabled: state.isBiometricEnabled 
      });

      if (!state.isBiometricSupported) {
        return { success: false, message: 'Biometría no disponible en este dispositivo' };
      }

      if (!state.isBiometricEnabled) {
        return { success: false, message: 'Biometría no activada' };
      }

      // Verificar que tengamos credenciales guardadas antes de mostrar biometría
      const credentialsStr = await AsyncStorage.getItem('user_credentials');
      if (!credentialsStr) {
        return { success: false, message: 'No hay credenciales guardadas' };
      }

      // Verificar biometría
      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Usar huella dactilar para iniciar sesión',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: false,
      });

      console.log('Biometric result:', biometricResult);

      if (!biometricResult.success) {
        if (biometricResult.error === 'UserCancel') {
          return { success: false, message: 'Autenticación cancelada' };
        }
        return { success: false, message: 'Autenticación biométrica fallida' };
      }

      const credentials = JSON.parse(credentialsStr);
      
      // Login normal con las credenciales guardadas
      return await login(credentials.email, credentials.password);
      
    } catch (error: any) {
      console.error('Biometric login error:', error);
      return { success: false, message: 'Error en autenticación biométrica' };
    }
  };

  const enableBiometric = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!state.isBiometricSupported) {
        return { success: false, message: 'Biometría no disponible en este dispositivo' };
      }

      const biometricResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirmar identidad para activar biometría',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Cancelar',
      });

      if (!biometricResult.success) {
        return { success: false, message: 'Autenticación biométrica fallida' };
      }

      await AsyncStorage.setItem('biometric_enabled', 'true');
      
      dispatch({ type: 'ENABLE_BIOMETRIC' });

      return { success: true, message: 'Biometría activada correctamente' };
      
    } catch (error: any) {
      console.error('Enable biometric error:', error);
      return { success: false, message: 'Error al activar biometría' };
    }
  };

  const disableBiometric = async (): Promise<void> => {
    await AsyncStorage.setItem('biometric_enabled', 'false');
    dispatch({ type: 'DISABLE_BIOMETRIC' });
  };

  const logout = async (): Promise<void> => {
    try {
      // Intentar hacer logout en el servidor
      await api.logout();
    } catch (error) {
      // Ignorar errores del logout del servidor
      console.log('Server logout error (ignored):', error);
    } finally {
      // Limpiar solo token y user, NO las credenciales biométricas ni configuración
      await AsyncStorage.multiRemove(['token', 'user']);
      // Mantener 'user_credentials' y 'biometric_enabled' para próximos logins
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateUser = (user: User): void => {
    dispatch({ type: 'UPDATE_USER', payload: user });
    AsyncStorage.setItem('user', JSON.stringify(user));
  };

  const refreshToken = async (): Promise<void> => {
    try {
      const response = await api.refresh();
      const newToken = response.token;
      
      await AsyncStorage.setItem('token', newToken);
      
      if (state.user) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: state.user, token: newToken },
        });
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await logout();
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithBiometric,
    logout,
    updateUser,
    refreshToken,
    enableBiometric,
    disableBiometric,
    checkBiometricSupport,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};