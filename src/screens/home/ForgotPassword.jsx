import React, { useState } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const StyledBox = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
  padding: theme.spacing(2),
}));

const FormContainer = styled(Box)(({ theme }) => ({
  backgroundColor: "white",
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
  width: "100%",
  maxWidth: "400px",
}));

const StyledButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: theme.spacing(1.5),
  fontWeight: "bold",
}));

export default function ForgotPassword() {
  const [mode, setMode] = useState("password"); // "password" or "username"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [username, setUsername] = useState(""); // For username display
  const [step, setStep] = useState(1); // 1: Email input, 2: OTP & action input for password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSendAction = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.match(/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const endpoint =
        mode === "password"
          ? "/Home/SendPasswordResetOtp"
          : "/Home/SendUsernameToEmail";
      const formdata = new FormData();
      formdata.append("email", email);
      const response = await fetch(endpoint, {
        method: "POST",
        body: formdata,
      });
      const data = await response.json();
      if (data.status) {
        if (mode === "password") {
          setSuccess(data.message || "OTP sent for password reset!");
          setStep(2);
        } else {
          setUsername(data.username || "Username sent to your email!");
          setSuccess(data.message || "Username has been sent to your email!");
          setEmail("");
          // navigate("/"); // Redirect to home after success
        }
      } else {
        setError(
          data.message || "Failed to process request. Please try again.",
        );
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    setLoading(true);
    try {
      const formdata = new FormData();
      formdata.append("email", email);
      formdata.append("otp", otp);
      formdata.append("newPassword", newPassword);
      const response = await fetch("/Home/ValidateOtpAndResetPassword", {
        method: "POST",
        body: formdata,
      });
      const data = await response.json();
      if (data.status) {
        setSuccess(data.message || "Password reset successfully!");
        setEmail("");
        setOtp("");
        setNewPassword("");
        setStep(1);
        navigate("/login");
      } else {
        setError(
          data.message || "Invalid OTP or reset failed. Please try again.",
        );
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledBox>
      <FormContainer>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          className="font-bold"
        >
          {mode === "password" ? "Forgot Password" : "Forgot Username"}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Button
            variant={mode === "password" ? "contained" : "outlined"}
            color="primary"
            onClick={() => {
              setMode("password");
              setStep(1);
              setError("");
              setSuccess("");
            }}
            sx={{ mr: 1 }}
          >
            Forgot Password
          </Button>
          <Button
            variant={mode === "username" ? "contained" : "outlined"}
            color="primary"
            onClick={() => {
              setMode("username");
              setStep(1);
              setError("");
              setSuccess("");
            }}
          >
            Forgot Username
          </Button>
        </Box>
        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" className="mb-4">
            {success}
            {mode === "username" && username && (
              <Typography variant="body1" sx={{ mt: 1 }}>
                Note: Check your email for your username.
              </Typography>
            )}
          </Alert>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendAction} className="flex flex-col gap-4">
            <TextField
              label="Email Address"
              variant="outlined"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
            />
            <StyledButton
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : mode === "password" ? (
                "Send OTP"
              ) : (
                "Send Username to Email"
              )}
            </StyledButton>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <TextField
              label="OTP"
              variant="outlined"
              fullWidth
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <TextField
              label="New Password"
              variant="outlined"
              fullWidth
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <StyledButton
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Reset Password"
              )}
            </StyledButton>
            <Button
              variant="text"
              color="secondary"
              onClick={() => {
                setStep(1);
                setError("");
                setSuccess("");
              }}
            >
              Back to Email
            </Button>
          </form>
        )}
      </FormContainer>
    </StyledBox>
  );
}
