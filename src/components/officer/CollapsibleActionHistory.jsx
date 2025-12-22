import React from "react";
import { Box, Button, Tooltip, Collapse } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ServerSideTable from "../ServerSideTable";
import {
  AddCircleOutlineSharp,
  PlusOne,
  RemoveCircleOutlineSharp,
} from "@mui/icons-material";

const buttonStyles = {
  backgroundColor: "#FFFFFF",
  color: "primary.main",
  textTransform: "none",
  fontSize: "24px",
  fontWeight: 700,
  padding: "8px 16px",
  border: "1px solid",
  borderColor: "primary.main",
  borderRadius: "8px",
  "&:hover": {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
};

const CollapsibleActionHistory = ({
  detailsOpen,
  setDetailsOpen,
  applicationId,
}) => {
  return (
    <Box sx={{ width: "100%", mx: "auto", mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
        <Tooltip
          title={detailsOpen ? "Collapse history" : "Expand history"}
          arrow
        >
          <Button
            onClick={() => setDetailsOpen(!detailsOpen)}
            sx={buttonStyles}
            endIcon={
              detailsOpen ? (
                <RemoveCircleOutlineSharp />
              ) : (
                <AddCircleOutlineSharp />
              )
            }
            aria-expanded={detailsOpen}
            aria-label={detailsOpen ? "Collapse history" : "Expand history"}
          >
            {detailsOpen ? "Hide History" : "Application Movement History"}
          </Button>
        </Tooltip>
      </Box>
      <Collapse in={detailsOpen} timeout={500}>
        <Box
          sx={{
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          }}
        >
          <ServerSideTable
            url={"/Officer/GetApplicationHistory"}
            extraParams={{ ApplicationId: applicationId }}
            actionFunctions={{}}
            Title={"Application History"}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

export default CollapsibleActionHistory;
