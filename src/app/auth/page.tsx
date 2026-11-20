"use client";

import React, { useState } from "react";
import {
   Box,
   Typography,
   TextField,
   Button,
   IconButton,
   InputAdornment,
   Link,
   useTheme,
   useMediaQuery,
   Stack,
   Dialog,
   DialogTitle,
   DialogContent,
   Snackbar,
   CircularProgress,
   Fade,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Scrollbar from "react-browser-scrollbar";
import { Icon } from "@iconify/react";
import CustomBox from "@src/components/CustomBox";

// Validation schemas
const loginSchema = yup.object({
   email: yup.string().email("Invalid email").required("Email is required"),
   password: yup.string().required("Password is required"),
});

const forgotSchema = yup.object({
   email: yup.string().email("Invalid email").required("Email is required"),
});

interface FormProps {
   email: string;
   password: string;
}

const LoginPage = () => {
   const [showPassword, setShowPassword] = useState(false);
   const [openForgotModal, setOpenForgotModal] = useState(false);
   const [snackbarOpen, setSnackbarOpen] = useState(false);
   const [snackbarMessage, setSnackbarMessage] = useState("");
   const [loading, setLoading] = useState(false);

   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("md"));

   // Login form. Public registration is closed (accounts are
   // created by an administrator), so this page is sign-in only —
   // the previous sign-up mode and dummy social buttons were
   // removed (P2-21): the API forbids public sign-up and no social
   // auth exists.
   const {
      control,
      handleSubmit,
      formState: { errors },
   } = useForm<FormProps>({
      resolver: yupResolver(loginSchema),
      defaultValues: {
         email: "",
         password: "",
      },
   });

   // Form for forgot password
   const {
      control: forgotControl,
      handleSubmit: handleSubmitForgot,
      formState: { errors: forgotErrors },
      reset: resetForgot,
   } = useForm({
      resolver: yupResolver(forgotSchema),
      defaultValues: { email: "" },
   });

   const onSubmit = async (data: any) => {
      setLoading(true);
      try {
         const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
         });
         if (res.ok) {
            setSnackbarMessage("Login successful!");
            setSnackbarOpen(true);
            window.location.href = "/admin/dashboard";
         } else {
            const errData = await res.json().catch(() => ({}));
            setSnackbarMessage(errData.error || "Invalid email or password");
            setSnackbarOpen(true);
         }
      } catch {
         setSnackbarMessage("Network error. Please try again.");
         setSnackbarOpen(true);
      } finally {
         setLoading(false);
      }
   };

   const onSubmitForgot = async (data: any) => {
      setLoading(true);
      try {
         await new Promise((r) => setTimeout(r, 1500));
         setSnackbarOpen(true);
         setOpenForgotModal(false);
         resetForgot();
      } finally {
         setLoading(false);
      }
   };

   return (
      <Box
         sx={{
            display: "flex",
            minHeight: "100vh",
            bgcolor: "background.default",
            color: "text.primary",
         }}
      >
         {!isMobile && (
            <CustomBox
               sx={{
                  flex: 1,
                  color: "text.primary",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  p: 4,
                  backgroundColor: "background.paper",
               }}
            >
               <Typography variant="h4" fontWeight={700}>
                  Hi, Welcome back
               </Typography>
               <Typography variant="body2" sx={{ mt: 1, mb: 4 }}>
                  More effectively with optimized workflows.
               </Typography>
               <Box
                  component="img"
                  src="/images/login.webp"
                  alt="Illustration"
                  sx={{
                     width: "100%",
                     maxWidth: 380,
                     // backgroundColor: "background.paper",
                  }}
               />
            </CustomBox>
         )}

         <Box
            sx={{
               flex: 1,
               py: 6,
               px: 6,
               maxWidth: 480,
               mx: "auto",
            }}
         >
            <Scrollbar
               autoHide
               thumbSize={6}
               darkMode
               style={{
                  height: "100%",
               }}
            >
               <Box
                  sx={{
                     display: "flex",
                     flexDirection: "column",
                     justifyContent: "center",
                     height: "100%",
                  }}
               >
                  <Typography variant="h5" fontWeight={600} mb={1}>
                     Sign in to your account
                  </Typography>
                  <Typography variant="body2" mb={3}>
                     Accounts are created by your store administrator.
                  </Typography>

                  <Fade in key="login">
                     <Box
                        component="form"
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                     >
                        <Stack spacing={2} py={1}>
                           <Controller
                              name="email"
                              control={control}
                              render={({ field }) => (
                                 <TextField
                                    {...field}
                                    fullWidth
                                    label="Email address"
                                    error={!!errors.email}
                                    helperText={errors.email?.message}
                                    autoComplete="email"
                                 />
                              )}
                           />

                           <Controller
                              name="password"
                              control={control}
                              render={({ field }) => (
                                 <TextField
                                    {...field}
                                    fullWidth
                                    label="Password"
                                    type={showPassword ? "text" : "password"}
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                    autoComplete="current-password"
                                    InputProps={{
                                       endAdornment: (
                                          <InputAdornment position="end">
                                             <IconButton
                                                onClick={() =>
                                                   setShowPassword(
                                                      !showPassword
                                                   )
                                                }
                                                edge="end"
                                                aria-label={
                                                   showPassword
                                                      ? "Hide password"
                                                      : "Show password"
                                                }
                                             >
                                                {showPassword ? (
                                                   <Icon icon="solar:eye-closed-bold" />
                                                ) : (
                                                   <Icon icon="solar:eye-bold" />
                                                )}
                                             </IconButton>
                                          </InputAdornment>
                                       ),
                                    }}
                                 />
                              )}
                           />

                           <Box
                              sx={{
                                 display: "flex",
                                 justifyContent: "flex-end",
                              }}
                           >
                              <Link
                                 href="#"
                                 variant="body2"
                                 onClick={() => setOpenForgotModal(true)}
                              >
                                 Forgot password?
                              </Link>
                           </Box>

                           <Button
                              variant="contained"
                              size="large"
                              fullWidth
                              type="submit"
                              disabled={loading}
                              color="primary"
                              startIcon={
                                 loading && <CircularProgress size={20} />
                              }
                           >
                              Sign In
                           </Button>
                        </Stack>
                     </Box>
                  </Fade>

               </Box>
            </Scrollbar>
         </Box>

         {/* Forgot Password Modal */}
         <Dialog
            open={openForgotModal}
            onClose={() => setOpenForgotModal(false)}
         >
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
               <form onSubmit={handleSubmitForgot(onSubmitForgot)}>
                  <Controller
                     name="email"
                     control={forgotControl}
                     render={({ field }) => (
                        <TextField
                           {...field}
                           fullWidth
                           margin="normal"
                           label="Email"
                           error={!!forgotErrors.email}
                           helperText={forgotErrors.email?.message}
                           autoComplete="email"
                        />
                     )}
                  />
                  <Button
                     variant="contained"
                     type="submit"
                     fullWidth
                     sx={{ mt: 2 }}
                     disabled={loading}
                     startIcon={loading && <CircularProgress size={20} />}
                  >
                     Send reset link
                  </Button>
               </form>
            </DialogContent>
         </Dialog>

         {/* Snackbar */}
         <Snackbar
            open={snackbarOpen}
            autoHideDuration={4000}
            onClose={() => setSnackbarOpen(false)}
            message={snackbarMessage || "Reset link has been sent!"}
         />
      </Box>
   );
};

export default LoginPage;
