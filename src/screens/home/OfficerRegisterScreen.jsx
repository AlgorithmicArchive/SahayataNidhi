import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Container,
  Link,
  CircularProgress,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import CustomInputField from "../../components/form/CustomInputField";
import CustomSelectField from "../../components/form/CustomSelectField";
import CustomButton from "../../components/CustomButton";
import { fetchDistricts } from "../../assets/fetch";
import OtpModal from "../../components/OtpModal";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Col, Row } from "react-bootstrap";

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

// Validation schema
const schema = yup.object().shape({
  fullName: yup
    .string()
    .required("Full name is required")
    .min(5, "Full Name must be at least 5 characters"),
  username: yup
    .string()
    .required("Username is required")
    .min(5, "Username must be at least 5 characters")
    .test("username-unique", "Username already exists", async (value) => {
      if (!value) return false;
      try {
        const response = await axios.get("/Home/CheckUsername", {
          params: { username: value },
        });
        return response.data.isUnique;
      } catch {
        return false;
      }
    }),
  email: yup
    .string()
    .required("Email is required")
    .matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format")
    .test("email-unique", "Email already exists", async (value) => {
      if (!value) return false;
      try {
        const response = await axios.get("/Home/CheckEmail", {
          params: { email: value, UserType: "Officer" },
        });
        return response.data.isUnique;
      } catch {
        return false;
      }
    }),
  mobileNumber: yup
    .string()
    .required("Mobile Number is required")
    .matches(/^[0-9]{10}$/, "Enter 10 digit number")
    .test("mobile-unique", "Mobile Number already exists", async (value) => {
      if (!value) return false;
      try {
        const res = await axios.get("/Home/CheckMobileNumber", {
          params: { number: value, UserType: "Officer" },
        });
        return res.data?.isUnique;
      } catch {
        return false;
      }
    }),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(12, "Password must be at most 12 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,12}$/,
      "Password must include uppercase, lowercase, number, and special character",
    ),
  confirmPassword: yup
    .string()
    .required("Confirm your password")
    .test("passwords-match", "Passwords do not match", function (value) {
      return value === this.parent.password;
    }),
  department: yup.string().required("Department is required"),
  designation: yup.string().required("Designation is required"),
  District: yup.string().when("designation", {
    is: (designation) =>
      accessLevelMap[designation] === "District" ||
      accessLevelMap[designation] === "Tehsil",
    then: yup.string().required("District is required"),
  }),
  Division: yup.string().when("designation", {
    is: (designation) => accessLevelMap[designation] === "Division",
    then: yup.string().required("Division is required"),
  }),
  Tehsil: yup.string().when("designation", {
    is: (designation) => accessLevelMap[designation] === "Tehsil",
    then: yup.string().required("Tehsil is required"),
  }),
  captcha: yup
    .string()
    .required("CAPTCHA is required")
    .test("captcha-match", "CAPTCHA is incorrect", function (value) {
      return value === this.options.context.captcha;
    }),
});

