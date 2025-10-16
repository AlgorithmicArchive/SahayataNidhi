import React, { useState } from "react";
import { Box, styled } from "@mui/material";
import BasicModal from "../../components/BasicModal";
import { useNavigate } from "react-router-dom";
import ServerSideTable from "../../components/ServerSideTable";
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

export default function Incomplete() {
  const [open, setOpen] = useState(false);
  const [table, setTable] = useState(null);
  const [ApplicationId, setApplicationId] = useState(null);

  // Toggle modal state
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const navigate = useNavigate();

  const actionFunctions = {
    IncompleteForm: (row) => {
      const userdata = row.original;
      navigate("/user/incompleteform", {
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
        url="/User/IncompleteApplications"
        extraParams={{}}
        actionFunctions={actionFunctions}
        Title={"Incomplete Applications"}
      />
      <BasicModal
        open={open}
        handleClose={handleClose}
        Title={"Application Status"}
        pdf={null}
        table={table}
        accordion={ApplicationId}
      />
    </MainContainer>
  );
}
