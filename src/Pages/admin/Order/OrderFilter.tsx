import { Box, Tooltip, IconButton } from "@mui/material";
import CustomModal from "@src/components/Modal";
import Scrollbar from "react-browser-scrollbar";
import OrderFilterModal from "./OrderFilterModel";
import { useState } from "react";
import Icon from "@src/components/Icon";
import { OrderFilter as OrderFilterType } from "@src/components/Table/Filter";

const OrderFilter = (data: any, onChange: Function) => {
   const [modalOpen, setModalOpen] = useState(false);

   return (
      <Box>
         <Tooltip title="Filter">
            <IconButton
               sx={{ color: "text.secondary" }}
               onClick={() => setModalOpen(true)}
            >
               <Icon icon="solar:filters-bold-duotone" />
            </IconButton>
         </Tooltip>

         <CustomModal
            sx={{
               width: { xs: "100%", md: 900 },
               height: { xs: "100vh", md: "auto" },
               borderRadius: { xs: 0, md: 2 },
            }}
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Order Filter"
         >
            <Scrollbar
               autoHide
               darkMode
               thumbSize={6}
               style={{ height: "100%" }}
            >
               <OrderFilterModal
                  filterValue={{
                     ...data.orderData,
                     status: data.orderData?.status,
                  }}
                  onCloseModal={() => setModalOpen(false)}
                  onChange={(f: OrderFilterType) =>
                     onChange?.({
                        ...data,
                        orderData: {
                           ...f,
                           status: f.status !== null ? f.status : "",
                        },
                     })
                  }
               />
            </Scrollbar>
         </CustomModal>
      </Box>
   );
};

export default OrderFilter;