export default function OfficerRegisterScreen() {
  const {
    handleSubmit,
    getValues,
    control,
    formState: { errors },
    watch,
    trigger,
  } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    resolver: yupResolver(schema),
    context: { captcha: captcha },
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
  const selectedDepartment = watch("department");
  const selectedDesignation = watch("designation");
  const selectedDistrict = watch("District");
  const emailValue = watch("email");
  const mobileValue = watch("mobileNumber");
  const navigate = useNavigate();

  // Fetch departments and districts on mount
  useEffect(() => {
    // Fetch departments
    axios
      .get("/Home/GetDepartments")
      .then((response) => {
        if (response.data.status) {
          const departmentOptions = response.data.departments.map((dept) => ({
            label: dept.departmentName,
            value: dept.departmentId,
          }));
          setDepartments(departmentOptions);
        } else {
          toast.error("Failed to fetch departments", {
            position: "top-center",
            autoClose: 3000,
            theme: "colored",
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching departments", error);
        toast.error("Error fetching departments", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
      });

    fetchDistricts(setDistrictOptions);
    setCaptcha(generateCaptcha());
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
                label: des.designation,
                value: des.designation,
                accessLevel: des.accessLevel, // Assuming accessLevel is returned
              }),
            );
            setDesignations(designationOptions);
            // Update accessLevelMap
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
    }
  }, [selectedDistrict]);

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha());
  };

  // Handle email validation button click
  const handleEmailValidate = async () => {
    const isValid = await trigger("email");
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
    }
  };

  // Handle mobile validation button click
  const handleMobileValidate = async () => {
    const isValid = await trigger("mobileNumber");
    if (isValid && !errors.mobileNumber) {
      setLoading(true);
      try {
        const mobile = getValues("mobileNumber");
        const response = await axios.get("/Home/SendMobileOtp", {
          params: { mobileNumber: mobile },
        });
        if (response.data.status) {
          setIsMobileOtpSent(true);
          setIsOtpModalOpen(true);
          setOtpType("mobile");
          setUserId(response.data.userId);
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
    formData.append("accessLevel", accessLevelMap[selectedDesignation]);
    formData.append(
      "accessCode",
      accessLevelMap[selectedDesignation] !== "State"
        ? accessLevelMap[selectedDesignation].includes("Tehsil")
          ? data["Tehsil"]
          : accessLevelMap[selectedDesignation].includes("District")
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
      formData.append("mobileNumber", getValues("mobileNumber"));
    }

    try {
      const response = await axios.post(
        otpType === "email"
          ? "/Home/OTPValidation"
          : "/Home/MobileOTPValidation",
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

  return (
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
        {/* Header */}
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

        {/* Form */}
        <Box
          component="form"
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <Row>
            <Col xs={6}>
              <CustomInputField
                name="fullName"
                label={
                  <Typography component="span">
                    Full Name <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                control={control}
                errors={errors}
                disabled={loading}
              />
            </Col>
            <Col xs={6}>
              <CustomInputField
                name="username"
                label={
                  <Typography component="span">
                    Username <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                control={control}
                errors={errors}
                disabled={loading}
              />
            </Col>
          </Row>
          <Row>
            <Col xs={6}>
              <CustomInputField
                name="email"
                label={
                  <Typography component="span">
                    Email <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                type="email"
                control={control}
                errors={errors}
                disabled={loading || isEmailOtpVerified}
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
              {!isEmailOtpVerified && emailValue && (
                <CustomButton
                  text="Validate Email"
                  bgColor="primary.main"
                  color="white"
                  width="100%"
                  disabled={loading}
                  onClick={handleEmailValidate}
                  sx={{ mt: 1 }}
                />
              )}
            </Col>
            <Col xs={6}>
              <CustomInputField
                name="mobileNumber"
                label={
                  <Typography component="span">
                    Mobile Number <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                type="tel"
                control={control}
                errors={errors}
                maxLength={10}
                disabled={loading || isMobileOtpVerified}
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
              {!isMobileOtpVerified && mobileValue && (
                <CustomButton
                  text="Validate Mobile"
                  bgColor="primary.main"
                  color="white"
                  width="100%"
                  disabled={loading}
                  onClick={handleMobileValidate}
                  sx={{ mt: 1 }}
                />
              )}
            </Col>
          </Row>
          <Row>
            <Col xs={6}>
              <CustomInputField
                name="password"
                label={
                  <Typography component="span">
                    Password <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                type="password"
                control={control}
                errors={errors}
                disabled={loading}
              />
            </Col>
            <Col xs={6}>
              <CustomInputField
                name="confirmPassword"
                label={
                  <Typography component="span">
                    Confirm Password <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                type="password"
                control={control}
                errors={errors}
                disabled={loading}
              />
            </Col>
          </Row>
          <Row>
            <Col xs={6}>
              <CustomSelectField
                label={
                  <Typography component="span">
                    Department <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                name="department"
                control={control}
                placeholder="Select Department"
                options={departments}
                errors={errors}
                disabled={loading}
              />
            </Col>
            <Col xs={6}>
              <CustomSelectField
                label={
                  <Typography component="span">
                    Designation <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                name="designation"
                control={control}
                placeholder="Select Designation"
                options={designations}
                errors={errors}
                disabled={loading || !selectedDepartment}
              />
            </Col>
          </Row>
          <Row>
            <Col xs={6}>
              {(accessLevelMap[selectedDesignation] === "District" ||
                accessLevelMap[selectedDesignation] === "Tehsil") && (
                <CustomSelectField
                  label={
                    <Typography component="span">
                      District <span style={{ color: "red" }}>*</span>
                    </Typography>
                  }
                  name="District"
                  control={control}
                  placeholder="Select District"
                  options={districtOptions}
                  errors={errors}
                  disabled={loading}
                />
              )}
              {accessLevelMap[selectedDesignation] === "Division" && (
                <CustomSelectField
                  label={
                    <Typography component="span">
                      Division <span style={{ color: "red" }}>*</span>
                    </Typography>
                  }
                  name="Division"
                  control={control}
                  placeholder="Select Division"
                  options={[
                    { label: "Jammu", value: 1 },
                    { label: "Kashmir", value: 2 },
                  ]}
                  errors={errors}
                  disabled={loading}
                />
              )}
            </Col>
            <Col xs={6}>
              {accessLevelMap[selectedDesignation] === "Tehsil" && (
                <CustomSelectField
                  label={
                    <Typography component="span">
                      TSWO Office <span style={{ color: "red" }}>*</span>
                    </Typography>
                  }
                  name="Tehsil"
                  control={control}
                  placeholder="Select Tehsil"
                  options={tehsilOptions}
                  errors={errors}
                  disabled={loading}
                />
              )}
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
                        color: Math.random() > 0.5 ? "primary.main" : "#2d3748",
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
              <CustomInputField
                label={
                  <Typography component="span">
                    Enter CAPTCHA <span style={{ color: "red" }}>*</span>
                  </Typography>
                }
                name="captcha"
                control={control}
                placeholder="Enter the CAPTCHA code"
                errors={errors}
                aria-describedby="captcha-error"
                disabled={loading}
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
  );
}
