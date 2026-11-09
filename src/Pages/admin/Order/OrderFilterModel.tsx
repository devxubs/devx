"use client";

import {
   Box,
   Grid,
   Stack,
   Typography,
   Button,
   TextField,
   Checkbox,
   FormControlLabel,
   Divider,
   useMediaQuery,
   useTheme,
} from "@mui/material";
import DateRange from "../../../components/DateRange";
import CustomAutocomplete from "../../../components/Autocomplete";
import { OrderFilter } from "../../../components/Table/Filter";
import { useState } from "react";
import { orderStatuses, districts, orderSources, products } from "./data";

const couriers = ["All", "Pathao", "Steadfast", "RedX", "Paperfly", "Sundarban", "SA Paribahan", "E-Courier", "Manual/Direct"];
const courierStatusesList = ["All", "Pending", "In Courier", "Delivered", "Cancelled", "Returned", "Hold"];
const courierPerformanceList = ["All", "Success", "Average", "Low"];
const courierChargedList = ["All", "Yes", "No"];
const deliveryChargeList = ["All", "Free", "Paid"];
const codChangedList = ["All", "Yes", "No"];
const paymentStatusList = ["All", "Paid", "Unpaid", "Partial"];
const orderTypeList = ["All", "Urgent", "Regular"];
const stockAvailabilityList = ["All", "In Stock", "Out of Stock"];
const websiteList = ["All", "devxpos.com", "facebook.com", "instagram.com"];
const printStatusList = ["All", "Printed", "Not Printed"];
const courierMarkList = ["All", "Marked", "Unmarked"];
const cancelReasonList = ["All", "Customer Refused", "Wrong Product", "Damaged", "Delayed Delivery", "Price Disagreement", "Other"];
const emailStatusList = ["Any", "Sent", "Failed", "Not Sent"];
const bdMobileNumberList = ["Any", "Valid BD", "Invalid"];
const customerTypeList = ["All", "New", "Regular"];
const employeeActionList = ["All", "Order Created/Assigned", "Status Updated", "Delivered"];
const categoriesList = ["All", "Beverages", "Snacks", "Dairy", "Electronics", "Footwear", "Personal Care"];
const comparisonOps = ["Greater", "Less", "Equal"];
const utmSourcesList = ["Any", "Google Ads", "Facebook Ads", "Instagram Ads", "TikTok", "Email Newsletter", "Direct"];

const employeeNames = [
   "All",
   "John",
   "Anthony",
   "Thomas",
   "Mark",
   "Paul",
   "Andrew",
   "George",
   "Charles",
   "Richard",
   "Edward",
   "Steven",
];

