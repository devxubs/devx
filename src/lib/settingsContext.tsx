"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";

export interface StoreSettings {
   // RP-3 (U3): server-computed capability (GET /api/settings) —
   // true when the signed-in role may save settings. Not a stored
   // setting; the PUT whitelist ignores it. Defaults to false
   // (fail-closed) until the first successful fetch.
   canUpdateSettings?: boolean;
   // Audit L-1: separate from canUpdateSettings — true only for
   // administrators per the server's requireAdmin rule (System
   // Admin role or the "all" permission). Gates the presentation
   // of the admin-only actions on the System tab (factory reset,
   // data export); the server enforces requireAdmin regardless.
   // Server-computed in the settings GET response, never from the
   // client role.
   canAdminSettings?: boolean;
   storeName: string;
   tagline?: string;
   logoUrl?: string;
   email?: string;
   phone?: string;
   address?: string;
   currency: string;
   currencySymbol: string;
   timezone: string;
   dateFormat: string;
   language: string;

   // Sales & POS
   defaultTaxRate: number;
   defaultDeliveryCharge: number;
   defaultDiscountRate: number;
   invoicePrefix: string;
   orderPrefix: string;
   enableStockValidation: boolean;
   defaultPaymentMethod: string;

   // Inventory
   defaultLowStockAlert: number;
   autoGenerateSku: boolean;
   autoGenerateBarcode: boolean;

   // Invoice & Printing
   receiptPaperSize: string;
   invoiceHeader?: string;
   invoiceFooter?: string;
   showLogoOnReceipt: boolean;
   showBarcodeOnReceipt: boolean;

   // Appearance
   themeMode: string;
   themeColor: string;

   // Notifications & System
   enableLowStockAlert: boolean;
   notifyEmail?: string;

   // Entity ID Custom Prefixes
   prefixEmployee: string;
   prefixCustomer: string;
   prefixSupplier: string;
   prefixOrder: string;
   prefixPurchase: string;
   prefixProduct: string;
   prefixCategory: string;
   prefixUnit: string;
   prefixExpense: string;
   prefixAsset: string;
   prefixRole: string;
   prefixBilling: string;
   customConfig?: any;
}

const defaultSettings: StoreSettings = {
   canUpdateSettings: false,
   // Audit L-1: fail-closed like canUpdateSettings — until the
   // server says this session is an administrator, the System
   // tab's admin-only actions stay disabled.
   canAdminSettings: false,
   storeName: "DevX POS",
   tagline: "Smart Retail & Point of Sale",
   logoUrl: "",
   email: "info@devxpos.com",
   phone: "+880 1700-000000",
   address: "Dhaka, Bangladesh",
   currency: "BDT",
   currencySymbol: "৳",
   timezone: "Asia/Dhaka",
   dateFormat: "DD/MM/YYYY",
   language: "en",

   defaultTaxRate: 0,
   defaultDeliveryCharge: 60.0,
   defaultDiscountRate: 0.0,
   invoicePrefix: "INV",
   orderPrefix: "#",
   enableStockValidation: true,
   defaultPaymentMethod: "Cash",

   defaultLowStockAlert: 10,
   autoGenerateSku: true,
   autoGenerateBarcode: true,

   receiptPaperSize: "80mm",
   invoiceHeader: "DevX POS - Retail Invoice",
   invoiceFooter: "Thank you for shopping with us! Please come again.",
   showLogoOnReceipt: true,
   showBarcodeOnReceipt: true,

   themeMode: "dark",
   themeColor: "primary",
   enableLowStockAlert: true,
   notifyEmail: "admin@devxpos.com",

   prefixEmployee: "EP_",
   prefixCustomer: "CUS_",
   prefixSupplier: "SUP_",
   prefixOrder: "ORD_",
   prefixPurchase: "PUR_",
   prefixProduct: "PROD_",
   prefixCategory: "CAT_",
   prefixUnit: "UNIT_",
   prefixExpense: "EXP_",
   prefixAsset: "AST_",
   prefixRole: "ROLE_",
   prefixBilling: "BILL_",
};

