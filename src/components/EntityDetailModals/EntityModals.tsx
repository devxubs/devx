"use client";

import React, { useState, useEffect } from "react";
import {
   Dialog,
   DialogTitle,
   DialogContent,
   DialogActions,
   Button,
   Stack,
   Typography,
   Box,
   Divider,
   Chip,
   Grid,
   Avatar,
   Table,
   TableHead,
   TableRow,
   TableCell,
   TableBody,
   Paper,
   CircularProgress,
   LinearProgress,
} from "@mui/material";
import Icon from "@src/components/Icon";
import PrintButton from "@src/components/PrintButton";
import CustomModal from "@src/components/Modal";
import HtmlRenderer from "@src/components/HtmlRenderer";
import { isDescriptionEmpty } from "@src/lib/sanitizeHtml";
import { exportToExcel, exportToWord } from "@src/lib/exportEngine";
import { useSettings } from "@src/lib/settingsContext";

// ==========================================
// 1. EMPLOYEE DETAIL MODAL
// ==========================================
export const EmployeeDetailModal = ({
   open,
   onClose,
   employeeId,
}: {
   open: boolean;
   onClose: () => void;
   employeeId?: string | null;
}) => {
   const [employee, setEmployee] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!open || !employeeId) return;
      setLoading(true);
      fetch(`/api/users/${employeeId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setEmployee(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, employeeId]);

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="User Details"
         closeIcon={true}
         sx={{
            width: { xs: "92%", sm: 540 },
            maxHeight: "90vh",
            overflowY: "auto",
            p: { xs: 2, sm: 3 },
         }}
      >
         {loading ? (
            <Stack alignItems="center" py={5}>
               <CircularProgress />
            </Stack>
         ) : employee ? (
            <Stack spacing={2.5}>
               <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
               >
                  <Stack direction="row" spacing={2} alignItems="center">
                     <Avatar
                        src={employee.image}
                        sx={{ width: 64, height: 64 }}
                     />
                     <Box>
                        <Typography variant="h6">
                           {employee.name || "User"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                           {employee.email}
                        </Typography>
                        <Chip
                           label={
                              typeof employee.role === "object"
                                 ? employee.role?.name || "Staff"
                                 : employee.role || "Staff"
                           }
                           size="small"
                           sx={{ mt: 0.5, fontWeight: 600 }}
                        />
                     </Box>
                  </Stack>
                  <Chip
                     label={employee?.customId || "USER"}
                     color="primary"
                     size="small"
                     sx={{ fontWeight: 700 }}
                  />
               </Stack>
               <Divider />
               <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        Phone Number
                     </Typography>
                     <Typography variant="body2" fontWeight={500}>
                        {employee.phoneNumber || "N/A"}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        Account Status
                     </Typography>
                     <Typography variant="body2" fontWeight={500}>
                        {employee.status || "ACTIVE"}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        Salary
                     </Typography>
                     <Typography variant="body2" fontWeight={500}>
                        {employee.salary ? `৳ ${employee.salary}` : "N/A"}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        Hire Date
                     </Typography>
                     <Typography variant="body2" fontWeight={500}>
                        {employee.hireDate
                           ? new Date(employee.hireDate).toLocaleDateString()
                           : "N/A"}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                     <Typography variant="caption" color="text.secondary">
                        Address
                     </Typography>
                     <Typography variant="body2" fontWeight={500}>
                        {employee.address || "N/A"}
                     </Typography>
                  </Grid>
               </Grid>
            </Stack>
         ) : (
            <Typography variant="body2" color="text.secondary">
               User not found.
            </Typography>
         )}
      </CustomModal>
   );
};

// ==========================================
// 2. PRODUCT DETAIL MODAL
// ==========================================
export const ProductDetailModal = ({
   open,
   onClose,
   productId,
}: {
   open: boolean;
   onClose: () => void;
   productId?: string | null;
}) => {
   const { formatCurrency } = useSettings();
   const [product, setProduct] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!open || !productId) return;
      setLoading(true);
      fetch(`/api/products/${productId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setProduct(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, productId]);

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title="Product Details"
         closeIcon={true}
         sx={{
            width: { xs: "92%", sm: 540 },
            maxHeight: "90vh",
            overflowY: "auto",
            p: { xs: 2, sm: 3 },
         }}
      >
         {loading ? (
            <Stack alignItems="center" py={5}>
               <CircularProgress />
            </Stack>
         ) : product ? (
            <Stack spacing={2.5}>
               <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
               >
                  <Typography variant="h6" fontWeight={700}>
                     {product.productName}
                  </Typography>
                  <Chip
                     label={product?.customId || product?.productCode || "PROD"}
                     color="primary"
                     size="small"
                     sx={{ fontWeight: 700 }}
                  />
               </Stack>
               <Divider />
               <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        SKU Code
                     </Typography>
                     <Typography variant="body2" fontWeight={600}>
                        {product.productSku || "N/A"}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        Category
                     </Typography>
                     <Typography variant="body2" fontWeight={600}>
                        {product.category?.name || "General"}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        Regular Price
                     </Typography>
                     <Typography variant="body2" fontWeight={700}>
                        {formatCurrency(Number(product.regularPrice || 0))}
                     </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                     <Typography variant="caption" color="text.secondary">
                        Current Stock
                     </Typography>
                     <Typography
                        variant="body2"
                        fontWeight={700}
                        color={
                           product.quantity <= 10
                              ? "warning.main"
                              : "success.main"
                        }
                     >
                        {product.quantity} units{" "}
                        {product.quantity <= 10 && "(Low Stock)"}
                     </Typography>
                  </Grid>
               </Grid>
               {!isDescriptionEmpty(product.content) && (
                  <Box>
                     <Typography variant="caption" color="text.secondary">
                        Description
                     </Typography>
                     <HtmlRenderer
                        content={product.content}
                        sx={{ mt: 0.5 }}
                     />
                  </Box>
               )}
               <Divider />
               <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  pt={1}
               >
                  <PrintButton
                     label="Print Product Spec"
                     variant="outlined"
                     color="primary"
                     size="small"
                  />
                  <Button
                     onClick={onClose}
                     variant="contained"
                     color="inherit"
                     size="small"
                  >
                     Close
                  </Button>
               </Stack>
            </Stack>
         ) : (
            <Typography variant="body2" color="text.secondary">
               Product not found.
            </Typography>
         )}
      </CustomModal>
   );
};

