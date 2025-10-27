import React, { useEffect, useState, useContext, useMemo } from "react";
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
  Modal,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import axiosInstance from "../../axiosConfig";
import MessageModal from "../../components/MessageModal";
import ServerSideTable from "../../components/ServerSideTable";
import { UserContext } from "../../UserContext";

export default function AddDesignations() {
  const { userType, officerAuthorities } = useContext(UserContext);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
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
  const [modalMessage, setModalMessage] = useState({
    title: "",
    message: "",
    type: "success",
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState(null);
  const [refreshTable, setRefreshTable] = useState(false);

  // Check if user has permission to update/delete
  const canModifyDesignations = useMemo(() => {
    return (
      officerAuthorities?.canDirectWithhold ||
      userType === "SeniorOfficer" ||
      userType === "Admin"
    );
  }, [userType, officerAuthorities]);

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

  // Reset form when edit modal closes
  useEffect(() => {
    if (!editModalOpen) {
      reset({ designation: "", designationShort: "", accessLevel: "" });
      setEditingDesignation(null);
    }
  }, [editModalOpen, reset]);

  // Handle form submission for adding a designation
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
        setModalMessage({
          title: "Add Designation",
          message: "Designation Added Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        reset();
        setErrorMessage("");
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to add designation: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error creating designation: ${error.message}`);
    }
  };

  // Handle update designation
  const handleUpdate = async (data) => {
    if (!editingDesignation) return;

    try {
      const formData = new FormData();
      formData.append("DesignationId", editingDesignation.designationId);
      formData.append("Designation", data.designation);
      formData.append("DesignationShort", data.designationShort);
      formData.append("AccessLevel", data.accessLevel);
      formData.append("DepartmentId", departmentId.toString());

      const response = await axiosInstance.post(
        "/Admin/UpdateDesignation",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Update Designation",
          message: "Designation Updated Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setEditModalOpen(false);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to update designation: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error updating designation: ${error.message}`);
    }
  };

  // Handle delete designation
  const handleDelete = async (designationId) => {
    if (!window.confirm("Are you sure you want to delete this designation?"))
      return;

    try {
      const formData = new FormData();
      formData.append("DesignationId", designationId);

      const response = await axiosInstance.post(
        "/Admin/DeleteDesignation",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Delete Designation",
          message: "Designation Deleted Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to delete designation: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error deleting designation: ${error.message}`);
    }
  };

  // Action functions for ServerSideTable
  const actionFunctions = {
    UpdateDesignation: (row) => {
      if (!canModifyDesignations) {
        setErrorMessage("You do not have permission to update designations.");
        return;
      }
      const userdata = row.original;
      setEditingDesignation(userdata);
      setValue("designation", userdata.designation);
      setValue("designationShort", userdata.designationShort);
      setValue("accessLevel", userdata.accessLevel);
      setEditModalOpen(true);
    },
    DeleteDesignation: (row) => {
      if (!canModifyDesignations) {
        setErrorMessage("You do not have permission to delete designations.");
        return;
      }
      handleDelete(row.original.designationId);
    },
  };

  // Table columns
  const columns = [
    { field: "designationId", headerName: "ID", flex: 1 },
    { field: "designation", headerName: "Designation", flex: 1 },
    { field: "designationShort", headerName: "Short Name", flex: 1 },
    { field: "accessLevel", headerName: "Access Level", flex: 1 },
  ];

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

  if (errorMessage && !editModalOpen) {
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
                    <Select
                      {...field}
                      label="Access Level"
                      aria-label="Select Access Level"
                    >
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
                disabled={!canModifyDesignations}
                aria-label="Add Designation"
              >
                Add Designation
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>

      <ServerSideTable
        url="/Admin/GetDesignations"
        Title="Existing Designations"
        extraParams={{}}
        canSanction={false}
        canHavePool={false}
        pendingApplications={false}
        actionFunctions={actionFunctions}
        columns={columns}
        refresh={refreshTable}
        onAction={(actionFunction, row) => actionFunctions[actionFunction](row)}
      />

      <MessageModal
        title={modalMessage.title}
        message={modalMessage.message}
        type={modalMessage.type}
        key="designationAction"
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      />

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Box
          sx={{
            bgcolor: "white",
            p: 4,
            borderRadius: 2,
            maxWidth: 600,
            mx: "auto",
            mt: "5%",
            boxShadow: 24,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Edit Designation
          </Typography>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}
          <form onSubmit={handleSubmit(handleUpdate)}>
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
                      <Select
                        {...field}
                        label="Access Level"
                        aria-label="Select Access Level"
                      >
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
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    mt: 3,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setEditModalOpen(false)}
                    aria-label="Cancel Edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    aria-label="Update Designation"
                  >
                    Update
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Modal>
    </Container>
  );
}
