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

// CAPTCHA generator
const generateCaptcha = () => {
  const characters = "ABCDEFGHIJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let captcha = "";
  for (let i = 0; i < 6; i++) {
    captcha += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return captcha;
};

// Validation schema
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
    setUserId,
    setActualUserType,
  } = useContext(UserContext);

  const navigate = useNavigate();

  const [buttonLoading, setButtonLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

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
        setUserType(response.userType);          // <-- displayed role (Citizen for non-validated)
        setActualUserType(response.actualUserType); // <-- NEW: store original DB role
        setProfile(response.profile);
        setUsername(response.username);
        setDesignation(response.designation);
        setUserId(response.userId);
        if (response.department && response.department !== "")
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
          background:
            "linear-gradient(to bottom right, #F4F9FF 0%, #F9F3EC 100%)",
        }}
      >
        <CircularProgress size={80} sx={{ color: "#2562E9" }} />
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
          "linear-gradient(to bottom right, #F4F9FF 0%, #F9F3EC 100%)",
        padding: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          backgroundColor: "#FFFFFF",
          padding: { xs: 4, md: 6 },
          borderRadius: 4,
          width: { xs: "95%", sm: "80%", md: "50%", lg: "35%" },
          maxWidth: 520,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-8px)",
            boxShadow: "0 16px 48px rgba(0, 0, 0, 0.15)",
          },
        }}
      >
        {/* Login Title */}
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "2.8rem", sm: "3.2rem", md: "3.5rem" },
              background: "linear-gradient(to bottom right, #2561E8, #1F43B4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}
          >
            Login
          </Typography>
        </Box>
        {/* JanParichay SSO Button */}
        <Box
          component="button"
          onClick={async () => {
            setButtonLoading(true);
            try {
              const res = await fetch("/Home/InitiateSSO", { method: "POST" });
              const data = await res.json();
              if (data.redirectUrl) {
                window.location.href = data.redirectUrl; // Redirect to JanParichay
              } else {
                toast.error("Failed to start SSO.");
              }
            } catch (err) {
              toast.error("SSO initiation failed.");
            } finally {
              setButtonLoading(false);
            }
          }}
          disabled={buttonLoading}
          sx={{
            border: "none",
            background: "linear-gradient(to bottom, #0A7B5B, #065F46)",
            padding: { xs: "1rem 1.5rem", sm: "1.2rem 2rem" },
            width: "100%",
            color: "#FFFFFF",
            fontWeight: "bold",
            fontSize: { xs: "1.1rem", sm: "1.2rem" },
            borderRadius: 4,
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            textTransform: "none",
            boxShadow: "0 6px 16px rgba(10, 123, 91, 0.3)",
            transition: "all 0.3s ease",
            mt: 2,
            "&:hover": {
              background: "linear-gradient(to bottom, #065F46, #0A7B5B)",
              transform: "translateY(-2px)",
              boxShadow: "0 8px 20px rgba(10, 123, 91, 0.4)",
            },
            "&:disabled": {
              opacity: 0.7,
              cursor: "not-allowed",
            },
          }}
        >
          {buttonLoading ? (
            <>
              <CircularProgress size={20} color="inherit" />
              Starting SSO...
            </>
          ) : (
            <>Login with JanParichay</>
          )}
        </Box>
        {/* Form */}
        <Box
          component="form"
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}
        >
          {/* Username Field */}
          <CustomInputField
            label={
              <span style={{ color: "#235BDE", fontWeight: 600 }}>
                Username <span style={{ color: "red" }}>*</span>
              </span>
            }
            name="username"
            control={control}
            placeholder="Enter your username"
            errors={errors}
            disabled={buttonLoading}
            sx={{
              "& .MuiFormLabel-root": {
                color: "#235BDE",
                fontWeight: 600,
                fontSize: "1.05rem",
              },
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                fontSize: "1.05rem",
              },
            }}
          />

          {/* Password Field */}
          <CustomInputField
            label={
              <span style={{ color: "#235BDE", fontWeight: 600 }}>
                Password <span style={{ color: "red" }}>*</span>
              </span>
            }
            name="password"
            control={control}
            type="password"
            placeholder="Enter your password"
            errors={errors}
            disabled={buttonLoading}
            sx={{
              "& .MuiFormLabel-root": {
                color: "#235BDE",
                fontWeight: 600,
                fontSize: "1.05rem",
              },
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                fontSize: "1.05rem",
              },
            }}
          />

          {/* CAPTCHA */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mt: 3,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            <Box
              sx={{
                background:
                  "linear-gradient(to bottom right, #F0F7FE 0%, #FDF7F0 100%)",
                border: "3px solid #2562E9",
                borderRadius: 4,
                padding: { xs: "14px 20px", sm: "16px 24px" },
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
                fontFamily: "monospace",
                fontSize: { xs: "1.8rem", sm: "2.1rem", md: "2.3rem" },
                fontWeight: 800,
                color: "#2562E9",
                letterSpacing: "4px",
                minWidth: { xs: "180px", sm: "350px" },
                textAlign: "center",
                userSelect: "none",
                textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {captcha}
            </Box>
            <IconButton
              onClick={handleRefreshCaptcha}
              disabled={buttonLoading}
              sx={{
                background:
                  "linear-gradient(to bottom, #2562E9 0%, #1F43B5 100%)",
                color: "#FDF6F0",
                width: { xs: 50, sm: 56 },
                height: { xs: 50, sm: 56 },
                borderRadius: 3,
                boxShadow: "0 4px 12px rgba(37, 98, 233, 0.3)",
                "&:hover": {
                  background:
                    "linear-gradient(to bottom, #1F43B5 0%, #2562E9 100%)",
                  transform: "scale(1.1)",
                  boxShadow: "0 6px 16px rgba(37, 98, 233, 0.4)",
                },
              }}
            >
              <RefreshIcon sx={{ fontSize: "1.6rem" }} />
            </IconButton>
          </Box>

          {/* CAPTCHA Input */}
          <CustomInputField
            label={
              <span style={{ color: "#235BDE", fontWeight: 600 }}>
                Enter CAPTCHA <span style={{ color: "red" }}>*</span>
              </span>
            }
            name="captcha"
            control={control}
            placeholder="Type the code above"
            errors={errors}
            disabled={buttonLoading}
            sx={{
              "& .MuiFormLabel-root": {
                color: "#235BDE",
                fontWeight: 600,
                fontSize: "1.05rem",
              },
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                fontSize: "1.05rem",
              },
            }}
          />

          {/* Forgot Password */}
          <Box sx={{ textAlign: "right" }}>
            <Link
              href="/forgot-password"
              sx={{
                fontSize: "0.95rem",
                color: "#235BDE",
                fontWeight: 600,
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                  color: "#1F43B5",
                },
              }}
            >
              Forgot Password/Username?
            </Link>
          </Box>

          {/* LOGIN BUTTON */}
          <Box
            component="button"
            type="submit"
            disabled={buttonLoading}
            sx={{
              border: "none",
              background:
                "linear-gradient(to bottom, #2562E9 0%, #1F43B5 100%)",
              padding: { xs: "1rem 1.5rem", sm: "1.2rem 2rem" },
              width: "100%",
              color: "#FDF6F0",
              fontWeight: "bold",
              fontSize: { xs: "1.1rem", sm: "1.2rem" },
              borderRadius: 4,
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              textTransform: "none",
              boxShadow: "0 6px 16px rgba(37, 98, 233, 0.3)",
              transition: "all 0.3s ease",
              "&:hover": {
                background:
                  "linear-gradient(to bottom, #1F43B5 0%, #2562E9 100%)",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 20px rgba(37, 98, 233, 0.4)",
              },
              "&:disabled": {
                opacity: 0.7,
                cursor: "not-allowed",
              },
            }}
          >
            {buttonLoading ? (
              <>
                <CircularProgress size={22} color="inherit" />
                Logging In...
              </>
            ) : (
              "Log In"
            )}
          </Box>

          {/* Sign Up Link */}
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{" "}
              <Link
                href="/register"
                sx={{
                  color: "#F67015",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": {
                    textDecoration: "underline",
                    color: "#E4630A",
                  },
                }}
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/register");
                }}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* OTP Modal */}
      <Dialog open={otpModalOpen} onClose={() => setOtpModalOpen(false)}>
        <DialogTitle
          sx={{
            background: "linear-gradient(to bottom right, #2561E8, #1F43B4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
            fontSize: "1.4rem",
          }}
        >
          Verify Your Email
        </DialogTitle>
        <DialogContent
          sx={{
            background:
              "linear-gradient(to bottom right, #F0F7FE 0%, #FDF7F0 100%)",
            p: 3,
          }}
        >
          <Typography variant="body1" mb={2} color="#1e1e1eff" fontWeight={500}>
            Enter the 6-digit OTP sent to <strong>{email}</strong>
          </Typography>
          <TextField
            fullWidth
            label={
              <span style={{ color: "#235BDE", fontWeight: 600 }}>
                OTP <span style={{ color: "red" }}>*</span>
              </span>
            }
            variant="outlined"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputProps={{ maxLength: 6 }}
            disabled={buttonLoading}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                backgroundColor: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                fontSize: "1.1rem",
              },
              "& .MuiFormLabel-root": {
                color: "#235BDE",
                fontWeight: 600,
                fontSize: "1.05rem",
              },
            }}
          />
          <Box mt={2}>
            <Link
              component="button"
              variant="body2"
              onClick={handleResendOtp}
              disabled={buttonLoading}
              sx={{
                color: "#0FB282",
                fontWeight: 600,
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Resend OTP
            </Link>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            backgroundColor: "#FFFFFF",
            p: 2,
            boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <Button
            onClick={() => setOtpModalOpen(false)}
            disabled={buttonLoading}
            sx={{ fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleOtpVerify}
            disabled={buttonLoading}
            sx={{
              background:
                "linear-gradient(to bottom, #2562E9 0%, #1F43B5 100%)",
              color: "#FDF6F0",
              borderRadius: 3,
              fontWeight: 600,
              px: 3,
              textTransform: "none",
              "&:hover": {
                background:
                  "linear-gradient(to bottom, #1F43B5 0%, #2562E9 100%)",
              },
            }}
          >
            Verify
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer />
    </Box>
  );
}
