import React, { useState } from "react";
import { Box, styled } from "@mui/material";
import BasicModal from "../../components/BasicModal";
import { useNavigate } from "react-router-dom";
import ServerSideTable from "../../components/ServerSideTable";
import axiosInstance from "../../axiosConfig";
import { toast } from "react-toastify";

const MainContainer = styled(Box)`
  min-height: 100vh;
  background: linear-gradient(to bottom right, #f4f9ff 0%, #f9f3ec 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem; /* Reduced padding for smaller screens */
  box-sizing: border-box;
  width: 100%;

  @media (max-width: 600px) {
    padding: 1rem 0.5rem;
  }
`;

const TableCard = styled(Box)`
  background: #ffffff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  width: 95%; /* Use percentage for responsiveness */
  max-width: 1200px; /* Limit max width for larger screens */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 600px) {
    padding: 1rem;
    border-radius: 12px;
  }
`;

export default function Initiated() {
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState(null);
  const [ApplicationId, setApplicationId] = useState(null);

  // Toggle modal state
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();

  const actionFunctions = {
    CreateTimeLine: (row) => {
      const userdata = row.original;
      handleOpen();
      setApplicationId(userdata.referenceNumber);
      setTable({
        url: "/User/GetApplicationHistory",
        params: { ApplicationId: userdata.referenceNumber },
      });
    },
    EditForm: (row) => {
      const userdata = row.original;
      navigate("/user/editform", {
        state: {
          referenceNumber: userdata.referenceNumber,
          ServiceId: userdata.serviceId,
        },
      });
    },
    DownloadSanctionLetter: async (row) => {
      const userdata = row.original;
      const applicationId = userdata.referenceNumber;

      try {
        const fileName =
          applicationId.replace(/\//g, "_") + "_SanctionLetter.pdf";

        // Fetch the sanction letter from the API
        const response = await axiosInstance.get(
          "/User/DownloadSanctionLetter",
          { params: { fileName: fileName }, responseType: "blob" },
        );

        // Create a Blob from the response data
        const blob = new Blob([response.data], { type: "application/pdf" });

        // Trigger download
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        window.URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error("Error downloading sanction letter:", error);
        toast.error("Failed to download sanction letter.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
      }
    },
    DownloadCorrigendum: async (row, action) => {
      console.log("Action", action);
      const userdata = row.original;
      const applicationId = userdata.referenceNumber;

      try {
        const fileName =
          action.corrigendumId.replace(/\//g, "_") +
          "_CorrigendumSanctionLetter.pdf";

        // Fetch the sanction letter from the API
        const response = await axiosInstance.get(
          "/User/DownloadSanctionLetter",
          { params: { fileName: fileName }, responseType: "blob" },
        );

        // Create a Blob from the response data
        const blob = new Blob([response.data], { type: "application/pdf" });

        // Trigger download
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        window.URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error("Error downloading sanction letter:", error);
        toast.error("Failed to download sanction letter.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
      }
    },
    UpdateExpiringDocument: async (row, action) => {
      const userdata = row.original;
      navigate("/user/updateexpiringdocument", {
        state: {
          referenceNumber: userdata.referenceNumber,
          ServiceId: userdata.serviceId,
        },
      });
    },
  };

  return (
    <MainContainer>
      <ServerSideTable
        url="/User/GetInitiatedApplications"
        extraParams={{}}
        actionFunctions={actionFunctions}
        Title={"Initiated Applications"}
      />
      <BasicModal
        open={open}
        handleClose={handleClose}
        Title={"Application Status for " + ApplicationId}
        pdf={null}
        table={table}
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "70%", md: "50%" },
            maxWidth: "800px",
            borderRadius: "12px",
            padding: { xs: "1rem", sm: "2rem" },
          },
        }}
      />
    </MainContainer>
  );
}
