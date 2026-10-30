import { Box, Tooltip, IconButton } from "@mui/material";
import CustomModal from "@src/components/Modal";
import OrderFilterModal from "./OrderFilterModel";
import React, { useState } from "react";
import Icon from "@src/components/Icon";
import {
   FilterData,
   OrderFilter as OrderFilterType,
} from "@src/components/Table/Filter";

export const OrderFilterComponent = ({
   data,
   onChange,
}: {
   data: FilterData;
   onChange: Function;
}) => {
   const [modalOpen, setModalOpen] = useState(false);

   return (
      <Box>
         <Tooltip title="Filter">
            <IconButton
               data-testid="order-filter-btn"
               sx={{ color: "text.secondary" }}
               onClick={() => setModalOpen(true)}
            >
               <Icon icon="solar:filters-bold-duotone" />
            </IconButton>
         </Tooltip>

         <CustomModal
            sx={{
               width: { xs: "100%", md: 950 },
               maxHeight: { xs: "100vh", md: "88vh" },
               borderRadius: { xs: 0, md: 2 },
               display: "flex",
               flexDirection: "column",
            }}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Order Filter"
         >
            <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
               <OrderFilterModal
                  filterValue={{
                     ...data.orderData,
                  }}
                  onCloseModal={() => setModalOpen(false)}
                  onChange={(f: OrderFilterType) => {
                     onChange?.({
                        ...data,
                        orderData: {
                           ...data.orderData,
                           ...f,
                        },
                     });
                  }}
               />
            </Box>
         </CustomModal>
      </Box>
   );
};

const OrderFilter = (data: FilterData, onChange: Function) => {
   return <OrderFilterComponent data={data} onChange={onChange} />;
};

export default OrderFilter;
