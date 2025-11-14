"use client";

import React, { useState, useEffect } from "react";
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
   LinearProgress,
   Fade,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Scrollbar from "react-browser-scrollbar";
import { Icon } from "@iconify/react";
import CustomBox from "@src/components/CustomBox";

// Validation schemas
const signupSchema = yup.object({
   fullName: yup.string().required("Full name is required"),
   businessName: yup.string().required("Business name is required"),
   businessAddress: yup.string().required("Business address is required"),
   mobileNumber: yup
      .string()
      .matches(/^\+?\d{7,15}$/, "Invalid mobile number")
      .required("Mobile number is required"),
   email: yup.string().email("Invalid email").required("Email is required"),
   password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
   confirmPassword: yup
      .string()
      .oneOf([yup.ref("password")], "Passwords must match")
      .required("Confirm password is required"),
});

const loginSchema = yup.object({
   email: yup.string().email("Invalid email").required("Email is required"),
   password: yup.string().required("Password is required"),
});

const forgotSchema = yup.object({
   email: yup.string().email("Invalid email").required("Email is required"),
});

function passwordStrength(password: string) {
   let score = 0;
   if (!password) return score;
   if (password.length >= 6) score += 1;
   if (/[A-Z]/.test(password)) score += 1;
   if (/[0-9]/.test(password)) score += 1;
   if (/[^A-Za-z0-9]/.test(password)) score += 1;
   return score;
}

const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

interface FormProps {
   fullName?: string;
   businessName?: string;
   businessAddress?: string;
   mobileNumber?: string;
   email: string;
   password: string;
   confirmPassword?: string;
}

