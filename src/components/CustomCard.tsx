import { Card, Typography } from "@mui/material";
import React, { ReactNode } from "react";

const CustomCard = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => {
  return (
    <Card sx={{ p: 3, boxShadow: 20, height: "100%" }}>
      <Typography variant="subtitle1" mb={2}>
        {title}
      </Typography>
      {children}
    </Card>
  );
};

export default CustomCard;
