"use client";

import { useState, useEffect, useCallback } from "react";

export interface ProductItem {
   id: string;
   productName: string;
   productCode: string;
   productSku: string;
   subDescription?: string | null;
   content?: string | null;
   images: string[];
   quantity: number;
   lowStockAlert: number;
   categoryId?: string | null;
   category?: { id: string; name: string } | null;
   productType?: string | null;
   colors: string[];
   sizes: string[];
   regularPrice: number;
   salePrice?: number | null;
   createdAt: string;
   updatedAt: string;
}

export function useProducts(initialSearch = "") {
   const [products, setProducts] = useState<ProductItem[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [page, setPage] = useState(1);
   const [search, setSearch] = useState(initialSearch);

   const fetchProducts = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const params = new URLSearchParams({
            page: String(page),
            limit: "50",
            ...(search ? { search } : {}),
         });
         const res = await fetch(`/api/products?${params}`);
         if (!res.ok) {
            throw new Error("Failed to load products");
         }
         const data = await res.json();
         setProducts(data.products || []);
         setTotal(data.total || 0);
      } catch (err: any) {
         setError(err.message || "An error occurred");
      } finally {
         setLoading(false);
      }
   }, [page, search]);

   useEffect(() => {
      fetchProducts();
   }, [fetchProducts]);

   return {
      products,
      total,
      loading,
      error,
      page,
      setPage,
      search,
      setSearch,
      refetch: fetchProducts,
   };
}
