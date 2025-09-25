import { apiFetch } from "./api";

export type CustomerProfile = {
  _id: string;
  user: string;
  firstName: string;
  lastName: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  balance: number;
  creditLimit: number;
  totalSpent: number;
  preferredPaymentMethod?: string;
  notes?: string;
};

export type CustomerProfileResponse = {
  success: boolean;
  data: { customer: CustomerProfile };
};

export type CustomerBalanceResponse = {
  success: boolean;
  data: {
    balance: number;
    creditLimit: number;
    availableCredit: number;
    totalSpent: number;
  };
};

export type CustomerInvoicesResponse = {
  success: boolean;
  data: {
    all: InvoiceSummary[];
    pending: InvoiceSummary[];
    totalPending: number;
    totalPaid: number;
  };
};

export type CustomerInvoiceResponse = {
  success: boolean;
  data: { invoice: Invoice; isUnpaid: boolean };
};

export type InvoiceSummary = {
  _id: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: number;
  paidAmount?: number;
  status: string;
  organization?: { name?: string; user?: { email?: string } };
};

export type Invoice = InvoiceSummary & {
  organization?: { name?: string };
  customer?: { firstName?: string; lastName?: string };
};

export async function getCustomerProfile() {
  return apiFetch<CustomerProfileResponse>("/customer/profile", { auth: true });
}

export async function updateCustomerProfile(body: Partial<CustomerProfile>) {
  return apiFetch<CustomerProfileResponse>("/customer/profile", {
    method: "PATCH",
    body,
    auth: true,
  });
}

export async function getCustomerBalance() {
  return apiFetch<CustomerBalanceResponse>("/customer/balance", { auth: true });
}

export async function addCustomerBalance(amount: number) {
  return apiFetch<{ success: boolean; data: { newBalance: number } }>(
    "/customer/balance/add",
    { method: "POST", body: { amount }, auth: true }
  );
}

export async function getCustomerInvoices(params?: {
  status?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  dueBefore?: string;
  dueAfter?: string;
  email?: string; // organization email filter
  minTotal?: number;
  maxTotal?: number;
  unpaidOnly?: boolean;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.sortBy) search.set("sortBy", params.sortBy);
  if (params?.order) search.set("order", params.order);
  if (params?.dueBefore) search.set("dueBefore", params.dueBefore);
  if (params?.dueAfter) search.set("dueAfter", params.dueAfter);
  if (params?.email) search.set("email", params.email);
  if (params?.minTotal != null) search.set("minTotal", String(params.minTotal));
  if (params?.maxTotal != null) search.set("maxTotal", String(params.maxTotal));
  if (params?.unpaidOnly) search.set("unpaidOnly", "true");
  const qs = search.toString();
  return apiFetch<CustomerInvoicesResponse>(
    `/customer/invoices${qs ? `?${qs}` : ""}`,
    {
      auth: true,
    }
  );
}

export async function getCustomerInvoice(invoiceId: string) {
  return apiFetch<CustomerInvoiceResponse>(`/customer/invoices/${invoiceId}`, {
    auth: true,
  });
}

export async function payCustomerInvoice(invoiceId: string, amount: number) {
  return apiFetch<{
    success: boolean;
    data: { remainingBalance: number; transactionId: string };
  }>(`/customer/invoices/${invoiceId}/pay`, {
    method: "POST",
    body: { amount },
    auth: true,
  });
}

export async function lookupOrganizationsByEmail(q: string) {
  return apiFetch<{
    success: boolean;
    data: { results: { id: string; name: string; email: string }[] };
  }>(`/customer/lookup/organizations?q=${encodeURIComponent(q)}`, {
    auth: true,
  });
}
