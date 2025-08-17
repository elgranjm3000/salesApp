import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  Customer,
  DashboardData,
  PaginatedResponse,
  Product,
  Sale,
  User
} from '../type';

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
    console.log("status"); // Esto se imprimirá solo si no hay error
    return response.data;
  } catch (error) {
    console.error("Error en login:", error);
    throw error; // o maneja el error como prefieras
  }
}

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async me(): Promise<User> {
    const response: AxiosResponse<User> = await this.client.get('/auth/me');
    return response.data;
  }

  // Dashboard
  async getDashboard(): Promise<DashboardData> {
    const response: AxiosResponse<DashboardData> = await this.client.get('/dashboard');
    return response.data;
  }

  // Products
  async getProducts(params?: Record<string, any>): Promise<PaginatedResponse<Product>> {
    const response: AxiosResponse<PaginatedResponse<Product>> = await this.client.get('/products', { params });
    return response.data;
  }

  async getProduct(id: number): Promise<Product> {
    const response: AxiosResponse<Product> = await this.client.get(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response: AxiosResponse<Product> = await this.client.post('/products', data);
    return response.data;
  }

  async updateProduct(id: number, data: Partial<Product>): Promise<Product> {
    const response: AxiosResponse<Product> = await this.client.put(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: number): Promise<void> {
    await this.client.delete(`/products/${id}`);
  }

  // Customers
  async getCustomers(params?: Record<string, any>): Promise<PaginatedResponse<Customer>> {
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

  async deleteCustomer(id: number): Promise<void> {
    await this.client.delete(`/customers/${id}`);
  }

  // Sales
  async getSales(params?: Record<string, any>): Promise<PaginatedResponse<Sale>> {
    const response: AxiosResponse<PaginatedResponse<Sale>> = await this.client.get('/sales', { params });
    return response.data;
  }

  async getSale(id: number): Promise<Sale> {
    const response: AxiosResponse<Sale> = await this.client.get(`/sales/${id}`);
    return response.data;
  }

  async createSale(data: Partial<Sale>): Promise<Sale> {
    const response: AxiosResponse<Sale> = await this.client.post('/sales', data);
    return response.data;
  }

  async updateSale(id: number, data: Partial<Sale>): Promise<Sale> {
    const response: AxiosResponse<Sale> = await this.client.put(`/sales/${id}`, data);
    return response.data;
  }
}

export const api = new ApiService();