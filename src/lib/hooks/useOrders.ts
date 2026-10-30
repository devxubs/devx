"use client";

import { useState, useEffect, useCallback } from "react";

export function useOrders(initialStatus = "") {
   const [orders, setOrders] = useState<any[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [page, setPage] = useState(1);
   const [status, setStatus] = useState(initialStatus);

   const fetchOrders = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const params = new URLSearchParams({
            page: String(page),
            limit: "25",
            ...(status && status !== "All" ? { status } : {}),
         });
         const res = await fetch(`/api/orders?${params}`);
         if (!res.ok) {
            throw new Error("Failed to load orders");
         }
         const data = await res.json();
         setOrders(data.orders || []);
         setTotal(data.total || 0);
      } catch (err: any) {
         setError(err.message || "An error occurred");
      } finally {
         setLoading(false);
      }
   }, [page, status]);

   useEffect(() => {
      fetchOrders();
   }, [fetchOrders]);

   return {
      orders,
      total,
      loading,
      error,
      page,
      setPage,
      status,
      setStatus,
      refetch: fetchOrders,
   };
}
