import React, { useEffect, useState, useCallback, Suspense } from "react";
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
  FormHelperText,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useForm, Controller } from "react-hook-form";
import { fetchDistricts } from "../../assets/fetch";
import OtpModal from "../../components/OtpModal";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Col, Row } from "react-bootstrap";
import debounce from "lodash/debounce";
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

export default function OfficerRegisterScreen() {
  const {
    handleSubmit,
    control,
    getValues,
    watch,
    trigger,
    setError,
    formState: { errors },
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
      department: "",
      designation: "",
      District: "",
      Division: "",
      Tehsil: "",
      captcha: "",
    },
  });

  const [captcha, setCaptcha] = useState(generateCaptcha());
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [tehsilOptions, setTehsilOptions] = useState([]);
  const [accessLevelMap, setAccessLevelMap] = useState({});
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpType, setOtpType] = useState(null);
  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(false);
  const lowerCase = useState(false);
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState(false);
  const [isMobileOtpVerified, setIsMobileOtpVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReady, setIsReady] = useState(false);

  const selectedDepartment = watch("department");
  const selectedDesignation = watch("designation");
  const selectedDistrict = watch("District");
  const selectedDivision = watch("Division");
  const selectedTehsil = watch("Tehsil");
  const emailValue = watch("email");
  const mobileValue = watch("mobileNumber");
  const navigate = useNavigate();

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, districtRes] = await Promise.all([
          axios.get("/Home/GetDepartments"),
          fetchDistricts(setDistrictOptions),
        ]);

        if (deptRes.data.status) {
          setDepartments(
            deptRes.data.departments.map((d) => ({
              label: d.departmentName,
              value: d.departmentId,
            })),
          );
        }
        setCaptcha(generateCaptcha());
        setIsReady(true);
      } catch (err) {
        toast.error("Failed to load data");
      }
    };
    fetchData();
  }, []);

  // Fetch designations
  useEffect(() => {
    if (selectedDepartment) {
      axios
        .get(`/Home/GetDesignations?deparmentId=${selectedDepartment}`)
        .then((res) => {
          if (res.data.status) {
            const opts = res.data.designations.map((d) => ({
              label: `${d.designation} (${d.accessLevel})`,
              value: d.designation,
              accessLevel: d.accessLevel,
            }));
            setDesignations(opts);
            const map = {};
            opts.forEach((o) => (map[o.value] = o.accessLevel));
            setAccessLevelMap(map);
          }
        });
    } else {
      setDesignations([]);
      setAccessLevelMap({});
    }
  }, [selectedDepartment]);

  // Fetch tehsils
  useEffect(() => {
    if (selectedDistrict) {
      axios
        .get(`/Base/GetTeshilForDistrict?districtId=${selectedDistrict}`)
        .then((res) => {
          if (res.data.status) {
            setTehsilOptions(
              res.data.tehsils.map((t) => ({
                label: t.tehsilName,
                value: t.tehsilId,
              })),
            );
          }
        });
    } else {
      setTehsilOptions([]);
    }
  }, [selectedDistrict]);

  const handleRefreshCaptcha = () => setCaptcha(generateCaptcha());

  // Debounced validation
  const debouncedEmailValidation = useCallback(
    debounce(async (value, { setError }) => {
      if (!value || !selectedDepartment || !selectedDesignation) return;
      const params = {
        email: value,
        UserType: "Officer",
        departmentId: selectedDepartment,
        designation: selectedDesignation,
      };
      if (
        accessLevelMap[selectedDesignation] === "Division" &&
        !selectedDivision
      )
        return "Select division";
      if (
        accessLevelMap[selectedDesignation] === "District" &&
        !selectedDistrict
      )
        return "Select district";
      if (
        accessLevelMap[selectedDesignation] === "Tehsil" &&
        (!selectedDistrict || !selectedTehsil)
      )
        return "Select district & tehsil";

      const res = await axios.get("/Home/CheckEmail", { params });
      if (!res.data.isUnique) {
        setError("email", { type: "manual", message: "Email already exists" });
        return false;
      }
      return true;
    }, 300),
    [
      selectedDepartment,
      selectedDesignation,
      selectedDivision,
      selectedDistrict,
      selectedTehsil,
      accessLevelMap,
    ],
  );

  const debouncedMobileValidation = useCallback(
    debounce(async (value, { setError }) => {
      if (!value || !selectedDepartment || !selectedDesignation) return;
      const params = {
        number: value,
        UserType: "Officer",
        departmentId: selectedDepartment,
        designation: selectedDesignation,
      };
      if (
        accessLevelMap[selectedDesignation] === "Division" &&
        !selectedDivision
      )
        return "Select division";
      if (
        accessLevelMap[selectedDesignation] === "District" &&
        !selectedDistrict
      )
        return "Select district";
      if (
        accessLevelMap[selectedDesignation] === "Tehsil" &&
        (!selectedDistrict || !selectedTehsil)
      )
        return "Select district & tehsil";

      const res = await axios.get("/Home/CheckMobileNumber", { params });
      if (!res.data.isUnique) {
        setError("mobileNumber", {
          type: "manual",
          message: "Mobile already exists",
        });
        return false;
      }
      return true;
    }, 300),
    [
      selectedDepartment,
      selectedDesignation,
      selectedDivision,
      selectedDistrict,
      selectedTehsil,
      accessLevelMap,
    ],
  );

  // Validate Email
  const handleEmailValidate = async () => {
    const valid = await trigger("email");
    if (valid && !errors.email) {
      setLoading(true);
      try {
        const res = await axios.get("/Home/SendOtp", {
          params: { email: getValues("email") },
        });
        if (res.data.status) {
          setIsOtpModalOpen(true);
          setOtpType("email");
          setUserId(res.data.userId);
          setErrorMessage(res.data.message);
          toast.success("OTP sent to email");
        }
      } catch {
        toast.error("Failed to send OTP");
      } finally {
        setLoading(false);
      }
    }
  };

  // Validate Mobile
  const handleMobileValidate = async () => {
    const valid = await trigger("mobileNumber");
    if (valid && !errors.mobileNumber) {
      setLoading(true);
      try {
        const res = await axios.get("/Home/SendOtp", {
          params: { mobile: getValues("mobileNumber") },
        });
        if (res.data.status) {
          setIsOtpModalOpen(true);
          setOtpType("mobile");
          setUserId(res.data.userId);
          setErrorMessage(res.data.message);
          toast.success("OTP sent to mobile");
        }
      } catch {
        toast.error("Failed to send OTP");
      } finally {
        setLoading(false);
      }
    }
  };

  // Submit
  const onSubmit = async (data) => {
    if (!isEmailOtpVerified || !isMobileOtpVerified) {
      toast.error("Verify both email and mobile");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v));
    formData.append("accessLevel", accessLevelMap[selectedDesignation] || "");
    formData.append(
      "accessCode",
      accessLevelMap[selectedDesignation] === "State"
        ? 0
        : data[
            accessLevelMap[selectedDesignation] === "Tehsil"
              ? "Tehsil"
              : accessLevelMap[selectedDesignation] === "District"
              ? "District"
              : "Division"
          ],
    );

    try {
      const res = await axios.post("/Home/OfficerRegistration", formData);
      if (res.data.status) {
        toast.success("Registered! Redirecting...");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error("Registration failed");
      }
    } catch {
      toast.error("Error occurred");
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
    formData.append(
      otpType === "email" ? "email" : "mobile",
      getValues(otpType === "email" ? "email" : "mobileNumber"),
    );

    try {
      const res = await axios.post("/Home/OTPValidation", formData);
      if (res.data.status) {
        if (otpType === "email") setIsEmailOtpVerified(true);
        else setIsMobileOtpVerified(true);
        setIsOtpModalOpen(false);
        toast.success(`${otpType === "email" ? "Email" : "Mobile"} verified`);
      } else {
        toast.error("Invalid OTP");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
        }}
      >
        <CircularProgress size={80} sx={{ color: "#2562E9" }} />
      </Box>
    );
  }

  return (
    <Suspense fallback={<CircularProgress />}>
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
          maxWidth="lg"
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
            Officer Registration
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
                      validate: async (v) =>
                        (
                          await axios.get("/Home/CheckUsername", {
                            params: { username: v },
                          })
                        ).data.isUnique || "Username taken",
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

              {/* Row 2: Department & Designation */}
              <Row>
                <Col xs={12} md={6}>
                  <Controller
                    name="department"
                    control={control}
                    rules={{ required: "Department required" }}
                    render={({ field, fieldState: { error } }) => (
                      <FormControl fullWidth error={!!error}>
                        <InputLabel sx={{ color: "#235BDE", fontWeight: 600 }}>
                          Department <span style={{ color: "red" }}>*</span>
                        </InputLabel>

                        <Select
                          {...field}
                          disabled={loading}
                          sx={{ borderRadius: 3 }}
                        >
                          {departments.map((d) => (
                            <MenuItem key={d.value} value={d.value}>
                              {d.label}
                            </MenuItem>
                          ))}
                        </Select>

                        {error && (
                          <FormHelperText>{error.message}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Col>
                <Col xs={12} md={6}>
                  <Controller
                    name="designation"
                    control={control}
                    rules={{ required: "Designation required" }}
                    render={({ field, fieldState: { error } }) => (
                      <FormControl fullWidth error={!!error}>
                        <InputLabel sx={{ color: "#235BDE", fontWeight: 600 }}>
                          Designation <span style={{ color: "red" }}>*</span>
                        </InputLabel>
                        <Select
                          {...field}
                          disabled={loading || !selectedDepartment}
                          sx={{ borderRadius: 3 }}
                        >
                          {designations.map((d) => (
                            <MenuItem key={d.value} value={d.value}>
                              {d.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {error && (
                          <FormHelperText>{error.message}</FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Col>
              </Row>

              {/* Conditional Fields */}
              <Row>
                <Col xs={12} md={6}>
                  {(accessLevelMap[selectedDesignation] === "District" ||
                    accessLevelMap[selectedDesignation] === "Tehsil") && (
                    <Controller
                      name="District"
                      control={control}
                      rules={{ required: "District required" }}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth error={!!error}>
                          <InputLabel
                            sx={{ color: "#235BDE", fontWeight: 600 }}
                          >
                            District <span style={{ color: "red" }}>*</span>
                          </InputLabel>
                          <Select
                            {...field}
                            disabled={loading}
                            sx={{ borderRadius: 3 }}
                          >
                            {districtOptions.map((d) => (
                              <MenuItem key={d.value} value={d.value}>
                                {d.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {error && (
                            <FormHelperText>{error.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  )}
                  {accessLevelMap[selectedDesignation] === "Division" && (
                    <Controller
                      name="Division"
                      control={control}
                      rules={{ required: "Division required" }}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth error={!!error}>
                          <InputLabel
                            sx={{ color: "#235BDE", fontWeight: 600 }}
                          >
                            Division <span style={{ color: "red" }}>*</span>
                          </InputLabel>
                          <Select
                            {...field}
                            disabled={loading}
                            sx={{ borderRadius: 3 }}
                          >
                            <MenuItem value={1}>Jammu</MenuItem>
                            <MenuItem value={2}>Kashmir</MenuItem>
                          </Select>
                          {error && (
                            <FormHelperText>{error.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  )}
                </Col>
                <Col xs={12} md={6}>
                  {accessLevelMap[selectedDesignation] === "Tehsil" && (
                    <Controller
                      name="Tehsil"
                      control={control}
                      rules={{ required: "TSWO Office required" }}
                      render={({ field, fieldState: { error } }) => (
                        <FormControl fullWidth error={!!error}>
                          <InputLabel
                            sx={{ color: "#235BDE", fontWeight: 600 }}
                          >
                            TSWO Office <span style={{ color: "red" }}>*</span>
                          </InputLabel>
                          <Select
                            {...field}
                            disabled={loading || !selectedDistrict}
                            sx={{ borderRadius: 3 }}
                          >
                            {tehsilOptions.map((t) => (
                              <MenuItem key={t.value} value={t.value}>
                                {t.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {error && (
                            <FormHelperText>{error.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  )}
                </Col>
              </Row>

              {/* Email & Mobile */}
              <Row>
                <Col xs={12} md={6}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Controller
                      name="email"
                      control={control}
                      rules={{
                        required: "Email required",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Invalid email",
                        },
                        validate: (v) =>
                          debouncedEmailValidation(v, { setError }),
                      }}
                      render={({ field, fieldState: { error } }) => (
                        <TextField
                          {...field}
                          label={
                            <span style={{ color: "#235BDE", fontWeight: 600 }}>
                              Email <span style={{ color: "red" }}>*</span>
                            </span>
                          }
                          type="email"
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
                    {isEmailOtpVerified && (
                      <CheckCircleOutline
                        sx={{ color: "#0FB282", fontSize: 28 }}
                      />
                    )}
                  </Box>
                  {!isEmailOtpVerified && emailValue && !errors.email && (
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
                        validate: (v) =>
                          debouncedMobileValidation(v, { setError }),
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
                          fullWidth
                          inputProps={{ maxLength: 10 }}
                          disabled={loading || isMobileOtpVerified}
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
                    {isMobileOtpVerified && (
                      <CheckCircleOutline
                        sx={{ color: "#0FB282", fontSize: 28 }}
                      />
                    )}
                  </Box>
                  {!isMobileOtpVerified &&
                    mobileValue &&
                    !errors.mobileNumber && (
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

              {/* Password */}
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
                    loading || !isEmailOtpVerified || !isMobileOtpVerified
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
                      boxShadow: "Boosted shadow",
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

          {/* Sign In Link */}
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
    </Suspense>
  );
}
