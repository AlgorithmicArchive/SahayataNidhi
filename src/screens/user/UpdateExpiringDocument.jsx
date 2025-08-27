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
} from "@mui/material";
import { styled } from "@mui/system";
import { Delete as DeleteIcon } from "@mui/icons-material";
import {
  runValidations,
  TransformationFunctionsList,
} from "../../assets/formvalidations";

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
  const { referenceNumber, ServiceId } = location.state || {};
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
  } = useForm({
    mode: "onBlur", // Validate on change to catch errors early
    defaultValues: {},
  });

  // Debug form state
  const formState = watch();
  React.useEffect(() => {
    console.log("Form State:", formState);
    console.log("Validation Errors:", errors);
    console.log("Submit Button State:", {
      fieldsLength: fields.length,
      errors: Object.keys(errors),
    });
    console.log("Fields Configuration:", fields);
  }, [formState, errors, fields]);

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

        console.log("API Response:", data);

        if (data.status) {
          const {
            udidCardNumber,
            udidCardIssueDate,
            percentageOfDisability,
            ifTemporaryDisabilityUdidCardValidUpto,
            udidCard,
          } = data.data || {};

          const requiredFields = [
            udidCardNumber,
            udidCardIssueDate,
            percentageOfDisability,
            ifTemporaryDisabilityUdidCardValidUpto,
            udidCard,
          ].filter((field) => field && field.name && field.id);

          if (requiredFields.length === 0) {
            setApiError("No valid form fields were returned by the server.");
            setIsLoading(false);
            return;
          }

          setFields(requiredFields);

          // Initialize form values
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

  // Cleanup URL.createObjectURL to prevent memory leaks
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

  const validateUdidNumber = async (udidNumber, referenceNumber) => {
    try {
      console.log(
        "Validating UDID Number:",
        udidNumber,
        "for Reference Number:",
        referenceNumber,
      );
      const response = await axiosInstance.get("/User/GetIfSameUdidNumber", {
        params: { referenceNumber, udidNumber },
      });
      const data = response.data;
      console.log("UDID Validation Response:", data);
      if (data.status) {
        return true;
      } else {
        return (
          data.message ||
          "UDID Number doesn't match the existing one in the record."
        );
      }
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
      onChange(file);
    }
    event.target.value = "";
  };

  const handleRemoveFile = (fieldName, onChange) => {
    onChange(null);
  };

  const handleAddFileClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (data) => {
    setApiError("");
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("referenceNumber", referenceNumber);
      formDataToSend.append("ServiceId", ServiceId);

      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formDataToSend.append(key, value);
        } else if (value !== null && value !== "") {
          formDataToSend.append(key, value);
        }
      });

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

  const renderInputField = (field) => {
    if (!field?.name || !field?.id) return null;

    const validationRules = {
      validate: async (value) => {
        const transformedValue =
          field.type !== "enclosure"
            ? applyTransformations(value, field.transformationFunctions || [])
            : value;
        const formValues = getValues(); // Get current form state
        const validationResult = await runValidations(
          {
            ...field,
            validationFunctions: field.validationFunctions || [],
          },
          transformedValue,
          formValues,
          referenceNumber,
        );
        console.log(`Validation for ${field.name}:`, {
          value,
          transformedValue,
          validationResult,
        });
        if (validationResult !== true) {
          return validationResult;
        }
        if (field.name === "UdidCardNumber" && transformedValue) {
          const udidValidationResult = await validateUdidNumber(
            transformedValue,
            referenceNumber,
          );
          if (udidValidationResult !== true) {
            return udidValidationResult;
          }
        }
        return true;
      },
    };

    // Make Percentage field optional by not applying "notEmpty" validation
    if (
      field.validationFunctions?.includes("notEmpty") &&
      field.name !== "percentageOfDisability"
    ) {
      validationRules.required = "This field is required";
    }

    if (field.type === "enclosure") {
      return (
        <Controller
          key={field.id}
          name={field.name}
          control={control}
          defaultValue={null}
          rules={validationRules}
          render={({ field: { onChange, onBlur, value } }) => (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: "#333" }}>
                {field.label}
              </Typography>
              <StyledButton
                variant="outlined"
                onClick={handleAddFileClick}
                sx={{ mb: 2 }}
              >
                Upload {field.label}
              </StyledButton>
              <input
                type="file"
                accept={field.accept || ".pdf"}
                onChange={(e) => handleFileChange(field.name, onChange, e)}
                onBlur={onBlur}
                style={{ display: "none" }}
                ref={fileInputRef}
              />
              {value && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    width: "max-content",
                    backgroundColor: "#f9f9f9",
                    padding: "8px 12px",
                    border: "1px solid #000",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <FileNameTypography
                    variant="caption"
                    sx={{ pr: 2 }}
                    onClick={() => window.open(URL.createObjectURL(value))}
                  >
                    {value.name}
                  </FileNameTypography>
                  <IconButton
                    color="error"
                    onClick={() => handleRemoveFile(field.name, onChange)}
                    sx={{
                      "&:hover": {
                        backgroundColor: "rgba(211, 47, 47, 0.1)",
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
              {errors[field.name] && (
                <FormHelperText error sx={{ mt: 1 }}>
                  {errors[field.name]?.message}
                </FormHelperText>
              )}
            </Box>
          )}
        />
      );
    }

    return (
      <Controller
        key={field.id}
        name={field.name}
        control={control}
        defaultValue=""
        rules={validationRules}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            type={field.type === "date" ? "date" : "text"}
            label={field.label}
            value={value || ""}
            onChange={(e) => {
              const transformedValue = applyTransformations(
                e.target.value,
                field.transformationFunctions || [],
              );
              onChange(transformedValue);
            }}
            onBlur={onBlur}
            InputLabelProps={
              field.type === "date" ? { shrink: true } : undefined
            }
            error={!!errors[field.name]}
            helperText={errors[field.name]?.message || ""}
            fullWidth
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: "8px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              },
            }}
            inputProps={{
              maxLength: field.maxLength,
              minLength: field.minLength,
              "aria-invalid": !!errors[field.name] ? "true" : "false",
              "aria-describedby": `${field.name}-error`,
            }}
          />
        )}
      />
    );
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
