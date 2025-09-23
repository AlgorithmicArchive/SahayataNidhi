import {
  Box,
  TextField,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Row, Col } from "react-bootstrap";
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast, ToastContainer } from "react-toastify";
import axiosInstance from "../../axiosConfig";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export default function EmailManager() {
  const [tabValue, setTabValue] = useState(0);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Dynamic Email Template Generator Component
  const DynamicEmailTemplateGenerator = () => {
    const [services, setServices] = useState([]);
    const [formFields, setFormFields] = useState([]);
    const [serviceDetails, setServiceDetails] = useState({});
    const [selectedServiceId, setSelectedServiceId] = useState("");
    const [selectedLetterType, setSelectedLetterType] = useState("");
    const [template, setTemplate] = useState("");
    const [htmlOutput, setHtmlOutput] = useState("");

    // Dummy data for preview (replace with actual API data if available)
    const dummyServiceDetails = {};

    // Fetch services
    useEffect(() => {
      const fetchServices = async () => {
        try {
          const response = await axiosInstance.get("/Base/GetServices");
          if (response.data.status && response.data.services) {
            setServices(response.data.services);
          } else {
            toast.error("No services found.");
          }
        } catch (error) {
          console.error("Error fetching services:", error);
          toast.error("Failed to load services.");
        }
      };

      fetchServices();
    }, []);

    // Fetch form fields and email template when service or letter type changes
    useEffect(() => {
      if (!selectedServiceId) {
        setFormFields([]);
        setServiceDetails({});
        setSelectedLetterType("");
        setTemplate("");
        setHtmlOutput("");
        return;
      }

      const fetchFormFields = async () => {
        try {
          const response = await axiosInstance.get(
            "/Designer/GetFormElementsForEmail",
            {
              params: { serviceId: selectedServiceId },
            },
          );
          setFormFields(response.data.names || []);
        } catch (error) {
          console.error("Error fetching form fields:", error);
          toast.error("Failed to load form fields.");
        }
      };

      const fetchEmailTemplate = async () => {
        if (!selectedLetterType) {
          setTemplate("");
          setHtmlOutput("");
          return;
        }
        try {
          const response = await axiosInstance.get(
            "/Designer/GetEmailTemplate",
            {
              params: {
                serviceId: selectedServiceId,
                type: selectedLetterType,
              },
            },
          );
          if (response.data.status) {
            setTemplate(response.data.template || "");
            toast.success("Email template loaded successfully.");
          } else {
            setTemplate("");
            toast.info("No existing template found for this service and type.");
          }
        } catch (error) {
          console.error("Error fetching email template:", error);
          setTemplate("");
          toast.error("Failed to load email template.");
        }
      };

      fetchFormFields();
      setServiceDetails(dummyServiceDetails); // Replace with actual API if available
      if (selectedLetterType) {
        fetchEmailTemplate();
      }
    }, [selectedServiceId, selectedLetterType]);

    const insertVariable = (variable) => {
      const quillEditor = document.querySelector(".ql-editor");
      const cursorPosition = quillEditor?.selectionStart || template.length;
      setTemplate((prev) => {
        return (
          prev.slice(0, cursorPosition) +
          `{${variable}}` +
          prev.slice(cursorPosition)
        );
      });
    };

    const handleTemplateChange = (content) => {
      setTemplate(content);
    };

    const generateEmailHtml = () => {
      let output = template;
      const allVariables = [...formFields, ...Object.keys(serviceDetails)];
      allVariables.forEach((variable) => {
        output = output.replace(
          new RegExp(`{${variable}}`, "g"),
          dummyServiceDetails[variable] || `{${variable}}`,
        );
      });
      const currentDate = new Date("2025-07-15T13:41:00+05:30");
      const formattedDate = currentDate.toLocaleString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
      output = output.replace(new RegExp("{Date}", "g"), formattedDate);

      const html = `
        <div style='font-family: Arial, sans-serif;'>
          ${output}
          <br />
          <p style='font-size: 12px; color: #888;'>Thank you,<br />Your Application Team</p>
        </div>
      `;
      setHtmlOutput(html);
      toast.success("Email template updated!");
    };

    const handleSaveTemplate = async () => {
      if (!selectedServiceId || !selectedLetterType || !template) {
        toast.error(
          "Please select a service, email type, and enter a template.",
        );
        return;
      }

      const formData = new FormData();
      formData.append("serviceId", selectedServiceId);
      formData.append("type", selectedLetterType);
      formData.append("template", template);

      try {
        const response = await axiosInstance.post(
          "/Designer/SaveEmailTemplate",
          formData,
        );
        if (response.data.status) {
          toast.success("Email template saved successfully!");
        } else {
          toast.error("Failed to save email template.");
        }
      } catch (error) {
        console.error("Error saving email template:", error);
        toast.error("An error occurred while saving the email template.");
      }
    };

    return (
      <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: "bold", color: "primary.main", mb: 3 }}
        >
          Dynamic Email Template Generator
        </Typography>
        <Row>
          <Col md={6}>
            <FormControl fullWidth sx={{ mb: 2 }}>
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
                {services.map((service) => (
                  <MenuItem key={service.serviceId} value={service.serviceId}>
                    {service.serviceName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="letter-type-select-label">
                Select Email Type
              </InputLabel>
              <Select
                labelId="letter-type-select-label"
                value={selectedLetterType}
                label="Select Email Type"
                onChange={(e) => setSelectedLetterType(e.target.value)}
                disabled={!selectedServiceId}
              >
                <MenuItem value="" disabled>
                  Select an Email Type
                </MenuItem>
                <MenuItem value="Submission">Application Submission</MenuItem>
                <MenuItem value="OfficerAction">Officer Action</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Template (Use formatting and insert variables like{" "}
                {"{FirstName}"}, {"{OfficerRole}"}, {"{Date}"})
              </Typography>
              <ReactQuill
                value={template}
                onChange={handleTemplateChange}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link"],
                  ],
                }}
                formats={[
                  "header",
                  "bold",
                  "italic",
                  "underline",
                  "strike",
                  "list",
                  "bullet",
                  "link",
                ]}
                style={{
                  height: "300px",
                  marginBottom: "16px",
                  backgroundColor: "#f5f5f5",
                }}
                readOnly={!selectedServiceId || !selectedLetterType}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Insert Variable
              </Typography>
              <Select
                value=""
                onChange={(e) => insertVariable(e.target.value)}
                displayEmpty
                disabled={!selectedServiceId || !selectedLetterType}
                sx={{ mr: 2 }}
              >
                <MenuItem value="" disabled>
                  Select Variable
                </MenuItem>
                {[...formFields, ...Object.keys(serviceDetails), "Date"].map(
                  (field) => (
                    <MenuItem key={field} value={field}>
                      {field}
                    </MenuItem>
                  ),
                )}
              </Select>
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={generateEmailHtml}
                disabled={!selectedServiceId || !selectedLetterType}
              >
                Generate Email
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleSaveTemplate}
                disabled={!selectedServiceId || !selectedLetterType}
              >
                Save Template
              </Button>
            </Box>
          </Col>
          <Col md={6}>
            <Typography
              variant="h5"
              sx={{ color: "grey.800", mb: 2, fontWeight: "bold" }}
            >
              Email Preview
            </Typography>
            {htmlOutput ? (
              <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: "#f5f5f5" }}>
                <div dangerouslySetInnerHTML={{ __html: htmlOutput }} />
              </Paper>
            ) : (
              <Typography variant="body1" sx={{ color: "grey.600", mt: 2 }}>
                Edit the template to preview the email.
              </Typography>
            )}
            {htmlOutput && (
              <>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Generated HTML
                </Typography>
                <Paper elevation={1} sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: "14px" }}>
                    {htmlOutput}
                  </pre>
                </Paper>
              </>
            )}
          </Col>
        </Row>
      </Box>
    );
  };

  // Email Settings Component
  const EmailSettings = () => {
    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm({
      defaultValues: {
        SenderName: "Social Welfare Department",
        SenderEmail: "websiterandom24@gmail.com",
        SmtpServer: "smtp.gmail.com",
        SmtpPort: 587,
        Password: "uuku vmsm auwi livn",
      },
      mode: "onChange",
    });

    const onSubmit = (data) => {
      try {
        sessionStorage.setItem("emailSettings", JSON.stringify(data));
        toast.success("Settings saved successfully!");
      } catch (error) {
        toast.error("An error occurred while saving settings.");
        console.error(error);
      }
    };

    return (
      <Box sx={{ p: 4, maxWidth: 500, mx: "auto" }}>
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: "bold", color: "primary.main", mb: 3 }}
        >
          Email Settings
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Controller
            name="SenderName"
            control={control}
            rules={{ required: "Sender Name is required" }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Sender Name"
                variant="outlined"
                fullWidth
                error={!!errors.SenderName}
                helperText={errors.SenderName?.message}
              />
            )}
          />
          <Controller
            name="SenderEmail"
            control={control}
            rules={{
              required: "Sender Email is required",
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: "Invalid email address",
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Sender Email"
                type="email"
                variant="outlined"
                fullWidth
                error={!!errors.SenderEmail}
                helperText={errors.SenderEmail?.message}
              />
            )}
          />
          <Controller
            name="SmtpServer"
            control={control}
            rules={{ required: "SMTP Server is required" }}
            render={({ field }) => (
              <TextField
                {...field}
                label="SMTP Server"
                variant="outlined"
                fullWidth
                error={!!errors.SmtpServer}
                helperText={errors.SmtpServer?.message}
              />
            )}
          />
          <Controller
            name="SmtpPort"
            control={control}
            rules={{
              required: "SMTP Port is required",
              min: { value: 1, message: "Port must be greater than 0" },
              max: { value: 65535, message: "Port must be less than 65536" },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="SMTP Port"
                type="number"
                variant="outlined"
                fullWidth
                error={!!errors.SmtpPort}
                helperText={errors.SmtpPort?.message}
              />
            )}
          />
          <Controller
            name="Password"
            control={control}
            rules={{ required: "Password is required" }}
            render={({ field }) => (
              <TextField
                {...field}
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                error={!!errors.Password}
                helperText={errors.Password?.message}
              />
            )}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            sx={{ mt: 2, py: 1.5, fontWeight: "medium" }}
          >
            Save Settings
          </Button>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "grey.100", p: 2 }}>
      <Tabs value={tabValue} onChange={handleTabChange} centered sx={{ mb: 2 }}>
        <Tab label="Email Template Generator" />
        <Tab label="Email Settings" />
      </Tabs>
      {tabValue === 0 && <DynamicEmailTemplateGenerator />}
      {tabValue === 1 && <EmailSettings />}
      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
}
