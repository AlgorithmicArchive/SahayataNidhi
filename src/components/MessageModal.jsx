import React from "react";
import { Modal, Box, Typography, Button } from "@mui/material";

const MessageModal = ({
  open,
  onClose,
  title,
  message,
  type = "info",
  primaryButton,
  secondaryButton,
}) => {
  const getColor = () => {
    switch (type) {
      case "error":
        return "#f44336"; // red
      case "success":
        return "#4caf50"; // green
      case "warning":
        return "#ff9800"; // orange
      case "info":
      default:
        return "#2196f3"; // blue
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: getColor() }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          {message}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
          {secondaryButton && (
            <Button
              variant="outlined"
              onClick={secondaryButton.action}
              sx={{
                borderColor: "#6B7280",
                color: "#6B7280",
                textTransform: "none",
                "&:hover": { borderColor: "#4B5563", color: "#4B5563" },
              }}
            >
              {secondaryButton.text}
            </Button>
          )}
          <Button
            variant="contained"
            onClick={primaryButton ? primaryButton.action : onClose}
            sx={{
              backgroundColor: getColor(),
              textTransform: "none",
              "&:hover": { backgroundColor: getColor() },
            }}
          >
            {primaryButton ? primaryButton.text : "Close"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default MessageModal;
