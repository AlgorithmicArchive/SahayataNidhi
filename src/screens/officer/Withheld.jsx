import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  FormHelperText,
  MenuItem,
  Alert,
} from "@mui/material";
import ServiceSelectionForm from "../../components/ServiceSelectionForm";
import { fetchServiceList } from "../../assets/fetch";
import axiosInstance from "../../axiosConfig";

export default function Withheld() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(""); // NEW: For success message
  const [formData, setFormData] = useState({
    withheldType: "",
    withheldReason: "",
    isWithheld: true,
  });
  const [recordExists, setRecordExists] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canPermanentToTemporary, setCanPermanentToTemporary] = useState(true);

  useEffect(() => {
    fetchServiceList(setServices);
  }, []);

  const handleCheck = async () => {
    if (!referenceNumber || !serviceId) {
      setError("Please enter Reference Number and select a Service.");
      return;
    }
    setError("");
    setSuccessMessage(""); // Clear success message on new check
    setLoading(true);
    setHasChecked(false);
    setCanCreate(false);

    try {
      const res = await axiosInstance.get("/Officer/GetWithheldApplication", {
        params: { referenceNumber, serviceId },
      });

      if (res.data?.status && res.data.application) {
        setRecordExists(true);
        setFormData({
          withheldType: res.data.application.withheldType,
          withheldReason: res.data.application.withheldReason,
          isWithheld: res.data.application.isWithheld,
        });
        setCanPermanentToTemporary(res.data.canPermanentToTemporary);
        setCanCreate(true);
        setHasChecked(true);
      } else if (
        !res.data.status &&
        res.data.response === "Application not found."
      ) {
        setError(res.data.response);
        setRecordExists(false);
        setCanCreate(false);
        setHasChecked(false);
      } else if (
        !res.data.status &&
        res.data.response ===
          "Application is not sactioned can't withheld the application."
      ) {
        setError(res.data.response);
        setRecordExists(false);
        setCanCreate(false);
        setHasChecked(false);
      } else {
        setRecordExists(false);
        setFormData({
          withheldType: "",
          withheldReason: "",
          isWithheld: true,
        });
        setCanCreate(true);
        setHasChecked(true);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch details.");
      setCanCreate(false);
      setHasChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const form = new FormData();
      form.append("ServiceId", serviceId);
      form.append("ReferenceNumber", referenceNumber);
      form.append("IsWithheld", formData.isWithheld.toString());
      form.append("WithheldType", formData.withheldType);
      form.append("WithheldReason", formData.withheldReason);

      let res;
      if (recordExists) {
        res = await axiosInstance.put(
          "/Officer/UpdateWithheldApplication",
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      } else {
        res = await axiosInstance.post(
          "/Officer/CreateWithheldApplication",
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      }

      // Set success message and clear the page
      setSuccessMessage(res.data.message);
      setServiceId("");
      setReferenceNumber("");
      setFormData({
        withheldType: "",
        withheldReason: "",
        isWithheld: true,
      });
      setRecordExists(false);
      setHasChecked(false);
      setCanCreate(false);
      setError("");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save application");
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: "auto", height: "100vh" }}>
      <Typography variant="h5" mb={3}>
        Check / Edit Withheld Application
      </Typography>

      {/* Success message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Service Selector */}
      <ServiceSelectionForm
        services={services}
        value={serviceId}
        onServiceSelect={(id) => setServiceId(id)}
      />
      {error && !serviceId && (
        <FormHelperText error>Please select a service</FormHelperText>
      )}

      {/* Reference Number */}
      <TextField
        fullWidth
        label="Reference Number"
        value={referenceNumber}
        onChange={(e) => setReferenceNumber(e.target.value)}
        sx={{ mt: 2 }}
      />
      {error && !referenceNumber && (
        <FormHelperText error>Please enter a reference number</FormHelperText>
      )}

      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={handleCheck}
        disabled={loading}
      >
        {loading ? <CircularProgress size={20} /> : "Check Application"}
      </Button>

      {/* Display error message if application cannot be withheld */}
      {error && !canCreate && !successMessage && (
        <FormHelperText error sx={{ mt: 2 }}>
          {error}
        </FormHelperText>
      )}

      {/* Editable Form - Only shown if canCreate is true */}
      {hasChecked && canCreate && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" mb={2}>
            {recordExists
              ? "Update Withheld Application"
              : "Create New Withheld Application"}
          </Typography>

          {/* Withheld Type */}
          <TextField
            select
            label="Withheld Type"
            fullWidth
            value={formData.withheldType}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, withheldType: e.target.value }))
            }
            sx={{ mb: 2 }}
          >
            <MenuItem value="Permanent">Permanent</MenuItem>
            {(formData.withheldType === "Temporary" ||
              (formData.withheldType === "Permanent" &&
                canPermanentToTemporary)) && (
              <MenuItem value="Temporary">Temporary</MenuItem>
            )}
          </TextField>

          {/* Withheld Reason */}
          <TextField
            label="Withheld Reason"
            fullWidth
            multiline
            rows={3}
            value={formData.withheldReason}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                withheldReason: e.target.value,
              }))
            }
            sx={{ mb: 2 }}
          />

          {/* Is Withheld */}
          <TextField
            select
            label="Is Withheld"
            fullWidth
            value={formData.isWithheld}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isWithheld: e.target.value === "true",
              }))
            }
            sx={{ mb: 2 }}
          >
            <MenuItem value="true">True</MenuItem>
            <MenuItem value="false">False</MenuItem>
          </TextField>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {recordExists ? "Update Application" : "Submit Application"}
          </Button>
        </Box>
      )}
    </Box>
  );
}
