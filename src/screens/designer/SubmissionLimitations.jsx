import React, { useState, useEffect, useContext } from "react";
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../axiosConfig";
import { UserContext } from "../../UserContext";

export default function SubmissionLimitations() {
  const { userType, officerAuthorities } = useContext(UserContext);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [config, setConfig] = useState({
    isLimited: false,
    limitType: "",
    limitCount: 0,
  });
  const [isFetchingServices, setIsFetchingServices] = useState(false);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Log UserContext values for debugging
  useEffect(() => {
    console.log("UserContext Values:", { userType, officerAuthorities });
  }, [userType, officerAuthorities]);

  // Determine permissions from UserContext
  const canSaveConfig = userType === "Designer";

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      setIsFetchingServices(true);
      setFetchError("");
      try {
        const response = await axiosInstance.get("/Base/GetServices");
        if (response.data.status && Array.isArray(response.data.services)) {
          setServices(response.data.services);
        } else {
          setServices([]);
          setFetchError("No services found.");
          toast.error("No services found.");
        }
      } catch (error) {
        console.error("Error fetching services:", error);
        setFetchError("Failed to load services.");
        toast.error("Failed to load services.");
      } finally {
        setIsFetchingServices(false);
      }
    };

    fetchServices();
  }, []);

  // Fetch SubmissionLimitConfig when service is selected
  useEffect(() => {
    if (!selectedServiceId) {
      setConfig({ isLimited: false, limitType: "", limitCount: 0 });
      setFetchError("");
      return;
    }

    const fetchConfig = async () => {
      setIsFetchingConfig(true);
      setFetchError("");
      try {
        const response = await axiosInstance.get("/Designer/GetServiceConfig", {
          params: { serviceId: selectedServiceId },
        });
        if (response.data.status && response.data.config) {
          setConfig(response.data.config);
          toast.success("Configuration loaded successfully.");
        } else {
          setConfig({ isLimited: false, limitType: "", limitCount: 0 });
          toast.info("No existing configuration found for this service.");
        }
      } catch (error) {
        console.error("Error fetching configuration:", error);
        setConfig({ isLimited: false, limitType: "", limitCount: 0 });
        setFetchError("Failed to load configuration.");
        toast.error("Failed to load configuration.");
      } finally {
        setIsFetchingConfig(false);
      }
    };

    fetchConfig();
  }, [selectedServiceId]);

  const handleConfigChange = (field, value) => {
    setConfig((prev) => {
      const newConfig = { ...prev, [field]: value };
      // Reset limitType and limitCount if isLimited is false
      if (field === "isLimited" && !value) {
        return { ...newConfig, limitType: "", limitCount: 0 };
      }
      return newConfig;
    });
  };

  const handleSaveConfig = async () => {
    if (!selectedServiceId) {
      toast.error("Please select a service.");
      return;
    }

    if (config.isLimited && (!config.limitType || config.limitCount <= 0)) {
      toast.error("Please select a valid limit type and count.");
      return;
    }

    setIsSaving(true);
    const formData = new FormData();
    formData.append("serviceId", selectedServiceId);
    formData.append("SubmissionLimitConfig", JSON.stringify(config));

    try {
      const response = await axiosInstance.post(
        "/Designer/SaveServiceConfig",
        formData,
      );
      if (response.data.status) {
        toast.success("Configuration saved successfully!");
      } else {
        toast.error(
          "Failed to save configuration: " +
            (response.data.message || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("An error occurred while saving the configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      <Container
        maxWidth="md"
        sx={{
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 3,
          p: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: "grey.800", mb: 4, fontWeight: "bold" }}
        >
          Configure Submission Limits
        </Typography>

        {isFetchingServices ? (
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <CircularProgress size={20} sx={{ mr: 2 }} />
            <Typography variant="body2">Loading services...</Typography>
          </Box>
        ) : fetchError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {fetchError}
          </Alert>
        ) : (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="service-select-label">Select Service</InputLabel>
            <Select
              labelId="service-select-label"
              value={selectedServiceId}
              label="Select Service"
              onChange={(e) => setSelectedServiceId(e.target.value)}
            >
              <MenuItem value="" disabled>
                Select a Service
              </MenuItem>
              {services.length > 0 ? (
                services.map((service) => (
                  <MenuItem key={service.serviceId} value={service.serviceId}>
                    {service.serviceName}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No services available</MenuItem>
              )}
            </Select>
          </FormControl>
        )}

        {selectedServiceId && (
          <>
            {isFetchingConfig ? (
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography variant="body2">
                  Loading configuration...
                </Typography>
              </Box>
            ) : fetchError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {fetchError}
              </Alert>
            ) : (
              <>
                {selectedServiceId && !canSaveConfig && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    You do not have permission to configure submission limits.
                    Please contact an administrator or log in as a Senior
                    Officer.
                  </Alert>
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.isLimited}
                      onChange={(e) =>
                        handleConfigChange("isLimited", e.target.checked)
                      }
                      disabled={!canSaveConfig}
                    />
                  }
                  label="Enable Submission Limits"
                  sx={{ mb: 2 }}
                />
                {config.isLimited && (
                  <>
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel id="limit-type-select-label">
                        Limit Type
                      </InputLabel>
                      <Select
                        labelId="limit-type-select-label"
                        value={config.limitType}
                        label="Limit Type"
                        onChange={(e) =>
                          handleConfigChange("limitType", e.target.value)
                        }
                        disabled={!canSaveConfig}
                      >
                        <MenuItem value="" disabled>
                          Select Limit Type
                        </MenuItem>
                        <MenuItem value="All Time">All Time</MenuItem>
                        <MenuItem value="Yearly">Yearly</MenuItem>
                        <MenuItem value="Monthly">Monthly</MenuItem>
                        <MenuItem value="Weekly">Weekly</MenuItem>
                        <MenuItem value="Daily">Daily</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="Limit Count"
                      type="number"
                      value={config.limitCount}
                      onChange={(e) =>
                        handleConfigChange(
                          "limitCount",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      fullWidth
                      variant="outlined"
                      sx={{ mb: 3 }}
                      inputProps={{ min: 0 }}
                      disabled={!canSaveConfig}
                    />
                  </>
                )}
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSaveConfig}
                  disabled={isSaving || !canSaveConfig || !selectedServiceId}
                  sx={{ mt: 2 }}
                >
                  {isSaving ? (
                    <CircularProgress size={24} />
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
              </>
            )}
          </>
        )}

        <ToastContainer position="top-right" autoClose={3000} />
      </Container>
    </Box>
  );
}
