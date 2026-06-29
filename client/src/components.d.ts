import React from 'react';

export const Loader: React.FC<{ text?: string }>;
export const AnimatedBackground: React.FC;
export const NavigationBar: React.FC<{ user: any; onLogout: () => void }>;
export const Dashboard: React.FC;
export const SalesTable: React.FC<{ week: number; month: string; year: number }>;
export const CostsTable: React.FC<{ week: number; month: string; year: number }>;
export const Statistics: React.FC<{ year: number; month: string; week: number }>;
export const Login: React.FC<{ onLogin: (user: any) => void }>;
export const DynamicFieldsSettings: React.FC;
export const Reports: React.FC;
export const ProfitLossStatement: React.FC;
export const PasswordChange: React.FC<{ show: boolean; onHide: () => void; onSuccess?: () => void }>;
export const PeriodSelector: React.FC<{ value: any; onChange: (period: any) => void }>;
