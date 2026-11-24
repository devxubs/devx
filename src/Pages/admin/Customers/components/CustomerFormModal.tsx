"use client";

// Customers page — Add / Edit customer modal (Phase 2, mission §2.2).
//
// The field set, validation, and duplicate-phone handling follow the
// existing AddCustomerModal in Order Create (the codebase's customer
// form pattern): name + phone required, phone/email format checks, and
// the API's 409 duplicate-phone response surfaced as an error. Create
// uses POST /api/customers; edit uses PUT /api/customers/:id — both
// validate and recompute nothing client-side, and the parent reloads
// the analytics list after a save so the stats stay accurate.
import {
   Button,
   CircularProgress,
   Grid,
   Stack,
   TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import CustomModal from "@src/components/Modal";
import { useSnackbar } from "@src/lib/snackbarContext";
import { CustomerRow } from "./customerFilterUtils";

interface CustomerFormModalProps {
   open: boolean;
   /** null = add mode; a row = edit that customer. */
   customer: CustomerRow | null;
   onClose: () => void;
   onSaved: (message: string) => void;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
   open,
   customer,
   onClose,
   onSaved,
}) => {
   const isEdit = Boolean(customer);
   const { showSnackbar } = useSnackbar();
   const [name, setName] = useState("");
   const [phone, setPhone] = useState("");
   const [email, setEmail] = useState("");
   const [address, setAddress] = useState("");
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      if (!open) return;
      setName(customer?.name || "");
      setPhone(customer?.phone || "");
      setEmail(customer?.email || "");
      setAddress(customer?.address || "");
      setError(null);
      setSaving(false);
   }, [open, customer]);

   const handleSave = async () => {
      if (saving) return;
      if (!name.trim()) {
         showSnackbar("Customer name is required", "error");
         return setError("Customer name is required");
      }
      if (!phone.trim()) {
         showSnackbar("Phone number is required", "error");
         return setError("Phone number is required");
      }
      if (!/^[0-9+\-\s()]+$/.test(phone.trim())) {
         showSnackbar("Invalid phone number", "error");
         return setError("Invalid phone number");
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
         showSnackbar("Invalid email address", "error");
         return setError("Invalid email address");
      }
      setSaving(true);
      setError(null);
      try {
         const res = await fetch(
            isEdit ? `/api/customers/${customer!.id}` : "/api/customers",
            {
               method: isEdit ? "PUT" : "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                  name: name.trim(),
                  phone: phone.trim(),
                  email: email.trim(),
                  address: address.trim(),
               }),
            },
         );
         const data = await res.json().catch(() => ({}));
         if (!res.ok) {
            // 409 = duplicate phone (the API returns the same message
            // for create and edit); show it verbatim.
            throw new Error(data.error || "Failed to save customer");
         }
         showSnackbar(isEdit ? "Customer updated successfully." : "Customer added successfully.", "success");
         onSaved(
            isEdit
               ? "Customer updated."
               : "Customer added.",
         );
         onClose();
      } catch (err: any) {
         const errMsg = err?.message || "Failed to save customer";
         setError(errMsg);
         showSnackbar(errMsg, "error");
      } finally {
         setSaving(false);
      }
   };

   return (
      <CustomModal
         open={open}
         onClose={onClose}
         title={isEdit ? "Edit Customer" : "Add New Customer"}
         closeIcon
         sx={{
            width: { xs: "92vw", sm: 560 },
            maxWidth: 560,
            maxHeight: "90vh",
            overflowY: "auto",
         }}
      >
         <Stack spacing={2}>
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                     label="Full Name *"
                     fullWidth
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="Customer name"
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                     label="Phone Number *"
                     fullWidth
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     placeholder="01XXXXXXXXX"
                     type="tel"
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                     label="E-mail"
                     fullWidth
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="customer@mail.com"
                  />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                     label="Billing Address"
                     fullWidth
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     placeholder="Street, City"
                  />
               </Grid>
            </Grid>
            <Stack
               direction="row"
               spacing={1.5}
               justifyContent="flex-end"
               flexWrap="wrap"
            >
               <Button
                  variant="text"
                  color="inherit"
                  onClick={onClose}
                  disabled={saving}
                  sx={{ textTransform: "none" }}
               >
                  Cancel
               </Button>
               <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={
                     saving ? (
                        <CircularProgress size={16} color="inherit" />
                     ) : undefined
                  }
                  sx={{ textTransform: "none" }}
               >
                  {isEdit ? "Update Customer" : "Save Customer"}
               </Button>
            </Stack>
         </Stack>
      </CustomModal>
   );
};

export default CustomerFormModal;
