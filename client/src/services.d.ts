import { AxiosInstance, AxiosResponse } from 'axios';

export const authService: {
  login: (data: any) => Promise<AxiosResponse>;
  getMe: () => Promise<AxiosResponse>;
  changePassword: (data: any) => Promise<AxiosResponse>;
};

export const fieldService: {
  getAll: (type: string, includeDeleted?: boolean) => Promise<AxiosResponse>;
  create: (data: any) => Promise<AxiosResponse>;
  update: (id: string, data: any) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
  restore: (id: string) => Promise<AxiosResponse>;
  permanentDelete: (id: string) => Promise<AxiosResponse>;
};

export const salesService: {
  getAll: (params: any) => Promise<AxiosResponse>;
  create: (data: any) => Promise<AxiosResponse>;
  update: (id: string, data: any) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
  restore: (id: string) => Promise<AxiosResponse>;
  permanentDelete: (id: string) => Promise<AxiosResponse>;
  getWeeklySummary: (params: any) => Promise<AxiosResponse>;
};

export const costsService: {
  getAll: (params: any) => Promise<AxiosResponse>;
  create: (data: any) => Promise<AxiosResponse>;
  update: (id: string, data: any) => Promise<AxiosResponse>;
  delete: (id: string) => Promise<AxiosResponse>;
  restore: (id: string) => Promise<AxiosResponse>;
  permanentDelete: (id: string) => Promise<AxiosResponse>;
};

export const reportService: {
  getWeekly: (params: any) => Promise<AxiosResponse>;
  getMonthly: (params: any) => Promise<AxiosResponse>;
  getAvailablePeriods: () => Promise<AxiosResponse>;
  getDaily: (params: any) => Promise<AxiosResponse>;
  getCustomPeriod: (params: any) => Promise<AxiosResponse>;
  getProfitLoss: (params: any) => Promise<AxiosResponse>;
  getRunningBalance: (params: any) => Promise<AxiosResponse>;
  saveTemplate: (data: any) => Promise<AxiosResponse>;
  getTemplates: () => Promise<AxiosResponse>;
  deleteTemplate: (id: string) => Promise<AxiosResponse>;
};

declare const api: AxiosInstance;
export default api;
