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

// Admin hierarchy configuration
const adminHierarchy = {
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

// Mock divisions and districts (replace with API data)
const divisions = [
  { id: 1, name: "Jammu" },
  { id: 2, name: "Kashmir" },
];

const districts = [
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
    formState: { errors },
  } = useForm({
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
    },
  });
  const [currentAdminLevel, setCurrentAdminLevel] = useState("");
  const [currentAdminDivision, setCurrentAdminDivision] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [department, setDepartment] = useState(0);

  const selectedRole = watch("role");
  const selectedDivision = watch("division");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(
          "/Admin/GetCurrentAdminDetails",
        );
        if (!response.data || !response.data.additionalDetails) {
          throw new Error("Admin data is missing");
        }

        const details = JSON.parse(response.data.additionalDetails);
        if (!details || !details.AccessLevel) {
          throw new Error("Invalid admin details");
        }

        setCurrentAdminLevel(details.AccessLevel);
        if (details.DivisionId) {
          setCurrentAdminDivision(details.DivisionId);
        }

        if (adminHierarchy[details.AccessLevel]) {
          setAvailableRoles(adminHierarchy[details.AccessLevel].roles);
        }

        setDepartment(details.Department || 0);
        setFilteredDistricts(response.data.districts || districts);
      } catch (error) {
        setErrorMessage(`Error loading admin data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRole === "District Admin" && selectedDivision) {
      setFilteredDistricts(
        districts.filter((d) => d.divisionId === parseInt(selectedDivision)),
      );
      setValue("district", "");
    }
  }, [selectedDivision, selectedRole, setValue]);

  const onSubmit = async (data) => {
    const selectedRoleObj = availableRoles.find((r) => r.Role === data.role);
    if (!selectedRoleObj) {
      setErrorMessage("Invalid role selected");
      return;
    }

    const additionalDetails = {
      Role: selectedRoleObj.Role,
      RoleShort: selectedRoleObj.RoleShort,
      AccessLevel: selectedRoleObj.AccessLevel,
      AccessCode: data.district || data.division || selectedRoleObj.AccessCode,
      Department: department,
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
        setErrorMessage("");
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
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Name"
                    variant="outlined"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.name ? "true" : "false"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="username"
                control={control}
                rules={{ required: "Username is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Username"
                    variant="outlined"
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.username ? "true" : "false"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                rules={{
                  required: "Email is required",
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: "Invalid email format",
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email"
                    type="email"
                    variant="outlined"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.email ? "true" : "false"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="password"
                control={control}
                rules={{ required: "Password is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Password"
                    type="password"
                    variant="outlined"
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.password ? "true" : "false"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="mobileNumber"
                control={control}
                rules={{ required: "Mobile number is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Mobile Number"
                    variant="outlined"
                    error={!!errors.mobileNumber}
                    helperText={errors.mobileNumber?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.mobileNumber ? "true" : "false"}
                  />
                )}
              />
            </Grid>
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
                    <InputLabel shrink>Role</InputLabel>
                    <Select {...field} label="Role">
                      <MenuItem value="">Select Role</MenuItem>
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
            {selectedRole === "Division Admin" &&
              currentAdminLevel === "State" && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="division"
                    control={control}
                    rules={{ required: "Division is required" }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        variant="outlined"
                        error={!!errors.division}
                      >
                        <InputLabel shrink>Division</InputLabel>
                        <Select {...field} label="Division">
                          <MenuItem value="">Select Division</MenuItem>
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
                      <InputLabel shrink>District</InputLabel>
                      <Select {...field} label="District">
                        <MenuItem value="">Select District</MenuItem>
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
              >
                Create Admin
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
    </Container>
  );
}
