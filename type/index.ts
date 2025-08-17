export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'seller' | 'manager';
  status: 'active' | 'inactive';
  phone?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  code: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  min_stock: number;
  image?: string;
  category_id: number;
  category?: Category;
  status: 'active' | 'inactive';
  barcode?: string;
  weight?: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
}

export interface Sale {
  id: number;
  sale_number: string;
  customer_id: number;
  customer?: Customer;
  user_id: number;
  user?: User;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'card' | 'transfer' | 'credit';
  payment_status: 'pending' | 'paid' | 'partial';
  notes?: string;
  sale_date: string;
  items?: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  today_sales: number;
  month_sales: number;
  low_stock_products: number;
  total_customers: number;
}

export interface SalesChart {
  date: string;
  day: string;
  total: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recent_sales: Sale[];
  sales_chart: SalesChart[];
  top_products?: Product[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}