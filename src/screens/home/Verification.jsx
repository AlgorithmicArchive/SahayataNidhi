// Verification.jsx
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
import { useNavigate } from "react-router-dom";
import { Validate } from "../../assets/fetch";
import { UserContext } from "../../UserContext";

export default function Verification() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const {
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm();

  const { setVerified, userType, username } = useContext(UserContext);
  const navigate = useNavigate();

  // Auto-select OTP for Citizen users
  useEffect(() => {
    if (userType === "Citizen") {
      handleOptionSelect("otp");
    }
  }, [userType]);

  const handleOptionSelect = async (option) => {
    setErrorMessage("");
    setOtpMessage("");
    setSelectedOption(option);

    if (option === "otp") {
      setIsSendingOtp(true);
      try {
        const response = await fetch(`/Home/SendLoginOtp?username=${username}`);
        const data = await response.json();
        if (data.status) {
          setOtpMessage(data.message || "OTP sent to your email and mobile.");
        } else {
          setErrorMessage(data.message || "Failed to send OTP.");
          // If OTP send fails, keep the option selected but show error
          if (data.message.includes("not found") || data.message.includes("not available")) {
            setOtpMessage(data.message);
          }
        }
      } catch (error) {
        console.error("Error sending OTP:", error);
        setErrorMessage("Network error. Please try again.");
      } finally {
        setIsSendingOtp(false);
      }
    }
  };

  const handleBack = () => {
    setSelectedOption(null);
    setErrorMessage("");
    setOtpMessage("");
    setValue("otp", "");
    setValue("backupCode", "");
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await Validate(formData);
      if (response.status) {
        // ONLY SET VERIFIED ON SUCCESS
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async () => {
    setIsSendingOtp(true);
    setErrorMessage("");
    setOtpMessage("");

    try {
      const response = await fetch(`/Home/SendLoginOtp?username=${username}`);
      const data = await response.json();
      if (data.status) {
        setOtpMessage(data.message || "OTP sent to your email and mobile.");
      } else {
        setErrorMessage(data.message || "Failed to send OTP.");
        if (data.message.includes("not found") || data.message.includes("not available")) {
          setOtpMessage(data.message);
        }
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // If user is Citizen, show OTP form directly
  if (userType === "Citizen") {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "80vh",
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
          OTP Verification
        </Typography>

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
          {isSendingOtp && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <CircularProgress size={20} sx={{ color: "primary.main" }} />
              <Typography variant="body2">Sending OTP...</Typography>
            </Box>
          )}

          {otpMessage && (
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
            label="Enter OTP sent to your Email and Mobile Number."
            name="otp"
            placeholder="OTP"
            type="text"
            control={control}
            rules={{
              required: "OTP is required.",
              pattern: {
                value: /^[0-9]{7}$/,
                message: "OTP must be 7 digits",
              }
            }}
            errors={errors}
            disabled={isSubmitting || isSendingOtp}
          />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <CustomButton
              text={isSubmitting ? "Verifying..." : "Submit"}
              onClick={handleSubmit(onSubmit)}
              bgColor="primary.main"
              color="background.paper"
              width="100%"
              disabled={isSubmitting || isSendingOtp}
              startIcon={isSubmitting && <CircularProgress size={20} color="inherit" />}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                onClick={resendOtp}
                disabled={isSendingOtp}
                sx={{
                  color: "primary.main",
                  borderColor: "primary.main",
                  borderRadius: 3,
                  textTransform: "none",
                  flex: 1,
                  "&:hover": {
                    backgroundColor: "primary.light",
                    borderColor: "primary.dark",
                  },
                  "&:disabled": {
                    borderColor: "grey.400",
                    color: "grey.400",
                  }
                }}
                startIcon={isSendingOtp && <CircularProgress size={16} />}
              >
                {isSendingOtp ? "Sending..." : "Resend OTP"}
              </Button>
            </Box>
          </Box>

          {errorMessage && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {errorMessage}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // For non-Citizen users, show the selection screen
  return (
    <Box
      sx={{
        width: "100vw",
        height: "80vh",
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
          <Button
            variant="contained"
            onClick={() => handleOptionSelect("backup")}
            sx={{
              backgroundColor: "background.paper",
              color: "primary.main",
              borderRadius: 3,
              fontWeight: "bold",
              textTransform: "none",
            }}
          >
            Use Backup Codes
          </Button>
        </Box>
      )}

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

          {selectedOption === "otp" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 1,
              }}
            >
              {isSendingOtp && (
                <>
                  <CircularProgress size={20} sx={{ color: "primary.main" }} />
                  <Typography variant="body2">Sending OTP...</Typography>
                </>
              )}
            </Box>
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
              ...(selectedOption === "otp" && {
                pattern: {
                  value: /^[0-9]{7}$/,
                  message: "OTP must be 7 digits",
                }
              })
            }}
            errors={errors}
            disabled={isSubmitting || (selectedOption === "otp" && isSendingOtp)}
          />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <CustomButton
              text={isSubmitting ? "Verifying..." : "Submit"}
              onClick={handleSubmit(onSubmit)}
              bgColor="primary.main"
              color="background.paper"
              width="100%"
              disabled={isSubmitting || (selectedOption === "otp" && isSendingOtp)}
              startIcon={isSubmitting && <CircularProgress size={20} color="inherit" />}
            />

            {selectedOption === "otp" && (
              <Box sx={{ display: "flex", gap: 2, justifyContent: "space-between" }}>
                <Button
                  variant="outlined"
                  onClick={resendOtp}
                  disabled={isSendingOtp}
                  sx={{
                    color: "primary.main",
                    borderColor: "primary.main",
                    borderRadius: 3,
                    textTransform: "none",
                    flex: 1,
                    "&:hover": {
                      backgroundColor: "primary.light",
                      borderColor: "primary.dark",
                    },
                    "&:disabled": {
                      borderColor: "grey.400",
                      color: "grey.400",
                    }
                  }}
                  startIcon={isSendingOtp && <CircularProgress size={16} />}
                >
                  {isSendingOtp ? "Sending..." : "Resend OTP"}
                </Button>

                <Button
                  variant="outlined"
                  onClick={handleBack}
                  sx={{
                    color: "primary.main",
                    borderColor: "primary.main",
                    borderRadius: 3,
                    textTransform: "none",
                    flex: 1,
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

            {selectedOption === "backup" && (
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
            )}
          </Box>

          {errorMessage && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {errorMessage}
            </Typography>
          )}
        </Box>
      )}

      {errorMessage && !selectedOption && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {errorMessage}
        </Typography>
      )}
    </Box>
  );
}