import React, { useState } from "react";
import { Modal, Box, Typography, TextField, Button } from "@mui/material";

export default function OtpModal({
  open,
  onClose,
  onSubmit,
  registeredAt = "email",
  erorrMessage = "",
}) {
  const [otp, setOtp] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(otp);
    setOtp(""); // Reset OTP input after submission
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
      }}
      aria-labelledby="otp-modal-title"
      aria-describedby="otp-modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          border: "2px solid #000",
          boxShadow: 24,
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography id="otp-modal-title" variant="h6" component="h2">
          Enter OTP
        </Typography>
        <Typography
          id="otp-modal-description"
          sx={{ mt: 1, color: erorrMessage == "" ? "green" : "red" }}
        >
          {erorrMessage == ""
            ? `Please enter the OTP sent to your registered ${registeredAt}.`
            : erorrMessage}
        </Typography>
        <form
          onSubmit={handleSubmit}
          style={{ width: "100%" }}
          autoComplete="off"
        >
          <TextField
            label="OTP"
            variant="outlined"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            sx={{ mt: 2, width: "100%" }}
            inputProps={{ maxLength: 7 }}
            aria-label="OTP input"
          />
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!otp || otp.length < 4}
              fullWidth
            >
              Submit OTP
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                console.log("Cancel button clicked");
                onClose();
              }}
              fullWidth
            >
              Cancel
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
}
