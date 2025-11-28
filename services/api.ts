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
//ssh -R 80:localhost:80 ssh.serveo.net hace la ip publica
// npx expo start --tunnel --clear para que ve la app
// cloudflared tunnel --url http://localhost:80
const BASE_URL = 'https://chrystal.com.ve/chrystalmobile.chrystal.com.ve/public/api'; // Cambiar por tu IP
//const BASE_URL = 'https://maritime-buyers-network-singh.trycloudflare.com/sales-api/public/api'; // Cambiar por tu IP

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginCredentialsWithDevice extends LoginCredentials {
  device_name?: string;
  device_type?: 'web' | 'mobile' | 'tablet';
  force_logout?: boolean;
}

interface LoginResponse {
  user: User;
  token: string;
  token_type: string;
}

// Interfaces para el nuevo flujo de registro de empresa
interface CheckCompanyInfoRequest {
  email: string;
  rif: string;
}

interface CheckCompanyInfoResponse {
  success: boolean;
  message: string;
  data: {
    company_id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    contact: string;
    license: string;
    rif: string;
  };
  question: string;
}

interface ConfirmCompanyRegistrationRequest {
  company_id: number;
  confirm: boolean;
}

interface ConfirmCompanyRegistrationResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    expires_in_minutes: number;
  };
}

interface ValidateCompanyCodeRequest {
  company_id: number;
  email: string;
  validation_code: string;
}

interface ValidateCompanyCodeResponse {
  success: boolean;
  message: string;
  data: {
    validation_token: string;
    company_id: number;
    expires_in_minutes: number;
  };
}

interface CompleteCompanyRegistrationRequest {
  validation_token: string;
  company_id: number;
  email: string;
  password: string;
  password_confirmation: string;
}

interface CompleteCompanyRegistrationResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      role: string;
      status: string;
    };
    company: {
      id: number;
      name: string;
      rif: string;
      email: string;
      status: string;
    };
    token: string;
  };
}

interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  role?: 'company';
  password?: string;
  password_confirmation?: string;
  status?: 'active' | 'inactive';
  rif?: string;
  companyName?: string;
  contactPerson?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  key_activation?: string;
}

interface Company {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact?: string;
  serial_no?: string;
  status: 'active' | 'inactive';
  user?: User;
  sellers?: Seller[];
  rif: string;
  key_system_items_id?: string;
  created_at: string;
  updated_at: string;
}

interface Seller {
  id: number;
  user_id: number;
  company_id: number;
  code: string;
  description?: string;
  status?: string;
  percent_sales: number;
  percent_receivable: number;
  inkeeper: boolean;
  user_code?: string;
  percent_gerencial_debit_note: number;
  percent_gerencial_credit_note: number;
  percent_returned_check: number;
  seller_status: 'active' | 'inactive';
  user?: User;
  company?: Company;
  created_at: string;
  updated_at: string;
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

interface Quote {
  id: number;
  quote_number: string;
  customer_id: number;
  customer?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  };
  user_id: number;
  user?: {
    id: number;
    name: string;
  };
  company_id?: number;
  company?: {
    id: number;
    name: string;
  };
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  valid_until: string;
  quote_date: string;
  terms_conditions?: string;
  notes?: string;
  metadata?: Record<string, any>;
  items?: QuoteItem[];
  created_at: string;
  updated_at: string;
}

interface QuoteItem {
  id: number;
  quote_id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
    code: string;
    price: number;
    buy_tax: number;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
}

interface CreateQuoteData {
  customer_id: number;
  company_id?: number;
  items: {
    product_id: number;
    quantity: number;
    unit_price: number;
    discount?: number;
    name?: string;
    buy_tax?: number;
  }[];
  discount?: number;
  valid_until: string;
  terms_conditions?: string;
  notes?: string;
  metadata?: Record<string, any>;
  bcv_rate?: number;
  bcv_date?: string;
  status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
}


interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    expires_in_minutes: number;
  };
}

interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

interface VerifyResetCodeResponse {
  success: boolean;
  message: string;
  data: {
    reset_token: string;
    expires_in_minutes: number;
  };
}