// ==========================================
// 3. ORDER DETAIL MODAL
// ==========================================
export { default as OrderDetailModal } from "@src/Pages/admin/Order/components/OrderDetailModal";

// ==========================================
// 4. CUSTOMER DETAIL MODAL (With Order History & Success Rate)
// ==========================================
export { default as CustomerDetailModal } from "@src/Pages/admin/Customers/CustomerDetailModal";

// ==========================================
// 5. PURCHASE DETAIL MODAL
// ==========================================
export const PurchaseDetailModal = ({
   open,
   onClose,
   purchaseId,
}: {
   open: boolean;
   onClose: () => void;
   purchaseId?: string | null;
}) => {
   const { formatCurrency } = useSettings();
   const [purchase, setPurchase] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!open || !purchaseId) return;
      setLoading(true);
      fetch(`/api/purchases/${purchaseId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setPurchase(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, purchaseId]);

   const handleExportPurchaseDocx = () => {
      if (!purchase) return;
      exportToWord({
         filename: `PurchaseOrder_${purchase.purchaseNo || purchase.customId || "PO"}`,
         title: "Purchase Order",
         columns: [],
         data: [],
         isInvoice: true,
         invoiceData: {
            invoiceNo: purchase.purchaseNo || purchase.customId || "PO-000",
            orderId: purchase.customId,
            date: new Date(
               purchase.purchaseDate || purchase.createdAt,
            ).toLocaleDateString(),
            paymentMethod: purchase.paymentStatus || "PAID",
            status: purchase.status || "RECEIVED",
            storeName: "DevX POS",
            customerName: `Supplier: ${purchase.supplier?.name || "Direct Vendor"}`,
            customerPhone: purchase.supplier?.phone,
            customerAddress: purchase.supplier?.address,
            items: (purchase.items || []).map((it: any) => ({
               name: it.name || it.product?.productName || "Purchase Item",
               sku: it.sku || it.product?.sku || "-",
               quantity: Number(it.quantity),
               price: Number(it.price),
               subtotal: Number(it.subtotal),
            })),
            subtotal: Number(purchase.totalAmount || 0),
            total: Number(purchase.totalAmount || 0),
            paid: Number(purchase.paid || purchase.totalAmount || 0),
            due: Number(purchase.due || 0),
            notes: purchase.note,
         },
      });
   };

   const handleExportPurchaseXlsx = () => {
      if (!purchase) return;
      exportToExcel({
         filename: `PurchaseOrder_${purchase.purchaseNo || purchase.customId || "PO"}`,
         title: "Purchase Order",
         columns: [],
         data: [],
         isInvoice: true,
         invoiceData: {
            invoiceNo: purchase.purchaseNo || purchase.customId || "PO-000",
            orderId: purchase.customId,
            date: new Date(
               purchase.purchaseDate || purchase.createdAt,
            ).toLocaleDateString(),
            paymentMethod: purchase.paymentStatus || "PAID",
            status: purchase.status || "RECEIVED",
            storeName: "DevX POS",
            customerName: `Supplier: ${purchase.supplier?.name || "Direct Vendor"}`,
            customerPhone: purchase.supplier?.phone,
            customerAddress: purchase.supplier?.address,
            items: (purchase.items || []).map((it: any) => ({
               name: it.name || it.product?.productName || "Purchase Item",
               sku: it.sku || it.product?.sku || "-",
               quantity: Number(it.quantity),
               price: Number(it.price),
               subtotal: Number(it.subtotal),
            })),
            subtotal: Number(purchase.totalAmount || 0),
            total: Number(purchase.totalAmount || 0),
            paid: Number(purchase.paid || purchase.totalAmount || 0),
            due: Number(purchase.due || 0),
            notes: purchase.note,
         },
      });
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle
            sx={{
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
            }}
         >
            <Typography variant="h6" fontWeight={700}>
               Purchase Details
            </Typography>
            <Stack direction="row" spacing={1}>
               <Chip
                  label={`PUR: ${purchase?.customId || "PUR"}`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
               />
               <Chip
                  label={`INV: ${purchase?.invoice || "N/A"}`}
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 700 }}
               />
            </Stack>
         </DialogTitle>
         <DialogContent dividers>
            {loading ? (
               <Stack alignItems="center" py={5}>
                  <CircularProgress />
               </Stack>
            ) : purchase ? (
               <Stack spacing={2}>
                  <Grid container spacing={2}>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Purchase ID
                        </Typography>
                        <Typography
                           variant="body2"
                           fontWeight={700}
                           color="primary.main"
                        >
                           {purchase.customId || purchase.id}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Supplier Invoice ID
                        </Typography>
                        <Typography
                           variant="body2"
                           fontWeight={700}
                           color="secondary.main"
                        >
                           {purchase.invoice}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Supplier
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                           {purchase.supplier?.name || "Direct Vendor"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Date
                        </Typography>
                        <Typography variant="body2">
                           {new Date(purchase.createdAt).toLocaleDateString()}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Total Cost
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                           {formatCurrency(Number(purchase.total))}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Paid / Due
                        </Typography>
                        <Typography variant="body2">
                           Paid: {formatCurrency(Number(purchase.paid))} | Due:{" "}
                           {formatCurrency(Number(purchase.due))}
                        </Typography>
                     </Grid>
                  </Grid>

                  {/* Purchased Items */}
                  {Array.isArray(purchase.items) &&
                     purchase.items.length > 0 && (
                        <Box mt={1}>
                           <Typography
                              variant="subtitle2"
                              fontWeight={700}
                              mb={1}
                           >
                              Items ({purchase.items.length})
                           </Typography>
                           <Paper variant="outlined">
                              <Table size="small">
                                 <TableHead>
                                    <TableRow>
                                       <TableCell>Item Name</TableCell>
                                       <TableCell align="center">Qty</TableCell>
                                       <TableCell align="right">
                                          Unit Price
                                       </TableCell>
                                       <TableCell align="right">
                                          Subtotal
                                       </TableCell>
                                    </TableRow>
                                 </TableHead>
                                 <TableBody>
                                    {purchase.items.map((item: any) => (
                                       <TableRow key={item.id}>
                                          <TableCell>
                                             {item.name ||
                                                item.product?.productName ||
                                                "Item"}
                                          </TableCell>
                                          <TableCell align="center">
                                             {item.quantity}
                                          </TableCell>
                                          <TableCell align="right">
                                             {formatCurrency(
                                                Number(item.price),
                                             )}
                                          </TableCell>
                                          <TableCell
                                             align="right"
                                             sx={{ fontWeight: 700 }}
                                          >
                                             {formatCurrency(
                                                Number(item.subtotal),
                                             )}
                                          </TableCell>
                                       </TableRow>
                                    ))}
                                 </TableBody>
                              </Table>
                           </Paper>
                        </Box>
                     )}

                  {purchase.note && (
                     <Box>
                        <Typography variant="caption" color="text.secondary">
                           Note
                        </Typography>
                        <Typography variant="body2">{purchase.note}</Typography>
                     </Box>
                  )}
               </Stack>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  Purchase not found.
               </Typography>
            )}
         </DialogContent>
         <DialogActions
            sx={{
               justifyContent: "space-between",
               px: 3,
               py: 1.5,
               flexWrap: "wrap",
               gap: 1,
            }}
         >
            <Stack direction="row" spacing={1} alignItems="center">
               <PrintButton
                  label="Print Purchase Order"
                  variant="contained"
                  color="primary"
                  size="small"
               />
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                     <Icon icon="vscode-icons:file-type-word" size="small" />
                  }
                  onClick={handleExportPurchaseDocx}
               >
                  Word
               </Button>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                     <Icon icon="vscode-icons:file-type-excel" size="small" />
                  }
                  onClick={handleExportPurchaseXlsx}
               >
                  Excel
               </Button>
            </Stack>
            <Button
               onClick={onClose}
               variant="contained"
               color="inherit"
               size="small"
            >
               Close
            </Button>
         </DialogActions>
      </Dialog>
   );
};

// ==========================================
// 6. SUPPLIER DETAIL MODAL
// ==========================================
export const SupplierDetailModal = ({
   open,
   onClose,
   supplierId,
}: {
   open: boolean;
   onClose: () => void;
   supplierId?: string | null;
}) => {
   const { formatCurrency } = useSettings();
   const [supplier, setSupplier] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!open || !supplierId) return;
      setLoading(true);
      fetch(`/api/suppliers/${supplierId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setSupplier(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, supplierId]);

   const handleExportSupplierDocx = () => {
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
            {
               field: "Total Purchases",
               value: String(supplier.purchases?.length || 0),
            },
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
            {
               field: "Total Purchases",
               value: String(supplier.purchases?.length || 0),
            },
         ],
      });
   };

   return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
         <DialogTitle
            sx={{
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
            }}
         >
            <Typography variant="h6" fontWeight={700}>
               Supplier Information
            </Typography>
            <Chip
               label={supplier?.customId || "SUP"}
               color="primary"
               size="small"
               sx={{ fontWeight: 700 }}
            />
         </DialogTitle>
         <DialogContent dividers>
            {loading ? (
               <Stack alignItems="center" py={5}>
                  <CircularProgress />
               </Stack>
            ) : supplier ? (
               <Stack spacing={2}>
                  <Typography variant="h6">{supplier.name}</Typography>
                  <Grid container spacing={2}>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Phone
                        </Typography>
                        <Typography variant="body2">
                           {supplier.phone || "N/A"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">
                           Email
                        </Typography>
                        <Typography variant="body2">
                           {supplier.email || "N/A"}
                        </Typography>
                     </Grid>
                     <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">
                           Address
                        </Typography>
                        <Typography variant="body2">
                           {supplier.address || "N/A"}
                        </Typography>
                     </Grid>
                  </Grid>
                  <Divider />
                  <Typography variant="subtitle2" fontWeight={600}>
                     Associated Purchases ({supplier.purchases?.length || 0})
                  </Typography>
               </Stack>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  Supplier not found.
               </Typography>
            )}
         </DialogContent>
         <DialogActions
            sx={{
               justifyContent: "space-between",
               px: 3,
               py: 1.5,
               flexWrap: "wrap",
               gap: 1,
            }}
         >
            <Stack direction="row" spacing={1} alignItems="center">
               <PrintButton
                  label="Print Supplier Statement"
                  variant="outlined"
                  color="primary"
                  size="small"
               />
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                     <Icon icon="vscode-icons:file-type-word" size="small" />
                  }
                  onClick={handleExportSupplierDocx}
               >
                  Word
               </Button>
               <Button
                  variant="outlined"
                  size="small"
                  startIcon={
                     <Icon icon="vscode-icons:file-type-excel" size="small" />
                  }
                  onClick={handleExportSupplierXlsx}
               >
                  Excel
               </Button>
            </Stack>
            <Button
               onClick={onClose}
               variant="contained"
               color="inherit"
               size="small"
            >
               Close
            </Button>
         </DialogActions>
      </Dialog>
   );
};

