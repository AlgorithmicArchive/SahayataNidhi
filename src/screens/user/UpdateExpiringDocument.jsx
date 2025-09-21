import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import axiosInstance from "../../axiosConfig";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
  FormHelperText,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from "@mui/material";
import { styled } from "@mui/system";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  runValidations,
  TransformationFunctionsList,
} from "../../assets/formvalidations";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, parse } from "date-fns";

const StyledContainer = styled(Container)({
  background: "linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)",
  padding: "32px",
  borderRadius: "16px",
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.15)",
  maxWidth: "600px",
  marginTop: "40px",
});

const StyledButton = styled(Button)({
  background: "linear-gradient(45deg, #1976d2 30%, #2196f3 90%)",
  color: "#fff",
  fontWeight: "600",
  padding: "12px 24px",
  borderRadius: "8px",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 4px 15px rgba(25, 118, 210, 0.4)",
  },
  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});

const FileNameTypography = styled(Typography)({
  cursor: "pointer",
  color: "#1976d2",
  "&:hover": {
    textDecoration: "underline",
  },
});

export default function UpdateExpiringDocument() {
  const location = useLocation();
  const navigate = useNavigate();
  const { referenceNumber, ServiceId, applicationId } = location.state || {};
  const [fields, setFields] = React.useState([]);
  const [apiError, setApiError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const fileInputRef = useRef(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
    watch,
    trigger,
    setError,
  } = useForm({
    mode: "onBlur",
    defaultValues: {},
  });

  const kindOfDisability = watch("KindOfDisability");

  const commonStyles = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#FFFFFF",
      borderRadius: "12px",
      transition: "all 0.3s ease",
      "& fieldset": {
        borderColor: "#A5B4FC",
      },
      "&:hover fieldset": {
        borderColor: "#6366F1",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#6366F1",
        boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)",
      },
      "&.Mui-error fieldset": {
        borderColor: "#F43F5E",
      },
    },
    "& .MuiInputLabel-root": {
      color: "#6B7280",
      fontWeight: "500",
      fontSize: "0.9rem",
      "&.Mui-focused": {
        color: "#6366F1",
      },
      "&.Mui-error": {
        color: "#F43F5E",
      },
    },
    "& .MuiInputBase-input": {
      fontSize: "1rem",
      color: "#1F2937",
      padding: "14px 16px",
    },
    "& .MuiFormHelperText-root": {
      color: "#F43F5E",
      fontSize: "0.85rem",
    },
    marginBottom: "1.5rem",
  };

  const buttonStyles = {
    background: "linear-gradient(to right, #10B981, #059669)",
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    "&:hover": {
      background: "linear-gradient(to right, #059669, #047857)",
    },
    "&.Mui-disabled": {
      background: "#D1D5DB",
      color: "#9CA3AF",
    },
    marginBottom: "0.5rem",
  };

  const getLabelWithAsteriskJSX = (field) => {
    const isRequired = field.validationFunctions?.includes("notEmpty");
    return (
      <>
        {field.label}
        {isRequired && (
          <span style={{ color: "#F43F5E", fontSize: "1rem" }}> *</span>
        )}
      </>
    );
  };

  const applyTransformations = (value, transformationFunctions = []) => {
    let transformedValue = value || "";
    for (const transformFn of transformationFunctions) {
      if (TransformationFunctionsList[transformFn]) {
        transformedValue =
          TransformationFunctionsList[transformFn](transformedValue);
      }
    }
    return transformedValue;
  };

  useEffect(() => {
    if (!referenceNumber || !ServiceId) {
      setApiError("Missing reference number or service ID.");
      setIsLoading(false);
      return;
    }

    const fetchFields = async () => {
      try {
        const response = await axiosInstance.get(
          "/User/GetExpiringDocumentDetails",
          {
            params: { ServiceId, referenceNumber },
          },
        );
        const data = response.data;

        if (data.status) {
          const {
            udidCardNumber,
            udidCardIssueDate,
            percentageOfDisability,
            kindOfDisabilityField,
            udidCard,
          } = data.data || {};

          const requiredFields = [
            udidCardNumber,
            udidCardIssueDate,
            percentageOfDisability,
            kindOfDisabilityField,
            udidCard,
          ].filter((field) => field && field.name && field.id);

          if (requiredFields.length === 0) {
            setApiError("No valid form fields were returned by the server.");
            setIsLoading(false);
            return;
          }

          setFields(requiredFields);

          requiredFields.forEach((field) => {
            setValue(field.name, field.type === "enclosure" ? null : "");
          });
        } else {
          setApiError(data.message || "Failed to fetch form fields.");
        }
      } catch (error) {
        console.error("Error fetching form fields:", error);
        setApiError(
          error.response?.data?.message ||
            "An error occurred while fetching form fields.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchFields();
  }, [referenceNumber, ServiceId, setValue]);

  useEffect(() => {
    return () => {
      fields
        .filter((field) => field.type === "enclosure")
        .forEach((field) => {
          const value = getValues(field.name);
          if (value instanceof File) {
            URL.revokeObjectURL(value);
          }
        });
    };
  }, [fields, getValues]);

  const validateUdidNumber = async (udidNumber, referenceNumber) => {
    try {
      const response = await axiosInstance.get("/User/GetIfSameUdidNumber", {
        params: { referenceNumber, udidNumber },
      });
      const data = response.data;
      return data.status
        ? true
        : data.message ||
            "UDID Number doesn't match the existing one in the record.";
    } catch (error) {
      console.error("Error validating UDID number:", error);
      return (
        error.response?.data?.message ||
        "Error validating UDID number. Please try again."
      );
    }
  };

  const handleFileChange = (fieldName, onChange, event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (100kb–200kb) and type (.pdf)
      if (fieldName === "UdidCard") {
        if (file.size < 100 * 1024 || file.size > 200 * 1024) {
          setError(fieldName, {
            type: "manual",
            message: "File size must be between 100kb and 200kb.",
          });
          return;
        }
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          setError(fieldName, {
            type: "manual",
            message: "File must be a PDF.",
          });
          return;
        }
      }
      onChange(file);
      trigger(fieldName);
    }
    event.target.value = "";
  };

  const handleRemoveFile = (fieldName, onChange) => {
    onChange(null);
    trigger(fieldName);
  };

  const handleAddFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onSubmit = async (data) => {
    setApiError("");
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("referenceNumber", referenceNumber);
      formDataToSend.append("ServiceId", ServiceId);

      // Include optional fields
      formDataToSend.append("remarks", data.remarks || "");
      if (applicationId) {
        formDataToSend.append("applicationId", applicationId);
      }

      // Define fields to include based on backend expectation, excluding UdidCardNumber
      const fieldsToCorrect = [
        "UdidCardIssueDate",
        "PercentageOfDisability",
        "KindOfDisability",
        "UdidCard",
      ];

      // Append fields to FormData, respecting KindOfDisability for IfTemporaryDisabilityUdidCardValidUpto
      Object.entries(data).forEach(([key, value]) => {
        if (fieldsToCorrect.includes(key)) {
          if (key === "UdidCard" && value instanceof File) {
            formDataToSend.append(key, value);
          } else if (
            value !== null &&
            value !== "" &&
            value !== "Please Select"
          ) {
            formDataToSend.append(key, value);
          }
        }
      });

      // Conditionally append IfTemporaryDisabilityUdidCardValidUpto only if KindOfDisability is TEMPORARY
      if (kindOfDisability === "TEMPORARY") {
        const tempField = fields.find((f) => f.name === "KindOfDisability")
          ?.additionalFields?.TEMPORARY?.[0];
        if (tempField && data[tempField.name]) {
          formDataToSend.append(tempField.name, data[tempField.name]);
        }
      }

      const response = await axiosInstance.post(
        "/User/UpdateExpiringDocumentDetails",
        formDataToSend,
      );
      const responseData = response.data;

      if (responseData.status) {
        alert("Form submitted successfully!");
        navigate("/user/home");
      } else {
        setApiError(responseData.message || "Failed to submit form.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setApiError(
        error.response?.data?.message ||
          "An error occurred while submitting the form.",
      );
    }
  };

  const renderField = (field) => {
    if (!field?.name || !field?.id) return null;

    const validationRules = {
      validate: async (value) => {
        const transformedValue =
          field.type !== "enclosure"
            ? applyTransformations(value, field.transformationFunctions || [])
            : value;
        const formValues = getValues();
        const validationResult = await runValidations(
          {
            ...field,
            validationFunctions: field.validationFunctions || [],
          },
          transformedValue,
          formValues,
          referenceNumber,
        );
        if (validationResult !== true) {
          return validationResult;
        }
        if (field.name === "UdidCardNumber" && transformedValue) {
          const udidValidationResult = await validateUdidNumber(
            transformedValue,
            referenceNumber,
          );
          return udidValidationResult;
        }
        return true;
      },
    };

    if (
      field.validationFunctions?.includes("notEmpty") &&
      field.name !== "PercentageOfDisability"
    ) {
      validationRules.required = "This field is required";
    }

    switch (field.type) {
      case "text":
      case "date":
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue=""
            rules={validationRules}
            render={({ field: { onChange, value, ref } }) => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {field.type === "date" ? (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label={getLabelWithAsteriskJSX(field)}
                      value={
                        value ? parse(value, "dd/MM/yyyy", new Date()) : null
                      }
                      onChange={(newValue) => {
                        const formatted =
                          newValue instanceof Date && !isNaN(newValue.getTime())
                            ? format(newValue, "dd/MM/yyyy")
                            : "";
                        onChange(formatted);
                        trigger(field.name);
                      }}
                      format="dd/MM/yyyy"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          margin: "normal",
                          error: Boolean(errors[field.name]),
                          helperText: errors[field.name]?.message || "",
                          inputRef: ref,
                          InputLabelProps: {
                            shrink: true,
                            style: { fontSize: "1rem", color: "#000000" },
                          },
                          placeholder: "dd MMM yyyy",
                          sx: commonStyles,
                        },
                      }}
                    />
                  </LocalizationProvider>
                ) : (
                  <TextField
                    type={field.type}
                    id={`${field.id}`}
                    label={getLabelWithAsteriskJSX(field)}
                    value={value || ""}
                    onChange={(e) => {
                      const transformedVal = applyTransformations(
                        e.target.value,
                        field.transformationFunctions || [],
                      );
                      onChange(transformedVal);
                      trigger(field.name);
                    }}
                    inputRef={ref}
                    error={Boolean(errors[field.name])}
                    helperText={errors[field.name]?.message || ""}
                    fullWidth
                    margin="normal"
                    InputLabelProps={{
                      shrink: true,
                      style: { fontSize: "1rem", color: "#000000" },
                    }}
                    inputProps={{
                      maxLength: field.maxLength,
                    }}
                    sx={commonStyles}
                  />
                )}
              </Box>
            )}
          />
        );

      case "select":
        return (
          <Controller
            key={field.id}
            name={field.name}
            control={control}
            defaultValue=""
            rules={validationRules}
            render={({ field: { onChange, onBlur, value } }) => (
              <FormControl
                fullWidth
                error={!!errors[field.name]}
                sx={commonStyles}
              >
                <InputLabel id={`${field.name}-label`}>
                  {getLabelWithAsteriskJSX(field)}
                </InputLabel>
                <Select
                  labelId={`${field.name}-label`}
                  value={value || ""}
                  onChange={(e) => {
                    const transformedValue = applyTransformations(
                      e.target.value,
                      field.transformationFunctions || [],
                    );
                    onChange(transformedValue);
                    trigger(field.name);
                  }}
                  onBlur={onBlur}
                  label={getLabelWithAsteriskJSX(field)}
                >
                  {field.options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors[field.name] && (
                  <FormHelperText>{errors[field.name]?.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case "enclosure":
        return (
          <Controller
            key={field.id}
            name={field.name}
            control={control}
            defaultValue={null}
            rules={validationRules}
            render={({ field: { onChange, onBlur, value } }) => (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleAddFileClick}
                  sx={buttonStyles}
                >
                  {getLabelWithAsteriskJSX(field)}
                </Button>
                <input
                  type="file"
                  hidden
                  accept={field.accept || ".pdf"}
                  onChange={(e) => handleFileChange(field.name, onChange, e)}
                  onBlur={onBlur}
                  ref={fileInputRef}
                />
                {value && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <FileNameTypography
                      variant="body2"
                      onClick={() => window.open(URL.createObjectURL(value))}
                    >
                      {value.name}
                    </FileNameTypography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFile(field.name, onChange)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                )}
                <Typography
                  sx={{ fontSize: "0.85rem", color: "#6B7280", mt: 1 }}
                >
                  Accepted File Types: {field.accept || ".pdf"} Size:
                  100kb–200kb
                </Typography>
                {errors[field.name] && (
                  <FormHelperText>{errors[field.name]?.message}</FormHelperText>
                )}
              </Box>
            )}
          />
        );

      default:
        return null;
    }
  };

  const renderInputField = (field) => {
    if (!field?.name || !field?.id) return null;

    if (
      field.name === "KindOfDisability" &&
      field.additionalFields?.TEMPORARY?.[0]
    ) {
      const tempField = field.additionalFields.TEMPORARY[0];
      if (kindOfDisability === "TEMPORARY") {
        return (
          <Box sx={{ mb: 3 }}>
            {renderField(field)}
            <Box sx={{ height: 24 }} />
            {renderField(tempField)}
          </Box>
        );
      }
    }

    return renderField(field);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f0f4f8",
        }}
      >
        <CircularProgress size={60} sx={{ color: "#1976d2" }} />
      </Box>
    );
  }

  if (apiError && !fields.length) {
    return (
      <StyledContainer>
        <Typography
          variant="h6"
          color="error"
          sx={{ textAlign: "center", mt: 4 }}
        >
          {apiError}
        </Typography>
      </StyledContainer>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "linear-gradient(to bottom, #75aecfff 0%, #417ac5ff 100%)",
        padding: "40px",
      }}
    >
      <StyledContainer>
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            fontWeight: "700",
            color: "#1976d2",
            mb: 4,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          Update Expiring Document
        </Typography>

        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            fontWeight: "700",
            color: "#1976d2",
            mb: 4,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          Reference Number: {referenceNumber}
        </Typography>

        {apiError && fields.length > 0 && (
          <Typography color="error" sx={{ textAlign: "center", mb: 2 }}>
            {apiError}
          </Typography>
        )}

        <Box
          component="form"
          autoComplete="off"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {fields.map((field) => (
            <Box key={field.id}>{renderInputField(field)}</Box>
          ))}

          <StyledButton
            type="submit"
            disabled={fields.length === 0 || Object.keys(errors).length > 0}
            fullWidth
          >
            Submit
          </StyledButton>
        </Box>
      </StyledContainer>
    </Box>
  );
}
