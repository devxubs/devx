"use client";

import { Stack, Button } from "@mui/material";
import DeleteDialog from "@src/components/DeleteDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { TableProps } from "@src/components/Table";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";

const category: Omit<TableProps, "type"> = {
  head: ["@check", "Name", "@action"],
  body: [
    {
      id: 4,
      name: "Smart Fitness Watch",
    },
    {
      id: 4,
      name: "Smart Fitness Watch",
    },
    {
      id: 4,
      name: "Smart Fitness Watch",
    },
    {
      id: 4,
      name: "Smart Fitness Watch",
    },
  ],
};

const Categories = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const actionMenu = (row: any) => [
    {
      label: "edit",
      onClick: () => {
        // setSelectedProduct(row); // store clicked user
        // setMode("edit");
        setIsModalOpen(true);
      },
    },
    {
      label: "delete",
      color: "error",
      onClick: () => {
        // setDeleteConform(true);
        // setProductToDelete(row);
        setIsDeleteDialogOpen(true);
      },
    },
  ];

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
              //   setMode("add");
              //   setSelectedProduct({});
              setIsModalOpen(true);
            }}
          >
            Add Category
          </Button>
        </Stack>
        <Stack>
          <CustomTable
            type={"category"}
            head={category.head}
            body={category.body}
            actionMenu={(row) => actionMenu(row)}
          />
        </Stack>
        <CustomModal
          sx={{
            width: "100%",
            height: "100vh",
            borderRadius: 0,
            boxShadow: "none!important",
          }}
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        ></CustomModal>
        <DeleteDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          title={"asd"}
          onDelete={function (): void {
            throw new Error("Function not implemented.");
          }}
        />
      </Stack>
    </Scrollbar>
  );
};

export default Categories;
