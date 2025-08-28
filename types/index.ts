export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'seller' | 'manager' | 'company'; // Agregado 'company'
  status: 'active' | 'inactive';
  avatar?: string;
  email_verified_at?: string;
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
  images?: string[]; // JSON field
  category_id: number;
  category?: Category;
  status: 'active' | 'inactive';
  barcode?: string;
  weight?: number;
  attributes?: Record<string, any>; // JSON field
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
  latitude?: number;
  longitude?: number;
  status: 'active' | 'inactive';
  additional_info?: Record<string, any>; // JSON field
  sales_count?: number; // from withCount('sales')
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
  created_at: string;
  updated_at: string;
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
  metadata?: Record<string, any>; // JSON field
  items?: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  today_sales: number;
  month_sales: number;
  low_stock_products: number;
  total_customers: number;
  total_products?: number;
  pending_sales?: number;
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
  low_stock_products?: Product[];
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
  from: number;
  to: number;
  links: {
    first: string;
    last: string;
    prev?: string;
    next?: string;
  };
}

export interface SyncResponse {
  products?: Product[];
  customers?: Customer[];
  synced_sales?: {
    offline_id: string;
    server_id?: number;
    sale_number?: string;
    error?: string;
  }[];
  sync_time: string;
}