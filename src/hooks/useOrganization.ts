"use client";

import { useEffect, useState } from "react";
import {
  getOrgProfile,
  getOrgInvoices,
  getOrgInvoiceById,
  getOrgRevenue,
  searchCustomersByEmail,
  createOrgInvoice,
  sendOrgInvoice,
  updateOrgInvoice,
  deleteOrgInvoice,
  updateOrgProfile,
  type OrganizationProfile,
  type OrgInvoiceSummary,
} from "@/lib/organization";

export function useOrganizationOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [invoices, setInvoices] = useState<{
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
  }>({
    all: [],
    sent: [],
    paid: [],
    createdUnsent: [],
    financed: [],
  });
  const [revenue, setRevenue] = useState<{
    total: number;
    pending: number;
    received: number;
  } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const [profileRes, revenueRes] = await Promise.all([
        getOrgProfile(),
        getOrgRevenue(),
      ]);
      setProfile(profileRes.data.organization);
      setInvoices(profileRes.data.invoices);
      setRevenue(revenueRes.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { loading, error, profile, invoices, revenue, refresh };
}

export const organizationActions = {
  filterInvoices: getOrgInvoices,
  getInvoiceById: getOrgInvoiceById,
  searchCustomers: searchCustomersByEmail,
  createInvoice: createOrgInvoice,
  sendInvoice: sendOrgInvoice,
  updateInvoice: updateOrgInvoice,
  deleteInvoice: deleteOrgInvoice,
  updateProfile: updateOrgProfile,
};
