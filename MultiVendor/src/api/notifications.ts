import { apiRequest } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export type MyNotification = {
  id: number;
  title: string;
  message: string;
  notificationType: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  items: MyNotification[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
};

async function data<T>(path: string, method = 'GET'): Promise<T> {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, { method });
  if (!response || response.success !== true || !('data' in response)) {
    throw new ApiError(502, 'Dữ liệu thông báo trả về không hợp lệ.', response);
  }
  return response.data;
}

async function action(path: string, method: 'POST' | 'DELETE'): Promise<void> {
  const response = await apiRequest<{ success: boolean }>(path, { method });
  if (!response?.success) throw new ApiError(502, 'Không thể cập nhật thông báo.', response);
}

export const notificationsApi = {
  list: () => data<NotificationPage>('/my-notifications?page=1&pageSize=50'),
  read: (id: number) => action(`/my-notifications/${id}/read`, 'POST'),
  readAll: () => action('/my-notifications/read-all', 'POST'),
  delete: (id: number) => action(`/my-notifications/${id}`, 'DELETE'),
};
