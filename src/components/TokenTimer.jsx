import React, { useContext, useEffect, useState, useCallback } from "react";
import { Typography, Box, Modal, Button, Alert } from "@mui/material";
import { UserContext } from "../UserContext";
import axiosInstance from "../axiosConfig";
import { debounce } from "lodash";

const TokenTimer = () => {
  const { setTokenExpiry } = useContext(UserContext);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStart, setSessionStart] = useState(Date.now());
  const [lastRefresh, setLastRefresh] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
  const sessionDuration = 30 * 60 * 1000; // 30 minutes
  const popupThreshold = 2 * 60 * 1000; // 2 minutes
  const tokenRefreshThreshold = 5 * 60 * 1000; // 5 minutes
  const minRefreshInterval = 2 * 60 * 1000; // 2 minutes

  // Handle user activity to reset session
  const handleActivity = useCallback(
    debounce(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeRemaining = sessionStart + sessionDuration - now;

      if (timeSinceLastActivity >= inactivityThreshold && timeRemaining > 0) {
        setLastActivity(now);
        setSessionStart(now);
        setTokenExpiry(now + sessionDuration);
        setTimeLeft(null);
        setIsPopupOpen(false);
      }
    }, 500),
    [isPopupOpen, lastActivity, sessionStart],
  );

  // Attach activity listeners
  useEffect(() => {
    const events = ["mousemove", "click", "keypress", "scroll"];
    events.forEach((event) => window.addEventListener(event, handleActivity));
    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
      handleActivity.cancel();
    };
  }, [handleActivity]);

  // Timer logic
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const timeRemaining = sessionStart + sessionDuration - now;

      if (timeRemaining <= 0) {
        setTimeLeft("Expired");
        setIsPopupOpen(false);
        handleLogout();
        return;
      }

      if (timeSinceLastActivity >= inactivityThreshold) {
        const minutes = Math.floor(timeRemaining / 1000 / 60);
        const seconds = Math.floor((timeRemaining / 1000) % 60);
        setTimeLeft(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`,
        );

        if (timeRemaining <= popupThreshold) {
          setIsPopupOpen(true);
        }
      } else {
        setTimeLeft(null);
        setIsPopupOpen(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionStart, lastActivity]);

  // Refresh token
  const refreshToken = async () => {
    if (isRefreshing || Date.now() - lastRefresh < minRefreshInterval) {
      console.log("Token refresh skipped: in progress or within cooldown");
      return true;
    }

    setIsRefreshing(true);
    try {
      console.log("Attempting token refresh at", new Date().toISOString());
      const response = await axiosInstance.get("/Home/RefreshToken");
      if (response.data.status) {
        const { token, userType, profile, username, designation } =
          response.data;
        localStorage.setItem("authToken", token);
        localStorage.setItem("userType", userType);
        localStorage.setItem("profile", profile);
        localStorage.setItem("username", username);
        localStorage.setItem("designation", designation);
        setLastRefresh(Date.now());
        return true;
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      handleLogout();
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  // Continue session
  const handleContinue = async () => {
    const now = Date.now();
    if (await refreshToken()) {
      setLastActivity(now);
      setSessionStart(now);
      setTokenExpiry(now + sessionDuration);
      setIsPopupOpen(false);
      setTimeLeft(null);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setTimeLeft("Expired");
    setIsPopupOpen(false);
    localStorage.clear();
    window.location.href = "/login";
  };

  // Periodically check token expiry
  useEffect(() => {
    const checkTokenExpiry = async () => {
      const now = Date.now();
      const timeRemaining = sessionStart + sessionDuration - now;

      if (
        timeRemaining <= tokenRefreshThreshold &&
        timeRemaining > 0 &&
        now - lastRefresh >= minRefreshInterval
      ) {
        await refreshToken();
      }
    };

    const interval = setInterval(checkTokenExpiry, 2 * 60 * 1000); // Check every 2 minutes
    return () => clearInterval(interval);
  }, [sessionStart, lastRefresh]);

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
