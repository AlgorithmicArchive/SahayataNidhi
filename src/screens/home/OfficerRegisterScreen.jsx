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
import CustomButton from "../../components/CustomButton";
import { fetchDistricts } from "../../assets/fetch";
import OtpModal from "../../components/OtpModal";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Col, Row } from "react-bootstrap";
import debounce from "lodash/debounce";

// Function to generate a random CAPTCHA
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
  const [otpType, setOtpType] = useState(null); // 'email' or 'mobile'
  const [userId, setUserId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState(false);
  const [isMobileOtpSent, setIsMobileOtpSent] = useState(false);
  const [isMobileOtpVerified, setIsMobileOtpVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReady, setIsReady] = useState(false); // To prevent FOUC

  const selectedDepartment = watch("department");
  const selectedDesignation = watch("designation");
  const selectedDistrict = watch("District");
  const selectedDivision = watch("Division");
  const selectedTehsil = watch("Tehsil");
  const emailValue = watch("email");
  const mobileValue = watch("mobileNumber");
  const navigate = useNavigate();

  // Fetch departments and districts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const deptResponse = await axios.get("/Home/GetDepartments");
        if (deptResponse.data.status) {
          const departmentOptions = deptResponse.data.departments.map(
            (dept) => ({
              label: dept.departmentName,
              value: dept.departmentId,
            }),
          );
          setDepartments(departmentOptions);
        } else {
          toast.error("Failed to fetch departments", {
            position: "top-center",
            autoClose: 3000,
            theme: "colored",
          });
        }

        await fetchDistricts(setDistrictOptions);
        setCaptcha(generateCaptcha());
        setIsReady(true); // Mark as ready once data is fetched
      } catch (error) {
        console.error("Error fetching initial data", error);
        toast.error("Error fetching initial data", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
      }
    };

    fetchData();
  }, []);

  // Fetch designations when department changes
  useEffect(() => {
    if (selectedDepartment) {
      axios
        .get(`/Home/GetDesignations?deparmentId=${selectedDepartment}`)
        .then((response) => {
          if (response.data.status) {
            const designationOptions = response.data.designations.map(
              (des) => ({
                label: des.designation + ` (${des.accessLevel})`,
                value: des.designation,
                accessLevel: des.accessLevel,
              }),
            );
            setDesignations(designationOptions);
            const newAccessLevelMap = {};
            designationOptions.forEach((des) => {
              newAccessLevelMap[des.value] = des.accessLevel;
            });
            setAccessLevelMap(newAccessLevelMap);
          } else {
            toast.error("Failed to fetch designations", {
              position: "top-center",
              autoClose: 3000,
              theme: "colored",
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching designations", error);
          toast.error("Error fetching designations", {
            position: "top-center",
            autoClose: 3000,
            theme: "colored",
          });
        });
    } else {
      setDesignations([]);
      setAccessLevelMap({});
    }
  }, [selectedDepartment]);

  // Fetch tehsils when district changes
  useEffect(() => {
    if (selectedDistrict) {
      axios
        .get(`/Base/GetTeshilForDistrict?districtId=${selectedDistrict}`)
        .then((response) => {
          if (response.data.status) {
            const tehsilOptionsFormatted = response.data.tehsils.map(
              (tehsil) => ({
                label: tehsil.tehsilName,
                value: tehsil.tehsilId,
              }),
            );
            setTehsilOptions(tehsilOptionsFormatted);
          } else {
            toast.error("Failed to fetch tehsils", {
              position: "top-center",
              autoClose: 3000,
              theme: "colored",
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching tehsils", error);
          toast.error("Error fetching tehsils", {
            position: "top-center",
            autoClose: 3000,
            theme: "colored",
          });
        });
    } else {
      setTehsilOptions([]);
    }
  }, [selectedDistrict]);

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha());
  };

  // Debounced email validation
  const debouncedEmailValidation = useCallback(
    debounce(async (value, formContext) => {
      if (!value) {
        return "Email is required";
      }
      if (!selectedDepartment || !selectedDesignation) {
        return "Please select department and designation first";
      }
      try {
        const params = {
          email: value,
          UserType: "Officer",
          departmentId: selectedDepartment || null,
          designation: selectedDesignation || null,
        };
        if (accessLevelMap[selectedDesignation] === "Division") {
          if (!selectedDivision) return "Please select division first";
          params.divisionId = selectedDivision;
        } else if (accessLevelMap[selectedDesignation] === "District") {
          if (!selectedDistrict) return "Please select district first";
          params.districtId = selectedDistrict;
        } else if (accessLevelMap[selectedDesignation] === "Tehsil") {
          if (!selectedDistrict) return "Please select district first";
          if (!selectedTehsil) return "Please select tehsil first";
          params.districtId = selectedDistrict;
          params.tehsilId = selectedTehsil;
        }
        const response = await axios.get("/Home/CheckEmail", { params });
        console.log("Email check response:", response.data); // Debug log
        if (response.data && typeof response.data.isUnique === "boolean") {
          if (!response.data.isUnique) {
            formContext.setError("email", {
              type: "manual",
              message: "Email already exists",
            });
            return "Email already exists";
          }
          return true;
        }
        return "Invalid response from server";
      } catch (error) {
        console.error("Error checking email availability", error);
        return "Error checking email availability";
      }
    }, 300), // Reduced debounce delay for faster response
    [
      selectedDepartment,
      selectedDesignation,
      selectedDivision,
      selectedDistrict,
      selectedTehsil,
      accessLevelMap,
    ],
  );

  // Debounced mobile number validation
  const debouncedMobileValidation = useCallback(
    debounce(async (value, formContext) => {
      if (!value) {
        return "Mobile Number is required";
      }
      if (!selectedDepartment || !selectedDesignation) {
        return "Please select department and designation first";
      }
      try {
        const params = {
          number: value,
          UserType: "Officer",
          departmentId: selectedDepartment || null,
          designation: selectedDesignation || null,
        };
        if (accessLevelMap[selectedDesignation] === "Division") {
          if (!selectedDivision) return "Please select division first";
          params.divisionId = selectedDivision;
        } else if (accessLevelMap[selectedDesignation] === "District") {
          if (!selectedDistrict) return "Please select district first";
          params.districtId = selectedDistrict;
        } else if (accessLevelMap[selectedDesignation] === "Tehsil") {
          if (!selectedDistrict) return "Please select district first";
          if (!selectedTehsil) return "Please select tehsil first";
          params.districtId = selectedDistrict;
          params.tehsilId = selectedTehsil;
        }
        const response = await axios.get("/Home/CheckMobileNumber", { params });
        console.log("Mobile check response:", response.data); // Debug log
        if (response.data && typeof response.data.isUnique === "boolean") {
          if (!response.data.isUnique) {
            formContext.setError("mobileNumber", {
              type: "manual",
              message: "Mobile Number already exists",
            });
            return "Mobile Number already exists";
          }
          return true;
        }
        return "Invalid response from server";
      } catch (error) {
        console.error("Error checking mobile number availability", error);
        return "Error checking mobile number availability";
      }
    }, 300), // Reduced debounce delay for faster response
    [
      selectedDepartment,
      selectedDesignation,
      selectedDivision,
      selectedDistrict,
      selectedTehsil,
      accessLevelMap,
    ],
  );

  // Handle email validation button click
  const handleEmailValidate = async () => {
    const isValid = await trigger("email");
    console.log(
      "Email validation triggered, isValid:",
      isValid,
      "Errors:",
      errors.email,
    ); // Debug log
    if (isValid && !errors.email) {
      setLoading(true);
      try {
        const email = getValues("email");
        const response = await axios.get("/Home/SendOtp", {
          params: { email },
        });
        if (response.data.status) {
          setIsEmailOtpSent(true);
          setIsOtpModalOpen(true);
          setOtpType("email");
          setErrorMessage(response.data.message || "");
          setUserId(response.data.userId);
          toast.success("OTP sent to your email!", {
            position: "top-center",
            autoClose: 3000,
          });
        } else {
          toast.error("Failed to send OTP. Please try again.", {
            position: "top-center",
            autoClose: 3000,
          });
        }
      } catch (error) {
        console.error("Error sending OTP to email", error);
        toast.error("Error sending OTP to email.", {
          position: "top-center",
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Manually trigger validation to ensure error is set
      const emailError = await debouncedEmailValidation(getValues("email"), {
        setError,
      });
      if (emailError !== true) {
        setError("email", { type: "manual", message: emailError });
      }
    }
  };

  // Handle mobile validation button click
  const handleMobileValidate = async () => {
    const isValid = await trigger("mobileNumber");
    console.log(
      "Mobile validation triggered, isValid:",
      isValid,
      "Errors:",
      errors.mobileNumber,
    ); // Debug log
    if (isValid && !errors.mobileNumber) {
      setLoading(true);
      try {
        const mobile = getValues("mobileNumber");
        const response = await axios.get("/Home/SendOtp", {
          params: { mobile },
        });
        if (response.data.status) {
          setIsMobileOtpSent(true);
          setIsOtpModalOpen(true);
          setOtpType("mobile");
          setUserId(response.data.userId);
          setErrorMessage(response.data.message || "");
          toast.success("OTP sent to your mobile number!", {
            position: "top-center",
            autoClose: 3000,
          });
        } else {
          toast.error("Failed to send OTP. Please try again.", {
            position: "top-center",
            autoClose: 3000,
          });
        }
      } catch (error) {
        console.error("Error sending OTP to mobile", error);
        toast.error("Error sending OTP to mobile.", {
          position: "top-center",
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Manually trigger validation to ensure error is set
      const mobileError = await debouncedMobileValidation(
        getValues("mobileNumber"),
        { setError },
      );
      if (mobileError !== true) {
        setError("mobileNumber", { type: "manual", message: mobileError });
      }
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {
    if (!isEmailOtpVerified) {
      toast.error("Please verify email OTP before registering.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    if (!isMobileOtpVerified) {
      toast.error("Please verify mobile OTP before registering.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });
    formData.append("accessLevel", accessLevelMap[selectedDesignation] || "");
    formData.append(
      "accessCode",
      accessLevelMap[selectedDesignation] !== "State"
        ? accessLevelMap[selectedDesignation]?.includes("Tehsil")
          ? data["Tehsil"]
          : accessLevelMap[selectedDesignation]?.includes("District")
          ? data["District"]
          : data["Division"]
        : 0,
    );
    try {
      const response = await axios.post("/Home/OfficerRegistration", formData);
      const { status } = response.data;
      if (status) {
        toast.success("Registration successful! Redirecting to login...", {
          position: "top-center",
          autoClose: 2000,
        });
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error("Registration failed. Please try again.", {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Registration error", error);
      toast.error("An error occurred. Please try again.", {
        position: "top-center",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
      setCaptcha(generateCaptcha());
    }
  };

  // Handle OTP submission
  const handleOtpSubmit = async (otp) => {
    console.log("handleOtpSubmit called with OTP:", otp, "Type:", otpType);
    if (!otp) {
      toast.error("Please enter an OTP.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("otp", otp);
    if (otpType === "email") {
      formData.append("email", getValues("email"));
    } else if (otpType === "mobile") {
      formData.append("mobile", getValues("mobileNumber"));
    }

    try {
      const response = await axios.post(
        otpType === "email" ? "/Home/OTPValidation" : "/Home/OTPValidation",
        formData,
      );
      if (response.data.status) {
        if (otpType === "email") {
          setIsEmailOtpVerified(true);
        } else if (otpType === "mobile") {
          setIsMobileOtpVerified(true);
        }
        setIsOtpModalOpen(false);
        setOtpType(null);
        toast.success(
          `${
            otpType === "email" ? "Email" : "Mobile"
          } OTP verified successfully!`,
          {
            position: "top-center",
            autoClose: 2000,
          },
        );
      } else {
        toast.error("Invalid OTP. Please try again.", {
          position: "top-center",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error(
        `${otpType === "email" ? "Email" : "Mobile"} OTP validation error`,
        error,
      );
      toast.error(
        `Error validating ${otpType === "email" ? "email" : "mobile"} OTP.`,
        {
          position: "top-center",
          autoClose: 3000,
        },
      );
    } finally {
      setLoading(false);
    }
  };

  // Debug form errors
  useEffect(() => {
    console.log("Form errors:", errors);
  }, [errors]);

  // Render loading state to prevent FOUC
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
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Suspense fallback={<CircularProgress />}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "80vh",
          background:
            "linear-gradient(135deg, rgb(252, 252, 252) 0%, rgb(240, 236, 236) 100%)",
          padding: { xs: 2, md: 4 },
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            bgcolor: "#FFFFFF",
            p: { xs: 3, md: 5 },
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
            maxWidth: 500,
            transition: "transform 0.3s ease-in-out",
            "&:hover": {
              transform: "translateY(-5px)",
            },
          }}
          role="form"
          aria-labelledby="officer-register-title"
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography
              variant="h4"
              component="h1"
              id="officer-register-title"
              sx={{
                fontWeight: 700,
                color: "primary.main",
                mb: 1,
              }}
            >
              Officer Registration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign up as an officer to get started
            </Typography>
          </Box>

          <Box
            component="form"
            noValidate
            autoComplete="off"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <Row>
              <Col xs={6}>
                <Controller
                  name="fullName"
                  control={control}
                  rules={{
                    required: "Full name is required",
                    minLength: {
                      value: 5,
                      message: "Full Name must be at least 5 characters",
                    },
                    maxLength: {
                      value: 255,
                      message: "Full Name must be at most 255 characters",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        <Typography component="span">
                          Full Name <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      fullWidth
                      disabled={loading}
                      error={!!errors.fullName}
                      helperText={errors.fullName?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Col>
              <Col xs={6}>
                <Controller
                  name="username"
                  control={control}
                  rules={{
                    required: "Username is required",
                    minLength: {
                      value: 5,
                      message: "Username must be at least 5 characters",
                    },
                    maxLength: {
                      value: 20,
                      message: "Username must be at most 20 characters",
                    },
                    validate: async (value) => {
                      if (!value) return "Username is required";
                      try {
                        const response = await axios.get(
                          "/Home/CheckUsername",
                          {
                            params: { username: value },
                          },
                        );
                        return (
                          response.data.isUnique || "Username already exists"
                        );
                      } catch {
                        return "Error checking username availability";
                      }
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        <Typography component="span">
                          Username <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      fullWidth
                      disabled={loading}
                      error={!!errors.username}
                      helperText={errors.username?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                <Controller
                  name="department"
                  control={control}
                  rules={{
                    required: "Department is required",
                  }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      error={!!errors.department}
                      disabled={loading}
                    >
                      <InputLabel>
                        <Typography component="span">
                          Department <span style={{ color: "red" }}>*</span>
                        </Typography>
                      </InputLabel>
                      <Select
                        {...field}
                        label={
                          <Typography component="span">
                            Department <span style={{ color: "red" }}>*</span>
                          </Typography>
                        }
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <MenuItem value="" disabled>
                          Select Department
                        </MenuItem>
                        {departments.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.department && (
                        <FormHelperText>
                          {errors.department.message}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Col>
              <Col xs={6}>
                <Controller
                  name="designation"
                  control={control}
                  rules={{
                    required: "Designation is required",
                  }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      error={!!errors.designation}
                      disabled={loading || !selectedDepartment}
                    >
                      <InputLabel>
                        <Typography component="span">
                          Designation <span style={{ color: "red" }}>*</span>
                        </Typography>
                      </InputLabel>
                      <Select
                        {...field}
                        label={
                          <Typography component="span">
                            Designation <span style={{ color: "red" }}>*</span>
                          </Typography>
                        }
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      >
                        <MenuItem value="" disabled>
                          Select Designation
                        </MenuItem>
                        {designations.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.designation && (
                        <FormHelperText>
                          {errors.designation.message}
                        </FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                {(accessLevelMap[selectedDesignation] === "District" ||
                  accessLevelMap[selectedDesignation] === "Tehsil") && (
                  <Controller
                    name="District"
                    control={control}
                    rules={{
                      required:
                        accessLevelMap[selectedDesignation] === "District" ||
                        accessLevelMap[selectedDesignation] === "Tehsil"
                          ? "District is required"
                          : false,
                    }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        error={!!errors.District}
                        disabled={loading}
                      >
                        <InputLabel>
                          <Typography component="span">
                            District <span style={{ color: "red" }}>*</span>
                          </Typography>
                        </InputLabel>
                        <Select
                          {...field}
                          label={
                            <Typography component="span">
                              District <span style={{ color: "red" }}>*</span>
                            </Typography>
                          }
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <MenuItem value="" disabled>
                            Select District
                          </MenuItem>
                          {districtOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.District && (
                          <FormHelperText>
                            {errors.District.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                )}
                {accessLevelMap[selectedDesignation] === "Division" && (
                  <Controller
                    name="Division"
                    control={control}
                    rules={{
                      required:
                        accessLevelMap[selectedDesignation] === "Division"
                          ? "Division is required"
                          : false,
                    }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        error={!!errors.Division}
                        disabled={loading}
                      >
                        <InputLabel>
                          <Typography component="span">
                            Division <span style={{ color: "red" }}>*</span>
                          </Typography>
                        </InputLabel>
                        <Select
                          {...field}
                          label={
                            <Typography component="span">
                              Division <span style={{ color: "red" }}>*</span>
                            </Typography>
                          }
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <MenuItem value="" disabled>
                            Select Division
                          </MenuItem>
                          {[
                            { label: "Jammu", value: 1 },
                            { label: "Kashmir", value: 2 },
                          ].map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.Division && (
                          <FormHelperText>
                            {errors.Division.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                )}
              </Col>
              <Col xs={6}>
                {accessLevelMap[selectedDesignation] === "Tehsil" && (
                  <Controller
                    name="Tehsil"
                    control={control}
                    rules={{
                      required:
                        accessLevelMap[selectedDesignation] === "Tehsil"
                          ? "Tehsil is required"
                          : false,
                    }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        error={!!errors.Tehsil}
                        disabled={loading}
                      >
                        <InputLabel>
                          <Typography component="span">
                            TSWO Office <span style={{ color: "red" }}>*</span>
                          </Typography>
                        </InputLabel>
                        <Select
                          {...field}
                          label={
                            <Typography component="span">
                              TSWO Office{" "}
                              <span style={{ color: "red" }}>*</span>
                            </Typography>
                          }
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <MenuItem value="" disabled>
                            Select Tehsil
                          </MenuItem>
                          {tehsilOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.Tehsil && (
                          <FormHelperText>
                            {errors.Tehsil.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                )}
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email format",
                    },
                    maxLength: {
                      value: 40,
                      message: "Email must be at most 40 characters",
                    },
                    validate: async (value) => {
                      const result = await debouncedEmailValidation(value, {
                        setError,
                      });
                      console.log("Email validation result:", result); // Debug log
                      return result;
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        <Typography component="span">
                          Email <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      type="email"
                      fullWidth
                      disabled={loading || isEmailOtpVerified}
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      variant="outlined"
                      onBlur={() => trigger("email")} // Trigger validation on blur
                    />
                  )}
                />
                {isEmailOtpVerified && (
                  <Typography
                    variant="subtitle2"
                    color="success"
                    fontWeight="bold"
                    sx={{ mt: 1 }}
                  >
                    Verified
                  </Typography>
                )}
                {!isEmailOtpVerified && emailValue && !errors.email && (
                  <CustomButton
                    text="Validate Email"
                    bgColor="primary.main"
                    color="white"
                    width="100%"
                    disabled={loading}
                    onClick={handleEmailValidate}
                    sx={{ mt: 2 }}
                  />
                )}
              </Col>
              <Col xs={6}>
                <Controller
                  name="mobileNumber"
                  control={control}
                  rules={{
                    required: "Mobile Number is required",
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: "Enter 10 digit number",
                    },
                    validate: async (value) => {
                      const result = await debouncedMobileValidation(value, {
                        setError,
                      });
                      console.log("Mobile validation result:", result); // Debug log
                      return result;
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        <Typography component="span">
                          Mobile Number <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      type="tel"
                      fullWidth
                      inputProps={{ maxLength: 10 }}
                      disabled={loading || isMobileOtpVerified}
                      error={!!errors.mobileNumber}
                      helperText={errors.mobileNumber?.message}
                      variant="outlined"
                      onBlur={() => trigger("mobileNumber")} // Trigger validation on blur
                    />
                  )}
                />
                {isMobileOtpVerified && (
                  <Typography
                    variant="subtitle2"
                    color="success"
                    fontWeight="bold"
                    sx={{ mt: 1 }}
                  >
                    Verified
                  </Typography>
                )}
                {!isMobileOtpVerified &&
                  mobileValue &&
                  !errors.mobileNumber && (
                    <CustomButton
                      text="Validate Mobile"
                      bgColor="primary.main"
                      color="white"
                      width="100%"
                      disabled={loading}
                      onClick={handleMobileValidate}
                      sx={{ mt: 2 }}
                    />
                  )}
              </Col>
            </Row>
            <Row>
              <Col xs={6}>
                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                    maxLength: {
                      value: 12,
                      message: "Password must be at most 12 characters",
                    },
                    pattern: {
                      value:
                        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,12}$/,
                      message:
                        "Password must include uppercase, lowercase, number, and special character",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        <Typography component="span">
                          Password <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      type="password"
                      fullWidth
                      disabled={loading}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Col>
              <Col xs={6}>
                <Controller
                  name="confirmPassword"
                  control={control}
                  rules={{
                    required: "Confirm your password",
                    validate: (value) =>
                      value === getValues("password") ||
                      "Passwords do not match",
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        <Typography component="span">
                          Confirm Password{" "}
                          <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      type="password"
                      fullWidth
                      disabled={loading}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      variant="outlined"
                    />
                  )}
                />
              </Col>
            </Row>

            <Row>
              <Col xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mt: 2,
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "center",
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
                      width: "95%",
                      marginBottom: 2,
                      position: "relative",
                      overflow: "hidden",
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
                          fontSize: { xs: 16, sm: 18 },
                          fontWeight: Math.random() > 0.5 ? 700 : 400,
                          color:
                            Math.random() > 0.5 ? "primary.main" : "#2d3748",
                          transform: `rotate(${Math.floor(
                            Math.random() * 31 - 15,
                          )}deg) translateY(${Math.floor(
                            Math.random() * 6 - 3,
                          )}px)`,
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
                    disabled={loading}
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
                <Controller
                  name="captcha"
                  control={control}
                  rules={{
                    required: "CAPTCHA is required",
                    validate: (value) =>
                      value === captcha || "CAPTCHA is incorrect",
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={
                        <Typography component="span">
                          Enter CAPTCHA <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      fullWidth
                      placeholder="Enter the CAPTCHA code"
                      disabled={loading}
                      error={!!errors.captcha}
                      helperText={errors.captcha?.message}
                      variant="outlined"
                      inputProps={{ "aria-describedby": "captcha-error" }}
                    />
                  )}
                />
              </Col>
            </Row>

            <CustomButton
              text={loading ? "Registering..." : "Register"}
              bgColor="primary.main"
              color="background.default"
              type="submit"
              width="50%"
              disabled={loading || !isEmailOtpVerified || !isMobileOtpVerified}
              startIcon={
                loading && <CircularProgress size={20} color="inherit" />
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
                Already have an account?{" "}
                <Link
                  href="/login"
                  sx={{ color: "primary.main", fontWeight: 600 }}
                  underline="hover"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/login");
                  }}
                  aria-label="Sign in"
                >
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Container>

        <OtpModal
          open={isOtpModalOpen}
          onClose={() => {
            setIsOtpModalOpen(false);
            setOtpType(null);
          }}
          onSubmit={handleOtpSubmit}
          errorMessage={errorMessage}
          title={`Enter ${otpType === "email" ? "Email" : "Mobile"} OTP`}
          aria-labelledby="otp-modal-title"
          sx={{
            maxWidth: 400,
            mx: "auto",
            p: 3,
            bgcolor: "background.default",
            borderRadius: 3,
          }}
        />

        <ToastContainer />
      </Box>
    </Suspense>
  );
}
