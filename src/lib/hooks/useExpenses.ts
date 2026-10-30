"use client";

import { useState, useEffect, useCallback } from "react";

export interface ExpenseItem {
   id: string;
   type: string;
   amount: number;
   note?: string | null;
   createdAt: string;
}

export function useExpenses() {
   const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const fetchExpenses = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const res = await fetch("/api/expenses?page=1&limit=50");
         if (!res.ok) {
            throw new Error("Failed to load expenses");
         }
         const data = await res.json();
         setExpenses(data.expenses || []);
         setTotal(data.total || 0);
      } catch (err: any) {
         setError(err.message || "An error occurred");
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchExpenses();
   }, [fetchExpenses]);

   return {
      expenses,
      total,
      loading,
      error,
      refetch: fetchExpenses,
   };
}
