import React from "react";
import { Modal, Box, Typography, Button } from "@mui/material";
import CustomTable from "./CustomTable";
import PdfViewer from "./PdfViewer";
import { fetchData } from "../assets/fetch";
import CustomButton from "./CustomButton";
import UserDetailsAccordion from "./UserDetailsAccordion";
import CancelIcon from "@mui/icons-material/Cancel";
import ServerSideTable from "./ServerSideTable";

// Modal style
const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
};

const BasicModal = ({
  open,
  handleClose,
  Title,
  table,
  pdf,
  handleActionButton,
  buttonText = "",
  accordion = null,
  additionalContent = null, // Added prop
  sx = {}, // Allow custom styles to be passed
}) => {
  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={[
          style,
          {
            maxHeight: "650px",
            overflowY: "scroll",
            width: { xs: "100%", md: "90%" },
          },
          ...(Array.isArray(sx) ? sx : [sx]), // Merge custom styles
        ]}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" component="h2" sx={{ textAlign: "center" }}>
            {Title}
          </Typography>
          <CancelIcon
            color="primary.main"
            onClick={handleClose}
            sx={{ cursor: "pointer", fontSize: "18px" }}
          />
        </Box>
        {accordion && (
          <Box sx={{ mt: 2 }}>
            <UserDetailsAccordion applicationId={accordion} />
          </Box>
        )}
        <Box sx={{ mt: 2, width: "100%" }}>
          {table != null && (
            <ServerSideTable
              url={table.url}
              extraParams={table.params}
              actionFunctions={{}}
              Title={Title}
            />
          )}
          {pdf != null && <PdfViewer pdfUrl={pdf} width={"50%"} />}
        </Box>
        {additionalContent && (
          <Box sx={{ mt: 2, mb: 2 }}>{additionalContent}</Box>
        )}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            {handleActionButton && buttonText && (
              <CustomButton text={buttonText} onClick={handleActionButton} />
            )}
            <Button variant="outlined" onClick={handleClose} sx={{ mt: 2 }}>
              Close
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default BasicModal;
