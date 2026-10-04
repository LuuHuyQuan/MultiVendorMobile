import { apiRequest } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export type Faq = {
  id: number;
  question: string;
  answer: string;
  category: string;
};

export type SupportTicket = {
  id: number;
  ticketNumber: string;
  subject: string;
  statusName: string;
  createdAt: string;
};

export type SupportReply = {
  id: number;
  senderName: string;
  messageText: string;
  createdAt: string;
};

export type SupportTicketDetail = {
  ticket: SupportTicket & { description: string };
  replies: SupportReply[];
};

async function data<T>(path: string, method = 'GET', body?: unknown, auth = true): Promise<T> {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, { method, body, auth });
  if (!response || response.success !== true || !('data' in response)) {
    throw new ApiError(502, 'Dữ liệu hỗ trợ trả về không hợp lệ.', response);
  }
  return response.data;
}

export const customerSupportApi = {
  getFaqs: () => data<Faq[]>('/content/faqs', 'GET', undefined, false),
  contact: (request: { name: string; email: string; phone: string | null; subject: string; message: string }) =>
    data<{ id: number; ticketNumber: string }>('/customer-support/contact', 'POST', request, false),
  getTickets: () => data<{ items: SupportTicket[] }>('/customer-support?page=1&pageSize=20'),
  createTicket: (subject: string, description: string) =>
    data<{ id: number; ticketNumber: string }>('/customer-support', 'POST', {
      subject,
      description,
      orderId: null,
      category: 'general',
    }),
  getTicketDetail: (id: number) => data<SupportTicketDetail>(`/customer-support/${id}`),
  reply: (id: number, message: string) =>
    data<{ id: number }>(`/customer-support/${id}/replies`, 'POST', { message, isInternalNote: false }),
};
