"use client";

import { useEffect, useState } from "react";
import {
  getFinancerOverview,
  getFinancerBoughtInvoices,
  getFinancerInvoiceDetails,
  addFinancerBalance,
  cancelMarketplaceBid,
  type FinancerOverview,
  type FinancerInvoiceDetails,
} from "@/lib/financer";

export function useFinancerOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinancerOverview | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await getFinancerOverview();
      setData(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load financer");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return { loading, error, data, refresh, setData };
}

export const financerActions = {
  fetchBought: getFinancerBoughtInvoices,
  fetchInvoiceDetails: getFinancerInvoiceDetails,
  addBalance: addFinancerBalance,
  cancelBid: cancelMarketplaceBid,
};

export type { FinancerOverview, FinancerInvoiceDetails };


