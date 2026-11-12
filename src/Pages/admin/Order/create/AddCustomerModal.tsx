"use client";

// Order Create — "Add Customer" modal.
// The shell is the project's shared CustomModal (src/components/Modal.tsx),
// the same modal wrapper the rest of the app uses (e.g. CustomerDetailModal).
// No create-capable shared customer form exists in src/components, so the
// form fields live here, but all presentation chrome comes from the shared
// component — its source and defaults are untouched.
//
// Uses the real POST /api/customers. The API validates the phone format and
// returns 409 with the existing customer's identity on a duplicate phone —
// in that case the user can select that existing customer instead.
// On success the created customer is handed back via onCreated and the
// Order Create page selects it automatically.
import { Alert, Button, CircularProgress, Grid, Stack, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import CustomModal from "@src/components/Modal";
import type { ApiCustomer } from "./types";

interface AddCustomerModalProps {
   open: boolean;
   onClose: () => void;
   /** Called with the created (or chosen existing) customer. */
   onCreated: (customer: ApiCustomer) => void;
}

const AddCustomerModal = ({ open, onClose, onCreated }: AddCustomerModalProps) => {
   const [name, setName] = useState("");
   const [phone, setPhone] = useState("");
   const [email, setEmail] = useState("");
   const [address, setAddress] = useState("");
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);

   const reset = () => {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setError(null);
      setDuplicate(null);
   };

   const handleClose = () => {
      reset();
      onClose();
   };

   const handleUseExisting = async () => {
      if (!duplicate) return;
      setSaving(true);
      try {
         const res = await fetch(`/api/customers?search=${encodeURIComponent(phone)}&limit=5`);
         const data = res.ok ? await res.json() : { customers: [] };
         const found = (data.customers || []).find((c: ApiCustomer) => c.id === duplicate.id) || data.customers?.[0];
         if (found) {
            onCreated(found);
            handleClose();
         } else {
            setError("Could not load the existing customer. Search for them above instead.");
         }
      } catch {
         setError("Could not load the existing customer.");
      } finally {
         setSaving(false);
      }
   };

   const handleSave = async () => {
      if (saving) return;
      if (!name.trim()) return setError("Customer name is required");
      if (!phone.trim()) return setError("Phone number is required");
      if (!/^[0-9+\-\s()]+$/.test(phone.trim())) return setError("Invalid phone number");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Invalid email address");
      setSaving(true);
      setError(null);
      setDuplicate(null);
      try {
         const res = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               name: name.trim(),
               phone: phone.trim(),
               email: email.trim(),
               address: address.trim(),
            }),
         });
         const data = await res.json().catch(() => ({}));
         if (res.status === 409 && data.existingCustomer) {
            setDuplicate({ id: data.existingCustomer.id, name: data.existingCustomer.name });
            setError(data.error || "A customer with this phone number already exists");
            return;
         }
         if (!res.ok) throw new Error(data.error || "Failed to create customer");
         onCreated(data as ApiCustomer);
         handleClose();
      } catch (err: any) {
         setError(err?.message || "Failed to create customer");
      } finally {
         setSaving(false);
      }
   };

   return (
      <CustomModal
         open={open}
         onClose={handleClose}
         title="Add New Customer"
         closeIcon
         sx={{ width: { xs: "92vw", sm: 560 }, maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
      >
         <Stack spacing={2}>
            {error && <Alert severity={duplicate ? "warning" : "error"}>{error}</Alert>}
            <Grid container spacing={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Full Name *" fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Phone Number *" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" type="tel" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="E-mail" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@mail.com" />
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  <TextField label="Billing Address" fullWidth value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City" />
               </Grid>
            </Grid>
            <Typography variant="caption" color="textSecondary">
               The new customer is saved through the Customer API and selected automatically.
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="flex-end" flexWrap="wrap">
               <Button variant="text" color="inherit" onClick={handleClose} disabled={saving} sx={{ textTransform: "none" }}>
                  Cancel
               </Button>
               {duplicate && (
                  <Button variant="outlined" onClick={handleUseExisting} disabled={saving} sx={{ textTransform: "none" }}>
                     Use existing: {duplicate.name}
                  </Button>
               )}
               <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
                  sx={{ textTransform: "none" }}
               >
                  Save Customer
               </Button>
            </Stack>
         </Stack>
      </CustomModal>
   );
};

export default AddCustomerModal;
