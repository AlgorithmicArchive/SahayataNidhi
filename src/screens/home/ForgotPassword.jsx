import React, { useState, useRef, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Paper,
  Fade,
  Zoom,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  Email as EmailIcon,
  LockReset as LockResetIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  VpnKey as VpnKeyIcon,
  Lock as LockIcon,
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

// Custom Styled Components
const StyledContainer = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  background: "linear-gradient(to bottom right, #F4F9FF 0%, #F9F3EC 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2),
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(1),
  },
}));

const GlassCard = styled(Paper)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(12px)",
  borderRadius: theme.shape.borderRadius * 3,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
  padding: theme.spacing(5),
  width: "100%",
  maxWidth: "440px",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  transition: "all 0.3s ease",
  "&:hover": {
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
  },
}));

const ModeToggle = styled(Box)(({ theme }) => ({
  display: "flex",
  backgroundColor: alpha(theme.palette.primary.main, 0.08),
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(0.5),
  marginBottom: theme.spacing(3),
  overflow: "hidden",
}));

const ModeButton = styled(Button)(({ theme, active }) => ({
  flex: 1,
  textTransform: "none",
  fontWeight: 600,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(1.2, 2),
  backgroundColor: active ? theme.palette.primary.main : "transparent",
  color: active ? "white" : theme.palette.text.primary,
  "&:hover": {
    backgroundColor: active
      ? theme.palette.primary.dark
      : alpha(theme.palette.primary.main, 0.12),
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: theme.shape.borderRadius * 2,
    backgroundColor: alpha(theme.palette.common.white, 0.8),
    transition: "all 0.3s ease",
    "&:hover": {
      backgroundColor: alpha(theme.palette.common.white, 1),
    },
    "&.Mui-focused": {
      backgroundColor: theme.palette.common.white,
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(1.8, 4),
  borderRadius: theme.shape.borderRadius * 3,
  fontWeight: 600,
  textTransform: "none",
  fontSize: "1.05rem",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
  },
  "&:disabled": {
    backgroundColor: alpha(theme.palette.action.disabledBackground, 0.6),
  },
}));

const AccountCard = styled(Paper)(({ theme }) => ({
  marginBottom: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius * 2,
  overflow: "hidden",
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[8],
  },
}));

const OtpInputContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

