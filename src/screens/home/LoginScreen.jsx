import React, { useContext, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CustomInputField from "../../components/form/CustomInputField";
import CustomButton from "../../components/CustomButton";
import { Login } from "../../assets/fetch";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../UserContext";
import { ToastContainer, toast } from "react-toastify";
import CircularProgress from "@mui/material/CircularProgress";
import "react-toastify/dist/ReactToastify.css";

// Function to generate a random CAPTCHA (6 alphanumeric characters)
const generateCaptcha = () => {
  const characters = "ABCDEFGHIJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let captcha = "";
  for (let i = 0; i < 6; i++) {
    captcha += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return captcha;
};

// Validation schema with CAPTCHA
const schema = yup.object().shape({
  username: yup.string().required("Username is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  captcha: yup
    .string()
    .required("CAPTCHA is required")
    .test("captcha-match", "CAPTCHA is incorrect", function (value) {
      return value === this.options.context.captcha;
    }),
});

export default function LoginScreen() {
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const {
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    context: { captcha },
  });

  const {
    setUserType,
    setToken,
    setProfile,
    setUsername,
    setDesignation,
    setDepartment,
  } = useContext(UserContext);

  const navigate = useNavigate();

  const [buttonLoading, setButtonLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");

  // Set CAPTCHA value and regenerate on mount or refresh
  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  // Automatically set the CAPTCHA field value whenever captcha changes
  useEffect(() => {
    setValue("captcha", captcha, { shouldValidate: true });
  }, [captcha, setValue]);

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha());
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("password", data.password);

    setButtonLoading(true);
    setLoading(true);
    try {
      const response = await Login(formData);

      if (response.status) {
        setToken(response.token);
        setUserType(response.userType);
        setProfile(response.profile);
        setUsername(response.username);
        setDesignation(response.designation);
        if (response.department && response.department != "")
          setDepartment(response.department);
        navigate("/verification");
      } else if (response.isEmailVerified === false) {
        const formDataEmail = new FormData();
        formDataEmail.append("email", response.email);

        const res = await fetch("/Home/SendEmailVerificationOtp", {
          method: "POST",
          body: formDataEmail,
        });

        const resJson = await res.json();

        if (resJson.status) {
          setEmail(response.email);
          setUsername(response.username);
          setOtpModalOpen(true);
          toast.success("OTP sent to your email.");
        } else {
          toast.error(resJson.message || "Failed to send OTP.");
        }
      } else {
        toast.error(response.response || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
      setButtonLoading(false);
      setCaptcha(generateCaptcha());
    }
  };

  const handleOtpVerify = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("OTP must be 6 digits.");
      return;
    }

    setButtonLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("otp", otp);

      const res = await fetch("/Home/VerifyEmailOtp", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.status) {
        setOtpModalOpen(false);
        toast.success("Email verified. Please login again.");
      } else {
        toast.error(result.message || "OTP verification failed.");
      }
    } catch (err) {
      toast.error("Error verifying OTP.");
    } finally {
      setButtonLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const formData = new FormData();
    formData.append("email", email);

    try {
      const res = await fetch("/Home/SendEmailVerificationOtp", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (result.status) {
        toast.success("OTP resent to your email.");
      } else {
        toast.error(result.message || "Failed to resend OTP.");
      }
    } catch (err) {
      toast.error("Error resending OTP.");
    }
  };

  if (loading)
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f8f9fa",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: { xs: "90vh", lg: "80vh" },
        background:
          "linear-gradient(135deg,rgb(252, 252, 252) 0%,rgb(240, 236, 236) 100%)",
        padding: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          backgroundColor: "#FFFFFF",
          padding: { xs: 3, md: 5 },
          borderRadius: 3,
          width: { xs: "95%", sm: "80%", md: "50%", lg: "35%" },
          maxWidth: 500,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
          transition: "transform 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-5px)",
          },
        }}
      >
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography
            variant="h4"
            component="h1"
            id="login-title"
            sx={{ fontWeight: 700, color: "primary.main", mb: 1 }}
          >
            Login
          </Typography>
        </Box>

        <Box
          component="form"
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <CustomInputField
            label="Username"
            name="username"
            control={control}
            placeholder="Enter your username"
            errors={errors}
            aria-describedby="username-error"
            disabled={buttonLoading}
          />

          <CustomInputField
            label="Password"
            name="password"
            control={control}
            type="password"
            placeholder="Enter your password"
            errors={errors}
            aria-describedby="password-error"
            disabled={buttonLoading}
          />

          {/* CAPTCHA Display and Input */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mt: 2,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box
              sx={{
                background: "linear-gradient(45deg, #f3f4f6, #e5e7eb)",
                border: "2px solid",
                borderColor: "primary.main",
                borderRadius: 2,
                padding: 1.5,
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minWidth: 140,
                position: "relative",
                overflow: "hidden",
                width: "90%",
                "&:before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0, 0, 0, 0.05) 10px, rgba(0, 0, 0, 0.05) 12px)",
                  opacity: 0.2,
                },
              }}
              aria-label={`CAPTCHA code: ${captcha}`}
            >
              {captcha.split("").map((char, index) => (
                <Box
                  key={index}
                  component="span"
                  sx={{
                    fontFamily: "monospace",
                    fontSize: { xs: 24, sm: 24 },
                    fontWeight: Math.random() > 0.5 ? 700 : 400,
                    color: Math.random() > 0.5 ? "primary.main" : "#2d3748",
                    transform: `rotate(${Math.floor(
                      Math.random() * 31 - 15,
                    )}deg) translateY(${Math.floor(Math.random() * 6 - 3)}px)`,
                    margin: "0 2px",
                    userSelect: "none",
                  }}
                >
                  {char}
                </Box>
              ))}
            </Box>
            <IconButton
              onClick={handleRefreshCaptcha}
              disabled={buttonLoading}
              sx={{
                color: "primary.main",
                border: "1px solid",
                borderColor: "primary.main",
                borderRadius: 2,
                p: 1,
                "&:hover": {
                  backgroundColor: "primary.light",
                  borderColor: "primary.dark",
                  transform: "scale(1.05)",
                },
              }}
              aria-label="Refresh CAPTCHA"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
          <CustomInputField
            label="Enter CAPTCHA"
            name="captcha"
            control={control}
            placeholder="Enter the CAPTCHA code"
            errors={errors}
            aria-describedby="captcha-error"
            disabled={buttonLoading}
          />

          <Box sx={{ textAlign: "right" }}>
            <Link
              href="/forgot-password"
              sx={{ fontSize: 14, color: "primary.main" }}
              underline="hover"
              aria-label="Forgot password"
            >
              Forgot Password/Username?
            </Link>
          </Box>

          <CustomButton
            text={buttonLoading ? "Logging In..." : "Log In"}
            bgColor="primary.main"
            color="background.default"
            type="submit"
            width="100%"
            disabled={buttonLoading}
            startIcon={
              buttonLoading && <CircularProgress size={20} color="inherit" />
            }
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "primary.dark",
                transform: "scale(1.02)",
                transition: "all 0.2s ease",
              },
            }}
          />

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{" "}
              <Link
                href="/register"
                sx={{ color: "primary.main", fontWeight: 600 }}
                underline="hover"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/register");
                }}
                aria-label="Sign up"
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* OTP Dialog */}
      <Dialog open={otpModalOpen} onClose={() => setOtpModalOpen(false)}>
        <DialogTitle>Verify Your Email</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={1}>
            Enter the 6-digit OTP sent to <strong>{email}</strong>
          </Typography>
          <TextField
            fullWidth
            label="OTP"
            variant="outlined"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputProps={{ maxLength: 6 }}
            disabled={buttonLoading}
            aria-label="OTP input"
          />
          <Box mt={1}>
            <Link
              component="button"
              variant="body2"
              onClick={handleResendOtp}
              disabled={buttonLoading}
              aria-label="Resend OTP"
            >
              Resend OTP
            </Link>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOtpModalOpen(false)}
            disabled={buttonLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleOtpVerify}
            disabled={buttonLoading}
            aria-label="Verify OTP"
          >
            Verify
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
}
