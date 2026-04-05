import {
   Stack,
   Typography,
   Checkbox,
   Collapse,
   useTheme,
   IconButton,
   Grid,
   FormControlLabel,
} from "@mui/material";
import Icon from "@src/components/Icon";

import React, { useState } from "react";
import { Permission } from ".";

interface ItemProps {
   id: number;
   title: string;
   permissions?: Permission[];
   onChecked?: (PId: number, allow: boolean) => void;
   onCheckedAll?: (id: number) => void;
}

const Item = ({
   id,
   title,
   permissions,
   onChecked,
   onCheckedAll,
}: ItemProps) => {
   const theme = useTheme();
   const [expanded, setExpanded] = useState(true);

   return (
      <Stack
         py={1}
         px={3}
         bgcolor={theme.palette.background.paper}
         borderRadius={1}
      >
         <Stack
            direction={"row"}
            justifyContent={"space-between"}
            alignItems={"center"}
         >
            <Typography component="span" sx={{ userSelect: "none" }}>
               {title}
            </Typography>
            <Stack spacing={0.5} direction={"row"}>
               <Checkbox
                  size="small"
                  indeterminateIcon={
                     <Icon
                        icon="solar:minus-square-bold-duotone"
                        size="small"
                     />
                  }
                  icon={
                     <Icon
                        icon="solar:check-square-bold-duotone"
                        size="small"
                     />
                  }
                  checkedIcon={
                     <Icon
                        icon="solar:check-square-bold"
                        color="primary"
                        size="small"
                     />
                  }
                  indeterminate={
                     !!permissions?.some((p) => p.allow) &&
                     !permissions?.every((p) => p.allow)
                  }
                  checked={!!permissions?.every((p) => p.allow)}
                  onClick={() => {
                     onCheckedAll?.(id);
                  }}
               />
               <IconButton onClick={() => setExpanded(!expanded)}>
                  <Icon
                     style={{
                        transform: `rotate(${expanded ? 90 : 0}deg)`,
                        transition: "all 0.2s",
                     }}
                     icon={"solar:alt-arrow-right-broken"}
                     size="small"
                  />
               </IconButton>
            </Stack>
         </Stack>
         <Collapse in={expanded}>
            <Grid container spacing={2}>
               {permissions?.map((permission, idx) => (
                  <Grid key={idx} size={{ xs: 6, sm: 4, md: 6 }}>
                     <Stack spacing={1}>
                        <FormControlLabel
                           control={
                              <Checkbox
                                 icon={
                                    <Icon icon="solar:check-square-bold-duotone" />
                                 }
                                 checkedIcon={
                                    <Icon
                                       icon="solar:check-square-bold"
                                       color="primary"
                                    />
                                 }
                                 checked={permission.allow}
                                 onChange={() => {
                                    onChecked?.(
                                       permission.id,
                                       !permission.allow,
                                    );
                                 }}
                              />
                           }
                           label={permission.name}
                           sx={{
                              userSelect: "none",
                           }}
                        />
                     </Stack>
                  </Grid>
               ))}
            </Grid>
         </Collapse>
      </Stack>
   );
};

export default Item;
