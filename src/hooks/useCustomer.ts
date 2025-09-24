"use client";

import { useEffect, useState } from "react";
import {
  getCustomerProfile,
  getCustomerBalance,
  getCustomerInvoices,
  addCustomerBalance,
  updateCustomerProfile,
  getCustomerInvoice,
  payCustomerInvoice,
} from "@/lib/customer";
import type {
  CustomerProfile,
  CustomerBalanceResponse,
  CustomerInvoicesResponse,
} from "@/lib/customer";

export function useCustomerOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [balance, setBalance] = useState<
    CustomerBalanceResponse["data"] | null
  >(null);
  const [invoices, setInvoices] = useState<CustomerInvoicesResponse["data"]>({
    all: [],
    pending: [],
    totalPending: 0,
    totalPaid: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [p, b, i] = await Promise.all([
          getCustomerProfile(),
          getCustomerBalance(),
          getCustomerInvoices(),
        ]);
        if (!mounted) return;
        setProfile(p.data.customer);
        setBalance(b.data);
        setInvoices(i.data);
      } catch (e: unknown) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load customer");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { loading, error, profile, balance, invoices };
}

export const customerActions = {
  addBalance: addCustomerBalance,
  updateProfile: updateCustomerProfile,
  getInvoice: getCustomerInvoice,
  payInvoice: payCustomerInvoice,
};
