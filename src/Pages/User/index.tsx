"use client";

import {
  Stack,
  Button,
  Avatar,
  Typography,
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContent,
} from "@mui/material";
import Icon from "@src/components/Icon";
import CustomTable, { TableProps, TableRow } from "@src/components/Table";
import Link from "next/link";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";
import jwt from "jsonwebtoken";
import CustomModal from "@src/components/Modal";
import Modal from "./Modal";

const UserProfile = ({
  name,
  email,
  url,
}: {
  name: string;
  email: string;
  url?: string;
}) => {
  return (
    <Stack spacing={1} direction="row" alignItems="center">
      <Avatar src={url} />
      <Stack>
        <Typography
          variant="body1"
          fontSize={16}
          color="textPrimary"
          sx={{
            "&:hover": {
              cursor: "pointer",
              textDecoration: "underline",
            },
          }}
        >
          {name}
        </Typography>
        <Typography variant="body2" fontSize={14} color="textSecondary">
          {email}
        </Typography>
      </Stack>
    </Stack>
  );
};

const users: Omit<TableProps, "type"> = {
  head: ["@check", "Name", "Phone Number", "Role", "@action"],
  body: [
    {
      name: [
        "Jubayer Ahmed",
        <UserProfile name="Jubayer Ahmed" email="devxub@gmail.com" url="" />,
      ],
      phone_number: "01325584606",
      email: "devxub@gmail.com",
      role: "Manager",
    },
    {
      name: [
        "Najrul Ahmed",
        <UserProfile name="Najrul Ahmed" email="najrul787@gmail.com" url="" />,
      ],
      phone_number: "01818388585",
      email: "najrul787@gmail.com",
      role: "CEO",
    },
  ],
};

const Users = () => {
  // const filtered = users.body.filter((row) => {
  //   const valuesToSearch = [row.name, row.rank];
  //   return valuesToSearch.some((val: any) =>
  //     val.toLowerCase().includes("".toLowerCase())
  //   );
  // });
  const [modalOpen, setModalOpen] = useState(false);
  const [editableUser, setEditableUser] = useState({} as TableRow);
  const actionMenu = (row: any) => [
    {
      label: "edit",
      onClick: () => {
        setEditableUser({ ...row, name: row.name[0] }); // store clicked user
        setMode("edit");
        setModalOpen(true);
      },
    },
    {
      label: "delete",
      color: "error",
      onClick: () => {
        // setDeleteConform(true);
        setUserToDelete(row);
        setDeleteOpen(true);
      },
    },
  ];

  const [mode, setMode] = useState<"add" | "edit">("edit");

  // Delete dialog states
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const handleDeleteConfirm = () => {
    console.log("Deleting user:", userToDelete);
    // 👉 Here you can call API or update state
    setDeleteOpen(false);
    setUserToDelete(null);
  };

  return (
    <Scrollbar autoHide thumbSize={6} darkMode>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction={"row"} justifyContent={"flex-end"} spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Icon icon="solar:user-plus-bold-duotone" />}
            onClick={() => {
              setMode("add");
              setModalOpen(true);
              setEditableUser({}); // store clicked user
            }}
          >
            Add user
          </Button>
        </Stack>
        <Stack>
          <CustomTable
            type={"user"}
            head={users.head}
            body={users.body}
            actionMenu={(row) => actionMenu(row)}
          />
        </Stack>
      </Stack>
      <CustomModal
        sx={{ width: { xs: "90%", md: 900 } }}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === "add" ? "Add User" : "Edit User"}
      >
        <Modal
          mode={mode}
          onClose={() => setModalOpen(false)}
          userData={editableUser || {}}
          onChange={(d) => {
            setEditableUser({ ...editableUser, ...d });
          }}
        />
      </CustomModal>
      <CustomModal
        // sx={{ width: { xs: "90%", md: 900 } }}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={"Delete User"}
      >
        <Stack>
          <Typography>
            Are you sure you want to delete{" "}
            <strong>{userToDelete?.email || "this user"}</strong>?
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
            <Button onClick={() => setDeleteOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </CustomModal>
    </Scrollbar>
  );
};
export default Users;
