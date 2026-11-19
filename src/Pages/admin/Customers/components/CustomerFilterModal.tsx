"use client";

import React from "react";
import FilterModalShell from "@src/components/FilterModalShell";
import CustomerFilters from "./CustomerFilters";
import {
   CustomerFilterErrors,
   CustomerFilterState,
} from "./customerFilterUtils";

interface CustomerFilterModalProps {
   open: boolean;
   onClose: () => void;
   draftFilters: CustomerFilterState;
   onDraftChange: (filters: CustomerFilterState) => void;
   onApply: () => void;
   onReset: () => void;
   applying?: boolean;
   errors?: CustomerFilterErrors;
   showErrors?: boolean;
   currencySymbol?: string;
}

// Phase 2 (2.12): the modal frame, scrollable body and
// Reset/Cancel/Apply footer now come from the shared FilterModalShell
// (extracted from this component's original markup — same sizes,
// same footer, same behaviour); only the customer filter fields
// remain local.
const CustomerFilterModal: React.FC<CustomerFilterModalProps> = ({
   open,
   onClose,
   draftFilters,
   onDraftChange,
   onApply,
   onReset,
   applying = false,
   errors = {},
   showErrors = false,
   currencySymbol = "৳",
}) => {
   return (
      <FilterModalShell
         open={open}
         onClose={onClose}
         title="Customer Filters"
         onApply={onApply}
         onReset={onReset}
         applying={applying}
      >
         <CustomerFilters
            value={draftFilters}
            onChange={onDraftChange}
            errors={errors}
            showErrors={showErrors}
            currencySymbol={currencySymbol}
         />
      </FilterModalShell>
   );
};

export default CustomerFilterModal;
