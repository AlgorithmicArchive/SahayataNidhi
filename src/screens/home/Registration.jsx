import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Container,
  Link,
  CircularProgress,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useForm, Controller } from "react-hook-form";
import OtpModal from "../../components/OtpModal";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Col, Row } from "react-bootstrap";
import { fetchDistricts } from "../../assets/fetch";
import { CheckCircleOutline } from "@mui/icons-material";

// Generate CAPTCHA
const generateCaptcha = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let captcha = "";
  for (let i = 0; i < 6; i++) {
    captcha += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return captcha;
};

export default function RegisterScreen() {
  const [captcha, setCaptcha] = useState(generateCaptcha());
  const {
    handleSubmit,
    control,
    getValues,
    watch,
    formState: { errors },
    trigger,
    setValue,
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
      captcha: "",
      District: "",
      Tehsil: "",
    },
  });

  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpType, setOtpType] = useState(null); // 'email' or 'mobile'
  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [tehsilOptions, setTehsilOptions] = useState([]);
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState(false);
  const [isMobileOtpSent, setIsMobileOtpSent] = useState(false);
  const [isMobileOtpVerified, setIsMobileOtpVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEmailUnique, setIsEmailUnique] = useState(true);
  const [isMobileNumberUnique, setIsMobileNumberUnique] = useState(true);

  const selectedDistrict = watch("District");
  const emailValue = watch("email");
  const mobileValue = watch("mobileNumber");
  const navigate = useNavigate();

  // Reset CAPTCHA
  useEffect(() => {
    setValue("captcha", "");
    setCaptcha(generateCaptcha());
  }, [setValue]);

  // Fetch districts
  useEffect(() => {
    fetchDistricts(setDistrictOptions);
  }, []);

  // Fetch tehsils
  useEffect(() => {
    if (selectedDistrict) {
      axios
        .get(`/Base/GetTeshilForDistrict?districtId=${selectedDistrict}`)
        .then((response) => {
          if (response.data.status) {
            const formatted = response.data.tehsils.map((t) => ({
              label: t.tehsilName,
              value: t.tehsilId,
            }));
            setTehsilOptions(formatted);
          }
        })
        .catch(() => {
          toast.error("Failed to load tehsils");
        });
    }
  }, [selectedDistrict]);

  const handleRefreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setValue("captcha", "");
  }, [setValue]);

  // Validate Email
  const handleEmailValidate = async () => {
    if (!emailValue) {
      setIsEmailOtpVerified(true);
      return;
    }
    const valid = await trigger("email");
    if (valid) {
      setLoading(true);
      try {
        const res = await axios.get("/Home/SendOtp", {
          params: { email: emailValue },
        });
        if (res.data.status) {
          setIsEmailOtpSent(true);
          setIsOtpModalOpen(true);
          setOtpType("email");
          setUserId(res.data.userId);
          setErrorMessage(res.data.message);
          toast.success("OTP sent to email!");
        }
      } catch {
        toast.error("Failed to send email OTP");
      } finally {
        setLoading(false);
      }
    }
  };

  // Validate Mobile
  const handleMobileValidate = async () => {
    const valid = await trigger("mobileNumber");
    if (valid) {
      setLoading(true);
      try {
        const res = await axios.get("/Home/SendOtp", {
          params: { mobile: mobileValue },
        });
        if (res.data.status) {
          setIsMobileOtpSent(true);
          setIsOtpModalOpen(true);
          setOtpType("mobile");
          setUserId(res.data.userId);
          setErrorMessage(res.data.message);
          toast.success("OTP sent to mobile!");
        }
      } catch {
        toast.error("Failed to send mobile OTP");
      } finally {
        setLoading(false);
      }
    }
  };

  // Submit Registration
  const onSubmit = async (data) => {
    if (emailValue && !isEmailOtpVerified)
      return toast.error("Verify email first");
    if (!isMobileOtpVerified) return toast.error("Verify mobile first");

    setLoading(true);
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v));

    try {
      const res = await axios.post("/Home/Register", formData);
      if (res.data.status) {
        toast.success("Registered! Redirecting...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error("Registration failed");
      }
    } catch {
      toast.error("Error during registration");
    } finally {
      setLoading(false);
      handleRefreshCaptcha();
    }
  };

  // OTP Submit
  const handleOtpSubmit = async (otp) => {
    if (!otp) return toast.error("Enter OTP");

    setLoading(true);
    const formData = new FormData();
    formData.append("otp", otp);
    if (otpType === "email") formData.append("email", getValues("email"));
    else formData.append("mobile", getValues("mobileNumber"));

    try {
      const res = await axios.post("/Home/OTPValidation", formData);
      if (res.data.status) {
        if (otpType === "email") setIsEmailOtpVerified(true);
        else setIsMobileOtpVerified(true);
        setIsOtpModalOpen(false);
        toast.success(`${otpType === "email" ? "Email" : "Mobile"} verified!`);
      } else {
        toast.error("Invalid OTP");
      }
    } catch {
      toast.error("OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(to bottom right, #F4F9FF 0%, #F9F3EC 100%)",
          p: { xs: 2, md: 4 },
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            backgroundColor: "#FFFFFF",
            p: { xs: 4, md: 6 },
            borderRadius: 4,
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-8px)",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.15)",
            },
          }}
        >
          {/* Title */}
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: "2.8rem", sm: "3.2rem", md: "3.5rem" },
              textAlign: "center",
              background: "linear-gradient(to bottom right, #2561E8, #1F43B4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 4,
              letterSpacing: "-0.5px",
            }}
          >
            Create Account
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Row 1 */}
              <Row>
                <Col xs={12} md={6}>
                  <Controller
                    name="fullName"
                    control={control}
                    rules={{
                      required: "Full name required",
                      minLength: { value: 5, message: "Min 5 chars" },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label={
                          <span style={{ color: "#235BDE", fontWeight: 600 }}>
                            Full Name <span style={{ color: "red" }}>*</span>
                          </span>
                        }
                        variant="outlined"
                        fullWidth
                        disabled={loading}
                        error={!!error}
                        helperText={error?.message}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 3,
                            fontSize: "1.05rem",
                          },
                          "& .MuiFormLabel-root": {
                            fontWeight: 600,
                            color: "#235BDE",
                          },
                        }}
                      />
                    )}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Controller
                    name="username"
                    control={control}
                    rules={{
                      required: "Username required",
                      minLength: { value: 5, message: "Min 5 chars" },
                      validate: async (v) => {
                        const res = await axios.get("/Home/CheckUsername", {
                          params: { username: v },
                        });
                        return res.data?.isUnique || "Username taken";
                      },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label={
                          <span style={{ color: "#235BDE", fontWeight: 600 }}>
                            Username <span style={{ color: "red" }}>*</span>
                          </span>
                        }
                        variant="outlined"
                        fullWidth
                        disabled={loading}
                        error={!!error}
                        helperText={error?.message}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 3,
                            fontSize: "1.05rem",
                          },
                          "& .MuiFormLabel-root": {
                            fontWeight: 600,
                            color: "#235BDE",
                          },
                        }}
                      />
                    )}
                  />
                </Col>
              </Row>

              {/* Row 2: Email + Mobile */}
              <Row>
                <Col xs={12} md={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Controller
                      name="email"
                      control={control}
                      rules={{
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Invalid email",
                        },
                        validate: async (value) => {
                          if (!value) return true; // Skip if empty

                          try {
                            const response = await axios.get(
                              "/Home/CheckEmail",
                              {
                                params: { email: value, UserType: "Citizen" },
                              },
                            );

                            const isUnique = response.data?.isUnique;

                            // ✅ Store in state
                            setIsEmailUnique(isUnique);

                            // ✅ Return for validation
                            return isUnique || "Email already exists";
                          } catch (error) {
                            return "Server error while checking email";
                          }
                        },
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          label={
                            <span style={{ color: "#235BDE", fontWeight: 600 }}>
                              Email
                            </span>
                          }
                          type="email"
                          variant="outlined"
                          fullWidth
                          disabled={loading || isEmailOtpVerified}
                          error={!!error}
                          helperText={error?.message}
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": { borderRadius: 3 },
                            "& .MuiFormLabel-root": {
                              fontWeight: 600,
                              color: "#235BDE",
                            },
                          }}
                        />
                      )}
                    />
                    {isEmailOtpVerified && emailValue && (
                      <CheckCircleOutline
                        sx={{ color: "#0FB282", fontSize: 28 }}
                      />
                    )}
                  </Box>
                  {!isEmailOtpVerified && emailValue && isEmailUnique && (
                    <Box
                      component="button"
                      onClick={handleEmailValidate}
                      disabled={loading}
                      sx={{
                        mt: 1,
                        width: "100%",
                        background:
                          "linear-gradient(to bottom, #F67015 0%, #E4630A 100%)",
                        color: "#FDF6F0",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        py: 1.5,
                        borderRadius: 3,
                        border: "none",
                        cursor: "pointer",
                        "&:hover": {
                          background:
                            "linear-gradient(to bottom, #E4630A 0%, #F67015 100%)",
                        },
                      }}
                    >
                      Validate Email
                    </Box>
                  )}
                </Col>

                <Col xs={12} md={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Controller
                      name="mobileNumber"
                      control={control}
                      rules={{
                        required: "Mobile required",
                        pattern: {
                          value: /^[0-9]{10}$/,
                          message: "10 digits only",
                        },
                        validate: async (value) => {
                          if (!value) return true; // If field is empty, skip validation

                          try {
                            const response = await axios.get(
                              "/Home/CheckMobileNumber",
                              {
                                params: { number: value, UserType: "Citizen" },
                              },
                            );

                            const isUnique = response.data?.isUnique;

                            // ✅ Store in state for UI use
                            setIsMobileNumberUnique(isUnique);

                            // ✅ Must return validation result (required by React Hook Form)
                            return isUnique || "Mobile Number already exists";
                          } catch (error) {
                            return "Error validating mobile number";
                          }
                        },
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          label={
                            <span style={{ color: "#235BDE", fontWeight: 600 }}>
                              Mobile Number{" "}
                              <span style={{ color: "red" }}>*</span>
                            </span>
                          }
                          type="tel"
                          variant="outlined"
                          fullWidth
                          disabled={loading || isMobileOtpVerified}
                          error={!!error}
                          helperText={error?.message}
                          inputProps={{ maxLength: 10 }}
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": { borderRadius: 3 },
                            "& .MuiFormLabel-root": {
                              fontWeight: 600,
                              color: "#235BDE",
                            },
                          }}
                        />
                      )}
                    />
                    {isMobileOtpVerified && (
                      <CheckCircleOutline
                        sx={{ color: "#0FB282", fontSize: 28 }}
                      />
                    )}
                  </Box>
                  {!isMobileOtpVerified &&
                    mobileValue &&
                    isMobileNumberUnique && (
                      <Box
                        component="button"
                        onClick={handleMobileValidate}
                        disabled={loading}
                        sx={{
                          mt: 1,
                          width: "100%",
                          background:
                            "linear-gradient(to bottom, #0FB282 0%, #4CAF50 100%)",
                          color: "#FDF6F0",
                          fontWeight: "bold",
                          fontSize: "1rem",
                          py: 1.5,
                          borderRadius: 3,
                          border: "none",
                          cursor: "pointer",
                          "&:hover": {
                            background:
                              "linear-gradient(to bottom, #4CAF50 0%, #0FB282 100%)",
                          },
                        }}
                      >
                        Validate Mobile
                      </Box>
                    )}
                </Col>
              </Row>

              {/* Row 3: Password */}
              <Row>
                <Col xs={12} md={6}>
                  <Controller
                    name="password"
                    control={control}
                    rules={{
                      required: "Password required",
                      pattern: {
                        value:
                          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,20}$/,
                        message:
                          "Use uppercase, lowercase, number, special char",
                      },
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label={
                          <span style={{ color: "#235BDE", fontWeight: 600 }}>
                            Password <span style={{ color: "red" }}>*</span>
                          </span>
                        }
                        type="password"
                        variant="outlined"
                        fullWidth
                        disabled={loading}
                        error={!!error}
                        helperText={error?.message}
                        sx={{
                          "& .MuiOutlinedInput-root": { borderRadius: 3 },
                          "& .MuiFormLabel-root": {
                            fontWeight: 600,
                            color: "#235BDE",
                          },
                        }}
                      />
                    )}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Controller
                    name="confirmPassword"
                    control={control}
                    rules={{
                      required: "Confirm password",
                      validate: (v) =>
                        v === getValues("password") || "Passwords don't match",
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label={
                          <span style={{ color: "#235BDE", fontWeight: 600 }}>
                            Confirm Password{" "}
                            <span style={{ color: "red" }}>*</span>
                          </span>
                        }
                        type="password"
                        variant="outlined"
                        fullWidth
                        disabled={loading}
                        error={!!error}
                        helperText={error?.message}
                        sx={{
                          "& .MuiOutlinedInput-root": { borderRadius: 3 },
                          "& .MuiFormLabel-root": {
                            fontWeight: 600,
                            color: "#235BDE",
                          },
                        }}
                      />
                    )}
                  />
                </Col>
              </Row>

              {/* Row 4: District & Tehsil */}
              <Row>
                <Col xs={12} md={6}>
                  <Controller
                    name="District"
                    control={control}
                    rules={{ required: "District required" }}
                    render={({ field, fieldState: { error } }) => (
                      <FormControl fullWidth error={!!error}>
                        <InputLabel sx={{ color: "#235BDE", fontWeight: 600 }}>
                          District <span style={{ color: "red" }}>*</span>
                        </InputLabel>
                        <Select
                          {...field}
                          disabled={loading}
                          sx={{ borderRadius: 3, fontSize: "1.05rem" }}
                        >
                          {districtOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {error && (
                          <Typography color="error" variant="caption">
                            {error.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Controller
                    name="Tehsil"
                    control={control}
                    rules={{ required: "Tehsil required" }}
                    render={({ field, fieldState: { error } }) => (
                      <FormControl fullWidth error={!!error}>
                        <InputLabel sx={{ color: "#235BDE", fontWeight: 600 }}>
                          Tehsil <span style={{ color: "red" }}>*</span>
                        </InputLabel>
                        <Select
                          {...field}
                          disabled={loading || !selectedDistrict}
                          sx={{ borderRadius: 3, fontSize: "1.05rem" }}
                        >
                          {tehsilOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {error && (
                          <Typography color="error" variant="caption">
                            {error.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Col>
              </Row>

              {/* CAPTCHA */}
              <Row>
                <Col xs={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mt: 3,
                      flexDirection: { xs: "column", sm: "row" },
                      justifyContent: "center",
                    }}
                  >
                    <Box
                      sx={{
                        background:
                          "linear-gradient(to bottom right, #F0F7FE 0%, #FDF7F0 100%)",
                        border: "3px solid #2562E9",
                        borderRadius: 4,
                        padding: { xs: "16px 24px", sm: "18px 28px" },
                        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
                        fontFamily: "monospace",
                        fontSize: { xs: "2rem", sm: "2.3rem", md: "2.5rem" },
                        fontWeight: 800,
                        color: "#2562E9",
                        letterSpacing: "5px",
                        minWidth: { xs: "200px", sm: "650px" },
                        textAlign: "center",
                        userSelect: "none",
                        textShadow: "1px 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      {captcha}
                    </Box>
                    <IconButton
                      onClick={handleRefreshCaptcha}
                      disabled={loading}
                      sx={{
                        background:
                          "linear-gradient(to bottom, #2562E9 0%, #1F43B5 100%)",
                        color: "#FDF6F0",
                        width: 60,
                        height: 60,
                        borderRadius: 3,
                        boxShadow: "0 4px 12px rgba(37, 98, 233, 0.3)",
                        "&:hover": {
                          background:
                            "linear-gradient(to bottom, #1F43B5 0%, #2562E9 100%)",
                          transform: "scale(1.1)",
                        },
                      }}
                    >
                      <RefreshIcon sx={{ fontSize: "1.8rem" }} />
                    </IconButton>
                  </Box>

                  <Controller
                    name="captcha"
                    control={control}
                    rules={{
                      required: "CAPTCHA required",
                      validate: (v) => v === captcha || "Incorrect CAPTCHA",
                    }}
                    render={({ field, fieldState: { error } }) => (
                      <TextField
                        {...field}
                        label={
                          <span style={{ color: "#235BDE", fontWeight: 600 }}>
                            Enter CAPTCHA{" "}
                            <span style={{ color: "red" }}>*</span>
                          </span>
                        }
                        variant="outlined"
                        fullWidth
                        disabled={loading}
                        error={!!error}
                        helperText={error?.message}
                        sx={{
                          mt: 2,
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 3,
                            fontSize: "1.1rem",
                          },
                          "& .MuiFormLabel-root": {
                            fontWeight: 600,
                            color: "#235BDE",
                          },
                        }}
                      />
                    )}
                  />
                </Col>
              </Row>

              {/* Register Button */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Box
                  component="button"
                  type="submit"
                  disabled={
                    loading ||
                    !isMobileOtpVerified ||
                    (emailValue && !isEmailOtpVerified)
                  }
                  sx={{
                    border: "none",
                    background:
                      "linear-gradient(to bottom, #2562E9 0%, #1F43B5 100%)",
                    padding: { xs: "1.2rem 2rem", sm: "1.4rem 2.5rem" },
                    width: { xs: "100%", sm: "60%", md: "50%" },
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
                    "&:disabled": { opacity: 0.7, cursor: "not-allowed" },
                  }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={24} color="inherit" />
                      Registering...
                    </>
                  ) : (
                    "Register"
                  )}
                </Box>
              </Box>
            </Box>
          </form>

          {/* Links */}
          <Box textAlign="center" mt={3}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <Link
                href="/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/login");
                }}
                sx={{
                  color: "#F67015",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
          <Box textAlign="center" mt={1}>
            <Typography variant="body2" color="text.secondary">
              Department Officer?{" "}
              <Link
                href="/officerRegistration"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/officerRegistration");
                }}
                sx={{
                  color: "#235BDE",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Container>

        {/* OTP Modal */}
        {OtpModal && (
          <OtpModal
            open={isOtpModalOpen}
            onClose={() => {
              setIsOtpModalOpen(false);
              setOtpType(null);
            }}
            erorrMessage={errorMessage}
            onSubmit={handleOtpSubmit}
            registeredAt={otpType}
            title={`Enter ${otpType === "email" ? "Email" : "Mobile"} OTP`}
          />
        )}

        <ToastContainer />
      </Box>

      {/* Fullscreen Loader */}
      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <CircularProgress size={80} sx={{ color: "#2562E9" }} />
        </Box>
      )}
    </>
  );
}
