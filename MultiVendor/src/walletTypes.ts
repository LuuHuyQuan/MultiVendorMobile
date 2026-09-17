export type WalletStatus = 'active' | 'frozen' | 'closed';

export type WalletTransactionType = 'top_up' | 'withdrawal';

export type WalletTransactionStatus = 'pending' | 'completed' | 'failed';

export interface ApiResult<T> {
  success: boolean;
  data: T;
}

export interface WalletSummary {
  userId: number;
  availableBalance: number;
  reservedBalance: number;
  currency: string;
  statusName: WalletStatus;
  updatedAt: string;
}

export interface LinkedBankAccount {
  id: number;
  bankCode: string;
  bankName: string;
  accountHolderName: string;
  accountNumberMasked: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface WalletTransaction {
  id: number;
  userId: number;
  transactionType: WalletTransactionType;
  statusName: WalletTransactionStatus;
  amount: number;
  balanceAfter: number | null;
  bankAccountId: number;
  externalReference: string | null;
  description: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface LinkBankRequest {
  bankCode: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
}

export interface MoneyRequest {
  amount: number;
  bankAccountId: number;
  idempotencyKey: string;
}
