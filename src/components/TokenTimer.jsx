import React, { useContext, useEffect, useState, useCallback } from "react";
import { Typography, Box, Modal, Button, Alert } from "@mui/material";
import { UserContext } from "../UserContext";

const TokenTimer = () => {
  const { tokenExpiry, setTokenExpiry } = useContext(UserContext);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inactivityThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
  const sessionDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
  const popupThreshold = 2 * 60 * 1000; // 2 minutes in milliseconds

  // Handle user activity to reset the timer
  const handleActivity = useCallback(() => {
    // Only reset timer if popup is not open
    if (!isPopupOpen) {
      const now = Date.now();
      setLastActivity(now);
      setTokenExpiry(now + sessionDuration);
    }
  }, [isPopupOpen, setTokenExpiry]);

  // Set up activity listeners
  useEffect(() => {
    const events = ["mousemove", "click", "keypress", "scroll"];
    events.forEach((event) => window.addEventListener(event, handleActivity));
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
    };
  }, [handleActivity]);

  // Timer logic
  useEffect(() => {
    if (!tokenExpiry) {
      setTimeLeft(null);
      setIsPopupOpen(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      // Start timer only after 5 minutes of inactivity
      if (timeSinceLastActivity < inactivityThreshold) {
        setTimeLeft(null);
        return;
      }

      const timeRemaining = tokenExpiry - now;

      if (timeRemaining <= 0) {
        setTimeLeft("Expired");
        setIsPopupOpen(false);
        // Trigger logout logic
        handleLogout();
      } else {
        const minutes = Math.floor(timeRemaining / 1000 / 60);
        const seconds = Math.floor((timeRemaining / 1000) % 60);
        setTimeLeft(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );

        // Show popup when 2 minutes remain
        if (timeRemaining <= popupThreshold && !isPopupOpen) {
          setIsPopupOpen(true);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tokenExpiry, lastActivity, isPopupOpen]);

  // Handle continue session
  const handleContinue = () => {
    const now = Date.now();
    setLastActivity(now);
    setTokenExpiry(now + sessionDuration);
    setIsPopupOpen(false);
  };

  // Handle session expiration
  const handleLogout = () => {
    setTimeLeft("Expired");
    setIsPopupOpen(false);
    // Optionally, trigger logout logic here
    // e.g., clear token, redirect to login
    // Example: localStorage.removeItem('authToken'); window.location.href = '/login';
  };

  if (!timeLeft) return null;

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 1300,
          px: 3,
          py: 1.5,
          bgcolor: timeLeft === "Expired" ? "error.main" : "#ff9800",
          color: "#fff",
          borderRadius: "8px",
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.3)",
          fontWeight: "bold",
          fontSize: "1.1rem",
          textAlign: "center",
          minWidth: "220px",
          transition: "all 0.3s ease",
        }}
      >
        {timeLeft === "Expired" ? "Session Expired" : `Session expires in: ${timeLeft}`}
      </Box>

      <Modal open={isPopupOpen} onClose={() => {}}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 400 },
            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            textAlign: "center",
          }}
        >
          <Alert severity="warning" sx={{ mb: 3 }}>
            Your session will expire in 2 minutes. Would you like to continue?
          </Alert>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              sx={{
                bgcolor: "primary.main",
                color: "background.paper",
                fontWeight: 600,
                px: 3,
                "&:hover": { bgcolor: "primary.dark" },
              }}
              onClick={handleContinue}
            >
              Continue
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: "error.main",
                color: "error.main",
                fontWeight: 600,
                px: 3,
                "&:hover": { borderColor: "error.dark", color: "error.dark" },
              }}
              onClick={handleLogout}
            >
              Logout
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default TokenTimer;