interface SettingsContextType {
   settings: StoreSettings;
   loading: boolean;
   updateSettings: (newSettings: Partial<StoreSettings>) => Promise<boolean>;
   // Server message from the most recent failed updateSettings call
   // (e.g. a 400 validation error), or null. Lets save handlers surface
   // the API's exact reason instead of a generic failure toast.
   getLastSaveError: () => string | null;
   resetSettings: () => Promise<boolean>;
   refreshSettings: () => Promise<void>;
   formatCurrency: (amount: number | string | null | undefined) => string;
}

const SettingsContext = createContext<SettingsContextType>({
   settings: defaultSettings,
   loading: false,
   updateSettings: async () => false,
   getLastSaveError: () => null,
   resetSettings: async () => false,
   refreshSettings: async () => {},
   formatCurrency: (amt) => `৳${Number(amt || 0).toFixed(2)}`,
});

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
   const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
   const [loading, setLoading] = useState(true);

   const refreshSettings = useCallback(async () => {
      try {
         const res = await fetch("/api/settings");
         if (res.ok) {
            const data = await res.json();
            setSettings({
               ...defaultSettings,
               ...data,
               defaultTaxRate: Number(data.defaultTaxRate ?? defaultSettings.defaultTaxRate),
               defaultDeliveryCharge: Number(data.defaultDeliveryCharge ?? defaultSettings.defaultDeliveryCharge),
               defaultDiscountRate: Number(data.defaultDiscountRate ?? defaultSettings.defaultDiscountRate),
            });
         }
      } catch {
         // fallback to defaults
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      refreshSettings();
   }, [refreshSettings]);

   const lastSaveErrorRef = useRef<string | null>(null);
   const getLastSaveError = useCallback(() => lastSaveErrorRef.current, []);

   const updateSettings = async (newSettings: Partial<StoreSettings>): Promise<boolean> => {
      try {
         const res = await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSettings),
         });
         if (res.ok) {
            lastSaveErrorRef.current = null;
            const saved = await res.json();
            setSettings((prev) => ({
               ...prev,
               ...saved,
               defaultTaxRate: Number(saved.defaultTaxRate ?? prev.defaultTaxRate),
               defaultDeliveryCharge: Number(saved.defaultDeliveryCharge ?? prev.defaultDeliveryCharge),
               defaultDiscountRate: Number(saved.defaultDiscountRate ?? prev.defaultDiscountRate),
            }));
            return true;
         }
         try {
            const body = await res.json();
            lastSaveErrorRef.current =
               (typeof body?.message === "string" && body.message) ||
               (typeof body?.error === "string" && body.error) ||
               null;
         } catch {
            lastSaveErrorRef.current = null;
         }
         return false;
      } catch {
         lastSaveErrorRef.current = null;
         return false;
      }
   };

   const resetSettings = async (): Promise<boolean> => {
      try {
         const res = await fetch("/api/settings/reset", { method: "POST" });
         if (res.ok) {
            const data = await res.json();
            setSettings({
               ...defaultSettings,
               ...data.settings,
            });
            return true;
         }
         return false;
      } catch {
         return false;
      }
   };

   const formatCurrency = useCallback(
      (amount: number | string | null | undefined): string => {
         const val = Number(amount || 0);
         const formatted = val.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
         });
         return `${settings.currencySymbol || "৳"} ${formatted}`;
      },
      [settings.currencySymbol],
   );

   return (
      <SettingsContext.Provider
         value={{
            settings,
            loading,
            updateSettings,
            getLastSaveError,
            resetSettings,
            refreshSettings,
            formatCurrency,
         }}
      >
         {children}
      </SettingsContext.Provider>
   );
};

export const useSettings = () => useContext(SettingsContext);
