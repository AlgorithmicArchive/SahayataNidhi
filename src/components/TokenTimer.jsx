import React, { useContext, useEffect, useState, useCallback } from "react";
import { Typography, Box, Modal, Button, Alert } from "@mui/material";
import { UserContext } from "../UserContext";
import axiosInstance from "../axiosConfig";
const TokenTimer = () => {
  const { tokenExpiry, setTokenExpiry } = useContext(UserContext);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
  const sessionDuration = 30 * 60 * 1000; // 30 minutes (matches backend)
  const popupThreshold = 2 * 60 * 1000; // 2 minutes

  // Handle user activity to reset inactivity timer
  const handleActivity = useCallback(() => {
    if (!isPopupOpen) {
      setLastActivity(Date.now());
    }
  }, [isPopupOpen]);

  // Attach activity listeners
  useEffect(() => {
    const events = ["mousemove", "click", "keypress", "scroll"];
    events.forEach((event) => window.addEventListener(event, handleActivity));
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity),
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

      if (timeSinceLastActivity < inactivityThreshold) {
        setTimeLeft(null);
        return;
      }

      const timeRemaining = tokenExpiry - now;

      if (timeRemaining <= 0) {
        setTimeLeft("Expired");
        setIsPopupOpen(false);
        handleLogout();
      } else {
        const minutes = Math.floor(timeRemaining / 1000 / 60);
        const seconds = Math.floor((timeRemaining / 1000) % 60);
        setTimeLeft(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`,
        );

        if (timeRemaining <= popupThreshold && !isPopupOpen) {
          setIsPopupOpen(true);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [tokenExpiry, lastActivity, isPopupOpen]);

  // Continue session by refreshing the token
  const handleContinue = async () => {
    try {
      const response = await axiosInstance.get("/Home/RefreshToken");

      if (response.data.status) {
        const { token } = response.data;
        const now = Date.now();
        const newExpiry = now + sessionDuration;

        // Update token in localStorage
        localStorage.setItem("authToken", token);

        // Optionally store other user data from response if needed
        // localStorage.setItem("userType", response.data.userType);
        // localStorage.setItem("profile", response.data.profile);
        // localStorage.setItem("username", response.data.username);
        // localStorage.setItem("designation", response.data.designation);

        // Update context and reset timer
        setLastActivity(now);
        setTokenExpiry(newExpiry);
        setIsPopupOpen(false);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      handleLogout(); // Log out if refresh fails (e.g., token expired)
    }
  };

  // Handle logout
  const handleLogout = () => {
    setTimeLeft("Expired");
    setIsPopupOpen(false);
    localStorage.removeItem("authToken"); // Clear token
    // Clear other stored data if needed
    // localStorage.removeItem("userType");
    // localStorage.removeItem("profile");
    // localStorage.removeItem("username");
    // localStorage.removeItem("designation");
    window.location.href = "/login"; // Redirect to login
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
        {timeLeft === "Expired"
          ? "Session Expired"
          : `Session expires in: ${timeLeft}`}
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
