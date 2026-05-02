import {
   Grid,
   Stack,
   Typography,
   Button,
   TextField,
   InputAdornment,
   IconButton,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import UploadPhoto from "./imageUploader";
import CustomAutocomplete, { OptionType } from "@src/components/Autocomplete";
import { roles, UserProps } from ".";
import { Controller, useForm } from "react-hook-form";
import Icon from "@src/components/Icon";

interface ModalProps {
   mode: "add" | "edit";
   onClose?: () => void;
   editUserData?: UserProps;
   onAddUser?: (data: UserProps) => void;
   onEditUser?: (newData: UserProps) => void;
}

const Modal = ({
   mode,
   onClose,
   editUserData,
   onAddUser,
   onEditUser,
}: ModalProps) => {
   const {
      control,
      handleSubmit,
      watch,
      reset,
      formState: { errors },
   } = useForm<UserProps>({
      defaultValues: {
         name: editUserData?.name || "",
         email: editUserData?.email || "",
         phoneNumber: editUserData?.phoneNumber || "",
         address: editUserData?.address || "",
         role: editUserData?.role || "",
         password: "",
         confirmPassword: "",
         profileUrl: editUserData?.profileUrl || "",
      },
   });
   const passwordValue = watch("password");
   const [passwordShow, setPasswordShow] = useState(false);
   const [file, setFile] = useState<File | null>(editUserData?.file || null);

   const onSubmit = (data: UserProps) => {
      const finalData = {
         ...data,
         file, // send file to backend
      };
      if (mode === "edit") {
         onEditUser?.(finalData);
      } else {
         onAddUser?.(finalData);
      }
      onClose?.();
   };

   return (
      <Stack direction={"row"} alignItems={"center"} spacing={4} p={2}>
         <Stack direction={"row"}>
            <Controller
               name="profileUrl"
               control={control}
               render={({ field }) => (
                  <UploadPhoto
                     onUpload={(file: File) => {
                        setFile(file);
                        const objectUrl = URL.createObjectURL(file);
                        field.onChange(objectUrl);
                     }}
                     file={file}
                  />
               )}
            />
         </Stack>
         <form onSubmit={handleSubmit(onSubmit)}>
            <Stack direction={"row"} alignItems={"center"} spacing={4} p={2}>
               <Stack width={"100%"}>
                  <Grid container spacing={2}>
                     {/* Full Name */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                           name="name"
                           control={control}
                           rules={{
                              required: "Full name is required",
                              minLength: {
                                 value: 3,
                                 message: "Minimum 3 characters",
                              },
                           }}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Full Name"
                                 error={!!errors.name}
                                 helperText={errors.name?.message}
                                 fullWidth
                              />
                           )}
                        />
                     </Grid>

                     {/* Email */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                           name="email"
                           control={control}
                           rules={{
                              required: "Email is required",
                              pattern: {
                                 value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                 message: "Invalid email",
                              },
                           }}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="E-mail"
                                 error={!!errors.email}
                                 helperText={errors.email?.message}
                                 fullWidth
                              />
                           )}
                        />
                     </Grid>

                     {/* Address */}
                     <Grid size={{ xs: 12 }}>
                        <Controller
                           name="address"
                           control={control}
                           rules={{
                              required: "Address is required",
                           }}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Address"
                                 error={!!errors.address}
                                 helperText={errors.address?.message}
                                 fullWidth
                              />
                           )}
                        />
                     </Grid>

                     {/* Phone */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                           name="phoneNumber"
                           control={control}
                           rules={{
                              required: "Phone number is required",
                              pattern: {
                                 value: /^\d{11}$/,
                                 message: "Phone must be 11 digits",
                              },
                           }}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Phone Number"
                                 type="text"
                                 error={!!errors.phoneNumber}
                                 helperText={errors.phoneNumber?.message}
                                 InputProps={{
                                    startAdornment: (
                                       <InputAdornment position="start">
                                          +88
                                       </InputAdornment>
                                    ),
                                 }}
                                 inputProps={{
                                    inputMode: "numeric",
                                 }}
                                 fullWidth
                              />
                           )}
                        />
                     </Grid>

                     {/* Role */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                           name="role"
                           control={control}
                           rules={{
                              required: "Role is required",
                           }}
                           render={({ field }) => (
                              <>
                                 <CustomAutocomplete
                                    {...field}
                                    options={roles.map((r) => ({
                                       label: r,
                                       value: r,
                                    }))}
                                    label="Role"
                                    onChange={(v: OptionType | null) =>
                                       field.onChange(v?.value || "")
                                    }
                                    value={field.value}
                                    error={!!errors.role}
                                 />
                                 {errors.role && (
                                    <Typography color="error" fontSize={12}>
                                       {errors.role.message}
                                    </Typography>
                                 )}
                              </>
                           )}
                        />
                     </Grid>

                     {/* Password */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                           name="password"
                           control={control}
                           rules={{
                              validate: (value) => {
                                 if (mode === "edit" && !value) return true;
                                 if (value.length < 6)
                                    return "Minimum 6 characters";
                                 return true;
                              },
                           }}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Password"
                                 type={passwordShow ? "text" : "password"}
                                 error={!!errors.password}
                                 helperText={errors.password?.message}
                                 fullWidth
                                 InputProps={{
                                    endAdornment: (
                                       <IconButton
                                          size="small"
                                          onClick={() =>
                                             setPasswordShow(!passwordShow)
                                          }
                                       >
                                          <Icon
                                             size="small"
                                             icon={
                                                passwordShow
                                                   ? "solar:eye-bold-duotone"
                                                   : "solar:eye-closed-bold-duotone"
                                             }
                                          />
                                       </IconButton>
                                    ),
                                 }}
                              />
                           )}
                        />
                     </Grid>

                     {/* Confirm Password */}
                     <Grid size={{ xs: 12, md: 6 }}>
                        <Controller
                           name="confirmPassword"
                           control={control}
                           rules={{
                              validate: (value) => {
                                 if (mode === "edit" && !watch("password"))
                                    return true;
                                 return (
                                    value === passwordValue ||
                                    "Passwords do not match"
                                 );
                              },
                           }}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 label="Confirm Password"
                                 type={passwordShow ? "text" : "password"}
                                 error={!!errors.confirmPassword}
                                 helperText={errors.confirmPassword?.message}
                                 fullWidth
                                 InputProps={{
                                    endAdornment: (
                                       <IconButton
                                          size="small"
                                          onClick={() =>
                                             setPasswordShow(!passwordShow)
                                          }
                                       >
                                          <Icon
                                             size="small"
                                             icon={
                                                passwordShow
                                                   ? "solar:eye-bold-duotone"
                                                   : "solar:eye-closed-bold-duotone"
                                             }
                                          />
                                       </IconButton>
                                    ),
                                 }}
                              />
                           )}
                        />
                     </Grid>
                  </Grid>

                  <Stack
                     direction="row"
                     justifyContent="flex-end"
                     spacing={2}
                     mt={2}
                  >
                     <Button
                        variant="text"
                        color="inherit"
                        onClick={() => {
                           reset();
                           onClose?.();
                        }}
                     >
                        Cancel
                     </Button>

                     <Button type="submit" variant="contained">
                        {mode === "edit" ? "Update user" : "Add user"}
                     </Button>
                  </Stack>
               </Stack>
            </Stack>
         </form>
      </Stack>
   );
};

export default Modal;
