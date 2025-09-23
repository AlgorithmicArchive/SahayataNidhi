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
  const {
    setTokenExpiry,
    setToken,
    setUserType,
    setUsername,
    setProfile,
    setDesignation,
  } = useContext(UserContext);
  const [timeLeft, setTimeLeft] = useState(null); // Format: "MM:SS" or null
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [countdownStartTime, setCountdownStartTime] = useState(null); // Timestamp when 30-min countdown begins
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastActivityRef = useRef(Date.now()); // Track last activity
  const intervalRef = useRef(null); // Ref for countdown interval

  const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
  const sessionDuration = 30 * 60 * 1000; // 30 minutes
  const popupThreshold = 2 * 60 * 1000; // 2 minutes

  // Initialize lastActivity from sessionStorage
  useEffect(() => {
    const savedActivity = sessionStorage.getItem("lastActivity");
    if (savedActivity) {
      lastActivityRef.current = parseInt(savedActivity, 10);
    }
    setTokenExpiry(Date.now() + sessionDuration); // Initial expiry
  }, [setTokenExpiry]);

  // Debounced activity handler
  const handleActivity = useCallback(
    debounce(() => {
      const now = Date.now();
      lastActivityRef.current = now;
      sessionStorage.setItem("lastActivity", now.toString());

      // If countdown is active, stop it and send keep-alive
      if (countdownStartTime) {
        stopCountdown();
        keepAlive();
      }
    }, 500),
    [countdownStartTime],
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

  // Check for inactivity every 10 seconds
  useEffect(() => {
    const checkInactivity = () => {
      const now = Date.now();
      const timeIdle = now - lastActivityRef.current;

      if (timeIdle >= inactivityThreshold && !countdownStartTime) {
        setCountdownStartTime(now);
        refreshToken();
      }
    };

    checkInactivity();
    const checkInterval = setInterval(checkInactivity, 10000);
    return () => clearInterval(checkInterval);
  }, [countdownStartTime]);

  // Countdown logic
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

      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
      setTimeLeft(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`,
      );

      if (timeRemaining <= popupThreshold) {
        setIsPopupOpen(true);
      }
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [countdownStartTime]);

  // Stop countdown
  const stopCountdown = useCallback(() => {
    setCountdownStartTime(null);
    setTimeLeft(null);
    setIsPopupOpen(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Refresh token
  const refreshToken = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      console.log("Refreshing token due to 5-min inactivity");
      const response = await axiosInstance.get("/Home/RefreshToken");
      if (response.data.status) {
        const { token, userType, profile, username, designation } =
          response.data;
        // Update sessionStorage and context
        setToken(token || null);
        setUserType(userType || null);
        setUsername(username || null);
        setProfile(profile || null);
        setDesignation(designation || null);
        sessionStorage.setItem("token", token || "");
        sessionStorage.setItem("userType", userType || "");
        sessionStorage.setItem(
          "profile",
          profile ? JSON.stringify(profile) : "",
        );
        sessionStorage.setItem("username", username || "");
        sessionStorage.setItem("designation", designation || "");
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

  // Keep alive
  const keepAlive = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      console.log("Sending keep-alive to remove backend expiration");
      const response = await axiosInstance.get("/Home/KeepAlive");
      if (response.data.status) {
        const { token, userType, profile, username, designation } =
          response.data;
        // Update sessionStorage and context
        setToken(token || null);
        setUserType(userType || null);
        setUsername(username || null);
        setProfile(profile || null);
        setDesignation(designation || null);
        sessionStorage.setItem("token", token || "");
        sessionStorage.setItem("userType", userType || "");
        sessionStorage.setItem(
          "profile",
          profile ? JSON.stringify(profile) : "",
        );
        sessionStorage.setItem("username", username || "");
        sessionStorage.setItem("designation", designation || "");
        setTokenExpiry(Date.now() + 24 * 60 * 60 * 1000);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Keep-alive failed:", error);
      await refreshToken(); // Fallback to refreshToken
    } finally {
      setIsRefreshing(false);
    }
  };

  // Continue session
  const handleContinue = async () => {
    await refreshToken();
    stopCountdown();
  };

  // Logout
  const handleLogout = () => {
    stopCountdown();
    sessionStorage.clear();
    setToken(null);
    setUserType(null);
    setUsername(null);
    setProfile(null);
    setDesignation(null);
    setTokenExpiry(null);
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
          bgcolor: timeLeft === "00:00" ? "error.main" : "#ff9800",
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
