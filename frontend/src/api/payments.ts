import api from "../lib/api";

export type PaymentVariant =
  | "starter"
  | "business"
  | "starter_annual"
  | "business_annual"
  | "one_time";

export interface CreatePaymentResponse {
  payment_id: string;
  confirmation_url: string;
}

export interface PaymentRecord {
  id: string;
  type: string;
  plan: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  total: number;
}

export const paymentsApi = {
  create: (variant: PaymentVariant) =>
    api.post<CreatePaymentResponse>("/payments/create", { variant }),

  history: (limit = 20, offset = 0) =>
    api.get<PaymentHistoryResponse>("/payments/history", {
      params: { limit, offset },
    }),

  cancelSubscription: () =>
    api.post<{ message: string; plan_active_until: string | null }>(
      "/payments/cancel-subscription"
    ),
};
