import React, { useState } from "react";
import { Box } from "@mui/material";
import BasicModal from "../../components/BasicModal";
import { useNavigate } from "react-router-dom";
import ServerSideTable from "../../components/ServerSideTable";

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
    <Box
      sx={{
        height: { xs: "100vh", md: "50vh" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Box sx={{ width: { xs: "100%", md: "80%" } }}>
        <ServerSideTable
          url="/User/IncompleteApplications"
          extraParams={{}}
          actionFunctions={actionFunctions}
          Title={"Incomplete Applications"}
        />
      </Box>
      <BasicModal
        open={open}
        handleClose={handleClose}
        Title={"Application Status"}
        pdf={null}
        table={table}
        accordion={ApplicationId}
      />
    </Box>
  );
}
