import { Button, Stack, TextField } from "@mui/material";
import CustomAutocomplete, {
   CustomAutocompleteOptionType,
} from "@src/components/Autocomplete";
import React from "react";
import { Controller, useForm } from "react-hook-form";

interface FormData {
   amount: string;
   paymentMethod: CustomAutocompleteOptionType;
   transactionId: string;
}

interface ModalProps {
   onSubmit: (formData: FormData) => void;
}

const Modal = ({ onSubmit }: ModalProps) => {
   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm({
      defaultValues: {
         amount: "",
         paymentMethod: { label: "", value: "" },
         transactionId: "",
      },
   });

   return (
      <Stack
         component={"form"}
         onSubmit={handleSubmit(onSubmit)}
         spacing={2}
         width={{ xs: "300px", sm: "400px" }}
      >
         <Stack>
            <Controller
               name="amount"
               control={control}
               render={({ field }) => (
                  <TextField
                     {...field}
                     label="Amount"
                     type="text"
                     error={!!errors.amount}
                     helperText={errors.amount?.message}
                     inputProps={{
                        inputMode: "numeric",
                     }}
                     fullWidth
                  />
               )}
            />
         </Stack>
         <Stack>
            <Controller
               name="paymentMethod"
               control={control}
               render={({ field }) => (
                  <CustomAutocomplete
                     label="Payment Method"
                     error={!!errors.paymentMethod}
                     helperText={errors.paymentMethod?.message}
                     fullWidth
                     options={[
                        { label: "Credit Card", value: "credit_card" },
                        { label: "PayPal", value: "paypal" },
                        { label: "Bank Transfer", value: "bank_transfer" },
                        { label: "Bkash", value: "bkash" },
                     ]}
                     value={field.value?.value || null}
                     onChange={(newValue, event) =>
                        field.onChange(newValue || { label: "", value: "" })
                     }
                     onBlur={field.onBlur}
                     ref={field.ref}
                  />
               )}
            />
         </Stack>
         <Stack>
            <Controller
               name="transactionId"
               control={control}
               render={({ field }) => (
                  <TextField
                     {...field}
                     label="Transaction ID"
                     type="text"
                     error={!!errors.transactionId}
                     helperText={errors.transactionId?.message}
                     inputProps={{
                        inputMode: "numeric",
                     }}
                     fullWidth
                  />
               )}
            />
         </Stack>
         <Stack
            direction={"row"}
            alignItems="center"
            justifyContent="flex-end"
            spacing={2}
         >
            <Button variant="text" color="inherit" onClick={() => reset()}>
               Cancel
            </Button>
            <Button variant="contained" color="primary" type="submit">
               Pay
            </Button>
         </Stack>
      </Stack>
   );
};

export default Modal;