const OrderFilterModal = ({
   onChange,
   filterValue,
   onCloseModal,
}: {
   filterValue: OrderFilter;
   onChange?: Function;
   onCloseModal: Function;
}) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
   const [filterData, setFilterData] = useState<OrderFilter>({
      order_created_at: filterValue.order_created_at,
      courier_submitted_at: filterValue.courier_submitted_at,
      status_added_at: filterValue.status_added_at,
      employee: filterValue.employee || "",
      employeeAction: filterValue.employeeAction || "All",
      status: filterValue.status || "",
      excludeStatus: Boolean(filterValue.excludeStatus),
      order_source: filterValue.order_source || "",
      excludeOrderSource: Boolean(filterValue.excludeOrderSource),
      orderTag: filterValue.orderTag || "",
      customerTag: filterValue.customerTag || "",
      customerType: filterValue.customerType || "All",
      courier: filterValue.courier || "",
      excludeCourier: Boolean(filterValue.excludeCourier),
      courierStatus: filterValue.courierStatus || "",
      excludeCourierStatus: Boolean(filterValue.excludeCourierStatus),
      courierPerformance: filterValue.courierPerformance || "All",
      courierCharged: filterValue.courierCharged || "All",
      deliveryCharge: filterValue.deliveryCharge || "All",
      codChanged: filterValue.codChanged || "All",
      category: filterValue.category || "",
      excludeCategory: Boolean(filterValue.excludeCategory),
      products: filterValue.products || "",
      excludeProduct: Boolean(filterValue.excludeProduct),
      district: filterValue.district || "",
      excludeDistrict: Boolean(filterValue.excludeDistrict),
      paymentStatus: filterValue.paymentStatus || "All",
      orderType: filterValue.orderType || "All",
      stockAvailability: filterValue.stockAvailability || "All",
      website: filterValue.website || "All",
      print_status: filterValue.print_status || "All",
      courierMark: filterValue.courierMark || "All",
      pathaoCity: filterValue.pathaoCity || "",
      pathaoZone: filterValue.pathaoZone || "",
      cancelReason: filterValue.cancelReason || "All",
      emailStatus: filterValue.emailStatus || "Any",
      bdMobileNumber: filterValue.bdMobileNumber || "Any",
      utmSource: filterValue.utmSource || "Any",
      excludeUtmSource: Boolean(filterValue.excludeUtmSource),
      minPrice: filterValue.minPrice || "",
      maxPrice: filterValue.maxPrice || "",
      itemQty: filterValue.itemQty || "",
      itemQtyOp: filterValue.itemQtyOp || "Greater",
      urlUtm: filterValue.urlUtm || "",
      referenceId: filterValue.referenceId || "",
      discountAmount: filterValue.discountAmount || "",
      discountOp: filterValue.discountOp || "Greater",
      note: filterValue.note || "",
      duplicateOrders: Boolean(filterValue.duplicateOrders),
   });

   const inputSize = isMobile ? "small" : "medium";

   const updateField = (key: keyof OrderFilter, val: any) => {
      setFilterData((prev) => ({ ...prev, [key]: val }));
   };

   return (
      <Stack height={"100%"} spacing={2.5} p={1}>
         {/* SECTION 1: TIMELINES & DATES */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
               Date & Timeline Filters
            </Typography>
            <Grid container spacing={2}>
               {/* Order Created At */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Order Created At</Typography>
                     <DateRange
                        size={inputSize}
                        title="Order Created At"
                        value={filterData.order_created_at}
                        onChange={(v: any) => updateField("order_created_at", v)}
                     />
                  </Stack>
               </Grid>

               {/* Courier Submitted At */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Courier Submitted At</Typography>
                     <DateRange
                        size={inputSize}
                        title="Courier Submitted At"
                        value={filterData.courier_submitted_at}
                        onChange={(v: any) => updateField("courier_submitted_at", v)}
                     />
                  </Stack>
               </Grid>

               {/* Status Added At */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Status Added At</Typography>
                     <DateRange
                        size={inputSize}
                        title="Status Added At"
                        value={filterData.status_added_at}
                        onChange={(v: any) => updateField("status_added_at", v)}
                     />
                  </Stack>
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 2: STATUS & SOURCE */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
               Order Status & Identification
            </Typography>
            <Grid container spacing={2}>
               {/* Status */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeStatus)}
                                 onChange={(e) => updateField("excludeStatus", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Status"
                        options={["All", ...orderStatuses]}
                        value={filterData.status || "All"}
                        onChange={(v: any) => updateField("status", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Order Source */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Order Source</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeOrderSource)}
                                 onChange={(e) => updateField("excludeOrderSource", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Order Source"
                        options={["All", ...orderSources]}
                        value={filterData.order_source || "All"}
                        onChange={(v: any) => updateField("order_source", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Order Type */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Order Type</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Order Type"
                        options={orderTypeList}
                        value={filterData.orderType || "All"}
                        onChange={(v: any) => updateField("orderType", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* Order Tag */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Order Tag</Typography>
                     <TextField
                        size={inputSize}
                        placeholder="Search order tag"
                        value={filterData.orderTag}
                        onChange={(e) => updateField("orderTag", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* Note */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Order Note</Typography>
                     <TextField
                        size={inputSize}
                        placeholder="e.g. Has Note or keyword"
                        value={filterData.note}
                        onChange={(e) => updateField("note", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* Print Status */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Print Status</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Print Status"
                        options={printStatusList}
                        value={filterData.print_status || "All"}
                        onChange={(v: any) => updateField("print_status", v || "All")}
                     />
                  </Stack>
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 3: CUSTOMER & LOCATION */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
               Customer & District
            </Typography>
            <Grid container spacing={2}>
               {/* Customer Type */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Customer Type</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Customer Type"
                        options={customerTypeList}
                        value={filterData.customerType || "All"}
                        onChange={(v: any) => updateField("customerType", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* District */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">District</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeDistrict)}
                                 onChange={(e) => updateField("excludeDistrict", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="District"
                        options={["All", ...districts]}
                        value={filterData.district || "All"}
                        onChange={(v: any) => updateField("district", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Customer Tag */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Customer Tag</Typography>
                     <TextField
                        size={inputSize}
                        placeholder="Search customer tag"
                        value={filterData.customerTag}
                        onChange={(e) => updateField("customerTag", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* BD Mobile Number */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">BD Mobile Number</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="BD Mobile Number"
                        options={bdMobileNumberList}
                        value={filterData.bdMobileNumber || "Any"}
                        onChange={(v: any) => updateField("bdMobileNumber", v || "Any")}
                     />
                  </Stack>
               </Grid>

               {/* Duplicate Orders Toggle */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1} justifyContent="center" height="100%" pt={2}>
                     <FormControlLabel
                        control={
                           <Checkbox
                              checked={Boolean(filterData.duplicateOrders)}
                              onChange={(e) => updateField("duplicateOrders", e.target.checked)}
                           />
                        }
                        label={<Typography variant="body2">Only Repeat / Duplicate Orders</Typography>}
                     />
                  </Stack>
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 4: COURIER & LOGISTICS */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
               Courier & Fulfillment
            </Typography>
            <Grid container spacing={2}>
               {/* Courier */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Courier</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeCourier)}
                                 onChange={(e) => updateField("excludeCourier", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Courier"
                        options={couriers}
                        value={filterData.courier || "All"}
                        onChange={(v: any) => updateField("courier", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Courier Status */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Courier Status</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeCourierStatus)}
                                 onChange={(e) => updateField("excludeCourierStatus", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Courier Status"
                        options={courierStatusesList}
                        value={filterData.courierStatus || "All"}
                        onChange={(v: any) => updateField("courierStatus", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Courier Performance */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Courier Performance</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Courier Performance"
                        options={courierPerformanceList}
                        value={filterData.courierPerformance || "All"}
                        onChange={(v: any) => updateField("courierPerformance", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* Courier Charged */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Courier Charged</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Courier Charged"
                        options={courierChargedList}
                        value={filterData.courierCharged || "All"}
                        onChange={(v: any) => updateField("courierCharged", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* Delivery Charge */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Delivery Charge</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Delivery Charge"
                        options={deliveryChargeList}
                        value={filterData.deliveryCharge || "All"}
                        onChange={(v: any) => updateField("deliveryCharge", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* COD Changed */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">COD Changed</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="COD Changed"
                        options={codChangedList}
                        value={filterData.codChanged || "All"}
                        onChange={(v: any) => updateField("codChanged", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* Pathao City */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Pathao City</Typography>
                     <TextField
                        size={inputSize}
                        placeholder="Search city"
                        value={filterData.pathaoCity}
                        onChange={(e) => updateField("pathaoCity", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* Pathao Zone */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Pathao Zone</Typography>
                     <TextField
                        size={inputSize}
                        placeholder="Search zone"
                        value={filterData.pathaoZone}
                        onChange={(e) => updateField("pathaoZone", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* Cancel / Return Reason */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Cancel / Return Reason</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Cancel Reason"
                        options={cancelReasonList}
                        value={filterData.cancelReason || "All"}
                        onChange={(v: any) => updateField("cancelReason", v || "All")}
                     />
                  </Stack>
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 5: PRODUCTS & INVENTORY */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
               Products & Inventory
            </Typography>
            <Grid container spacing={2}>
               {/* Product Category */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Product Category</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeCategory)}
                                 onChange={(e) => updateField("excludeCategory", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Category"
                        options={categoriesList}
                        value={filterData.category || "All"}
                        onChange={(v: any) => updateField("category", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Select Product */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">Product</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeProduct)}
                                 onChange={(e) => updateField("excludeProduct", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Product"
                        options={["All", ...products]}
                        value={filterData.products || "All"}
                        onChange={(v: any) => updateField("products", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Stock Availability */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Stock Availability</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Stock Availability"
                        options={stockAvailabilityList}
                        value={filterData.stockAvailability || "All"}
                        onChange={(v: any) => updateField("stockAvailability", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* Order Items Total Qty */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Total Items Quantity</Typography>
                     <Stack direction="row" spacing={1}>
                        <Box sx={{ width: "45%" }}>
                           <CustomAutocomplete
                              size={inputSize}
                              options={comparisonOps}
                              value={filterData.itemQtyOp || "Greater"}
                              onChange={(v: any) => updateField("itemQtyOp", v || "Greater")}
                           />
                        </Box>
                        <TextField
                           size={inputSize}
                           type="number"
                           placeholder="Qty"
                           value={filterData.itemQty}
                           onChange={(e) => updateField("itemQty", e.target.value)}
                           sx={{ width: "55%" }}
                        />
                     </Stack>
                  </Stack>
               </Grid>
            </Grid>
         </Box>

         <Divider />

         {/* SECTION 6: FINANCIAL, EMPLOYEE & CAMPAIGN */}
         <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" gutterBottom>
               Financial, Employee & Campaign Filters
            </Typography>
            <Grid container spacing={2}>
               {/* Payment Status */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Payment Status</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Payment Status"
                        options={paymentStatusList}
                        value={filterData.paymentStatus || "All"}
                        onChange={(v: any) => updateField("paymentStatus", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* Min Price */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Product Amount Min</Typography>
                     <TextField
                        size={inputSize}
                        type="number"
                        placeholder="0"
                        value={filterData.minPrice}
                        onChange={(e) => updateField("minPrice", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* Max Price */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Product Amount Max</Typography>
                     <TextField
                        size={inputSize}
                        type="number"
                        placeholder="No limit"
                        value={filterData.maxPrice}
                        onChange={(e) => updateField("maxPrice", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* Discount Amount */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Discount Amount</Typography>
                     <Stack direction="row" spacing={1}>
                        <Box sx={{ width: "45%" }}>
                           <CustomAutocomplete
                              size={inputSize}
                              options={comparisonOps}
                              value={filterData.discountOp || "Greater"}
                              onChange={(v: any) => updateField("discountOp", v || "Greater")}
                           />
                        </Box>
                        <TextField
                           size={inputSize}
                           type="number"
                           placeholder="Amount"
                           value={filterData.discountAmount}
                           onChange={(e) => updateField("discountAmount", e.target.value)}
                           sx={{ width: "55%" }}
                        />
                     </Stack>
                  </Stack>
               </Grid>

               {/* Employee */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Employee</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Employee"
                        options={employeeNames}
                        value={filterData.employee || "All"}
                        onChange={(v: any) => updateField("employee", v === "All" ? "" : v || "")}
                     />
                  </Stack>
               </Grid>

               {/* Employee Action */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Employee Action</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Employee Action"
                        options={employeeActionList}
                        value={filterData.employeeAction || "All"}
                        onChange={(v: any) => updateField("employeeAction", v || "All")}
                     />
                  </Stack>
               </Grid>

               {/* UTM Source */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={0.5}>
                     <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">UTM Source</Typography>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 size="small"
                                 checked={Boolean(filterData.excludeUtmSource)}
                                 onChange={(e) => updateField("excludeUtmSource", e.target.checked)}
                              />
                           }
                           label={<Typography variant="caption">Exclude</Typography>}
                           sx={{ m: 0 }}
                        />
                     </Stack>
                     <CustomAutocomplete
                        size={inputSize}
                        label="UTM Source"
                        options={utmSourcesList}
                        value={filterData.utmSource || "Any"}
                        onChange={(v: any) => updateField("utmSource", v || "Any")}
                     />
                  </Stack>
               </Grid>

               {/* Reference ID */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Reference / Campaign ID</Typography>
                     <TextField
                        size={inputSize}
                        placeholder="e.g. CAMP_SUMMER"
                        value={filterData.referenceId}
                        onChange={(e) => updateField("referenceId", e.target.value)}
                     />
                  </Stack>
               </Grid>

               {/* Website */}
               <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Stack spacing={1}>
                     <Typography variant="body2" color="text.secondary">Website Domain</Typography>
                     <CustomAutocomplete
                        size={inputSize}
                        label="Website"
                        options={websiteList}
                        value={filterData.website || "All"}
                        onChange={(v: any) => updateField("website", v || "All")}
                     />
                  </Stack>
               </Grid>
            </Grid>
         </Box>

         {/* Buttons */}
         <Stack
            direction={isMobile ? "column" : "row"}
            justifyContent={isMobile ? "flex-start" : "flex-end"}
            spacing={2}
            pt={2}
            pb={isMobile ? 6 : 0}
            flexWrap="wrap"
         >
            <Button
               color="inherit"
               onClick={() => {
                  const resetFilters: OrderFilter = {
                     order_created_at: [null, null],
                     courier_submitted_at: [null, null],
                     status_added_at: [null, null],
                     employee: "",
                     employeeAction: "All",
                     status: "",
                     excludeStatus: false,
                     order_source: "",
                     excludeOrderSource: false,
                     orderTag: "",
                     customerTag: "",
                     customerType: "All",
                     courier: "",
                     excludeCourier: false,
                     courierStatus: "",
                     excludeCourierStatus: false,
                     courierPerformance: "All",
                     courierCharged: "All",
                     deliveryCharge: "All",
                     codChanged: "All",
                     category: "",
                     excludeCategory: false,
                     products: "",
                     excludeProduct: false,
                     district: "",
                     excludeDistrict: false,
                     paymentStatus: "All",
                     orderType: "All",
                     stockAvailability: "All",
                     website: "All",
                     print_status: "All",
                     courierMark: "All",
                     pathaoCity: "",
                     pathaoZone: "",
                     cancelReason: "All",
                     emailStatus: "Any",
                     bdMobileNumber: "Any",
                     utmSource: "Any",
                     excludeUtmSource: false,
                     minPrice: "",
                     maxPrice: "",
                     itemQty: "",
                     itemQtyOp: "Greater",
                     urlUtm: "",
                     referenceId: "",
                     discountAmount: "",
                     discountOp: "Greater",
                     note: "",
                     duplicateOrders: false,
                  };
                  setFilterData(resetFilters);
                  onChange?.(resetFilters);
               }}
            >
               Reset
            </Button>
            <Button color="error" onClick={() => onCloseModal()}>
               Cancel
            </Button>
            <Button
               variant="contained"
               color="primary"
               onClick={() => {
                  const cleaned: any = {};
                  for (const [k, v] of Object.entries(filterData)) {
                     if (v === "All" || v === "Any" || v === "" || v === false || v === null || v === undefined) continue;
                     if (k === "itemQtyOp" && !filterData.itemQty) continue;
                     if (k === "discountOp" && !filterData.discountAmount) continue;
                     cleaned[k] = v;
                  }
                  onChange?.(cleaned);
                  onCloseModal();
               }}
            >
               Apply
            </Button>
         </Stack>
      </Stack>
   );
};

export default OrderFilterModal;
