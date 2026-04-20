import { Button, Stack, TextField, Typography } from "@mui/material";
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
   onClose: () => void;
}

const Modal = ({ onSubmit, onClose }: ModalProps) => {
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
         <Stack
            bgcolor="background.paper"
            borderRadius={2}
            p={2}
            pt={0}
            spacing={0.1}
         >
            <Stack direction={"row"} alignItems="center" spacing={1} mb={1}>
               <Typography variant="body1" color="textSecondary">
                  Account name
               </Typography>
               :<Typography variant="subtitle2">Demo Commerce BD</Typography>
            </Stack>
            <Stack direction={"row"} alignItems="center" spacing={1} mb={1}>
               <Typography variant="body1" color="textSecondary">
                  Account number
               </Typography>
               :<Typography variant="subtitle2">22334455667788</Typography>
            </Stack>
            <Stack direction={"row"} alignItems="center" spacing={1} mb={1}>
               <Typography variant="body1" color="textSecondary">
                  Routing number
               </Typography>
               :<Typography variant="subtitle2">112233445</Typography>
            </Stack>
            <Stack direction={"row"} alignItems="center" spacing={1} mb={1}>
               <Typography variant="body1" color="textSecondary">
                  Brunch
               </Typography>
               :
               <Typography variant="subtitle2">Uttara Branch, Dhaka</Typography>
            </Stack>
         </Stack>
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
                     value={field.value?.label || null}
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
            <Button
               variant="text"
               color="inherit"
               onClick={() => {
                  reset();
                  onClose();
               }}
            >
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
