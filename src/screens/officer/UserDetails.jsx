import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchCertificateDetails, fetchUserDetail } from "../../assets/fetch";
import { Container, Row } from "react-bootstrap";
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { formatKey, runValidations } from "../../assets/formvalidations";
import { Controller, useForm } from "react-hook-form";
import CustomButton from "../../components/CustomButton";
import axiosInstance from "../../axiosConfig";
import BasicModal from "../../components/BasicModal";
import SectionSelectCheckboxes from "../../components/SectionSelectCheckboxes";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CollapsibleActionHistory from "../../components/officer/CollapsibleActionHistory";
import CollapsibleFormDetails from "../../components/officer/CollapsibleFormDetails";

const commonStyles = {
  "& .MuiOutlinedInput-root": {
    borderColor: "#E0E0E0",
    "&:hover fieldset": { borderColor: "#1976D2" },
    "&.Mui-focused fieldset": { borderColor: "#1976D2", borderWidth: "2px" },
    backgroundColor: "#FAFAFA",
    borderRadius: "8px",
    fontSize: "14px",
  },
  "& .MuiInputLabel-root": {
    color: "#757575",
    "&.Mui-focused": { color: "#1976D2" },
  },
  marginBottom: "16px",
};

const buttonStyles = {
  backgroundColor: "#1976D2",
  color: "#FFFFFF",
  textTransform: "none",
  fontSize: "14px",
  fontWeight: 500,
  padding: "8px 16px",
  borderRadius: "8px",
  "&:hover": {
    backgroundColor: "#1565C0",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
  "&:disabled": {
    backgroundColor: "#B0BEC5",
    color: "#FFFFFF",
  },
};

export default function UserDetails() {
  const location = useLocation();
  const { applicationId, notaction } = location.state || {};
  const [formDetails, setFormDetails] = useState({});
  const [actionForm, setActionForm] = useState([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isSignedPdf, setIsSignedPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [certificateDetails, setCertificateDetails] = useState(null);
  const [isSanctionLetter, setIsSanctionLetter] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [hasPending, setHaspending] = useState(false);
  const [canTakeAction, setCanTakeAction] = useState(true);
  const [currentOfficerDetails, setCurrentOfficerDetails] = useState(null);
  const [lastActionTaken, setLastActionTaken] = useState(null);

  const {
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors },
    unregister,
  } = useForm({ mode: "onChange" });

  const defaultAction = watch("defaultAction");
  const forwardDeclaration = watch("forwardDeclaration");

  // Clear Remarks when defaultAction changes
  useEffect(() => {
    setValue("Remarks", "");
  }, [defaultAction, setValue]);

  // Update Remarks when forwardDeclaration changes
  useEffect(() => {
    if (defaultAction === "Forward" && forwardDeclaration) {
      const declarationText = `I hereby certify that the beneficiary, namely ${getValueByName(
        formDetails,
        "ApplicantName",
      )} parentage ${getValueByName(
        formDetails,
        "Parentage",
      )} Application No. ${applicationId}, is eligible for pension and his application is submitted for sanction.`;
      setValue("Remarks", declarationText, { shouldValidate: false });
    } else {
      setValue("Remarks", "", { shouldValidate: false });
    }
  }, [defaultAction, forwardDeclaration, formDetails, applicationId, setValue]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      try {
        await fetchUserDetail(
          applicationId,
          setFormDetails,
          setActionForm,
          setHaspending,
          setCanTakeAction,
          null,
          setCurrentOfficerDetails,
        );
      } catch (error) {
        console.error("Error fetching user details:", error);
        toast.error("Failed to load user details. Please try again.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
      } finally {
        setLoading(false);
      }
    }
    if (applicationId) loadDetails();
  }, [applicationId]);

  const handleViewPdf = (url) => {
    setPdfUrl(url);
    setIsSignedPdf(false);
    setPdfModalOpen(true);
  };

  const handleGenerateUserDetailsPdf = async () => {
    setButtonLoading(true);
    try {
      const response = await axiosInstance.get(
        "/Officer/GenerateUserDetailsPdf",
        {
          params: { applicationId },
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${applicationId}_UserDetails.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setButtonLoading(false);
    }
  };

  async function signPdf(pdfBlob, pin) {
    const formData = new FormData();
    formData.append("pdf", pdfBlob, "document.pdf");
    formData.append("pin", pin);
    formData.append(
      "original_path",
      applicationId.replace(/\//g, "_") + "SanctionLetter.pdf",
    );
    try {
      const response = await fetch("http://localhost:8000/sign", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Signing failed: ${errorText}`);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(
        "Error signing PDF: " +
          error.message +
          " Check If Desktop App is started.",
      );
    }
  }

  const checkDesktopApp = async () => {
    try {
      const response = await fetch("http://localhost:8000/");
      if (!response.ok) {
        toast.error("Desktop application is not running.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        return false;
      }
      return true;
    } catch (error) {
      toast.error(
        "Please start the USB Token PDF Signer desktop application.",
        {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        },
      );
      return false;
    }
  };

  const fetchCertificates = async (pin) => {
    const formData = new FormData();
    formData.append("pin", pin);
    const response = await fetch("http://localhost:8000/certificates", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  };

  const handlePinSubmit = async () => {
    if (!pin) {
      toast.error("Please enter the USB token PIN.", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
      return;
    }

    const normalizeSerial = (value) =>
      value?.toString().replace(/\s+/g, "").toUpperCase();

    setButtonLoading(true);
    try {
      const certificates = await fetchCertificates(pin);
      if (!certificates || certificates.length === 0) {
        throw new Error("No certificates found on the USB token.");
      }

      const selectedCertificate = certificates[0];
      const expiration = new Date(certificateDetails.expirationDate);
      const now = new Date();
      const tokenSerial = normalizeSerial(selectedCertificate.serial_number);
      const registeredSerial = normalizeSerial(
        certificateDetails.serial_number,
      );

      if (tokenSerial !== registeredSerial) {
        toast.error("Not the registered certificate.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        return;
      } else if (expiration < now) {
        toast.error("The registered certificate has expired.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        return;
      }

      const signedBlob = await signPdf(pdfBlob, pin);

      const updateFormData = new FormData();
      updateFormData.append("signedPdf", signedBlob, "signed.pdf");
      updateFormData.append("applicationId", applicationId);
      const updateResponse = await axiosInstance.post(
        "/Officer/UpdatePdf",
        updateFormData,
      );

      if (!updateResponse.data.status) {
        throw new Error(
          "Failed to update PDF on server: " +
            (updateResponse.data.response || "Unknown error"),
        );
      }

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const blobUrl = URL.createObjectURL(signedBlob);
      setPdfUrl(updateResponse.data.path);
      setPdfModalOpen(false);
      setTimeout(() => {
        setPdfBlob(null);
        setIsSignedPdf(true);
        setConfirmOpen(false);
        setPdfModalOpen(true);
      }, 100);
      if (pendingFormData) {
        await handleFinalSubmit(pendingFormData);
        setPendingFormData(null);
      }
    } catch (error) {
      console.error("Signing error:", error);
      toast.error("Error signing PDF: " + error.message, {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setButtonLoading(false);
      setPin("");
    }
  };

  const sanctionAction = async () => {
    const response = await axiosInstance.get("/Officer/GetSanctionLetter", {
      params: { applicationId },
    });
    const result = response.data;
    if (!result.status) {
      throw new Error(result.response || "Something went wrong");
    }
    const pdfResponse = await axiosInstance.get(`/Base/DisplayFile`, {
      params: { filename: result.path },
      responseType: "blob",
    });
    const newPdfBlob = new Blob([pdfResponse.data], {
      type: "application/pdf",
    });

    // Update state for modal display
    setPdfBlob(newPdfBlob);
    setPdfUrl(result.path);
    setIsSignedPdf(false);
    setIsSanctionLetter(true);
    setPdfModalOpen(true);
  };

  const handleFinalSubmit = async (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (value && typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value ?? "");
      }
    });
    formData.append("applicationId", applicationId);
    try {
      const { data: result } = await axiosInstance.post(
        "/Officer/HandleAction",
        formData,
      );
      if (!result.status) {
        throw new Error(result.response || "Something went wrong");
      } else {
        setCanTakeAction(false);
        // Map defaultAction to its label
        const actionField = actionForm.find(
          (field) => field.name === "defaultAction",
        );
        const actionLabel =
          actionField?.options.find(
            (option) => option.value === data.defaultAction,
          )?.label || data.defaultAction;
        setLastActionTaken(actionLabel);
        toast.success("Action completed successfully!", {
          position: "top-center",
          autoClose: 6000,
          theme: "colored",
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Error processing request: " + error.message, {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setButtonLoading(false);
    }
  };

  const onSubmit = async (data) => {
    const defaultAction = data.defaultAction?.toLowerCase();
    setButtonLoading(true);

    if (defaultAction === "sanction") {
      const certDetails = await fetchCertificateDetails();
      if (!certDetails) {
        toast.error(
          "You have not registered DSC, so you can't sanction this application.",
          {
            position: "top-center",
            autoClose: 3000,
            theme: "colored",
          },
        );
        setButtonLoading(false);
        return;
      }

      setCertificateDetails(certDetails);
      setPendingFormData(data);
      await sanctionAction();
      setButtonLoading(false);
      return;
    }

    await handleFinalSubmit(data);
  };

  const handleModalClose = () => {
    setPdfModalOpen(false);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
    setPdfBlob(null);
    setIsSignedPdf(false);
    setIsSanctionLetter(false);
  };

  const renderField = (field, sectionIndex) => {
    switch (field.type) {
      case "text":
      case "email":
      case "date":
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            defaultValue=""
            rules={{
              validate: async (value) =>
                await runValidations(field, value, getValues()),
            }}
            render={({ field: { onChange, value, ref } }) => (
              <TextField
                type={field.type}
                id={field.id}
                label={field.label}
                value={value || ""}
                onChange={onChange}
                inputRef={ref}
                error={Boolean(errors[field.name])}
                helperText={errors[field.name]?.message}
                fullWidth
                margin="normal"
                inputProps={{
                  maxLength: field.validationFunctions?.includes(
                    "specificLength",
                  )
                    ? field.maxLength
                    : undefined,
                }}
                sx={commonStyles}
                aria-describedby={`field-${field.id}-error`}
              />
            )}
          />
        );
      case "file":
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            defaultValue={null}
            rules={{
              validate: async (value) => await runValidations(field, value),
            }}
            render={({ field: { onChange, ref } }) => (
              <FormControl
                fullWidth
                margin="normal"
                error={Boolean(errors[field.name])}
                sx={commonStyles}
              >
                <Tooltip title={`Upload ${field.label}`} arrow>
                  <Button
                    variant="contained"
                    component="label"
                    sx={buttonStyles}
                    aria-label={`Upload ${field.label}`}
                  >
                    {field.label}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => onChange(e.target.files[0])}
                      ref={ref}
                      accept={field.accept}
                    />
                  </Button>
                </Tooltip>
                <FormHelperText sx={{ color: "error.main" }}>
                  {errors[field.name]?.message}
                </FormHelperText>
              </FormControl>
            )}
          />
        );
      case "select":
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            defaultValue="Please Select"
            rules={{
              validate: async (value) => {
                if (field.required && value === "Please Select") {
                  return "Please select a valid option.";
                }
                return await runValidations(field, value, getValues());
              },
            }}
            render={({ field: { onChange, value, ref } }) => {
              let options =
                field.optionsType === "dependent" && field.dependentOn
                  ? field.dependentOptions?.[watch(field.dependentOn)] || []
                  : field.options || [];
              const selectOptions = [
                { value: "Please Select", label: "Please Select" },
                ...options,
              ];
              return (
                <>
                  <FormControl
                    fullWidth
                    margin="normal"
                    error={Boolean(errors[field.name])}
                    sx={commonStyles}
                  >
                    <InputLabel id={`${field.id}-label`}>
                      {field.label}
                    </InputLabel>
                    <Select
                      labelId={`${field.id}-label`}
                      id={field.id}
                      value={value || "Please Select"}
                      label={field.label}
                      onChange={(e) => {
                        onChange(e);
                        if (field.additionalFields) {
                          Object.keys(field.additionalFields).forEach((key) => {
                            if (key !== e.target.value) {
                              field.additionalFields[key].forEach(
                                (additionalField) => {
                                  const nestedFieldName =
                                    additionalField.name ||
                                    `${field.name}_${additionalField.id}`;
                                  unregister(nestedFieldName, {
                                    keepValue: false,
                                  });
                                },
                              );
                            }
                          });
                        }
                      }}
                      inputRef={ref}
                      sx={{ color: "#212121" }}
                      aria-describedby={`field-${field.id}-error`}
                    >
                      {selectOptions.map((option) => (
                        <MenuItem
                          key={`${field.name}-${option.value}`}
                          value={option.value}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText sx={{ color: "error.main" }}>
                      {errors[field.name]?.message}
                    </FormHelperText>
                  </FormControl>
                  {field.additionalFields && field.additionalFields[value] && (
                    <Box sx={{ mt: 2 }}>
                      {field.additionalFields[value].map((additionalField) => {
                        const additionalFieldName =
                          additionalField.name ||
                          `${field.name}_${additionalField.id}`;
                        return (
                          <Box key={additionalField.id} sx={{ mb: 2 }}>
                            <InputLabel
                              htmlFor={additionalField.id}
                              sx={{ color: "#757575", mb: 1 }}
                            >
                              {additionalField.label}
                            </InputLabel>
                            {renderField(
                              { ...additionalField, name: additionalFieldName },
                              sectionIndex,
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </>
              );
            }}
          />
        );
      case "enclosure":
        return (
          <Controller
            key={field.name}
            name={field.name}
            control={control}
            defaultValue={{
              selected: field.options[0]?.value || "",
              file: null,
            }}
            rules={{
              validate: async (value) =>
                await runValidations(field, value, getValues()),
            }}
            render={({ field: { onChange, value, ref } }) => (
              <Box sx={{ mb: 2 }}>
                <FormControl
                  fullWidth
                  margin="normal"
                  error={Boolean(errors[field.name]?.selected)}
                  sx={commonStyles}
                >
                  <InputLabel id={`${field.id}_select-label`}>
                    {field.label}
                  </InputLabel>
                  <Select
                    labelId={`${field.id}_select-label`}
                    id={`${field.id}_select`}
                    value={value?.selected || ""}
                    label={field.label}
                    onChange={(e) =>
                      onChange({ ...value, selected: e.target.value })
                    }
                    inputRef={ref}
                    sx={{ color: "#212121" }}
                    aria-describedby={`field-${field.id}-error`}
                  >
                    {field.options.map((option) => (
                      <MenuItem
                        key={`${field.name}-${option.value}`}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText sx={{ color: "error.main" }}>
                    {errors[field.name]?.selected?.message}
                  </FormHelperText>
                </FormControl>
                <FormControl
                  fullWidth
                  margin="normal"
                  error={Boolean(errors[field.name]?.file)}
                  sx={commonStyles}
                >
                  <Tooltip title="Upload enclosure file" arrow>
                    <Button
                      variant="contained"
                      component="label"
                      sx={{ ...buttonStyles, mt: 2 }}
                      disabled={!value?.selected}
                      aria-label={`Upload ${field.label} file`}
                    >
                      Upload File
                      <input
                        type="file"
                        hidden
                        onChange={(e) =>
                          onChange({ ...value, file: e.target.files[0] })
                        }
                        accept={field.accept}
                      />
                    </Button>
                  </Tooltip>
                  <FormHelperText sx={{ color: "error.main" }}>
                    {errors[field.name]?.file?.message}
                  </FormHelperText>
                </FormControl>
              </Box>
            )}
          />
        );
      default:
        return null;
    }
  };

  function getValueByName(data, name) {
    for (const section of Object.values(data)) {
      for (const field of section) {
        if (field.name === name) {
          return field.value || field.File || field.Enclosure || null;
        }
        if (field.additionalFields) {
          for (const subField of field.additionalFields) {
            if (subField.name === name) {
              return subField.value || null;
            }
          }
        }
      }
    }
    return null;
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#F5F5F5",
        }}
      >
        <CircularProgress color="primary" aria-label="Loading user details" />
      </Box>
    );
  }

  return (
    <Container
      style={{
        maxWidth: "80%",
        padding: "0",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: "24px",
        paddingBottom: "24px",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          bgcolor: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
          p: 4,
          transition: "transform 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-4px)",
          },
        }}
        role="main"
        aria-labelledby="user-details-title"
      >
        <CollapsibleFormDetails
          formDetails={formDetails}
          formatKey={formatKey}
          detailsOpen={detailsOpen}
          setDetailsOpen={setDetailsOpen}
          onViewPdf={handleViewPdf}
          applicationId={applicationId}
        />

        <CollapsibleActionHistory
          detailsOpen={historyOpen}
          setDetailsOpen={setHistoryOpen}
          applicationId={applicationId}
        />

        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CustomButton
            text="Generate User Details PDF"
            sx={{ ...buttonStyles, width: { xs: "100%", sm: "auto" } }}
            disabled={buttonLoading}
            startIcon={
              buttonLoading && <CircularProgress size={20} color="inherit" />
            }
            onClick={handleGenerateUserDetailsPdf}
            aria-label="Generate user details PDF"
          />
        </Box>
        {canTakeAction ? (
          <>
            {!notaction && !hasPending && (
              <>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: "primary.main",
                    textAlign: "center",
                    mt: detailsOpen ? 6 : 4,
                    mb: 4,
                  }}
                >
                  Action Form
                </Typography>

                <Box
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                    p: 3,
                    maxWidth: "600px",
                    mx: "auto",
                  }}
                >
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#212121",
                        mb: 1,
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      Declaration by Previous Officer
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      sx={{ color: "#757575", mb: 1, textAlign: "center" }}
                    >
                      {currentOfficerDetails.detailsConfirmationDeclartion &&
                        currentOfficerDetails.detailsConfirmationDeclartion}
                    </Typography>
                  </Box>

                  <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
                    {actionForm.length > 0 ? (
                      actionForm.map((field, index) => {
                        const selectedValue =
                          field.type === "select" ? watch(field.name) : null;
                        return (
                          <Box key={index} sx={{ mb: 2 }}>
                            {renderField(field, index)}
                            {field.type === "select" &&
                              field.name === "defaultAction" &&
                              selectedValue === "Forward" && (
                                <Controller
                                  name="forwardDeclaration"
                                  control={control}
                                  defaultValue=""
                                  rules={{
                                    validate: (value) =>
                                      value ===
                                        `I hereby certify that the beneficiary, namely ${getValueByName(
                                          formDetails,
                                          "ApplicantName",
                                        )} parentage ${getValueByName(
                                          formDetails,
                                          "Parentage",
                                        )} Application No. ${applicationId}, is eligible for pension and his application is submitted for sanction.` ||
                                      "You must confirm the declaration to forward.",
                                  }}
                                  render={({ field: { onChange, value } }) => (
                                    <FormControl
                                      fullWidth
                                      margin="normal"
                                      error={Boolean(errors.forwardDeclaration)}
                                      sx={commonStyles}
                                    >
                                      <FormControlLabel
                                        control={
                                          <Checkbox
                                            checked={value !== ""}
                                            onChange={(e) => {
                                              const declarationText = `I hereby certify that the beneficiary, namely ${getValueByName(
                                                formDetails,
                                                "ApplicantName",
                                              )} parentage ${getValueByName(
                                                formDetails,
                                                "Parentage",
                                              )} Application No. ${applicationId}, is eligible for pension and his application is submitted for sanction.`;
                                              onChange(
                                                e.target.checked
                                                  ? declarationText
                                                  : "",
                                              );
                                              setValue(
                                                "Remarks",
                                                e.target.checked
                                                  ? declarationText
                                                  : "",
                                                { shouldValidate: false },
                                              );
                                            }}
                                            color="primary"
                                          />
                                        }
                                        label={`I hereby certify that the beneficiary, namely ${getValueByName(
                                          formDetails,
                                          "ApplicantName",
                                        )} parentage ${getValueByName(
                                          formDetails,
                                          "Parentage",
                                        )} Application No. ${applicationId}, is eligible for pension and his application is submitted for sanction.`}
                                      />
                                      <FormHelperText
                                        sx={{ color: "error.main" }}
                                      >
                                        {errors.forwardDeclaration?.message}
                                      </FormHelperText>
                                    </FormControl>
                                  )}
                                />
                              )}
                            {field.type === "select" &&
                              selectedValue === "ReturnToCitizen" && (
                                <Controller
                                  name="returnFields"
                                  control={control}
                                  defaultValue={[]}
                                  rules={{
                                    validate: (value) =>
                                      value.length > 0 ||
                                      "Select at least one user detail field.",
                                  }}
                                  render={({ field: { onChange, value } }) => (
                                    <Box
                                      sx={{
                                        border: "1px solid #E0E0E0",
                                        borderRadius: "8px",
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                        p: 2,
                                        mt: 2,
                                      }}
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ color: "#757575", mb: 1 }}
                                      >
                                        Select Fields to Return
                                      </Typography>
                                      <SectionSelectCheckboxes
                                        formDetails={formDetails}
                                        control={control}
                                        name="returnFields"
                                        value={value}
                                        onChange={onChange}
                                        formatKey={formatKey}
                                      />
                                      {errors.returnFields && (
                                        <FormHelperText
                                          sx={{ color: "error.main" }}
                                        >
                                          {errors.returnFields.message}
                                        </FormHelperText>
                                      )}
                                    </Box>
                                  )}
                                />
                              )}
                          </Box>
                        );
                      })
                    ) : (
                      <Typography
                        sx={{ textAlign: "center", color: "#B0BEC5", py: 4 }}
                      >
                        No action form fields available.
                      </Typography>
                    )}
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <CustomButton
                        text="Take Action"
                        sx={{ ...buttonStyles, width: "100%", mt: 3 }}
                        disabled={buttonLoading}
                        startIcon={
                          buttonLoading && (
                            <CircularProgress size={20} color="inherit" />
                          )
                        }
                        type="submit"
                        aria-label="Submit action form"
                      />
                    </Box>
                  </form>
                </Box>
              </>
            )}
            {(notaction || hasPending) && (
              <Typography
                sx={{ textAlign: "center", color: "#e23535ff", py: 4 }}
              >
                You cannot take action right now.{" "}
                {hasPending &&
                  "Current application is under correction process."}
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="subtitle1" color="success" textAlign="center">
            {lastActionTaken
              ? `Application ${lastActionTaken}`
              : "Action Taken Successfully."}
          </Typography>
        )}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Enter USB Token PIN</DialogTitle>
          <DialogContent>
            <Typography>
              Please enter the PIN for your USB token to sign the document.
            </Typography>
            <TextField
              type="password"
              label="USB Token PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              fullWidth
              margin="normal"
              sx={commonStyles}
              aria-label="USB Token PIN"
              inputProps={{ "aria-describedby": "pin-helper-text" }}
            />
            <FormHelperText id="pin-helper-text">
              Required to sign the document.
            </FormHelperText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} aria-label="Cancel">
              Cancel
            </Button>
            <Button
              onClick={handlePinSubmit}
              color="primary"
              disabled={buttonLoading || !pin}
              aria-label="Submit PIN"
            >
              Submit
            </Button>
          </DialogActions>
        </Dialog>

        <BasicModal
          open={pdfModalOpen}
          handleClose={handleModalClose}
          handleActionButton={
            isSanctionLetter && !isSignedPdf ? () => setConfirmOpen(true) : null
          }
          buttonText={isSanctionLetter && !isSignedPdf ? "Sign PDF" : null}
          Title={isSignedPdf ? "Signed Document" : "Document Preview"}
          pdf={pdfUrl}
          sx={{
            "& .MuiDialog-paper": {
              width: { xs: "90%", md: "80%" },
              maxWidth: "800px",
              height: "80vh",
              borderRadius: "12px",
            },
          }}
        />
      </Box>
      <ToastContainer />
    </Container>
  );
}
