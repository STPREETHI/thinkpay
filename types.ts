
export enum VaultType {
  LIFESTYLE = 'Lifestyle',
  FOOD = 'Food',
  EMERGENCY = 'Emergency',
  BUSINESS = 'Business',
  BILLS = 'Bills',
  CUSTOM = 'Custom'
}

export interface User {
  username: string;
  email: string;
  createdAt: string;
  totalBudget: number; // This is the monthly goal/limit
  currentBalance: number; // This is actual cash available
}

export interface Vault {
  id: string;
  type: VaultType;
  name?: string;
  icon?: string;
  limit: number;
  spent: number;
  isLocked: boolean;
  pin?: string;
  biometricEnabled?: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  vaultAllocations: { vaultId: string; amount: number }[];
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
  explanation?: string;
  gateway?: 'Razorpay' | 'Stripe';
}

export interface RevenueRecord {
  id: string;
  amount: number;
  source: string;
  timestamp: number;
}

export interface Autopay {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  vaultId: string;
  status: 'active' | 'paused' | 'snoozed';
  frequency: 'monthly' | 'weekly';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'normal';
  timestamp: number;
  read: boolean;
}

export interface AICategorization {
  category: string;
  confidence: number;
  suggestedVault: VaultType;
  explanation: string;
}
