import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Divider,
  Typography,
  IconButton,
} from "@mui/material";
import { Col, Row } from "react-bootstrap";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import {
  AddCircleOutlineSharp,
  RemoveCircleOutlineSharp,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

const buttonStyles = {
  backgroundColor: "#FFFFFF",
  color: "primary.main",
  textTransform: "none",
  fontSize: "24px",
  fontWeight: 700,
  padding: "8px 16px",
  border: "1px solid",
  borderColor: "primary.main",
  borderRadius: "8px",
  "&:hover": {
    backgroundColor: "#E3F2FD",
    borderColor: "#1565C0",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
};

// Recursive function to flatten fields and nested additionalFields
const flattenFields = (fields) => {
  return fields.reduce((acc, field) => {
    acc.push(field);
    if (
      field.additionalFields &&
      Array.isArray(field.additionalFields) &&
      field.additionalFields.length > 0
    ) {
      acc.push(...flattenFields(field.additionalFields));
    }
    return acc;
  }, []);
};

// Mask private field value based on field name
const maskValue = (value, fieldName) => {
  if (!value) return "--"; // Handle null or undefined
  const strValue = String(value); // Convert to string

  // Rule 1: DateOfBirth - show first 2 characters
  if (fieldName.toLowerCase() === "dateofbirth") {
    if (strValue.length <= 2) return "*******";
    return `${strValue.slice(0, 2)}${"*".repeat(7)}`;
  }

  // Rule 2: Email - mask everything except last 3 chars of prefix, mask domain too
  if (fieldName.toLowerCase() === "email") {
    const atIndex = strValue.indexOf("@");
    if (atIndex === -1) return "*******"; // Not a valid email

    const prefix = strValue.slice(0, atIndex);
    const last3 = prefix.slice(-3); // keep last 3 chars visible

    // Build masked prefix (length of prefix - 3 stars + visible 3 chars)
    const maskedPrefix = "*".repeat(prefix.length - 3) + last3;

    // Mask the entire domain part with stars (same length as original)
    const maskedDomain = "*".repeat(strValue.length - atIndex);

    return maskedPrefix + maskedDomain;
  }

  // Rule 3: General private fields - show last 4 characters
  if (strValue.length <= 4) return "*******";
  return `${"*".repeat(4)}${strValue.slice(-4)}`;
};

export const CollapsibleFormDetails = ({
  formDetails,
  formatKey,
  detailsOpen,
  setDetailsOpen,
  onViewPdf,
  applicationId,
  privateFields = [],
}) => {
  const sections = useMemo(() => {
    return Array.isArray(formDetails)
      ? formDetails
      : Object.entries(formDetails).map(([key, value]) => ({ [key]: value }));
  }, [formDetails]);

  console.log("Form Details:", formDetails);

  // State to track visibility of private fields
  const [fieldVisibility, setFieldVisibility] = useState({});
  console.log("Private Fields:", privateFields);

  // Toggle visibility for a specific field
  const toggleFieldVisibility = (fieldName) => {
    setFieldVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  };

  return (
    <Box sx={{ width: "100%", mx: "auto", mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Button
          onClick={() => setDetailsOpen(!detailsOpen)}
          sx={buttonStyles}
          endIcon={
            detailsOpen ? (
              <RemoveCircleOutlineSharp />
            ) : (
              <AddCircleOutlineSharp />
            )
          }
          aria-expanded={detailsOpen}
          aria-label={detailsOpen ? "Collapse details" : "Expand details"}
        >
          {detailsOpen ? "Hide Details" : "Citizen Application Details"}
        </Button>
      </Box>
      <Collapse in={detailsOpen} timeout={500}>
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderRadius: "12px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            p: 3,
            border: "1px solid",
            borderColor: "primary.main",
            maxHeight: "800px",
            overflowY: "auto",
          }}
        >
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, color: "primary.main", mb: 2 }}
            >
              Reference Number
            </Typography>
            <Row className="g-3">
              <Col xs={12} md={12}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    variant="body1"
                    sx={{
                      border: "1px solid #E0E0E0",
                      borderRadius: "8px",
                      p: 2,
                      color: applicationId ? "#212121" : "#B0BEC5",
                    }}
                  >
                    {applicationId}
                  </Typography>
                </Box>
              </Col>
            </Row>
          </Box>

          {sections.length > 0 ? (
            sections.map((section, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 600, color: "primary.main", mb: 2 }}
                >
                  {Object.keys(section)[0]}
                </Typography>
                <Row className="g-3">
                  {Object.entries(section).map(([sectionName, fields]) => {
                    const allFields = flattenFields(fields);

                    return allFields.map(
                      (field, fieldIndex) =>
                        field.name !== "SameAsPresent" && (
                          <Col
                            xs={12}
                            md={6}
                            key={`${sectionName}-${field.name}-${fieldIndex}`}
                          >
                            <Box
                              sx={{ display: "flex", flexDirection: "column" }}
                            >
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 500,
                                  color: "#616161",
                                  mb: 1,
                                }}
                              >
                                {field.label || field.name}
                              </Typography>

                              {field.File && field.File !== "" ? (
                                /\.(jpg|jpeg|png|gif)$/i.test(field.File) ? (
                                  <Box
                                    component="img"
                                    src={`/Base/DisplayFile?filename=${field.File}`}
                                    alt={field.label}
                                    sx={{
                                      width: "100%",
                                      maxHeight: 200,
                                      objectFit: "contain",
                                      borderRadius: "8px",
                                      border: "1px solid #E0E0E0",
                                      transition: "transform 0.3s ease",
                                      "&:hover": { transform: "scale(1.02)" },
                                    }}
                                  />
                                ) : (
                                  <Box sx={{ mt: 1 }}>
                                    <Button
                                      variant="outlined"
                                      onClick={() => onViewPdf(field.File)}
                                      startIcon={<PictureAsPdfIcon />}
                                      sx={{
                                        textTransform: "none",
                                        borderColor: "#1976D2",
                                        color: "#1976D2",
                                        "&:hover": {
                                          backgroundColor: "#E3F2FD",
                                          borderColor: "#1565C0",
                                        },
                                      }}
                                      aria-label={`View ${field.label} document`}
                                    >
                                      View Document
                                    </Button>
                                    {field.Enclosure && (
                                      <Typography
                                        variant="caption"
                                        sx={{ mt: 1, color: "#757575" }}
                                      >
                                        Enclosure: {field.Enclosure}
                                      </Typography>
                                    )}
                                  </Box>
                                )
                              ) : privateFields.includes(field.name) ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      border: "1px solid #E0E0E0",
                                      borderRadius: "8px",
                                      p: 2,
                                      color: field.value
                                        ? "#212121"
                                        : "#B0BEC5",
                                      flexGrow: 1,
                                    }}
                                  >
                                    {fieldVisibility[field.name]
                                      ? field.value ?? "--"
                                      : maskValue(field.value, field.name)}
                                  </Typography>
                                  <IconButton
                                    onClick={() =>
                                      toggleFieldVisibility(field.name)
                                    }
                                    aria-label={
                                      fieldVisibility[field.name]
                                        ? `Hide ${field.label || field.name}`
                                        : `Show ${field.label || field.name}`
                                    }
                                    sx={{ color: "#1976D2" }}
                                  >
                                    {fieldVisibility[field.name] ? (
                                      <VisibilityOff />
                                    ) : (
                                      <Visibility />
                                    )}
                                  </IconButton>
                                </Box>
                              ) : (
                                <Typography
                                  variant="body1"
                                  sx={{
                                    border: "1px solid #E0E0E0",
                                    borderRadius: "8px",
                                    p: 2,
                                    color: field.value ? "#212121" : "#B0BEC5",
                                  }}
                                >
                                  {field.name === "AadhaarNumber"
                                    ? field.value && field.value.length > 0
                                      ? "Verified"
                                      : "Not Verified"
                                    : field.value ?? "--"}
                                </Typography>
                              )}
                            </Box>
                          </Col>
                        ),
                    );
                  })}
                </Row>
                {index < sections.length - 1 && (
                  <Divider sx={{ my: 3, borderColor: "#E0E0E0" }} />
                )}
              </Box>
            ))
          ) : (
            <Typography sx={{ textAlign: "center", color: "#B0BEC5", py: 4 }}>
              No form details available.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

export default CollapsibleFormDetails;
