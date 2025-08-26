// app/(tabs)/_layout.tsx - Mejorado para roles
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/design';

export default function TabLayout(): JSX.Element {
  const { user, loading } = useAuth();

  if (loading) {
    return <></>;
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Función para determinar si un tab debe mostrarse según el rol
  const shouldShowTab = (tabName: string): boolean => {
    switch (user.role) {
      case 'admin':
        return true; // Admin ve todos los tabs
        
      case 'manager':
        // Manager ve dashboard, clientes, ventas y reportes
        return ['index', 'customers', 'sales', 'reports'].includes(tabName);
        
      case 'company':
        // Company ve dashboard, productos, clientes, ventas y reportes
        return ['index', 'products', 'customers', 'sales', 'reports'].includes(tabName);
        
      case 'seller':
        // Seller ve dashboard, productos, clientes y ventas
        return ['index', 'products', 'customers', 'sales'].includes(tabName);
        
      default:
        return ['index'].includes(tabName); // Por defecto solo dashboard
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.tertiary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.gray[100],
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          href: shouldShowTab('index') ? '/index' : null,
        }}
      />
      
      <Tabs.Screen
        name="products"
        options={{
          title: 'Productos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
          href: shouldShowTab('products') ? '/products' : null,
        }}
      />
      
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          href: shouldShowTab('customers') ? '/customers' : null,
        }}
      />
      
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Ventas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
          href: shouldShowTab('sales') ? '/sales' : null,
        }}
      />
      
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
          href: shouldShowTab('reports') ? '/reports' : null,
        }}
      />
    </Tabs>
  );
}