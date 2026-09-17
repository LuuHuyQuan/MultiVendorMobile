import type { ApiValidationErrors } from './types';

type ErrorPayload = {
  message?: unknown;
  errors?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getValidationErrors = (
  payload: unknown,
): ApiValidationErrors | undefined => {
  if (!isObject(payload) || !isObject(payload.errors)) {
    return undefined;
  }

  const errors = Object.entries(payload.errors).reduce<ApiValidationErrors>(
    (result, [field, messages]) => {
      if (Array.isArray(messages)) {
        const validMessages = messages.filter(
          (message): message is string => typeof message === 'string',
        );

        if (validMessages.length > 0) {
          result[field] = validMessages;
        }
      }

      return result;
    },
    {},
  );

  return Object.keys(errors).length > 0 ? errors : undefined;
};

export class ApiError extends Error {
  readonly status: number;
  readonly validationErrors?: ApiValidationErrors;
  readonly payload?: unknown;

  constructor(
    status: number,
    message: string,
    payload?: unknown,
    validationErrors?: ApiValidationErrors,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.validationErrors = validationErrors;
  }
}

export const readResponseBody = async (
  response: Response,
): Promise<unknown> => {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const createApiError = (
  response: Response,
  payload: unknown,
): ApiError => {
  const errorPayload = isObject(payload)
    ? (payload as ErrorPayload)
    : undefined;
  const message =
    typeof errorPayload?.message === 'string'
      ? errorPayload.message
      : typeof payload === 'string' && payload.trim()
      ? payload
      : response.statusText || `Yeu cau that bai (${response.status}).`;

  return new ApiError(
    response.status,
    message,
    payload,
    getValidationErrors(payload),
  );
};

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;
