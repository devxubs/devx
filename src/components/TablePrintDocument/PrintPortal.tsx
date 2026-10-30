"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import TablePrintDocument, { PrintDocumentProps } from "./TablePrintDocument";

interface PrintContextType {
   printDocument: (props: PrintDocumentProps) => void;
   isPrinting: boolean;
}

const PrintContext = createContext<PrintContextType>({
   printDocument: () => {},
   isPrinting: false,
});

export const usePrint = () => useContext(PrintContext);

export const PrintProvider = ({ children }: { children: React.ReactNode }) => {
   const [printData, setPrintData] = useState<PrintDocumentProps | null>(null);
   const [mounted, setMounted] = useState(false);

   useEffect(() => {
      setMounted(true);
   }, []);

   const printDocument = useCallback((props: PrintDocumentProps) => {
      setPrintData(props);

      // Give React a tick to mount the portal DOM before triggering browser print
      setTimeout(() => {
         document.body.classList.add("devx-printing-active");

         const cleanup = () => {
            document.body.classList.remove("devx-printing-active");
            setPrintData(null);
            window.removeEventListener("afterprint", cleanup);
         };

         window.addEventListener("afterprint", cleanup);
         window.print();

         // Safety timeout fallback if afterprint does not fire in some browsers
         setTimeout(cleanup, 3000);
      }, 150);
   }, []);

   return (
      <PrintContext.Provider value={{ printDocument, isPrinting: Boolean(printData) }}>
         {children}
         {mounted &&
            printData &&
            createPortal(
               <div id="devx-print-portal" style={{ display: "none" }}>
                  <TablePrintDocument {...printData} />
               </div>,
               document.body,
            )}
      </PrintContext.Provider>
   );
};
