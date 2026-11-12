"use client";

// Order Create (upgrade) — "Add Customer" modal local to Order Create.
// Uses the real POST /api/customers. The API validates the phone format and
// returns 409 with the existing customer's identity on a duplicate phone —
// in that case the user can select that existing customer instead.
// Customer Management pages/components are not touched.
import {
   Alert,
   Button,
   CircularProgress,
   Dialog,
   DialogActions,
   DialogContent,
   DialogTitle,
   Grid,
   Stack,
   TextField,
   Typography,
} from "@mui/material";
import React, { useState } from "react";
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
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
         <DialogTitle>Add New Customer</DialogTitle>
         <DialogContent>
            <Stack spacing={2} pt={1}>
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
            </Stack>
         </DialogContent>
         <DialogActions>
            <Button variant="text" color="inherit" onClick={handleClose} disabled={saving}>
               Cancel
            </Button>
            {duplicate && (
               <Button variant="outlined" onClick={handleUseExisting} disabled={saving}>
                  Use existing: {duplicate.name}
               </Button>
            )}
            <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>
               Save Customer
            </Button>
         </DialogActions>
      </Dialog>
   );
};

export default AddCustomerModal;