interface ResetPasswordRequest {
  reset_token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

interface ActiveSessionInfo {
  device_name: string;
  device_type: string;
  ip_address: string;
  last_activity: string;
  login_time: string;
}

interface LoginResponseWithSession extends LoginResponse {
  device_info?: {
    device_name: string;
    device_type: string;
    expires_at: string;
  };
}

interface ActiveSessionExistsError {
  success: false;
  code: 'ACTIVE_SESSION_EXISTS';
  message: string;
  data: {
    active_session: ActiveSessionInfo;
  };
}

interface ActiveSession {
  id: number;
  device_name: string;
  device_type: string;
  ip_address: string;
  last_activity: string;
  created_at: string;
  is_current: boolean;
}

interface ActiveSessionsResponse {
  success: boolean;
  data: ActiveSession[];
}

interface LogoutAllDevicesRequest {
  password: string;
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

  // =================== NUEVO FLUJO DE REGISTRO DE EMPRESA ===================
  
  // Paso 1: Verificar información de empresa
  async checkCompanyInfo(data: CheckCompanyInfoRequest): Promise<CheckCompanyInfoResponse> {
    console.log("Checking company info:", data);
    try {
      const response: AxiosResponse<CheckCompanyInfoResponse> = await this.client.post('/users/check', data);
      console.log("Company check successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error checking company info:", error);
      throw error;
    }
  }

  // Paso 2: Confirmar registro de empresa
  async confirmCompanyRegistration(data: ConfirmCompanyRegistrationRequest): Promise<ConfirmCompanyRegistrationResponse> {
    console.log("Confirming company registration:", data);
    try {
      const response: AxiosResponse<ConfirmCompanyRegistrationResponse> = await this.client.post('/users/stepConfirm', data);
      console.log("Company registration confirmation successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error confirming company registration:", error);
      throw error;
    }
  }

  // Paso 3: Validar código de empresa
  async validateCompanyCode(data: ValidateCompanyCodeRequest): Promise<ValidateCompanyCodeResponse> {
    console.log("Validating company code:", data);
    try {
      const response: AxiosResponse<ValidateCompanyCodeResponse> = await this.client.post('/users/validateCompanyCode', data);
      console.log("Company code validation successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error validating company code:", error);
      throw error;
    }
  }

  // Paso 4: Completar registro de empresa
  async completeCompanyRegistration(data: CompleteCompanyRegistrationRequest): Promise<CompleteCompanyRegistrationResponse> {
    console.log("Completing company registration:", data);
    try {
      const response: AxiosResponse<CompleteCompanyRegistrationResponse> = await this.client.post('/users/completeCompanyRegistration', data);
      console.log("Company registration completion successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error completing company registration:", error);
      throw error;
    }
  }

  // =================== MÉTODOS DE AUTENTICACIÓN EXISTENTES ===================

   async login(
    credentials: LoginCredentials, 
    deviceInfo?: {
      device_name?: string;
      device_type?: 'web' | 'mobile' | 'tablet';
      force_logout?: boolean;
    }
  ): Promise<LoginResponseWithSession> {
    console.log("Login attempt with credentials:", credentials);
    
    const requestData: LoginCredentialsWithDevice = {
      ...credentials,
      device_name: deviceInfo?.device_name || 'Mobile App',
      device_type: deviceInfo?.device_type || 'mobile',
      force_logout: deviceInfo?.force_logout || false,
    };
    
    try {
      const response: AxiosResponse<LoginResponseWithSession> = await this.client.post(
        '/auth/login', 
        requestData
      );
      console.log("Login successful");
      return response.data;
    } catch (error: any) {
      // Verificar si es error de sesión activa
      if (error.response?.status === 409 && error.response?.data?.code === 'ACTIVE_SESSION_EXISTS') {
        console.log("Active session detected");
        throw {
          isActiveSessionError: true,
          activeSessionData: error.response.data,
        };
      }
      
      console.error("Error en login:", error);
      throw error;
    }
  }

   async getActiveSessions(): Promise<ActiveSession[]> {
    try {
      const response: AxiosResponse<ActiveSessionsResponse> = await this.client.get(
        '/auth/active-sessions'
      );
      return response.data.data;
    } catch (error) {
      console.error("Error getting active sessions:", error);
      throw error;
    }
  }

