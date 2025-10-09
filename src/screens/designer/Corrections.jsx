import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Box,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Col, Row } from "react-bootstrap";
import axiosInstance from "../../axiosConfig";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Corrections = () => {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [formFields, setFormFields] = useState([]);
  const [correctionFields, setCorrectionFields] = useState([]);
  const [corrigendumFields, setCorrigendumFields] = useState([]);
  const [amendmentFields, setAmendmentFields] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFieldNames, setModalFieldNames] = useState([]);
  const [modalFieldIndex, setModalFieldIndex] = useState(-1);
  const [modalType, setModalType] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [isGroup, setIsGroup] = useState(false);

  // Fetch services and form fields
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

    const fetchFormFields = async () => {
      if (!selectedServiceId) {
        setFormFields([]);
        return;
      }
      try {
        const response = await axiosInstance.get("/Designer/GetFormElements", {
          params: { serviceId: selectedServiceId },
        });
        if (response.data.status && response.data.sections) {
          setFormFields(response.data.sections);
        } else {
          setFormFields([]);
          toast.error("No form fields found for this service.");
        }
      } catch (error) {
        console.error("Error fetching form fields:", error);
        setFormFields([]);
        toast.error("Failed to load form fields.");
      }
    };

    fetchServices();
    fetchFormFields();
  }, [selectedServiceId]);

  // Fetch document fields when service changes
  useEffect(() => {
    if (!selectedServiceId) {
      setCorrectionFields([]);
      setCorrigendumFields([]);
      setAmendmentFields([]);
      setSelectedType("");
      return;
    }

    const fetchDocumentFields = async () => {
      try {
        const response = await axiosInstance.get(
          "/Designer/GetDocumentFields",
          {
            params: { serviceId: selectedServiceId },
          },
        );
        if (response.data.status && response.data.documentFields) {
          const { correction, corrigendum, amendment } =
            response.data.documentFields;
          setCorrectionFields(correction || []);
          setCorrigendumFields(corrigendum || []);
          setAmendmentFields(amendment || []);
          toast.success("Document fields loaded successfully.");
        } else {
          setCorrectionFields([]);
          setCorrigendumFields([]);
          setAmendmentFields([]);
          toast.info("No existing document fields found for this service.");
        }
      } catch (error) {
        console.error("Error fetching document fields:", error);
        setCorrectionFields([]);
        setCorrigendumFields([]);
        setAmendmentFields([]);
        toast.error("Failed to load document fields.");
      }
    };

    fetchDocumentFields();
  }, [selectedServiceId]);

  const openModalForAdd = (type, group = false) => {
    setModalType(type);
    setModalFieldIndex(-1);
    setModalFieldNames([]);
    setGroupLabel("");
    setIsGroup(group);
    setModalOpen(true);
  };

  const openModalForEdit = (type, index, field) => {
    setModalType(type);
    setModalFieldIndex(index);
    setIsGroup(typeof field === "object");
    setModalFieldNames(typeof field === "object" ? field.fields : [field]);
    setGroupLabel(typeof field === "object" ? field.label : "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setGroupLabel("");
    setIsGroup(false);
  };

  const handleCheckboxChange = (fieldName) => {
    setModalFieldNames((prev) =>
      prev.includes(fieldName)
        ? prev.filter((name) => name !== fieldName)
        : [...prev, fieldName],
    );
  };

  const handleSelectAllSection = (sectionFields, isChecked) => {
    setModalFieldNames((prev) => {
      if (isChecked) {
        const newFields = sectionFields
          .map((field) => field.name)
          .filter((name) => !prev.includes(name));
        return [...prev, ...newFields];
      } else {
        return prev.filter(
          (name) => !sectionFields.some((field) => field.name === name),
        );
      }
    });
  };

  const saveModal = () => {
    if (modalFieldNames.length === 0) {
      toast.error("Please select at least one field.");
      return;
    }

    if (isGroup && !groupLabel.trim()) {
      toast.error("Please provide a group label.");
      return;
    }

    const fieldEntry = isGroup
      ? { label: groupLabel, fields: modalFieldNames }
      : modalFieldNames[0];

    const updateFields = (currentFields, type) => {
      const newFields = [...currentFields];
      if (modalFieldIndex === -1) {
        const duplicates = modalFieldNames.filter((name) =>
          newFields.some((f) =>
            typeof f === "object" ? f.fields.includes(name) : f === name,
          ),
        );
        if (duplicates.length > 0) {
          toast.error(
            `The following fields are already added to ${type}: ${duplicates.join(
              ", ",
            )}`,
          );
          return null;
        }
        newFields.push(fieldEntry);
      } else {
        if (!isGroup && modalFieldNames.length > 1) {
          toast.error("Please select only one field for editing.");
          return null;
        }
        newFields[modalFieldIndex] = fieldEntry;
      }
      return newFields;
    };

    if (modalType === "Correction") {
      const updated = updateFields(correctionFields, "Correction");
      if (updated) setCorrectionFields(updated);
    } else if (modalType === "Corrigendum") {
      const updated = updateFields(corrigendumFields, "Corrigendum");
      if (updated) setCorrigendumFields(updated);
    } else if (modalType === "Amendment") {
      const updated = updateFields(amendmentFields, "Amendment");
      if (updated) setAmendmentFields(updated);
    }
    closeModal();
  };

  const handleRemoveField = (type, index) => {
    if (type === "Correction") {
      setCorrectionFields(correctionFields.filter((_, i) => i !== index));
    } else if (type === "Corrigendum") {
      setCorrigendumFields(corrigendumFields.filter((_, i) => i !== index));
    } else if (type === "Amendment") {
      setAmendmentFields(amendmentFields.filter((_, i) => i !== index));
    }
  };

  const handleGenerateJson = () => {
    const jsonOutput = {
      documentType: selectedType,
      fields:
        selectedType === "Correction"
          ? correctionFields
          : selectedType === "Corrigendum"
          ? corrigendumFields
          : amendmentFields,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    return jsonOutput;
  };

  const saveDocumentFields = async () => {
    if (!selectedServiceId || !selectedType) {
      toast.error("Please select a service and document type.");
      return;
    }

    const jsonOutput = handleGenerateJson();
    const formData = new FormData();
    formData.append("serviceId", selectedServiceId);
    formData.append("documentType", jsonOutput.documentType);
    formData.append("fields", JSON.stringify(jsonOutput.fields));

    try {
      const response = await axiosInstance.post(
        "/Designer/SaveDocumentFields",
        formData,
      );
      if (response.data.status) {
        toast.success("Document fields saved successfully!");
      } else {
        toast.error("Failed to save document fields.");
      }
    } catch (error) {
      console.error("Error saving document fields:", error);
      toast.error("An error occurred while saving document fields.");
    }
  };

  const renderFieldsTable = (type, fields) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {type} Fields
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableBody>
            {fields.length > 0 ? (
              fields.map((field, index) => (
                <TableRow key={`${type}-${index}`}>
                  <TableCell sx={{ border: "1px solid #ccc", fontSize: 12 }}>
                    {typeof field === "object" ? (
                      <>
                        <Typography sx={{ fontWeight: "bold" }}>
                          {field.label}
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          {field.fields.map((fieldName, idx) => (
                            <Typography key={idx} sx={{ fontSize: 12 }}>
                              {formFields
                                .flatMap((section) => section.fields)
                                .find((f) => f.name === fieldName)?.label ||
                                fieldName}
                            </Typography>
                          ))}
                        </Box>
                      </>
                    ) : (
                      formFields
                        .flatMap((section) => section.fields)
                        .find((f) => f.name === field)?.label || field
                    )}
                  </TableCell>
                  <TableCell sx={{ border: "1px solid #ccc", fontSize: 12 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => openModalForEdit(type, index, field)}
                      sx={{ mr: 1 }}
                      disabled={!selectedServiceId || !selectedType}
                    >
                      Edit
                    </Button>
                    <IconButton
                      onClick={() => handleRemoveField(type, index)}
                      color="error"
                      size="small"
                      disabled={!selectedServiceId || !selectedType}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} sx={{ textAlign: "center" }}>
                  No fields configured for {type}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openModalForAdd(type, false)}
          sx={{ bgcolor: "blue.500" }}
          disabled={!selectedServiceId || !selectedType}
        >
          Add Single Field
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openModalForAdd(type, true)}
          sx={{ bgcolor: "blue.500" }}
          disabled={!selectedServiceId || !selectedType}
        >
          Add Group
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      <Container
        maxWidth="lg"
        sx={{
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 3,
          p: 4,
        }}
      >
        <Row>
          <Col md={12}>
            <Typography
              variant="h4"
              sx={{ color: "grey.800", mb: 4, fontWeight: "bold" }}
            >
              Configure Document Fields
            </Typography>
            <Box sx={{ mb: 4 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="service-select-label">
                  Select Service
                </InputLabel>
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
                <InputLabel id="type-select-label">
                  Select Document Type
                </InputLabel>
                <Select
                  labelId="type-select-label"
                  value={selectedType}
                  label="Select Document Type"
                  onChange={(e) => setSelectedType(e.target.value)}
                  disabled={!selectedServiceId}
                >
                  <MenuItem value="" disabled>
                    Select a Document Type
                  </MenuItem>
                  <MenuItem value="Correction">Correction</MenuItem>
                  <MenuItem value="Corrigendum">Corrigendum</MenuItem>
                  <MenuItem value="Amendment">Document Updation</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {selectedType && (
              <>
                {renderFieldsTable(
                  selectedType,
                  selectedType === "Correction"
                    ? correctionFields
                    : selectedType === "Corrigendum"
                    ? corrigendumFields
                    : amendmentFields,
                )}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleGenerateJson}
                    disabled={!selectedServiceId || !selectedType}
                  >
                    Generate JSON
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={saveDocumentFields}
                    disabled={!selectedServiceId || !selectedType}
                  >
                    Save Document Fields
                  </Button>
                </Box>
              </>
            )}
          </Col>
        </Row>
        <Modal open={modalOpen} onClose={closeModal}>
          <Box
            sx={{
              bgcolor: "white",
              p: 4,
              borderRadius: 2,
              maxWidth: 500,
              mx: "auto",
              marginTop: "20px",
              boxShadow: 24,
              maxHeight: 800,
              overflowY: "auto",
            }}
          >
            <Typography variant="h5" sx={{ mb: 3 }}>
              Configure {modalType} {isGroup ? "Group" : "Field"}
              {modalFieldIndex === -1 ? "s" : ""}
            </Typography>
            {isGroup && (
              <TextField
                fullWidth
                label="Group Label"
                value={groupLabel}
                onChange={(e) => setGroupLabel(e.target.value)}
                sx={{ mb: 3 }}
                error={!groupLabel.trim() && modalFieldNames.length > 0}
                helperText={
                  !groupLabel.trim() && modalFieldNames.length > 0
                    ? "Group label is required"
                    : ""
                }
              />
            )}
            {formFields.length > 0 ? (
              <FormGroup sx={{ mb: 3, maxHeight: 400, overflowY: "auto" }}>
                {formFields.map((section, sectionIndex) => (
                  <Box key={`section-${sectionIndex}`} sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={section.fields.every((field) =>
                            modalFieldNames.includes(field.name),
                          )}
                          onChange={(e) =>
                            handleSelectAllSection(
                              section.fields,
                              e.target.checked,
                            )
                          }
                          disabled={modalFieldIndex !== -1 && !isGroup}
                        />
                      }
                      label={
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: "bold" }}
                        >
                          {section.sectionName}
                        </Typography>
                      }
                    />
                    <Box sx={{ pl: 4 }}>
                      {section.fields.map((field, fieldIndex) => (
                        <FormControlLabel
                          key={`${field.name}-${fieldIndex}`}
                          control={
                            <Checkbox
                              checked={modalFieldNames.includes(field.name)}
                              onChange={() => handleCheckboxChange(field.name)}
                              disabled={
                                modalFieldIndex !== -1 &&
                                !isGroup &&
                                !modalFieldNames.includes(field.name)
                              }
                            />
                          }
                          label={field.label}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </FormGroup>
            ) : (
              <Typography sx={{ mb: 3, color: "text.secondary" }}>
                No fields available for this service. Please ensure the service
                has configured fields.
              </Typography>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={saveModal}
                disabled={
                  modalFieldNames.length === 0 ||
                  (isGroup && !groupLabel.trim())
                }
              >
                Save
              </Button>
            </Box>
          </Box>
        </Modal>
      </Container>
      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
};

export default Corrections;