// ==========================================
// 7. EXPENSE DETAIL MODAL
// ==========================================
export const ExpenseDetailModal = ({
   open,
   onClose,
   expenseId,
}: {
   open: boolean;
   onClose: () => void;
   expenseId?: string | null;
}) => {
   const { formatCurrency } = useSettings();
   const [expense, setExpense] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!open || !expenseId) return;
      setLoading(true);
      fetch(`/api/expenses/${expenseId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setExpense(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, expenseId]);

   return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
         <DialogTitle
            sx={{
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
            }}
         >
            <Typography variant="h6" fontWeight={700}>
               Expense Voucher
            </Typography>
            <Chip
               label={expense?.customId || "EXP"}
               color="warning"
               size="small"
               sx={{ fontWeight: 700 }}
            />
         </DialogTitle>
         <DialogContent dividers>
            {loading ? (
               <Stack alignItems="center" py={4}>
                  <CircularProgress />
               </Stack>
            ) : expense ? (
               <Stack spacing={2}>
                  <Box>
                     <Typography variant="caption" color="text.secondary">
                        Category / Type
                     </Typography>
                     <Typography variant="h6">{expense.type}</Typography>
                  </Box>
                  <Box>
                     <Typography variant="caption" color="text.secondary">
                        Amount
                     </Typography>
                     <Typography
                        variant="h5"
                        fontWeight={700}
                        color="error.main"
                     >
                        {formatCurrency(Number(expense.amount))}
                     </Typography>
                  </Box>
                  <Box>
                     <Typography variant="caption" color="text.secondary">
                        Date
                     </Typography>
                     <Typography variant="body2">
                        {new Date(expense.createdAt).toLocaleDateString()}
                     </Typography>
                  </Box>
                  {expense.note && (
                     <Box>
                        <Typography variant="caption" color="text.secondary">
                           Note
                        </Typography>
                        <Typography variant="body2">{expense.note}</Typography>
                     </Box>
                  )}
               </Stack>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  Expense record not found.
               </Typography>
            )}
         </DialogContent>
         <DialogActions
            sx={{ justifyContent: "space-between", px: 3, py: 1.5 }}
         >
            <PrintButton
               label="Print Expense Voucher"
               variant="outlined"
               color="primary"
               size="small"
            />
            <Button
               onClick={onClose}
               variant="contained"
               color="inherit"
               size="small"
            >
               Close
            </Button>
         </DialogActions>
      </Dialog>
   );
};

// ==========================================
// 8. ASSET DETAIL MODAL
// ==========================================
export const AssetDetailModal = ({
   open,
   onClose,
   assetId,
}: {
   open: boolean;
   onClose: () => void;
   assetId?: string | null;
}) => {
   const { formatCurrency } = useSettings();
   const [asset, setAsset] = useState<any>(null);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!open || !assetId) return;
      setLoading(true);
      fetch(`/api/assets/${assetId}`)
         .then((r) => (r.ok ? r.json() : null))
         .then((d) => setAsset(d))
         .catch(() => {})
         .finally(() => setLoading(false));
   }, [open, assetId]);

   return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
         <DialogTitle
            sx={{
               display: "flex",
               justifyContent: "space-between",
               alignItems: "center",
            }}
         >
            <Typography variant="h6" fontWeight={700}>
               Asset Details
            </Typography>
            <Chip
               label={asset?.customId || "AST"}
               color="primary"
               size="small"
               sx={{ fontWeight: 700 }}
            />
         </DialogTitle>
         <DialogContent dividers>
            {loading ? (
               <Stack alignItems="center" py={4}>
                  <CircularProgress />
               </Stack>
            ) : asset ? (
               <Stack spacing={2}>
                  <Box>
                     <Typography variant="caption" color="text.secondary">
                        Asset Name
                     </Typography>
                     <Typography variant="h6">{asset.name}</Typography>
                  </Box>
                  <Box>
                     <Typography variant="caption" color="text.secondary">
                        Asset Value
                     </Typography>
                     <Typography
                        variant="h5"
                        fontWeight={700}
                        color="primary.main"
                     >
                        {formatCurrency(Number(asset.value))}
                     </Typography>
                  </Box>
                  <Box>
                     <Typography variant="caption" color="text.secondary">
                        Category
                     </Typography>
                     <Typography variant="body2">
                        {asset.category || "General Store Asset"}
                     </Typography>
                  </Box>
                  {asset.description && (
                     <Box>
                        <Typography variant="caption" color="text.secondary">
                           Description
                        </Typography>
                        <Typography variant="body2">
                           {asset.description}
                        </Typography>
                     </Box>
                  )}
               </Stack>
            ) : (
               <Typography variant="body2" color="text.secondary">
                  Asset not found.
               </Typography>
            )}
         </DialogContent>
         <DialogActions
            sx={{ justifyContent: "space-between", px: 3, py: 1.5 }}
         >
            <PrintButton
               label="Print Asset Record"
               variant="outlined"
               color="primary"
               size="small"
            />
            <Button
               onClick={onClose}
               variant="contained"
               color="inherit"
               size="small"
            >
               Close
            </Button>
         </DialogActions>
      </Dialog>
   );
};
