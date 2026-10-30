import re

with open('src/components/EntityDetailModals/EntityModals.tsx', 'r') as f:
    text = f.read()

# Split by the section headers
sections = re.split(r'(// ==========================================\n// \d+\. [^\n]+)', text)

# sections[2]: 1. EMPLOYEE DETAIL MODAL
# sections[4]: 2. PRODUCT DETAIL MODAL
# sections[6]: 3. ORDER DETAIL MODAL
# sections[8]: 4. CUSTOMER DETAIL MODAL
# sections[10]: 5. PURCHASE DETAIL MODAL
# sections[12]: 6. SUPPLIER DETAIL MODAL
# sections[14]: 7. EXPENSE DETAIL MODAL
# sections[16]: 8. ASSET DETAIL MODAL

# 1. Clean Employee Modal (sections[2]): remove handleExportPurchase...
sections[2] = re.sub(r'   const handleExportPurchaseDocx = \(\) => \{[\s\S]*?\n   \};\n\n   const handleExportPurchaseXlsx = \(\) => \{[\s\S]*?\n   \};\n', '', sections[2])

# 2. Clean Product Modal (sections[4]): remove handleExportPurchase...
sections[4] = re.sub(r'   const handleExportPurchaseDocx = \(\) => \{[\s\S]*?\n   \};\n\n   const handleExportPurchaseXlsx = \(\) => \{[\s\S]*?\n   \};\n', '', sections[4])

# 3. Clean Supplier Modal (sections[12]): replace handleExportPurchase... with Supplier export
supplier_exports = """   const handleExportSupplierDocx = () => {
      if (!supplier) return;
      exportToWord({
         filename: `Supplier_${supplier.name || "Statement"}`,
         title: `Supplier Statement - ${supplier.name || ""}`,
         columns: [
            { header: "Field", key: "field", width: 30 },
            { header: "Details", key: "value", width: 70 },
         ],
         data: [
            { field: "Supplier Name", value: supplier.name },
            { field: "Supplier ID", value: supplier.customId || "-" },
            { field: "Company", value: supplier.companyName || "-" },
            { field: "Phone", value: supplier.phone || "-" },
            { field: "Email", value: supplier.email || "-" },
            { field: "Address", value: supplier.address || "-" },
            { field: "Total Purchases", value: String(supplier.purchases?.length || 0) },
         ],
      });
   };

   const handleExportSupplierXlsx = () => {
      if (!supplier) return;
      exportToExcel({
         filename: `Supplier_${supplier.name || "Statement"}`,
         title: `Supplier Statement - ${supplier.name || ""}`,
         columns: [
            { header: "Field", key: "field", width: 30 },
            { header: "Details", key: "value", width: 70 },
         ],
         data: [
            { field: "Supplier Name", value: supplier.name },
            { field: "Supplier ID", value: supplier.customId || "-" },
            { field: "Company", value: supplier.companyName || "-" },
            { field: "Phone", value: supplier.phone || "-" },
            { field: "Email", value: supplier.email || "-" },
            { field: "Address", value: supplier.address || "-" },
            { field: "Total Purchases", value: String(supplier.purchases?.length || 0) },
         ],
      });
   };
"""

sections[12] = re.sub(r'   const handleExportPurchaseDocx = \(\) => \{[\s\S]*?\n   \};\n\n   const handleExportPurchaseXlsx = \(\) => \{[\s\S]*?\n   \};\n', supplier_exports, sections[12])

supplier_actions = """         <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
               <PrintButton label="Print Supplier Statement" variant="outlined" color="primary" size="small" />
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-word" size="small" />}
                  onClick={handleExportSupplierDocx}
               >
                  Word
               </Button>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-excel" size="small" />}
                  onClick={handleExportSupplierXlsx}
               >
                  Excel
               </Button>
            </Stack>
            <Button onClick={onClose} variant="contained" color="inherit" size="small">Close</Button>
         </DialogActions>"""

sections[12] = re.sub(r'         <DialogActions sx=\{\{ justifyContent: "space-between", px: 3, py: 1\.5 \}\}>\s*<PrintButton label="Print Supplier Statement"[^>]+/>\s*<Button onClick=\{onClose\}[^>]+>Close</Button>\s*</DialogActions>', supplier_actions, sections[12])

