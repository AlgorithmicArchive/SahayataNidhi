import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Typography, Box, Modal, Button, Alert } from "@mui/material";
import { UserContext } from "../UserContext";
import axiosInstance from "../axiosConfig";
import { debounce } from "lodash";

const TokenTimer = () => {
  const { setTokenExpiry } = useContext(UserContext);
  const [timeLeft, setTimeLeft] = useState(null); // Format: "MM:SS" or null
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [countdownStartTime, setCountdownStartTime] = useState(null); // Timestamp when 30-min countdown begins
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastActivityRef = useRef(Date.now()); // Use ref to avoid re-renders on updates
  const intervalRef = useRef(null); // Ref for countdown interval

  const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
  const sessionDuration = 30 * 60 * 1000; // 30 minutes
  const popupThreshold = 2 * 60 * 1000; // 2 minutes

  // Initialize lastActivity from localStorage for persistence across refreshes
  useEffect(() => {
    const savedActivity = localStorage.getItem("lastActivity");
    if (savedActivity) {
      lastActivityRef.current = parseInt(savedActivity, 10);
    }
    setTokenExpiry(Date.now() + sessionDuration); // Initial expiry
  }, [setTokenExpiry]);

  // Debounced activity handler: Updates lastActivity and handles resumption
  const handleActivity = useCallback(
    debounce(() => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem("lastActivity", now.toString());

      // If countdown is active, stop it and send keep-alive request
      if (countdownStartTime) {
        stopCountdown();
        keepAlive(); // Send request to remove backend expiration
      }
    }, 500),
    [countdownStartTime],
  );

  // Attach/detach activity listeners
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

  // Check for 5-min inactivity and start countdown (runs every 10 seconds to minimize checks)
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      const timeIdle = now - lastActivityRef.current;

      if (timeIdle >= inactivityThreshold && !countdownStartTime) {
        // Start 30-min countdown from NOW (not from last activity)
        setCountdownStartTime(now);
        refreshToken(); // Refresh backend token
      }
    };

    checkInactivity();
    const checkInterval = setInterval(checkInactivity, 10000); // Check every 10 seconds (low frequency)
    return () => clearInterval(checkInterval);
  }, [countdownStartTime]); // Only re-run if countdown starts/stops

  // Countdown logic: Once started, update timer every 1 second
  useEffect(() => {
    if (!countdownStartTime) return;

    const updateCountdown = () => {
      const now = Date.now();
      const timeElapsed = now - countdownStartTime;
      const timeRemaining = sessionDuration - timeElapsed;

      if (timeRemaining <= 0) {
        stopCountdown();
        handleLogout();
        return;
      }

      // Format and show timer
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
      setTimeLeft(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`,
      );

      // Show popup in last 2 min
      if (timeRemaining <= popupThreshold) {
        setIsPopupOpen(true);
      }
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000); // Update every second for countdown

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [countdownStartTime]);

  // Stop countdown helper
  const stopCountdown = useCallback(() => {
    setCountdownStartTime(null);
    setTimeLeft(null);
    setIsPopupOpen(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Refresh token (called only on 5-min idle detection)
  const refreshToken = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      console.log("Refreshing token due to 5-min inactivity");
      const response = await axiosInstance.get("/Home/RefreshToken");
      if (response.data.status) {
        const { token, userType, profile, username, designation } =
          response.data;
        localStorage.setItem("authToken", token);
        localStorage.setItem("userType", userType);
        localStorage.setItem("profile", profile);
        localStorage.setItem("username", username);
        localStorage.setItem("designation", designation);
        setTokenExpiry(Date.now() + sessionDuration);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      handleLogout();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Keep alive (remove expiration - called on activity resumption)
  const keepAlive = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      console.log("Sending keep-alive to remove backend expiration");
      const response = await axiosInstance.get("/Home/KeepAlive"); // Update URL if needed
      if (response.data.status) {
        const { token, userType, profile, username, designation } =
          response.data;
        localStorage.setItem("authToken", token);
        localStorage.setItem("userType", userType);
        localStorage.setItem("profile", profile);
        localStorage.setItem("username", username);
        localStorage.setItem("designation", designation);
        setTokenExpiry(Date.now() + 24 * 60 * 60 * 1000); // e.g., 24 hours
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Keep-alive failed:", error);
      // Optionally fallback to refreshToken() or ignore if non-critical
    } finally {
      setIsRefreshing(false);
    }
  };

  // Continue session (from popup - refreshes and stops countdown)
  const handleContinue = async () => {
    await refreshToken(); // Extend the current countdown session
    stopCountdown();
  };

  // Logout
  const handleLogout = () => {
    stopCountdown();
    localStorage.clear();
    window.location.href = "/login";
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
          bgcolor: timeLeft === "00:00" ? "error.main" : "#ff9800", // Note: timeLeft won't be "00:00" exactly due to async
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
        Session expires in: {timeLeft}
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
              disabled={isRefreshing}
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
