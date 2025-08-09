"use client";

import { Stack, Button, Avatar, Typography } from "@mui/material";
import Icon from "@src/components/Icon";
import CustomTable, { TableProps } from "@src/components/Table";
import React from "react";
import Scrollbar from "react-browser-scrollbar";

const UserProfile = ({ name, url }: { name: string; url?: string }) => (
  <Stack spacing={1} direction="row" alignItems="center">
    <Avatar src={url} />
    <Typography variant="body1">{name}</Typography>
  </Stack>
);

const users: Omit<TableProps, "type"> = {
  head: ["Seller", "Call", "Conform", "Cancel", "Rank", "@action"],
  body: [
    {
      seller: <UserProfile name="Xubayer" url="" />,
      name: "xubayer",
      call: 3000,
      conform: 2000,
      cancel: 1000,
      rank: "Top 1",
      chip: "rank",
      color: "primary",
    },
    {
      name: "Alice",
      seller: <UserProfile name="Alice" url="" />,
      call: 1000,
      conform: 800,
      cancel: 200,
      rank: "Top 2",
      chip: "rank",
      color: "secondary",
    },
  ],
};

const Users = () => {
  const filtered = users.body.filter((row) => {
    const valuesToSearch = [row.name, row.rank];
    return valuesToSearch.some((val: any) =>
      val.toLowerCase().includes("".toLowerCase())
    );
  });

  return (
    <Scrollbar autoHide thumbSize={6} darkMode>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between">
          <Stack></Stack>
          <Stack>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Icon icon="solar:user-plus-bold-duotone" />}
            >
              Add user
            </Button>
          </Stack>
        </Stack>
        <Stack>
          <CustomTable type={"order"} head={users.head} body={filtered} />
        </Stack>
      </Stack>
    </Scrollbar>
  );
};
export default Users;
