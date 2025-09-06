import {
  Accordion,
  AccordionSummary,
  accordionSummaryClasses,
  Stack,
  Typography,
  AccordionDetails,
} from "@mui/material";
import Icon from "@src/components/Icon";
import React from "react";

const Pricing = () => {
  return (
    <Accordion
      sx={{
        borderRadius: "16px!important",
        boxShadow: 15,
      }}
      defaultExpanded={false}
    >
      <AccordionSummary
        expandIcon={<Icon icon="solar:alt-arrow-right-broken" />}
        focusRipple={false}
        sx={{
          p: 2,
          "& .MuiAccordionSummary-content": {
            m: "0px!important",
          },
          [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]:
            {
              transform: "rotate(90deg)",
            },
        }}
      >
        <Stack spacing={1} p={2}>
          <Typography
            variant="body1"
            fontSize={18}
            color="textPrimary"
            sx={{
              "&:hover": {
                cursor: "pointer",
                textDecoration: "underline",
              },
            }}
          >
            Properties
          </Typography>
          <Typography
            variant="body2"
            fontSize={13}
            fontWeight={400}
            color="textSecondary"
          >
            Title, Category, short description, image...
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={3}>
          <Stack
            spacing={2}
            direction={"row"}
            alignItems={"center"}
            width={"100%"}
            mb={2}
          >
            <Stack spacing={2} flex={1}></Stack>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default Pricing;
