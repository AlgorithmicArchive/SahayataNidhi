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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  Paper,
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
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    withheldType: "",
    withheldReason: "",
    isWithheld: true,
  });
  const [applicantDetails, setApplicantDetails] = useState(null);
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
    setSuccessMessage("");
    setLoading(true);
    setHasChecked(false);
    setCanCreate(false);
    setApplicantDetails(null);

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
        setApplicantDetails({
          name: res.data.application.applicantName || "N/A",
          email: res.data.application.parentage || "N/A",
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
          }
        );
      } else {
        res = await axiosInstance.post(
          "/Officer/CreateWithheldApplication",
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      }

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
      setApplicantDetails(null);
      setError("");

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save application");
    }
  };

  const formControlStyles = {
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "divider" },
      "&:hover fieldset": { borderColor: "primary.main" },
      "&.Mui-focused fieldset": {
        borderColor: "primary.main",
        borderWidth: "2px",
      },
      backgroundColor: "background.paper",
      color: "text.primary",
      borderRadius: 1,
    },
    "& .MuiInputLabel-root": {
      color: "text.secondary",
      "&.Mui-focused": { color: "primary.main" },
    },
    marginBottom: 2,
  };

  const buttonStyles = {
    backgroundColor: "primary.main",
    color: "background.paper",
    fontWeight: 600,
    textTransform: "none",
    py: 1,
    px: 3,
    borderRadius: 2,
    "&:hover": {
      backgroundColor: "primary.dark",
      transform: "scale(1.02)",
      transition: "all 0.2s ease",
    },
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 700,
        mx: "auto",
        minHeight: "100vh",
        bgcolor: "background.default",
        borderRadius: 3,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontFamily: "'Playfair Display', serif",
          color: "primary.main",
          mb: 3,
          fontWeight: 700,
        }}
      >
        Withheld Application Management
      </Typography>

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl fullWidth sx={formControlStyles}>
          <ServiceSelectionForm
            services={services}
            value={serviceId}
            onServiceSelect={(id) => setServiceId(id)}
          />
          {!serviceId && error.includes("Service") && (
            <FormHelperText error>Please select a service</FormHelperText>
          )}
        </FormControl>

        <TextField
          fullWidth
          label="Reference Number"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          sx={formControlStyles}
          error={!referenceNumber && error.includes("Reference Number")}
          helperText={
            !referenceNumber && error.includes("Reference Number")
              ? "Please enter a reference number"
              : ""
          }
        />

        <Button
          variant="contained"
          sx={buttonStyles}
          onClick={handleCheck}
          disabled={loading}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? "Checking..." : "Check Application"}
        </Button>

        {hasChecked && canCreate && (
          <Paper
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 2,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}
            >
              {recordExists
                ? "Update Withheld Application"
                : "Create New Withheld Application"}
            </Typography>

            {applicantDetails && (
              <Box sx={{ mb: 3, p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Applicant Details
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {applicantDetails.name}
                </Typography>
                <Typography variant="body2">
                  <strong>Parentage:</strong> {applicantDetails.parentage}
                </Typography>
              </Box>
            )}

            <FormControl fullWidth sx={formControlStyles}>
              <InputLabel id="withheld-type-label">Withheld Type</InputLabel>
              <Select
                labelId="withheld-type-label"
                label="Withheld Type"
                value={formData.withheldType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    withheldType: e.target.value,
                  }))
                }
              >
                <MenuItem value="Permanent">Permanent</MenuItem>
                {(formData.withheldType === "Temporary" ||
                  (formData.withheldType === "Permanent" &&
                    canPermanentToTemporary)) && (
                  <MenuItem value="Temporary">Temporary</MenuItem>
                )}
              </Select>
            </FormControl>

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
              sx={formControlStyles}
            />

            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: "text.primary" }}
              >
                Is Withheld
              </Typography>
              <RadioGroup
                row
                value={formData.isWithheld.toString()}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isWithheld: e.target.value === "true",
                  }))
                }
              >
                <FormControlLabel
                  value="true"
                  control={<Radio />}
                  label="Yes"
                />
                <FormControlLabel
                  value="false"
                  control={<Radio />}
                  label="No"
                />
              </RadioGroup>
            </FormControl>

            <Button
              variant="contained"
              sx={buttonStyles}
              onClick={handleSave}
              disabled={loading}
            >
              {recordExists ? "Update Application" : "Submit Application"}
            </Button>
          </Paper>
        )}
      </Box>
    </Box>
  );
}