const OtpDigitInput = styled(TextField)(({ theme }) => ({
  flex: 1,
  "& .MuiOutlinedInput-root": {
    width: 50,
    height: 50,
    textAlign: "center",
    fontSize: "1.2rem",
    fontWeight: 600,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.9),
    "&.Mui-focused": {
      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}`,
    },
  },
  "& .MuiInputBase-input": {
    textAlign: "center",
  },
}));

export default function ForgotPassword() {
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [username, setUsername] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const navigate = useNavigate();
  const otpInputRefs = useRef([]);

  // Focus first OTP digit when entering step 3
  useEffect(() => {
    if (step === 3 && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [step]);

  // Handle OTP digit input and auto-focus next
  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(0, 1);
    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = digit;
    setOtpDigits(newOtpDigits);

    if (digit && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  // Handle OTP paste or full input
  const handleOtpInput = (index, e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length > 1) {
      const newOtpDigits = [...otpDigits];
      for (let i = 0; i < value.length && index + i < 6; i++) {
        newOtpDigits[index + i] = value.charAt(i);
      }
      setOtpDigits(newOtpDigits);
      const nextFocus = Math.min(index + value.length, 5);
      if (otpInputRefs.current[nextFocus]) {
        otpInputRefs.current[nextFocus].focus();
      }
    } else {
      handleOtpDigitChange(index, value);
    }
  };

  // Get full OTP string
  const getFullOtp = () => otpDigits.join("");

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
          ? "/Home/GetAccountsForPasswordReset"
          : "/Home/SendUsernameToEmail";
      const formdata = new FormData();
      formdata.append("email", email);
      const response = await fetch(endpoint, {
        method: "POST",
        body: formdata,
      });

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Verify Content-Type is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();
      if (data.status) {
        if (mode === "password") {
          if (data.accounts && data.accounts.length > 1) {
            setAccounts(data.accounts);
            setSuccess(
              data.message ||
                "Multiple accounts found. Please select one to proceed.",
            );
            setStep(2);
          } else {
            const userId = data.accounts?.[0]?.userId || "";
            await sendOtpForUser(userId);
          }
        } else {
          setUsername(data.usernames || "Usernames sent to your email!");
          setSuccess(data.message || "Usernames sent successfully!");
          setEmail("");
        }
      } else {
        setError(data.message || "Request failed. Please try again.");
      }
    } catch (err) {
      console.error("Fetch error:", err.message);
      setError(
        err.message === "Failed to fetch"
          ? "Network error. Please check your connection."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const sendOtpForUser = async (userId) => {
    setLoading(true);
    try {
      const formdata = new FormData();
      formdata.append("email", email);
      formdata.append("userId", userId);
      const response = await fetch("/Home/SendPasswordResetOtp", {
        method: "POST",
        body: formdata,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status) {
        setSelectedUserId(userId);
        setSuccess(data.message || "OTP sent to your email!");
        setStep(3);
        setOtpDigits(["", "", "", "", "", ""]);
      } else {
        setError(data.message || "Failed to send OTP.");
      }
    } catch (err) {
      console.error("Fetch error:", err.message);
      setError(
        err.message === "Failed to fetch"
          ? "Network error. Please check your connection."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const fullOtp = getFullOtp();
    if (fullOtp.length !== 6 || !/^\d+$/.test(fullOtp)) {
      setError("Enter a valid 6-digit OTP");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const formdata = new FormData();
      formdata.append("email", email);
      formdata.append("otp", fullOtp);
      formdata.append("newPassword", newPassword);
      formdata.append("userId", selectedUserId);
      const response = await fetch("/Home/ValidateOtpAndResetPassword", {
        method: "POST",
        body: formdata,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status) {
        setSuccess(data.message || "Password reset successfully!");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setError(data.message || "Invalid OTP or reset failed.");
      }
    } catch (err) {
      console.error("Fetch error:", err.message);
      setError(
        err.message === "Failed to fetch"
          ? "Network error. Please check your connection."
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setError("");
    setSuccess("");
    setAccounts([]);
    setSelectedUserId("");
    setOtpDigits(["", "", "", "", "", ""]);
    setNewPassword("");
  };

  return (
    <StyledContainer>
      <Zoom in timeout={600}>
        <GlassCard elevation={12}>
          <Typography
            variant="h4"
            align="center"
            fontWeight={700}
            gutterBottom
            sx={{
              background: "linear-gradient(90deg, #667eea, #764ba2)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {mode === "password" ? "Reset Password" : "Retrieve Username"}
          </Typography>

          <ModeToggle>
            <ModeButton
              active={mode === "password" ? 1 : 0}
              onClick={() => {
                setMode("password");
                resetForm();
              }}
              startIcon={<LockResetIcon />}
              aria-label="Switch to password reset mode"
            >
              Password
            </ModeButton>
            <ModeButton
              active={mode === "username" ? 1 : 0}
              onClick={() => {
                setMode("username");
                resetForm();
              }}
              startIcon={<PersonIcon />}
              aria-label="Switch to username retrieval mode"
            >
              Username
            </ModeButton>
          </ModeToggle>

          <Fade in={!!error} timeout={400}>
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              sx={{ mb: 2, borderRadius: 2 }}
              role="alert"
            >
              {error}
            </Alert>
          </Fade>

          <Fade in={!!success} timeout={400}>
            <Alert
              severity="success"
              icon={<CheckCircleIcon />}
              sx={{ mb: 2, borderRadius: 2 }}
              role="alert"
            >
              {success}
              {mode === "username" && username && (
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 500 }}>
                  Usernames: <strong>{username}</strong>
                </Typography>
              )}
            </Alert>
          </Fade>

          {step === 1 && (
            <Box component="form" onSubmit={handleSendAction}>
              <StyledTextField
                label="Email Address"
                variant="outlined"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                helperText="Enter the email associated with your account"
                sx={{ mb: 3 }}
                inputProps={{ "aria-label": "Email address" }}
              />

              <ActionButton
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
                size="large"
                aria-label={
                  mode === "password" ? "Find accounts" : "Send usernames"
                }
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : mode === "password" ? (
                  "Find Accounts"
                ) : (
                  "Send Usernames"
                )}
              </ActionButton>
            </Box>
          )}

          {step === 2 && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                fontWeight={600}
                color="text.primary"
              >
                Select Account
              </Typography>
              <List disablePadding>
                {accounts.map((account) => (
                  <AccountCard key={account.userId} elevation={2}>
                    <ListItemButton
                      onClick={() => sendOtpForUser(account.userId)}
                      sx={{ py: 2 }}
                      aria-label={`Select account with username ${account.maskedUsername}`}
                    >
                      <ListItemText
                        primary={
                          <Typography fontWeight={600}>
                            {account.maskedUsername}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            Type: {account.userType}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </AccountCard>
                ))}
              </List>

              <Button
                startIcon={<ArrowBackIcon />}
                onClick={resetForm}
                fullWidth
                sx={{ mt: 2, textTransform: "none" }}
                aria-label="Back to email input"
              >
                Back to Email
              </Button>
            </Box>
          )}

          {step === 3 && (
            <Box component="form" onSubmit={handleResetPassword}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Verification Code
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  Enter the 6-digit code sent to your email
                </Typography>
                <OtpInputContainer>
                  {otpDigits.map((digit, index) => (
                    <OtpDigitInput
                      key={index}
                      variant="outlined"
                      value={digit}
                      onChange={(e) => handleOtpInput(index, e)}
                      inputProps={{
                        maxLength: 1,
                        inputMode: "numeric",
                        type: "text",
                        "aria-label": `OTP digit ${index + 1}`,
                      }}
                      inputRef={(el) => (otpInputRefs.current[index] = el)}
                      error={getFullOtp().length < 6 && step === 3}
                    />
                  ))}
                </OtpInputContainer>
              </Box>

              <Divider sx={{ my: 2 }} />

              <StyledTextField
                label="New Password"
                variant="outlined"
                fullWidth
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                helperText="Minimum 8 characters"
                sx={{ mb: 3 }}
                inputProps={{ "aria-label": "New password" }}
              />

              <ActionButton
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={
                  loading || getFullOtp().length !== 6 || newPassword.length < 8
                }
                aria-label="Reset password"
              >
                {loading ? <CircularProgress size={24} /> : "Reset Password"}
              </ActionButton>

              <Button
                startIcon={<ArrowBackIcon />}
                onClick={resetForm}
                fullWidth
                sx={{ mt: 1.5, textTransform: "none" }}
                aria-label="Back to start"
              >
                Back to Start
              </Button>
            </Box>
          )}
        </GlassCard>
      </Zoom>
    </StyledContainer>
  );
}
