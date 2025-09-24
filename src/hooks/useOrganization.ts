"use client";

import { useEffect, useState } from "react";
import {
  getOrgProfile,
  getOrgInvoices,
  getOrgInvoiceById,
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
  }>({
    all: [],
    sent: [],
    paid: [],
    createdUnsent: [],
  });

  async function refresh() {
    setLoading(true);
    try {
      const res = await getOrgProfile();
      setProfile(res.data.organization);
      setInvoices(res.data.invoices);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load organization");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { loading, error, profile, invoices, refresh };
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
