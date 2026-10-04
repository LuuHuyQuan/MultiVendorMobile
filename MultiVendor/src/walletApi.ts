import { apiRequest } from './api/client';
import type {
  ApiResult,
  WalletActivity,
  LinkedBankAccount,
  LinkBankRequest,
  MoneyRequest,
  WalletSummary,
  WalletTransaction,
} from './walletTypes';

async function requestData<T>(
  path: string,
  options?: { method?: string; body?: string },
): Promise<T> {
  const result = await apiRequest<ApiResult<T>>(path, options);
  return result.data;
}

export const walletApi = {
  getWallet: () => requestData<WalletSummary>('/wallet'),

  getBanks: () =>
    requestData<LinkedBankAccount[]>('/wallet/bank-accounts'),

  linkBank: (request: LinkBankRequest) =>
    requestData<LinkedBankAccount>('/wallet/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  setDefaultBank: (id: number) =>
    requestData<LinkedBankAccount>(
      `/wallet/bank-accounts/${encodeURIComponent(String(id))}/default`,
      { method: 'PUT' },
    ),

  unlinkBank: (id: number) =>
    apiRequest<void>(
      `/wallet/bank-accounts/${encodeURIComponent(String(id))}`,
      { method: 'DELETE' },
    ),

  getTransactions: () =>
    requestData<WalletTransaction[]>(
      '/wallet/transactions?page=1&pageSize=50',
    ),

  getActivity: () =>
    requestData<{ items: WalletActivity[] }>(
      '/wallet/activity?page=1&pageSize=50',
    ).then(page => page.items),

  requestTopUp: (request: MoneyRequest) =>
    requestData<WalletTransaction>('/wallet/top-ups', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  requestWithdrawal: (request: MoneyRequest) =>
    requestData<WalletTransaction>('/wallet/withdrawals', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
};

export default walletApi;
