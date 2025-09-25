import { apiFetch } from "./api";

export type FinancerProfile = {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  documents?: Array<{ label: string; url: string }>;
};

export type FinancerOverview = {
  financer: {
    id: string;
    profile: FinancerProfile;
    balance: number;
    lockedBalance: number;
    stats: { bidsPlaced: number; invoicesWon: number; totalFinanced: number };
  };
  boughtInvoices: Array<{
    invoice: { _id: string; invoiceNumber?: string; totalAmount?: number };
    organization?: { name?: string; _id: string };
    amount: number;
    boughtAt: string;
  }>;
  bids: Array<{
    listingId: string;
    invoiceId: string;
    highestOnListing: number;
    myHighestBid: number;
    activeBids: Array<{ bidId: string; amount: number; status: string }>;
  }>;
};

export type FinancerOverviewResponse = {
  success: boolean;
  data: FinancerOverview;
};

export type FinancerBoughtInvoicesResponse = {
  success: boolean;
  data: { boughtInvoices: FinancerOverview["boughtInvoices"] };
};

export type FinancerInvoiceDetails = {
  _id: string;
  invoiceNumber: string;
  dueDate: string;
  issueDate: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  termsAndConditions?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
  }>;
  customer?: {
    firstName?: string;
    lastName?: string;
    user?: { email?: string };
  } | null;
  organization?: { name?: string } | null;
};

export type FinancerInvoiceDetailsResponse = {
  success: boolean;
  data: { invoice: FinancerInvoiceDetails };
};

export async function getFinancerOverview() {
  return apiFetch<FinancerOverviewResponse>("/financer/overview", {
    auth: true,
  });
}

export async function getFinancerBoughtInvoices() {
  return apiFetch<FinancerBoughtInvoicesResponse>("/financer/bought", {
    auth: true,
  });
}

export async function getFinancerInvoiceDetails(invoiceId: string) {
  return apiFetch<FinancerInvoiceDetailsResponse>(
    `/financer/invoices/${invoiceId}`,
    { auth: true }
  );
}

export async function addFinancerBalance(amount: number) {
  return apiFetch<{ success: boolean; data: { balance: number } }>(
    "/financer/balance/add",
    { method: "POST", auth: true, body: { amount } }
  );
}

export async function cancelMarketplaceBid(listingId: string, bidId: string) {
  return apiFetch<{ success: boolean; message: string }>(
    `/marketplace/${listingId}/bids/${bidId}/cancel`,
    { method: "POST", auth: true }
  );
}

export type FinancerSelfResponse = {
  success: boolean;
  data: {
    financerId: string;
    name: string;
    email: string;
    balance: number;
    lockedBalance: number;
  };
};

export async function getFinancerSelf() {
  return apiFetch<FinancerSelfResponse>("/financer/me", { auth: true });
}

export type MyBidsResponse = {
  success: boolean;
  data: {
    listings: Array<{
      _id: string;
      invoice: { _id: string; invoiceNumber?: string; totalAmount?: number };
      organization: string | { _id: string; name?: string };
      bids: Array<{
        _id: string;
        amount: number;
        status: string;
        financer: string | { _id: string };
      }>;
      isOpen: boolean;
    }>;
  };
};

export async function getMyBids() {
  return apiFetch<MyBidsResponse>("/financer/bids", { auth: true });
}
