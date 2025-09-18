import { Stack, Avatar, Typography, Tooltip, Button } from "@mui/material";
import Icon from "@src/components/Icon";
import { useState } from "react";

const User = ({
  name,
  email,
  number,
  url,
}: {
  name: string;
  email?: string;
  number: number | string;
  url?: string;
}) => {
  const [copyText, setCopyText] = useState("Copy number");

  return (
    <Stack spacing={1} direction="row" alignItems="center">
      <Stack>
        <Typography variant="body2" color="textPrimary">
          {name}
        </Typography>
        <Typography variant="body2" fontSize={14} color="textSecondary">
          {number}
        </Typography>
      </Stack>
      <Stack spacing={0.3}>
        <Tooltip title={copyText} disableInteractive>
          <Button
            color="inherit"
            sx={{
              borderRadius: "5px!important",
              minWidth: "30px!important",
              p: 0.3,
            }}
            onClick={() => {
              setCopyText("Copied!");
              navigator.clipboard.writeText(`${number}`);
              setTimeout(() => {
                setCopyText("Copy number");
              }, 2000);
            }}
          >
            <Icon icon="solar:copy-bold-duotone" size="small" />
          </Button>
        </Tooltip>
        <Tooltip title="Call now" disableInteractive>
          <Button
            color="primary"
            sx={{
              borderRadius: "5px!important",
              minWidth: "30px!important",
              p: 0.3,
            }}
            onClick={() => {
              window.open(`tel:${number}`);
            }}
          >
            <Icon icon="solar:outgoing-call-rounded-bold" size="small" />
          </Button>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default User;
