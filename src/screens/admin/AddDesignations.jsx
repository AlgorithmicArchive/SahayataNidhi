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
import ServerSideTable from "../../components/ServerSideTable";

export default function AddDesignations() {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      designation: "",
      designationShort: "",
      accessLevel: "",
    },
  });
  const [departmentId, setDepartmentId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Fetch current officer's details to get DepartmentId
  useEffect(() => {
    const fetchOfficerDetails = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get(
          "/Admin/GetCurrentAdminDetails",
        );
        if (!response.data || !response.data.additionalDetails) {
          throw new Error("Officer data is missing");
        }

        const details = JSON.parse(response.data.additionalDetails);
        if (!details || !details.Department) {
          throw new Error("Invalid officer details");
        }

        setDepartmentId(details.Department);
      } catch (error) {
        setErrorMessage(`Error loading officer data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOfficerDetails();
  }, []);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("Designation", data.designation);
      formData.append("DesignationShort", data.designationShort);
      formData.append("AccessLevel", data.accessLevel);
      formData.append("DepartmentId", departmentId.toString());

      const response = await axiosInstance.post(
        "/Admin/AddDesignation",
        formData,
      );

      if (response.data.status) {
        setShowMessageModal(true);
        reset();
        setErrorMessage("");
      }
    } catch (error) {
      setErrorMessage(`Error creating designation: ${error.message}`);
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
          Add New Designation
        </Typography>
        <Alert severity="error" sx={{ mb: 4 }}>
          {errorMessage}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Add New Designation
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
          mb: 6,
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Controller
                name="designation"
                control={control}
                rules={{ required: "Designation is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Designation"
                    variant="outlined"
                    error={!!errors.designation}
                    helperText={errors.designation?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.designation ? "true" : "false"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="designationShort"
                control={control}
                rules={{ required: "Short name is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Short Name"
                    variant="outlined"
                    error={!!errors.designationShort}
                    helperText={errors.designationShort?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.designationShort ? "true" : "false"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="accessLevel"
                control={control}
                rules={{ required: "Access level is required" }}
                render={({ field }) => (
                  <FormControl
                    fullWidth
                    variant="outlined"
                    error={!!errors.accessLevel}
                  >
                    <InputLabel shrink>Access Level</InputLabel>
                    <Select {...field} label="Access Level">
                      <MenuItem value="">Select Access Level</MenuItem>
                      <MenuItem value="State">State</MenuItem>
                      <MenuItem value="Division">Division</MenuItem>
                      <MenuItem value="District">District</MenuItem>
                      <MenuItem value="Tehsil">Tehsil</MenuItem>
                    </Select>
                    {errors.accessLevel && (
                      <Typography color="error" variant="caption">
                        {errors.accessLevel.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3, py: 1.5, fontSize: "1.1rem" }}
              >
                Add Designation
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>
      <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
        Existing Designations
      </Typography>
      <ServerSideTable
        url="/Admin/GetDesignations"
        Title="Designations"
        extraParams={{}}
        canSanction={false}
        canHavePool={false}
        pendingApplications={false}
      />
      <MessageModal
        title="Add Designation"
        message="Designation Added Successfully."
        type="success"
        key="addDesignation"
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      />
    </Container>
  );
}
