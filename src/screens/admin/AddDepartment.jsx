import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  Box,
  Container,
  Grid,
  TextField,
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

export default function AddDepartment() {
  const { userType, officerAuthorities } = useContext(UserContext);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      departmentName: "",
    },
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({
    title: "",
    message: "",
    type: "success",
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [refreshTable, setRefreshTable] = useState(false);

  // Check if user has permission to update/delete
  const canModifyDepartments = useMemo(() => {
    return (
      officerAuthorities?.canDirectWithhold ||
      userType === "SeniorOfficer" ||
      userType === "Admin"
    );
  }, [userType, officerAuthorities]);

  // Fetch initial data
  useEffect(() => {
    setIsLoading(true);
    // Simulate fetching officer details if needed (not required for departments, but kept for consistency)
    setTimeout(() => {
      setIsLoading(false);
    }, 500); // Simulate API call delay
  }, []);

  // Reset form when edit modal closes
  useEffect(() => {
    if (!editModalOpen) {
      reset({ departmentName: "" });
      setEditingDepartment(null);
    }
  }, [editModalOpen, reset]);

  // Handle form submission for adding a department
  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("DepartmentName", data.departmentName);

      const response = await axiosInstance.post(
        "/Admin/AddDepartment",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Add Department",
          message: "Department Added Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        reset();
        setErrorMessage("");
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to add department: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error creating department: ${error.message}`);
    }
  };

  // Handle update department
  const handleUpdate = async (data) => {
    if (!editingDepartment) return;

    try {
      const formData = new FormData();
      formData.append("DepartmentId", editingDepartment.departmentId);
      formData.append("DepartmentName", data.departmentName);

      const response = await axiosInstance.post(
        "/Admin/UpdateDepartment",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Update Department",
          message: "Department Updated Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setEditModalOpen(false);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to update department: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error updating department: ${error.message}`);
    }
  };

  // Handle delete department
  const handleDelete = async (departmentId) => {
    if (!window.confirm("Are you sure you want to delete this department?"))
      return;

    try {
      const formData = new FormData();
      formData.append("DepartmentId", departmentId);

      const response = await axiosInstance.post(
        "/Admin/DeleteDepartment",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Delete Department",
          message: "Department Deleted Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to delete department: ${
            response.data.message || "Unknown error"
          }`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error deleting department: ${error.message}`);
    }
  };

  // Action functions for ServerSideTable
  const actionFunctions = {
    UpdateDepartment: (row) => {
      if (!canModifyDepartments) {
        setErrorMessage("You do not have permission to update departments.");
        return;
      }
      const department = row.original;
      setEditingDepartment(department);
      setValue("departmentName", department.departmentName);
      setEditModalOpen(true);
    },
    DeleteDepartment: (row) => {
      if (!canModifyDepartments) {
        setErrorMessage("You do not have permission to delete departments.");
        return;
      }
      handleDelete(row.original.departmentId);
    },
  };

  // Table columns
  const columns = [
    { field: "departmentId", headerName: "ID", flex: 1 },
    { field: "departmentName", headerName: "Department Name", flex: 1 },
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
          Add New Department
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
        Add New Department
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
            <Grid item xs={12}>
              <Controller
                name="departmentName"
                control={control}
                rules={{ required: "Department name is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Department Name"
                    variant="outlined"
                    error={!!errors.departmentName}
                    helperText={errors.departmentName?.message}
                    InputLabelProps={{ shrink: true }}
                    aria-invalid={errors.departmentName ? "true" : "false"}
                  />
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
                disabled={!canModifyDepartments}
                aria-label="Add Department"
              >
                Add Department
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>

      <ServerSideTable
        url="/Admin/GetDepartments"
        Title="Existing Departments"
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
        key="departmentAction"
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
            Edit Department
          </Typography>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}
          <form onSubmit={handleSubmit(handleUpdate)}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Controller
                  name="departmentName"
                  control={control}
                  rules={{ required: "Department name is required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Department Name"
                      variant="outlined"
                      error={!!errors.departmentName}
                      helperText={errors.departmentName?.message}
                      InputLabelProps={{ shrink: true }}
                      aria-invalid={errors.departmentName ? "true" : "false"}
                    />
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
                    aria-label="Update Department"
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
