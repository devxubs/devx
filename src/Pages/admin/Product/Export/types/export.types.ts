import { ExportColumn, HeaderStyleOption, BorderStyleOption } from "@src/lib/exportEngine";

export type ExportFormat = "xlsx" | "docx" | "csv";
export type DocumentTheme = "light" | "dark";

export interface NormalizedProduct {
   id?: string;
   customId: string;
   productName: string;
   category: string;
   productSku: string;
   quantity: number;
   stockValue: string;
   price: number;
   date: string;
   [key: string]: any;
}

export interface StoreInfo {
   name: string;
   phone: string;
   email: string;
   address: string;
   logoUrl: string;
}

export interface ProductExportConfig {
   format: ExportFormat;
   fileName: string;
   documentTheme: DocumentTheme;
   documentTitle: string;
   headerStyle: HeaderStyleOption;
   borderStyle: BorderStyleOption;
   includeLogo: boolean;
   includeCompanyName: boolean;
   includeContact: boolean;
   includeDate: boolean;
   columns: ExportColumn[];
   storeInfo: StoreInfo;
}

export interface FormatOptionItem {
   key: ExportFormat;
   label: string;
   ext: string;
   icon: string;
   desc: string;
}

export interface ExportProductModalProps {
   open: boolean;
   onClose: () => void;
   selectedProducts: any[];
}
