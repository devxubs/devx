import {
   Stack,
   Typography,
   Checkbox,
   Collapse,
   useTheme,
   IconButton,
   Box,
   Grid,
} from "@mui/material";
import Icon from "@src/components/Icon";

import React, { useState } from "react";

interface ItemProps {
   title?: string;
}

const Item = ({ title }: ItemProps) => {
   const theme = useTheme();
   const [expanded, setExpanded] = useState(true);

   return (
      <Stack
         p={2}
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
               Accordion 1
            </Typography>
            <Stack spacing={0.5} direction={"row"}>
               <Checkbox
                  size="small"
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
                  onClick={() => {}}
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
               <Grid size={{ xs: 6, sm: 3, md: 6 }}>
                  <Stack direction={"row"} alignItems={"center"} spacing={1}>
                     <Checkbox />
                     <Typography variant="body1">Create</Typography>
                  </Stack>
               </Grid>
               <Grid size={{ xs: 6, sm: 3, md: 6 }}>
                  <Stack direction={"row"} alignItems={"center"} spacing={1}>
                     <Checkbox />
                     <Typography variant="body1">Edit</Typography>
                  </Stack>
               </Grid>
               <Grid size={{ xs: 6, sm: 3, md: 6 }}>
                  <Stack direction={"row"} alignItems={"center"} spacing={1}>
                     <Checkbox />
                     <Typography variant="body1">Delete</Typography>
                  </Stack>
               </Grid>
               <Grid size={{ xs: 6, sm: 3, md: 6 }}></Grid>
            </Grid>
         </Collapse>
      </Stack>
   );
};

export default Item;
