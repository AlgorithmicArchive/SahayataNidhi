import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import React, { useContext, useState, useEffect } from "react";
import CustomInputField from "../../components/form/CustomInputField";
import { useForm } from "react-hook-form";
import CustomButton from "../../components/CustomButton";
import { useNavigate, useLocation } from "react-router-dom";
import { Validate } from "../../assets/fetch";
import { UserContext } from "../../UserContext";

export default function Verification() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOProcessing, setIsSSOProcessing] = useState(true); // Show loading during SSO

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();

  const { setVerified, userType, username, setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  // ========================================
  // AUTO-PROCESS SSO FROM ?sso=... PARAM
  // ========================================
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sso = params.get("sso");

    if (sso) {
      try {
        const data = JSON.parse(decodeURIComponent(sso));

        if (data.status && data.token) {
          // Save to localStorage
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data));

          // Update context
          setVerified(true);
          if (setUser) setUser(data); // Optional: update full user in context

          // Redirect based on userType
          const redirectUrl =
            data.userType === "Admin"
              ? "/admin/home"
              : data.userType === "Officer"
              ? "/officer/home"
              : data.userType === "Designer"
              ? "/designer/dashboard"
              : data.userType === "Viewer"
              ? "/viewer/home"
              : "/user/home";

          navigate(redirectUrl, { replace: true });
        } else {
          setErrorMessage("Invalid SSO response.");
          setIsSSOProcessing(false);
        }
      } catch (e) {
        console.error("SSO parse error:", e);
        setErrorMessage("Invalid SSO data.");
        setIsSSOProcessing(false);
      }
    } else {
      setIsSSOProcessing(false); // No SSO → show OTP form
    }
  }, [location, navigate, setVerified, setUser]);

  // ========================================
  // NORMAL OTP / BACKUP FLOW
  // ========================================
  const handleOptionSelect = async (option) => {
    setErrorMessage("");
    setOtpMessage("");
    if (option === "otp") {
      setIsLoading(true);
      try {
        const response = await fetch(`/Home/SendLoginOtp?username=${username}`);
        const data = await response.json();
        if (data.status) {
          setOtpMessage(data.message || "OTP sent to your email and mobile.");
          setSelectedOption(option);
        } else {
          setErrorMessage(data.message || "Failed to send OTP.");
        }
      } catch (error) {
        console.error("Error sending OTP:", siete);
        setErrorMessage("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setSelectedOption(option);
    }
  };

  const handleBack = () => {
    setSelectedOption(null);
    setErrorMessage("");
    setOtpMessage("");
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await Validate(formData);
      if (response.status) {
        setVerified(true);
        const url =
          response.userType === "Admin"
            ? "/admin/home"
            : response.userType === "Officer"
            ? "/officer/home"
            : response.userType === "Designer"
            ? "/designer/dashboard"
            : response.userType === "Viewer"
            ? "/viewer/home"
            : "/user/home";
        navigate(url);
      } else {
        setErrorMessage(response.message || "Verification failed.");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setErrorMessage("An error occurred during verification.");
    }
  };

  // ========================================
  // RENDER
  // ========================================
  if (isSSOProcessing) {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        <CircularProgress sx={{ color: "primary.main" }} />
        <Typography variant="body1" color="text.primary">
          Completing Jan Parichay login...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100vw",
        height: "60vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 3,
        px: 2,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: "bold", color: "text.primary" }}
      >
        Verification
      </Typography>

      {/* Show OTP/Backup Options */}
      {!selectedOption && !isLoading && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => handleOptionSelect("otp")}
            sx={{
              backgroundColor: "primary.main",
              color: "background.paper",
              borderRadius: 3,
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": { backgroundColor: "primary.dark" },
            }}
          >
            Use OTP Verification
          </Button>
          {userType !== "Citizen" && (
            <Button
              variant="contained"
              onClick={() => handleOptionSelect("backup")}
              sx={{
                backgroundColor: "background.paper",
                color: "primary.main",
                borderRadius: 3,
                fontWeight: "bold",
                textTransform: "none",
                "&:hover": { backgroundColor: "background.paper" },
              }}
            >
              Use Backup Codes
            </Button>
          )}
        </Box>
      )}

      {/* Sending OTP */}
      {!selectedOption && isLoading && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress sx={{ color: "primary.main" }} />
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            Sending OTP...
          </Typography>
        </Box>
      )}

      {/* OTP / Backup Form */}
      {selectedOption && (
        <Box
          sx={{
            width: "100%",
            maxWidth: 400,
            backgroundColor: "background.paper",
            padding: 5,
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            boxShadow: 3,
          }}
        >
          {otpMessage && selectedOption === "otp" && (
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: otpMessage.includes("not")
                  ? "error.main"
                  : "text.primary",
              }}
            >
              {otpMessage}
            </Typography>
          )}

          <CustomInputField
            label={
              selectedOption === "otp"
                ? "Enter OTP sent to your Email and Mobile Number."
                : "Enter your backup code."
            }
            name={selectedOption === "otp" ? "otp" : "backupCode"}
            placeholder={selectedOption === "otp" ? "OTP" : "Backup Code"}
            type="text"
            control={control}
            rules={{
              required:
                selectedOption === "otp"
                  ? "OTP is required."
                  : "Backup Code is required.",
            }}
            errors={errors}
          />

          <CustomButton
            text="Submit"
            onClick={handleSubmit(onSubmit)}
            bgColor="primary.main"
            color="background.paper"
            width="100%"
          />

          <Button
            variant="outlined"
            onClick={handleBack}
            sx={{
              color: "primary.main",
              borderColor: "primary.main",
              borderRadius: 3,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "primary.light",
                borderColor: "primary.dark",
              },
            }}
          >
            Back
          </Button>
        </Box>
      )}

      {errorMessage && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {errorMessage}
        </Typography>
      )}
    </Box>
  );
}
