import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import axiosInstance from "../../axiosConfig";
import MessageModal from "../../components/MessageModal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CustomButton from "../../components/CustomButton";
import OtpModal from "../../components/OtpModal";

// Admin hierarchy configuration
const adminHierarchy = {
  System: {
    allowedToCreate: ["State", "Division", "District"],
    roles: [
      {
        Role: "State Admin",
        RoleShort: "SA",
        AccessLevel: "State",
        AccessCode: 0,
      },
      {
        Role: "Division Admin",
        RoleShort: "DA",
        AccessLevel: "Division",
        AccessCode: 1,
      },
      {
        Role: "District Admin",
        RoleShort: "DIA",
        AccessLevel: "District",
        AccessCode: 2,
      },
    ],
  },
  State: {
    allowedToCreate: ["Division", "District"],
    roles: [
      {
        Role: "Division Admin",
        RoleShort: "DA",
        AccessLevel: "Division",
        AccessCode: 1,
      },
      {
        Role: "District Admin",
        RoleShort: "DIA",
        AccessLevel: "District",
        AccessCode: 2,
      },
    ],
  },
  Division: {
    allowedToCreate: ["District"],
    roles: [
      {
        Role: "District Admin",
        RoleShort: "DIA",
        AccessLevel: "District",
        AccessCode: 2,
      },
    ],
  },
  District: {
    allowedToCreate: [],
    roles: [],
  },
};

// Mock divisions (replace with API data if available)
const divisions = [
  { id: 1, name: "Jammu" },
  { id: 2, name: "Kashmir" },
];

// Mock districts as fallback
const mockDistricts = [
  { id: 1, name: "District 1", divisionId: 1 },
  { id: 2, name: "District 2", divisionId: 1 },
  { id: 3, name: "District 3", divisionId: 2 },
];

