import { apiFetch } from "./api";

export type OrganizationProfile = {
  _id: string;
  user: string;
  name: string;
  gstId: string;
  panNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  revenue: { total: number; pending: number; received: number };
};

export type OrgProfileResponse = {
  success: boolean;
  data: {
    organization: OrganizationProfile;
    invoices: {
      all: OrgInvoiceSummary[];
      sent: OrgInvoiceSummary[];
      paid: OrgInvoiceSummary[];
      createdUnsent: OrgInvoiceSummary[];
      financed?: (OrgInvoiceSummary & {
        sold?: {
          isSold: boolean;
          soldTo?: {
            _id: string;
            user?: { email?: string };
            profile?: {
              companyName?: string;
              firstName?: string;
              lastName?: string;
            };
          };
          soldAmount?: number;
          soldAt?: string;
        };
      })[];
    };
  };
};

export type OrgInvoicesResponse = {
  success: boolean;
  data: {
    invoices: OrgInvoiceSummary[];
    total: number;
    stats: Record<string, number>;
  };
};

export type OrgRevenue = { total: number; pending: number; received: number };
export type OrgRevenueResponse = { success: boolean; data: OrgRevenue };

export type OrgInvoiceSummary = {
  _id: string;
  invoiceNumber: string;
  dueDate?: string;
  totalAmount: number;
  paidAmount?: number;
  status:
    | "draft"
    | "sent"
    | "viewed"
    | "partially_paid"
    | "paid"
    | "overdue"
    | "cancelled";
  customer?: string | null;
  // Optional flag from backend indicating this invoice is listed on marketplace
  isOnBid?: boolean;
};

export type OrgInvoice = OrgInvoiceSummary & {
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    total?: number;
  }>;
  organization?: { _id: string; name: string };
  customer?: { _id: string; user?: { email: string } } | null;
  notes?: string;
  termsAndConditions?: string;
  // Indicates if invoice is currently listed on marketplace for bids
  isOnBid?: boolean;
};

export async function getOrgProfile() {
  return apiFetch<OrgProfileResponse>("/organization/profile", { auth: true });
}

export async function updateOrgProfile(body: Partial<OrganizationProfile>) {
  return apiFetch<{
    success: boolean;
    data: { organization: OrganizationProfile };
  }>("/organization/profile", {
    method: "PATCH",
    body,
    auth: true,
  });
}

export async function getOrgInvoices(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch<OrgInvoicesResponse>(
    `/organization/invoices${qs ? `?${qs}` : ""}`,
    { auth: true }
  );
}

export async function getOrgInvoiceById(id: string) {
  return apiFetch<{ success: boolean; data: { invoice: OrgInvoice } }>(
    `/organization/invoices/${id}`,
    { auth: true }
  );
}

export async function getOrgInvoicesWithBids() {
  return apiFetch<{
    success: boolean;
    data: {
      listings: Array<{
        _id: string;
        invoice: OrgInvoice;
        organization: string;
        isOpen: boolean;
        bids: Array<{
          _id: string;
          amount: number;
          status: string;
          financer: {
            _id: string;
            user?: { email?: string };
            profile?: {
              firstName?: string;
              lastName?: string;
              companyName?: string;
            };
          };
        }>;
      }>;
    };
  }>(`/organization/invoices/with-bids`, { auth: true });
}

export async function getOrgSentInvoicesFull() {
  return apiFetch<{
    success: boolean;
    data: { invoices: OrgInvoice[] };
  }>(`/organization/invoices/sent/full`, { auth: true });
}

export async function getOrgRevenue() {
  return apiFetch<OrgRevenueResponse>("/organization/revenue", { auth: true });
}

export type OrgInvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
};

export async function createOrgInvoice(body: {
  items: OrgInvoiceItem[];
  dueDate: string;
  notes?: string;
  termsAndConditions?: string;
}) {
  return apiFetch<{ success: boolean; data: { invoice: OrgInvoice } }>(
    `/organization/invoices`,
    { method: "POST", auth: true, body }
  );
}

export async function sendOrgInvoice(invoiceId: string, customerId: string) {
  return apiFetch<{ success: boolean; data: { invoice: OrgInvoice } }>(
    `/organization/invoices/${invoiceId}/send`,
    { method: "POST", auth: true, body: { customerId } }
  );
}

export async function updateOrgInvoice(
  invoiceId: string,
  body: Partial<OrgInvoice>
) {
  return apiFetch<{ success: boolean; data: { invoice: OrgInvoice } }>(
    `/organization/invoices/${invoiceId}`,
    { method: "PATCH", auth: true, body }
  );
}

export async function deleteOrgInvoice(invoiceId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/organization/invoices/${invoiceId}`,
    { method: "DELETE", auth: true }
  );
}

export async function searchCustomersByEmail(q: string) {
  const qs = new URLSearchParams({ q }).toString();
  return apiFetch<{
    success: boolean;
    data: {
      results: Array<{
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
      }>;
    };
  }>(`/organization/customers/search?${qs}`, { auth: true });
}