const LoginPage = () => {
   const [showPassword, setShowPassword] = useState(false);
   const [isSignUp, setIsSignUp] = useState(false);
   const [openForgotModal, setOpenForgotModal] = useState(false);
   const [snackbarOpen, setSnackbarOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [passwordValue, setPasswordValue] = useState("");

   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("md"));

   // Form for login/signup
   const {
      control,
      handleSubmit,
      formState: { errors },
      reset,
      watch,
   } = useForm<FormProps>({
      resolver: yupResolver(isSignUp ? signupSchema : loginSchema),
      defaultValues: {
         fullName: "",
         businessName: "",
         businessAddress: "",
         mobileNumber: "",
         email: "",
         password: "",
         confirmPassword: "",
      },
   });

   // Watch password input for strength meter
   const watchedPassword = watch("password", "");
   useEffect(() => {
      setPasswordValue(watchedPassword);
   }, [watchedPassword]);

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

   // Simulate async login/signup
   const onSubmit = async (data: any) => {
      setLoading(true);
      try {
         await new Promise((r) => setTimeout(r, 2000)); // simulate network delay
         if (isSignUp) {
            alert("Signup successful!");
         } else {
            alert("Login successful!");
         }
         reset();
      } catch (err) {
         alert("Something went wrong");
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

   // Dummy social login handlers
   const handleGoogleLogin = () => alert("Google login clicked");
   const handleGitHubLogin = () => alert("GitHub login clicked");

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
                  {isSignUp ? "Join us today!" : "Hi, Welcome back"}
               </Typography>
               <Typography variant="body2" sx={{ mt: 1, mb: 4 }}>
                  {isSignUp
                     ? "Create your account to start your journey."
                     : "More effectively with optimized workflows."}
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
               py: isSignUp ? 2 : 6,
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
                     height: !isSignUp ? "100%" : "none",
                  }}
               >
                  <Typography variant="h5" fontWeight={600} mb={1}>
                     {isSignUp
                        ? "Create your account"
                        : "Sign in to your account"}
                  </Typography>
                  <Typography variant="body2" mb={3}>
                     {isSignUp ? (
                        <>
                           Already have an account?{" "}
                           <Link
                              href="#"
                              color="primary"
                              onClick={() => setIsSignUp(false)}
                           >
                              Sign in
                           </Link>
                        </>
                     ) : (
                        <>
                           Don’t have an account?{" "}
                           <Link
                              href="#"
                              color="primary"
                              onClick={() => setIsSignUp(true)}
                           >
                              Get started
                           </Link>
                        </>
                     )}
                  </Typography>

                  <Fade in key={isSignUp ? "signup" : "login"}>
                     <Box
                        component="form"
                        onSubmit={handleSubmit(onSubmit)}
                        noValidate
                     >
                        <Stack spacing={2} py={1}>
                           {isSignUp && (
                              <>
                                 <Controller
                                    name="fullName"
                                    control={control}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          fullWidth
                                          label="Full Name"
                                          error={!!errors.fullName}
                                          helperText={errors.fullName?.message}
                                          autoComplete="name"
                                       />
                                    )}
                                 />
                                 <Controller
                                    name="businessName"
                                    control={control}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          fullWidth
                                          label="Business Name"
                                          error={!!errors.businessName}
                                          helperText={
                                             errors.businessName?.message
                                          }
                                          autoComplete="organization"
                                       />
                                    )}
                                 />
                                 <Controller
                                    name="businessAddress"
                                    control={control}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          fullWidth
                                          label="Business Address"
                                          error={!!errors.businessAddress}
                                          helperText={
                                             errors.businessAddress?.message
                                          }
                                          autoComplete="street-address"
                                       />
                                    )}
                                 />
                                 <Controller
                                    name="mobileNumber"
                                    control={control}
                                    render={({ field }) => (
                                       <TextField
                                          {...field}
                                          fullWidth
                                          label="Mobile Number"
                                          error={!!errors.mobileNumber}
                                          helperText={
                                             errors.mobileNumber?.message
                                          }
                                          autoComplete="tel"
                                       />
                                    )}
                                 />
                              </>
                           )}

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
                                    autoComplete={
                                       isSignUp
                                          ? "new-password"
                                          : "current-password"
                                    }
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
                                    onChange={(e) => {
                                       field.onChange(e);
                                       setPasswordValue(e.target.value);
                                    }}
                                 />
                              )}
                           />

                           {/* Password strength meter */}
                           {isSignUp && passwordValue.length > 0 && (
                              <Box>
                                 <Typography variant="caption" gutterBottom>
                                    Password strength:{" "}
                                    <Box
                                       component="span"
                                       sx={{
                                          fontWeight: "bold",
                                          color:
                                             strengthLabels[
                                                passwordStrength(
                                                   passwordValue
                                                ) - 1
                                             ] === "Strong"
                                                ? "success.main"
                                                : strengthLabels[
                                                     passwordStrength(
                                                        passwordValue
                                                     ) - 1
                                                  ] === "Good"
                                                ? "warning.main"
                                                : "error.main",
                                       }}
                                    >
                                       {strengthLabels[
                                          passwordStrength(passwordValue) - 1
                                       ] || "Weak"}
                                    </Box>
                                 </Typography>
                                 <LinearProgress
                                    variant="determinate"
                                    value={
                                       (passwordStrength(passwordValue) / 4) *
                                       100
                                    }
                                    sx={{ height: 6, borderRadius: 2 }}
                                    color={
                                       passwordStrength(passwordValue) >= 3
                                          ? "success"
                                          : passwordStrength(passwordValue) ===
                                            2
                                          ? "warning"
                                          : "error"
                                    }
                                 />
                              </Box>
                           )}

                           {isSignUp && (
                              <Controller
                                 name="confirmPassword"
                                 control={control}
                                 render={({ field }) => (
                                    <TextField
                                       {...field}
                                       fullWidth
                                       label="Confirm Password"
                                       type={showPassword ? "text" : "password"}
                                       error={!!errors.confirmPassword}
                                       helperText={
                                          errors.confirmPassword?.message
                                       }
                                       autoComplete="new-password"
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
                           )}

                           {!isSignUp && (
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
                           )}

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
                              {isSignUp ? "Sign Up" : "Sign In"}
                           </Button>
                        </Stack>
                     </Box>
                  </Fade>

                  {!isSignUp && (
                     <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        mt={4}
                     >
                        <Button
                           startIcon={<Icon icon="devicon:google" />}
                           variant="outlined"
                           onClick={handleGoogleLogin}
                           disabled={loading}
                        >
                           Google
                        </Button>
                        <Button
                           startIcon={<Icon icon="devicon:github" />}
                           variant="outlined"
                           onClick={handleGitHubLogin}
                           disabled={loading}
                        >
                           GitHub
                        </Button>
                     </Stack>
                  )}
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
            message="Reset link has been sent!"
         />
      </Box>
   );
};

export default LoginPage;