export default function AddAdmin() {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      mobileNumber: "",
      userType: "Admin",
      role: "",
      division: "",
      district: "",
      department: "",
    },
  });
  const [currentAdminLevel, setCurrentAdminLevel] = useState("");
  const [currentAdminRole, setCurrentAdminRole] = useState("");
  const [currentAdminDivision, setCurrentAdminDivision] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpType, setOtpType] = useState(null); // 'email' or 'mobile'
  const [userId, setUserId] = useState(0);
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState(false);
  const [isMobileOtpSent, setIsMobileOtpSent] = useState(false);
  const [isMobileOtpVerified, setIsMobileOtpVerified] = useState(false);

  const selectedRole = watch("role");
  const selectedDivision = watch("division");
  const emailValue = watch("email");
  const mobileValue = watch("mobileNumber");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch admin details
        const adminResponse = await axiosInstance.get(
          "/Admin/GetCurrentAdminDetails",
        );
        if (!adminResponse.data || !adminResponse.data.additionalDetails) {
          throw new Error("Admin data is missing");
        }

        const details = JSON.parse(adminResponse.data.additionalDetails);
        if (!details || !details.AccessLevel) {
          throw new Error("Invalid admin details");
        }

        console.log("Current Admin Level:", details.AccessLevel); // Debug log
        console.log("Current Admin Role:", details.Role); // Debug log
        setCurrentAdminLevel(details.AccessLevel);
        setCurrentAdminRole(details.Role || "");
        if (details.DivisionId) {
          setCurrentAdminDivision(details.DivisionId);
        }

        // Set available roles based on AccessLevel or fallback to System if Role is System Admin
        const roleLevel =
          details.Role === "System Admin" ? "System" : details.AccessLevel;
        if (adminHierarchy[roleLevel]) {
          setAvailableRoles(adminHierarchy[roleLevel].roles);
          console.log("Available Roles:", adminHierarchy[roleLevel].roles); // Debug log
        } else {
          throw new Error(`No roles defined for AccessLevel: ${roleLevel}`);
        }

        const fetchedDistricts = adminResponse.data.districts || mockDistricts;
        setAllDistricts(fetchedDistricts);
        setFilteredDistricts(fetchedDistricts);

        // Fetch departments for System Admin
        if (details.Role === "System Admin") {
          const deptResponse = await axiosInstance.get("/Base/GetDepartments");
          if (
            deptResponse.data.status &&
            deptResponse.data.departments?.length > 0
          ) {
            console.log("Departments Loaded:", deptResponse.data.departments); // Debug log
            setDepartments(deptResponse.data.departments);
          } else {
            throw new Error(
              "Failed to load departments or no departments available",
            );
          }
        }
      } catch (error) {
        setErrorMessage(`Error loading data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (
      (selectedRole === "District Admin" ||
        selectedRole === "Division Admin") &&
      selectedDivision
    ) {
      setFilteredDistricts(
        allDistricts.filter((d) => d.divisionId === parseInt(selectedDivision)),
      );
      setValue("district", "");
    }
  }, [selectedDivision, selectedRole, setValue, allDistricts]);

  // Handle email validation button click
  const handleEmailValidate = async () => {
    const isValid = await trigger("email");
    if (isValid && !errors.email) {
      setIsLoading(true);
      try {
        const email = getValues("email");
        const response = await axiosInstance.get("/Home/SendOtp", {
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
        setIsLoading(false);
      }
    }
  };

  // Handle mobile validation button click
  const handleMobileValidate = async () => {
    const isValid = await trigger("mobileNumber");
    if (isValid && !errors.mobileNumber) {
      setIsLoading(true);
      try {
        const mobile = getValues("mobileNumber");
        const response = await axiosInstance.get("/Home/SendOtp", {
          params: { email: mobile },
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
        setIsLoading(false);
      }
    }
  };

  // Handle OTP submission
  const handleOtpSubmit = async (otp) => {
    if (!otp) {
      toast.error("Please enter an OTP.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("otp", otp);
    if (otpType === "email") {
      formData.append("email", getValues("email"));
    } else if (otpType === "mobile") {
      formData.append("email", getValues("mobileNumber"));
    }

    try {
      const response = await axiosInstance.post(
        "/Home/OTPValidation",
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
      setIsLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (!isEmailOtpVerified) {
      toast.error("Please verify email OTP before creating admin.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    if (!isMobileOtpVerified) {
      toast.error("Please verify mobile OTP before creating admin.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const selectedRoleObj = availableRoles.find((r) => r.Role === data.role);
    if (!selectedRoleObj) {
      setErrorMessage("Invalid role selected");
      return;
    }

    // Ensure department is provided for System Admin
    if (currentAdminRole === "System Admin" && !data.department) {
      setErrorMessage("Department is required for System Admin");
      return;
    }

    const additionalDetails = {
      Role: selectedRoleObj.Role,
      RoleShort: selectedRoleObj.RoleShort,
      AccessLevel: selectedRoleObj.AccessLevel,
      AccessCode: data.district || data.division || selectedRoleObj.AccessCode,
      Department: parseInt(data.department) || 0,
      Validate: true,
    };

    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("username", data.username);
      formData.append("email", data.email);
      formData.append("password", data.password);
      formData.append("mobileNumber", data.mobileNumber);
      formData.append("role", data.role);
      formData.append("division", data.division);
      formData.append("district", data.district);
      formData.append("department", data.department);
      formData.append("AdditionalDetails", JSON.stringify(additionalDetails));

      const response = await axiosInstance.post("/Admin/AddAdmin", formData);

      if (response.data.status) {
        setShowMessageModal(true);
        setValue("name", "");
        setValue("username", "");
        setValue("email", "");
        setValue("password", "");
        setValue("mobileNumber", "");
        setValue("role", "");
        setValue("division", "");
        setValue("district", "");
        setValue("department", "");
        setErrorMessage("");
        setIsEmailOtpSent(false);
        setIsEmailOtpVerified(false);
        setIsMobileOtpSent(false);
        setIsMobileOtpVerified(false);
      }
    } catch (error) {
      setErrorMessage(`Error creating admin: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "grey.100",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
          Add New Admin
        </Typography>
        <Alert severity="error" sx={{ mb: 4 }}>
          {errorMessage}
        </Alert>
      </Container>
    );
  }

  if (currentAdminLevel === "District") {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
          Add New Admin
        </Typography>
        <Alert severity="warning" sx={{ mb: 4 }}>
          District Admins are not authorized to create new admins.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Add New Admin
      </Typography>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {errorMessage}
        </Alert>
      )}
      {currentAdminRole === "System Admin" && departments.length === 0 && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          No departments available. Please contact support to configure
          departments.
        </Alert>
      )}
      <Box
        sx={{
          bgcolor: "white",
          p: 4,
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Name is required",
                  minLength: {
                    value: 5,
                    message: "Name must be at least 5 characters",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={
                      <Typography component="span">
                        Name <span style={{ color: "red" }}>*</span>
                      </Typography>
                    }
                    variant="outlined"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.name ? "true" : "false"}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="username"
                control={control}
                rules={{
                  required: "Username is required",
                  minLength: {
                    value: 5,
                    message: "Username must be at least 5 characters",
                  },
                  validate: async (value) => {
                    if (!value) return "Username is required";
                    try {
                      const res = await axiosInstance.get(
                        "/Home/CheckUsername",
                        {
                          params: { username: value },
                        },
                      );
                      return res.data?.isUnique || "Username already exists";
                    } catch {
                      return "Error checking username";
                    }
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={
                      <Typography component="span">
                        Username <span style={{ color: "red" }}>*</span>
                      </Typography>
                    }
                    variant="outlined"
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.username ? "true" : "false"}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email format",
                    },
                    validate: async (value) => {
                      if (!value) return "Email is required";
                      try {
                        const res = await axiosInstance.get(
                          "/Home/CheckEmail",
                          {
                            params: { email: value, UserType: "Admin" },
                          },
                        );
                        return res.data?.isUnique || "Email already exists";
                      } catch {
                        return "Error checking email";
                      }
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={
                        <Typography component="span">
                          Email <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      type="email"
                      variant="outlined"
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      InputLabelProps={{ shrink: true }}
                      aria-invalid={errors.email ? "true" : "false"}
                      disabled={isLoading || isEmailOtpVerified}
                      sx={{ flex: 1 }}
                    />
                  )}
                />
                {isEmailOtpVerified && (
                  <Typography
                    variant="subtitle2"
                    color="success.main"
                    fontWeight="bold"
                  >
                    Verified
                  </Typography>
                )}
              </Box>
              {!isEmailOtpVerified && emailValue && (
                <CustomButton
                  text="Validate Email"
                  bgColor="primary.main"
                  color="white"
                  width="100%"
                  disabled={isLoading}
                  onClick={handleEmailValidate}
                  sx={{ mt: 1 }}
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      if (!value) return "Mobile Number is required";
                      try {
                        const res = await axiosInstance.get(
                          "/Home/CheckMobileNumber",
                          {
                            params: { number: value, UserType: "Admin" },
                          },
                        );
                        return (
                          res.data?.isUnique || "Mobile Number already exists"
                        );
                      } catch {
                        return "Error checking mobile number";
                      }
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={
                        <Typography component="span">
                          Mobile Number <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      type="tel"
                      variant="outlined"
                      error={!!errors.mobileNumber}
                      helperText={errors.mobileNumber?.message}
                      InputLabelProps={{ shrink: true }}
                      aria-invalid={errors.mobileNumber ? "true" : "false"}
                      disabled={isLoading || isMobileOtpVerified}
                      inputProps={{ maxLength: 10 }}
                      sx={{ flex: 1 }}
                    />
                  )}
                />
                {isMobileOtpVerified && (
                  <Typography
                    variant="subtitle2"
                    color="success.main"
                    fontWeight="bold"
                  >
                    Verified
                  </Typography>
                )}
              </Box>
              {!isMobileOtpVerified && mobileValue && (
                <CustomButton
                  text="Validate Mobile"
                  bgColor="primary.main"
                  color="white"
                  width="100%"
                  disabled={isLoading}
                  onClick={handleMobileValidate}
                  sx={{ mt: 1 }}
                />
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
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
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,12}$/,
                    message:
                      "Password must include uppercase, lowercase, number, and special character",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={
                      <Typography component="span">
                        Password <span style={{ color: "red" }}>*</span>
                      </Typography>
                    }
                    type="password"
                    variant="outlined"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.password ? "true" : "false"}
                    disabled={isLoading}
                  />
                )}
              />
            </Grid>
            {currentAdminRole === "System Admin" && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="department"
                  control={control}
                  rules={{
                    required: "Department is required for System Admin",
                  }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      variant="outlined"
                      error={!!errors.department}
                    >
                      <InputLabel shrink>
                        Department <span style={{ color: "red" }}>*</span>
                      </InputLabel>
                      <Select
                        {...field}
                        label={
                          <Typography component="span">
                            Department <span style={{ color: "red" }}>*</span>
                          </Typography>
                        }
                        disabled={isLoading}
                      >
                        <MenuItem value="">Please Select Department</MenuItem>
                        {departments.map((dept) => (
                          <MenuItem
                            key={dept.departmentId}
                            value={dept.departmentId}
                          >
                            {dept.departmentName}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.department && (
                        <Typography color="error" variant="caption">
                          {errors.department.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <Controller
                name="role"
                control={control}
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <FormControl
                    fullWidth
                    variant="outlined"
                    error={!!errors.role}
                  >
                    <InputLabel shrink>
                      Role <span style={{ color: "red" }}>*</span>
                    </InputLabel>
                    <Select
                      {...field}
                      label={
                        <Typography component="span">
                          Role <span style={{ color: "red" }}>*</span>
                        </Typography>
                      }
                      disabled={isLoading}
                    >
                      <MenuItem value="">Please Select Role</MenuItem>
                      {availableRoles.map((role) => (
                        <MenuItem key={role.RoleShort} value={role.Role}>
                          {role.Role}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.role && (
                      <Typography color="error" variant="caption">
                        {errors.role.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            {(selectedRole === "Division Admin" ||
              selectedRole === "District Admin") &&
              (currentAdminLevel === "System" ||
                currentAdminLevel === "State") && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="division"
                    control={control}
                    rules={{
                      required:
                        selectedRole === "Division Admin" ||
                        selectedRole === "District Admin"
                          ? "Division is required"
                          : false,
                    }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        variant="outlined"
                        error={!!errors.division}
                      >
                        <InputLabel shrink>
                          Division <span style={{ color: "red" }}>*</span>
                        </InputLabel>
                        <Select
                          {...field}
                          label={
                            <Typography component="span">
                              Division <span style={{ color: "red" }}>*</span>
                            </Typography>
                          }
                          disabled={isLoading}
                        >
                          <MenuItem value="">Please Select Division</MenuItem>
                          {divisions.map((division) => (
                            <MenuItem key={division.id} value={division.id}>
                              {division.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.division && (
                          <Typography color="error" variant="caption">
                            {errors.division.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
              )}
            {selectedRole === "District Admin" && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="district"
                  control={control}
                  rules={{ required: "District is required" }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      variant="outlined"
                      error={!!errors.district}
                    >
                      <InputLabel shrink>
                        District <span style={{ color: "red" }}>*</span>
                      </InputLabel>
                      <Select
                        {...field}
                        label={
                          <Typography component="span">
                            District <span style={{ color: "red" }}>*</span>
                          </Typography>
                        }
                        disabled={isLoading}
                      >
                        <MenuItem value="">Please Select District</MenuItem>
                        {filteredDistricts.map((district) => (
                          <MenuItem key={district.id} value={district.id}>
                            {district.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.district && (
                        <Typography color="error" variant="caption">
                          {errors.district.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3, py: 1.5, fontSize: "1.1rem" }}
                disabled={
                  isLoading || !isEmailOtpVerified || !isMobileOtpVerified
                }
              >
                {isLoading ? "Creating Admin..." : "Create Admin"}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
      <MessageModal
        title="Add Admin"
        message="Admin Added Successfully."
        type="success"
        key="addadmin"
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      />
      {OtpModal && (
        <OtpModal
          open={isOtpModalOpen}
          onClose={() => {
            setIsOtpModalOpen(false);
            setOtpType(null);
          }}
          onSubmit={handleOtpSubmit}
          registeredAt={otpType}
          title={`Enter ${otpType === "email" ? "Email" : "Mobile"} OTP`}
        />
      )}
      <ToastContainer />
    </Container>
  );
}
