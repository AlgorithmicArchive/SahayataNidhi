// Updated ValidateOfficer component (no changes needed here, as the logic is in ServerSideTable)
import { Box } from "@mui/material";
import React, { useEffect, useState } from "react";
import axiosInstance from "../../axiosConfig";
import ServerSideTable from "../../components/ServerSideTable";
import MessageModal from "../../components/MessageModal";
export default function ValidateOfficer() {
  const [modalOpen, setModalOpen] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const actionFunctions = {
    ValidateOfficer: async (row) => {
      const userdata = row.original;
      console.log("Validating officer:", userdata.email);
      const formdata = new FormData();
      formdata.append("email", userdata.email);
      try {
        const response = await axiosInstance.post(
          "/Admin/ValidateOfficer",
          formdata,
        );
        if (response.data.status) {
          setResponseMessage(response.data.message);
          setModalOpen(true);
          // Optionally reload table
        } else {
          alert("Validation failed.");
        }
      } catch (error) {
        console.error("Error validating officer:", error);
        alert("An error occurred while validating officer.");
      }
    },
  };
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: "100vh",
        bgcolor: "#f8f9fa",
        py: 4,
      }}
    >
      <ServerSideTable
        url={"/Admin/GetOfficerToValidate"}
        extraParams={{}}
        actionFunctions={actionFunctions}
        refreshTrigger={true}
        Title={"Validate Officers"}
      />
      <MessageModal
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        message={responseMessage}
        type="success"
        title={"Officer Validation"}
        key={"Validation"}
      />
    </Box>
  );
}
