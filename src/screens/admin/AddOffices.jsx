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

export default function AddOffices() {
  const { userType, officerAuthorities } = useContext(UserContext);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      officeType: "",
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
  const [editingOffice, setEditingOffice] = useState(null);
  const [refreshTable, setRefreshTable] = useState(false);

  // Check if user has permission to update/delete
  const canModifyOffices = useMemo(() => {
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
      reset({ officeType: "", accessLevel: "" });
      setEditingOffice(null);
    }
  }, [editModalOpen, reset]);

  // Handle form submission for adding an office
  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("OfficeType", data.officeType);
      formData.append("AccessLevel", data.accessLevel);
      formData.append("DepartmentId", departmentId.toString());

      const response = await axiosInstance.post("/Admin/AddOffice", formData);

      if (response.data.status) {
        setModalMessage({
          title: "Add Office",
          message: "Office Added Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        reset();
        setErrorMessage("");
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to add office: ${response.data.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error creating office: ${error.message}`);
    }
  };

  // Handle update office
  const handleUpdate = async (data) => {
    if (!editingOffice) return;

    try {
      const formData = new FormData();
      formData.append("OfficeId", editingOffice.officeId);
      formData.append("OfficeType", data.officeType);
      formData.append("AccessLevel", data.accessLevel);
      formData.append("DepartmentId", departmentId.toString());

      const response = await axiosInstance.post(
        "/Admin/UpdateOffice",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Update Office",
          message: "Office Updated Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setEditModalOpen(false);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to update office: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error updating office: ${error.message}`);
    }
  };

  // Handle delete office
  const handleDelete = async (officeId) => {
    if (!window.confirm("Are you sure you want to delete this office?")) return;

    try {
      const formData = new FormData();
      formData.append("OfficeId", officeId);

      const response = await axiosInstance.post(
        "/Admin/DeleteOffice",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Delete Office",
          message: "Office Deleted Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to delete office: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error deleting office: ${error.message}`);
    }
  };

  // Action functions for ServerSideTable
  const actionFunctions = {
    UpdateOffice: (row) => {
      if (!canModifyOffices) {
        setErrorMessage("You do not have permission to update offices.");
        return;
      }
      const userdata = row.original;
      setEditingOffice(userdata);
      setValue("officeType", userdata.officeType);
      setValue("accessLevel", userdata.accessLevel);
      setEditModalOpen(true);
    },
    DeleteOffice: (row) => {
      if (!canModifyOffices) {
        setErrorMessage("You do not have permission to delete offices.");
        return;
      }
      handleDelete(row.original.officeId);
    },
  };

  // Table columns
  const columns = [
    { field: "officeId", headerName: "ID", flex: 1 },
    { field: "officeType", headerName: "Office Type", flex: 1 },
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
          Add New Office
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
        Add New Office
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
            <Grid item xs={12} sm={6}>
              <Controller
                name="officeType"
                control={control}
                rules={{ required: "Office type is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Office Type"
                    variant="outlined"
                    error={!!errors.officeType}
                    helperText={errors.officeType?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.officeType ? "true" : "false"}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
                disabled={!canModifyOffices}
                aria-label="Add Office"
              >
                Add Office
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>

      <ServerSideTable
        url="/Admin/GetOffices"
        Title="Existing Offices"
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
        key="officeAction"
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
            Edit Office
          </Typography>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}
          <form onSubmit={handleSubmit(handleUpdate)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="officeType"
                  control={control}
                  rules={{ required: "Office type is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Office Type"
                      variant="outlined"
                      error={!!errors.officeType}
                      helperText={errors.officeType?.message}
                      InputLabelProps={{ shrink: true }}
                      aria-invalid={errors.officeType ? "true" : "false"}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
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
                    aria-label="Update Office"
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