  // NUEVO: Cerrar todas las sesiones
  async logoutAllDevices(password: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/auth/logout-all-devices', { password });
      return response.data;
    } catch (error) {
      console.error("Error logging out all devices:", error);
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
  async getDashboard(params?: {    
    company_id?:number;
  }): Promise<DashboardData> {
    const response: AxiosResponse<DashboardData> = await this.client.get('/dashboard', { params });
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
    company_id?:number;
  }): Promise<PaginatedResponse<Product>> {
    const response: AxiosResponse<PaginatedResponse<Product>> = await this.client.get('/products', { params });
    return response.data;
  }

  async getProduct(id: number): Promise<Product> {
    const response: AxiosResponse<Product> = await this.client.get(`/products/${id}`);
    return response.data.data;
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
  async getCategories(params?: {    
    company_id?:number;
  }): Promise<Category[]> {
    const response: AxiosResponse<Category[]> = await this.client.get('/categories', { params });
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
    company_id?: number;
  }): Promise<PaginatedResponse<Customer>> {
    const response: AxiosResponse<PaginatedResponse<Customer>> = await this.client.get('/customers', { params });
    return response.data;
  }

  async getCustomer(id: number): Promise<Customer> {
    const response: AxiosResponse<Customer> = await this.client.get(`/customers/${id}`);
    return response.data.data;
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

  // Método antiguo de registro (mantenemos para compatibilidad)
  async createUser(data: CreateUserData): Promise<User> {
    console.log("Creating user with data:", data);
    const response: AxiosResponse<{ data: User }> = await this.client.post('/users/register', data);
    return response.data.data;
  }

  async getUsers(params?: {
    role?: string;
    search?: string;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<User>> {
    const response: AxiosResponse<PaginatedResponse<User>> = await this.client.get('/users', { params });
    return response.data;
  }

  async getUser(id: number): Promise<User> {
    const response: AxiosResponse<{ data: User }> = await this.client.get(`/users/${id}`);
    return response.data.data;
  }

  async updateUser(id: number, data: Partial<CreateUserData>): Promise<User> {
    const response: AxiosResponse<{ data: User }> = await this.client.put(`/users/${id}`, data);
    return response.data.data;
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  // Companies
  async getCompanies(params?: {
    search?: string;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Company>> {
    const response: AxiosResponse<PaginatedResponse<Company>> = await this.client.get('/companies', { params });
    return response.data.data;
  }

  async getCompany(id: number): Promise<Company> {
    const response: AxiosResponse<{ data: Company }> = await this.client.get(`/companies/${id}`);
    return response.data.data;
  }

  async createCompany(data: {
    user_id?: number;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    contact?: string;
    serial_no?: string;
    status?: 'active' | 'inactive';
    rif: string;
    key_system_items_id?: string;
  }): Promise<Company> {
    console.log("Creating company with data:", data);
    const response: AxiosResponse<{ data: Company }> = await this.client.post('/companies', data);
    return response.data.data;
  }

  async updateCompany(id: number, data: Partial<{
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    contact?: string;
    serial_no?: string;
    status?: 'active' | 'inactive';
  }>): Promise<Company> {
    const response: AxiosResponse<{ data: Company }> = await this.client.put(`/companies/${id}`, data);
    return response.data.data;
  }

  async deleteCompany(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.delete(`/companies/${id}`);
    return response.data;
  }

  async getCompanySellers(id: number): Promise<PaginatedResponse<Seller>> {
    const response: AxiosResponse<PaginatedResponse<Seller>> = await this.client.get(`/companies/${id}/sellers`);
    return response.data;
  }

  // Sellers
  async getSellers(params?: {
    search?: string;
    company_id?: number;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Seller>> {
    const response: AxiosResponse<PaginatedResponse<Seller>> = await this.client.get('/sellers',{ params });
    return response.data;
  }

  async getSeller(id: number): Promise<Seller> {
    const response: AxiosResponse<{ data: Seller }> = await this.client.get(`/sellers/${id}`);
    return response.data.data;
  }

  async createSeller(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    password_confirmation: string;
    company_id: number;
    code: string;
    description?: string;
    status?: string;
    percent_sales?: number;
    percent_receivable?: number;
    inkeeper?: boolean;
    user_code?: string;
    percent_gerencial_debit_note?: number;
    percent_gerencial_credit_note?: number;
    percent_returned_check?: number;
    seller_status?: 'active' | 'inactive';
  }): Promise<Seller> {
    const response: AxiosResponse<{ data: Seller }> = await this.client.post('/sellers', data);
    return response.data.data;
  }

  async updateSeller(id: number, data: Partial<{
    code: string;
    description?: string;
    status?: string;
    percent_sales?: number;
    percent_receivable?: number;
    inkeeper?: boolean;
    user_code?: string;
    percent_gerencial_debit_note?: number;
    percent_gerencial_credit_note?: number;
    percent_returned_check?: number;
    seller_status?: 'active' | 'inactive';
  }>): Promise<Seller> {
    const response: AxiosResponse<{ data: Seller }> = await this.client.put(`/sellers/${id}`, data);
    return response.data.data;
  }

  async deleteSeller(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.delete(`/sellers/${id}`);
    return response.data;
  }

  async getSellersByCompany(companyId: number): Promise<PaginatedResponse<Seller>> {
    const response: AxiosResponse<PaginatedResponse<Seller>> = await this.client.get(`/sellers/company/${companyId}`);
    return response.data;
  }

  async getQuotes(params?: {
    status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
    date_from?: string;
    date_to?: string;
    customer_id?: number;
    company_id?: number;
    expired?: boolean;
    today?: boolean;
    this_month?: boolean;
    per_page?: number;
    page?: number;
  }): Promise<PaginatedResponse<Quote>> {
    const response: AxiosResponse<PaginatedResponse<Quote>> = await this.client.get('/quotes', { params });
    return response.data.data;
  }

  async getQuote(id: number): Promise<Quote> {
    const response: AxiosResponse<Quote> = await this.client.get(`/quotes/${id}`);
    return response.data;
  }

  async createQuote(data: CreateQuoteData): Promise<Quote> {    
    const response: AxiosResponse<Quote> = await this.client.post('/quotes', data);
    return response.data;
  }

  async updateQuote(id: number, data: Partial<CreateQuoteData>): Promise<Quote> {
    const response: AxiosResponse<Quote> = await this.client.put(`/quotes/${id}`, data);
    return response.data;
  }

  async deleteQuote(id: number): Promise<{ message: string }> {
    const response: AxiosResponse<{ message: string }> = await this.client.delete(`/quotes/${id}`);
    return response.data;
  }

  // Acciones específicas de quotes
  async sendQuote(id: number): Promise<Quote> {
    const response: AxiosResponse<Quote> = await this.client.post(`/quotes/${id}/send`);
    return response.data;
  }

  async approveQuote(id: number): Promise<Quote> {
    const response: AxiosResponse<Quote> = await this.client.post(`/quotes/${id}/approve`);
    return response.data;
  }

  async rejectQuote(id: number): Promise<Quote> {
    const response: AxiosResponse<Quote> = await this.client.post(`/quotes/${id}/reject`);
    return response.data;
  }

  async duplicateQuote(id: number): Promise<Quote> {
    const response: AxiosResponse<Quote> = await this.client.post(`/quotes/${id}/duplicate`);
    return response.data;
  }

  async getQuoteStatistics(): Promise<{
    total_quotes: number;
    draft_quotes: number;
    sent_quotes: number;
    approved_quotes: number;
    rejected_quotes: number;
    expired_quotes: number;
    this_month_quotes: number;
    total_amount: number;
    average_amount: number;
  }> {
    const response = await this.client.get('/quotes/stats');
    return response.data;
  }


  // =================== RECUPERACIÓN DE CONTRASEÑA ===================

// Paso 1: Solicitar código de recuperación
async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
  console.log("Requesting password reset for:", data.email);
  try {
    const response: AxiosResponse<ForgotPasswordResponse> = await this.client.post('/auth/forgot-password', data);
    console.log("Password reset request successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error requesting password reset:", error);
    throw error;
  }
}

// Paso 2: Verificar código de recuperación
async verifyResetCode(data: VerifyResetCodeRequest): Promise<VerifyResetCodeResponse> {
  console.log("Verifying reset code for:", data.email);
  try {
    const response: AxiosResponse<VerifyResetCodeResponse> = await this.client.post('/auth/verify-reset-code', data);
    console.log("Reset code verification successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error verifying reset code:", error);
    throw error;
  }
}

// Paso 3: Restablecer contraseña
async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  console.log("Resetting password for:", data.email);
  try {
    const response: AxiosResponse<ResetPasswordResponse> = await this.client.post('/auth/reset-password', data);
    console.log("Password reset successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
}
}

export const api = new ApiService();