# 4. Enhance Customer Modal (sections[8]): add Customer export and buttons
customer_exports = """   const handleExportCustomerDocx = () => {
      if (!customer) return;
      exportToWord({
         filename: `Customer_${customer.name || "Statement"}`,
         title: `Customer Statement - ${customer.name || ""}`,
         columns: [
            { header: "Order ID", key: "orderId", width: 25 },
            { header: "Date", key: "date", width: 25 },
            { header: "Status", key: "status", width: 25 },
            { header: "Total", key: "total", width: 25, type: "currency" },
         ],
         data: (customer.orders || []).map((o: any) => ({
            orderId: o.orderId || o.customId || "-",
            date: new Date(o.createdAt).toLocaleDateString(),
            status: o.status || "-",
            total: Number(o.total || 0),
         })),
         metadata: [
            { label: "Customer Name", value: customer.name },
            { label: "Phone", value: customer.phone || "N/A" },
            { label: "Address", value: customer.address || "N/A" },
            { label: "Success Rate", value: `${stats.successRate}%` },
         ],
      });
   };

   const handleExportCustomerXlsx = () => {
      if (!customer) return;
      exportToExcel({
         filename: `Customer_${customer.name || "Statement"}`,
         title: `Customer Statement - ${customer.name || ""}`,
         columns: [
            { header: "Order ID", key: "orderId", width: 20 },
            { header: "Date", key: "date", width: 18, type: "date" },
            { header: "Status", key: "status", width: 18 },
            { header: "Total", key: "total", width: 18, type: "currency" },
         ],
         data: (customer.orders || []).map((o: any) => ({
            orderId: o.orderId || o.customId || "-",
            date: o.createdAt ? new Date(o.createdAt).toISOString().split("T")[0] : "",
            status: o.status || "-",
            total: Number(o.total || 0),
         })),
         metadata: [
            { label: "Customer Name", value: customer.name },
            { label: "Phone", value: customer.phone || "N/A" },
            { label: "Address", value: customer.address || "N/A" },
            { label: "Success Rate", value: `${stats.successRate}%` },
         ],
      });
   };
"""

# Check if handleExportCustomerDocx is already in sections[8]
if 'handleExportCustomerDocx' not in sections[8]:
    sections[8] = sections[8].replace('   return (', customer_exports + '\n   return (')

customer_actions = """         <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
               <PrintButton label="Print Customer Statement" variant="outlined" color="primary" size="small" />
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-word" size="small" />}
                  onClick={handleExportCustomerDocx}
               >
                  Word
               </Button>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-excel" size="small" />}
                  onClick={handleExportCustomerXlsx}
               >
                  Excel
               </Button>
            </Stack>
            <Button onClick={onClose} variant="contained" color="inherit" size="small">Close</Button>
         </DialogActions>"""

sections[8] = re.sub(r'         <DialogActions sx=\{\{ justifyContent: "space-between", px: 3, py: 1\.5 \}\}>\s*<PrintButton label="Print Customer Statement"[^>]+/>\s*<Button onClick=\{onClose\}[^>]+>Close</Button>\s*</DialogActions>', customer_actions, sections[8])

# 5. Enhance Purchase Modal (sections[10]): wire handleExportPurchaseDocx/Xlsx to DialogActions
purchase_actions = """         <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 1.5, flexWrap: "wrap", gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
               <PrintButton label="Print Purchase Order" variant="contained" color="primary" size="small" />
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-word" size="small" />}
                  onClick={handleExportPurchaseDocx}
               >
                  Word
               </Button>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="vscode-icons:file-type-excel" size="small" />}
                  onClick={handleExportPurchaseXlsx}
               >
                  Excel
               </Button>
            </Stack>
            <Button onClick={onClose} variant="contained" color="inherit" size="small">Close</Button>
         </DialogActions>"""

sections[10] = re.sub(r'         <DialogActions sx=\{\{ justifyContent: "space-between", px: 3, py: 1\.5 \}\}>\s*<PrintButton label="Print Purchase Order"[^>]+/>\s*<Button onClick=\{onClose\}[^>]+>Close</Button>\s*</DialogActions>', purchase_actions, sections[10])

new_text = ''.join(sections)
with open('src/components/EntityDetailModals/EntityModals.tsx', 'w') as f:
    f.write(new_text)

print('Updated EntityModals.tsx successfully without bash expansion!')
