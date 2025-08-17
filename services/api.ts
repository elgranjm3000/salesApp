import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Category,
  Customer,
  DashboardData,
  PaginatedResponse,
  Product,
  Sale,
  SyncResponse,
  User
} from '../types';

const BASE_URL = 'http://192.168.10.105/sales-api/public/api'; // Cambiar por tu IP

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
  token_type: string;
}

interface CreateSaleData {
  customer_id: number;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
    discount?: number;
  }[];
  payment_method: 'cash' | 'card' | 'transfer' | 'credit';
  discount?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await AsyncStorage.multiRemove(['token', 'user']);
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response: AxiosResponse<LoginResponse> = await this.client.post('/auth/login', credentials);
      console.log("Login successful");
      return response.data;
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async me(): Promise<User> {
    const response: AxiosResponse<User> = await this.client.get('/auth/me');
    return response.data;
  }

  async refresh(): Promise<{ token: string }> {
    const response: AxiosResponse<{ token: string }> = await this.client.post('/auth/refresh');
    return response.data;
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    const response: AxiosResponse<DashboardData> = await this.client.get('/dashboard');
    return response.data;
  }

  async getReports(): Promise<any> {
    const response: AxiosResponse<any> = await this.client.get('/reports');
    return response.data;
  }

  // Products
  async getProducts(params?: {
    search?: string;
    category_id?: number;
    low_stock?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Product>> {
    const response: AxiosResponse<PaginatedResponse<Product>> = await this.client.get('/products', { params });
    return response.data;
  }

  async getProduct(id: number): Promise<Product> {
    const response: AxiosResponse<Product> = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: FormData | Partial<Product>): Promise<Product> {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response: AxiosResponse<Product> = await this.client.post('/products', data, { headers });
    return response.data;
  }

  async updateProduct(id: number, data: FormData | Partial<Product>): Promise<Product> {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const response: AxiosResponse<Product> = await this.client.put(`/products/${id}`, data, { headers });
    return response.data;
  }

  async deleteProduct(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.delete(`/products/${id}`);
    return response.data;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    const response: AxiosResponse<Category[]> = await this.client.get('/categories');
    return response.data;
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    const response: AxiosResponse<Category> = await this.client.post('/categories', data);
    return response.data;
  }

  // Customers
  async getCustomers(params?: {
    search?: string;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Customer>> {
    const response: AxiosResponse<PaginatedResponse<Customer>> = await this.client.get('/customers', { params });
    return response.data;
  }

  async getCustomer(id: number): Promise<Customer> {
    const response: AxiosResponse<Customer> = await this.client.get(`/customers/${id}`);
    return response.data;
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response: AxiosResponse<Customer> = await this.client.post('/customers', data);
    return response.data;
  }

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
    const response: AxiosResponse<Customer> = await this.client.put(`/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.delete(`/customers/${id}`);
    return response.data;
  }

  // Sales
  async getSales(params?: {
    status?: 'pending' | 'completed' | 'cancelled';
    date_from?: string;
    date_to?: string;
    user_id?: number;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Sale>> {
    const response: AxiosResponse<PaginatedResponse<Sale>> = await this.client.get('/sales', { params });
    return response.data;
  }

  async getSale(id: number): Promise<Sale> {
    const response: AxiosResponse<Sale> = await this.client.get(`/sales/${id}`);
    return response.data;
  }

  async createSale(data: CreateSaleData): Promise<Sale> {
    const response: AxiosResponse<Sale> = await this.client.post('/sales', data);
    return response.data;
  }

  async updateSale(id: number, data: {
    status?: 'pending' | 'completed' | 'cancelled';
    payment_status?: 'pending' | 'paid' | 'partial';
    notes?: string;
  }): Promise<Sale> {
    const response: AxiosResponse<Sale> = await this.client.put(`/sales/${id}`, data);
    return response.data;
  }

  // Sync methods
  async syncProducts(lastSync?: string): Promise<SyncResponse> {
    const headers = lastSync ? { 'Last-Sync': lastSync } : {};
    const response: AxiosResponse<SyncResponse> = await this.client.get('/sync/products', { headers });
    return response.data;
  }

  async syncCustomers(lastSync?: string): Promise<SyncResponse> {
    const headers = lastSync ? { 'Last-Sync': lastSync } : {};
    const response: AxiosResponse<SyncResponse> = await this.client.get('/sync/customers', { headers });
    return response.data;
  }

  async syncSales(sales: {
    offline_id: string;
    customer_id: number;
    items: any[];
    subtotal: number;
    tax: number;
    total: number;
    payment_method?: string;
    sale_date?: string;
    notes?: string;
  }[]): Promise<SyncResponse> {
    const response: AxiosResponse<SyncResponse> = await this.client.post('/sync/sales', { sales });
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const api = new ApiService();