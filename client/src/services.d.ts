import { AxiosInstance, AxiosResponse } from 'axios';

export const authService: {
  login: (data: any) => Promise<AxiosResponse>;
  getMe: () => Promise<AxiosResponse>;
  changePassword: (data: any) => Promise<AxiosResponse>;
  forgotPassword: (data: any) => Promise<AxiosResponse>;
  resetPassword: (data: any) => Promise<AxiosResponse>;
};

export const fieldService: {
  getAll: (type: string) => Promise<AxiosResponse>;
  create: (data: any) => Promise<AxiosResponse>;
  update: (id: string, data: any) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
};

export const salesService: {
  getAll: (params: any) => Promise<AxiosResponse>;
  create: (data: any) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
  getWeeklySummary: (params: any) => Promise<AxiosResponse>;
};

export const costsService: {
  getAll: (params: any) => Promise<AxiosResponse>;
  create: (data: any) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
};

export const reportService: {
  getWeekly: (params: any) => Promise<AxiosResponse>;
  getMonthly: (params: any) => Promise<AxiosResponse>;
};

declare const api: AxiosInstance;
export default api;
