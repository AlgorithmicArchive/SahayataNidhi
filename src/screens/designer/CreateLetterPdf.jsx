  import React, {
    useState,
    useEffect,
    useMemo,
    memo,
    useContext,
    useCallback,
  } from "react";
  import {
    Container,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
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
    CircularProgress,
    Alert,
    Divider,
  } from "@mui/material";
  import AddIcon from "@mui/icons-material/Add";
  import DeleteIcon from "@mui/icons-material/Delete";
  import DragIndicator from "@mui/icons-material/DragIndicator";
  import { Col, Row } from "react-bootstrap";
  import {
    DndContext,
    closestCenter,
    useSensor,
    useSensors,
    PointerSensor,
  } from "@dnd-kit/core";
  import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
  } from "@dnd-kit/sortable";
  import { CSS } from "@dnd-kit/utilities";
  import axiosInstance from "../../axiosConfig";
  import { ToastContainer, toast } from "react-toastify";
  import "react-toastify/dist/ReactToastify.css";
  import { UserContext } from "../../UserContext"; // Assuming UserContext is in the same directory

  // SortableItem component for draggable rows
  const SortableItem = ({ id, children, disabled }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id, disabled });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <Box ref={setNodeRef} style={style} {...attributes}>
        {children(listeners)}
      </Box>
    );
  };

  // Memoized SanctionDetails component
  const SanctionDetails = memo(
    ({
      letterFor,
      information,
      dummyOfficer,
      dummyAreaName,
      dummyBranchOffice,
      dummyApplicationId,
    }) => {
      const sanctionedFromWhere =
        dummyOfficer.AccessLevel !== "State"
          ? `Office of The ${dummyOfficer.Role}, ${dummyAreaName}`
          : "SOCIAL WELFARE DEPARTMENT\nCIVIL SECRETARIAT, JAMMU / SRINAGAR";

      return (
        <>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ fontSize: 14, mb: 2 }}>
              To
              <br />
              THE MANAGER
              <br />
              THE JAMMU AND KASHMIR BANK LIMITED
              <br />
              B/O {dummyBranchOffice}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12, mb: 2 }}>
              Please Find the Particulars of Beneficiary given below:
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontSize: 10, mb: 2 }}>
            {information}
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell
                    sx={{
                      border: "none",
                      fontSize: 8,
                      color: "blue",
                      fontWeight: "bold",
                    }}
                  >
                    NO: {dummyApplicationId}
                  </TableCell>
                  <TableCell
                    sx={{
                      border: "none",
                      fontSize: 10,
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    ISSUING AUTHORITY
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <TableContainer component={Paper}>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell
                    sx={{
                      border: "none",
                      fontSize: 8,
                      color: "blue",
                      fontWeight: "bold",
                    }}
                  >
                    Date: {new Date().toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell
                    sx={{
                      border: "none",
                      fontSize: 10,
                      fontWeight: "bold",
                      textAlign: "right",
                    }}
                  >
                    {dummyOfficer.Role}, {dummyAreaName}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </>
      );
    },
  );

  // Memoized PDFPreview component
  const PDFPreview = memo(
    ({
      selectedServiceId,
      selectedLetterType,
      letterFor,
      information,
      rows,
      getPreview,
    }) => {
      const dummyOfficer = {
        AccessLevel: "District",
        Role: "District Officer",
        AccessCode: "JMU",
      };
      const dummyApplicationId = "APP/2025/123";
      const dummyAreaName = "Jammu District";
      const dummyBranchOffice = "Jammu Main Branch";

      if (!selectedServiceId || !selectedLetterType) {
        return (
          <Typography variant="body1" sx={{ color: "grey.600", mt: 2 }}>
            Select a service and letter type to preview the PDF.
          </Typography>
        );
      }

      return (
        <Box
          sx={{
            bgcolor: "white",
            border: "1px solid #ccc",
            borderRadius: 2,
            p: 3,
            minHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <Box
              component="img"
              src="/assets/images/emblem.png"
              alt="Emblem"
              sx={{ width: 50, height: 50, mb: 2 }}
            />
            <Typography variant="h6" sx={{ fontWeight: "bold", fontSize: 16 }}>
              Union Territory of Jammu and Kashmir
            </Typography>
            {selectedLetterType === "Sanction" && (
              <Typography
                variant="body1"
                sx={{ fontSize: 16, whiteSpace: "pre-line" }}
              >
                {dummyOfficer.AccessLevel !== "State"
                  ? `Office of The ${dummyOfficer.Role}, ${dummyAreaName}`
                  : "SOCIAL WELFARE DEPARTMENT\nCIVIL SECRETARIAT, JAMMU / SRINAGAR"}
              </Typography>
            )}
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", fontSize: 16, mt: 1 }}
            >
              {selectedLetterType === "Sanction"
                ? `Sanction Letter for ${letterFor || "Beneficiary"}`
                : "Acknowledgement"}
            </Typography>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell sx={{ border: "1px solid #ccc", fontSize: 12 }}>
                      {row.label}
                    </TableCell>
                    <TableCell sx={{ border: "1px solid #ccc", fontSize: 12 }}>
                      {getPreview(row)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {selectedLetterType === "Sanction" && (
            <SanctionDetails
              letterFor={letterFor}
              information={information}
              dummyOfficer={dummyOfficer}
              dummyAreaName={dummyAreaName}
              dummyBranchOffice={dummyBranchOffice}
              dummyApplicationId={dummyApplicationId}
            />
          )}
        </Box>
      );
    },
  );

  const CreateLetterPdf = () => {
    const { userType, officerAuthorities } = useContext(UserContext); // Integrate UserContext
    const [formFields, setFormFields] = useState([]);
    const [letterFor, setLetterFor] = useState("");
    const [information, setInformation] = useState("");
    const [rows, setRows] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalRowIndex, setModalRowIndex] = useState(-1);
    const [modalRowData, setModalRowData] = useState({
      label: "",
      transformString: "",
      selectedFields: [],
    });
    const [services, setServices] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState("");
    const [selectedLetterType, setSelectedLetterType] = useState("");
    const [isFetchingFields, setIsFetchingFields] = useState(false);
    const [fetchFieldsError, setFetchFieldsError] = useState("");

    // Determine permissions from UserContext
    const canDirectWithhold = useMemo(() => {
      return (
        officerAuthorities?.canDirectWithhold || userType === "SeniorOfficer"
      );
    }, [userType, officerAuthorities]);

    // Fetch services
    useEffect(() => {
      const fetchServices = async () => {
        try {
          const response = await axiosInstance.get("/Base/GetServices");
          console.log("Services API response:", response.data);
          if (response.data.status && Array.isArray(response.data.services)) {
            setServices(response.data.services);
          } else {
            toast.error("No services found.");
            setServices([]);
          }
        } catch (error) {
          console.error("Error fetching services:", error);
          toast.error("Failed to load services.");
          setServices([]);
        }
      };

      fetchServices();
    }, []);

    // Fetch form fields when selectedServiceId changes
    useEffect(() => {
      if (!selectedServiceId) {
        setFormFields([]);
        setFetchFieldsError("");
        return;
      }

      const fetchFormFields = async () => {
        setIsFetchingFields(true);
        setFetchFieldsError("");
        try {
          const response = await axiosInstance.get("/Designer/GetFormElements", {
            params: { serviceId: selectedServiceId },
          });
          console.log("FormFields API response:", response.data);
          if (response.data.status) {
            // Extract fields from sections
            const sectionFields = Array.isArray(response.data.sections)
              ? response.data.sections.flatMap((section) =>
                  section.fields.map((field) => ({
                    name: field.name,
                    label: field.label,
                  })),
                )
              : [];
            // Extract fields from columnNames
            const columnFields = Array.isArray(response.data.columnNames)
              ? response.data.columnNames.map((name) => ({
                  name,
                  label: name, // Use name as label since no separate label is provided
                }))
              : [];
            // Combine and ensure uniqueness by name using Map
            const uniqueFieldsMap = new Map();
            [...sectionFields, ...columnFields].forEach((field) => {
              uniqueFieldsMap.set(field.name, field);
            });
            const allFields = Array.from(uniqueFieldsMap.values());
            setFormFields(allFields);
            if (allFields.length === 0) {
              setFetchFieldsError(
                "No form fields or column names available for this service.",
              );
              toast.warn(
                "No form fields or column names available for this service.",
              );
            }
          } else {
            setFormFields([]);
            setFetchFieldsError(
              "No form fields or column names found for this service.",
            );
            toast.error("No form fields or column names found.");
          }
        } catch (error) {
          console.error("Error fetching form fields:", error);
          setFormFields([]);
          setFetchFieldsError("Failed to load form fields and column names.");
          toast.error("Failed to load form fields and column names.");
        } finally {
          setIsFetchingFields(false);
        }
      };

      fetchFormFields();
    }, [selectedServiceId]);

    // Fetch letter details
    useEffect(() => {
      if (!selectedServiceId || !selectedLetterType) {
        setLetterFor("");
        setInformation("");
        setRows([]);
        return;
      }

      const fetchLetterDetails = async () => {
        try {
          const response = await axiosInstance.get("/Designer/GetLetterDetails", {
            params: {
              serviceId: selectedServiceId,
              objField: selectedLetterType,
            },
          });
          console.log("LetterDetails API response:", response.data);
          if (response.data.requiredObj) {
            const { letterFor, tableFields, information } =
              response.data.requiredObj;
            setLetterFor(letterFor || "");
            setInformation(information || "");
            setRows(tableFields || []);
            toast.success(
              `${selectedLetterType} letter data loaded successfully.`,
            );
          } else {
            setLetterFor("");
            setInformation("");
            setRows([]);
            toast.info(
              `No existing ${selectedLetterType} letter data found for this service.`,
            );
          }
        } catch (error) {
          console.error(
            `Error fetching ${selectedLetterType} letter details:`,
            error,
          );
          setLetterFor("");
          setInformation("");
          setRows([]);
          toast.error(`Failed to load ${selectedLetterType} letter data.`);
        }
      };

      fetchLetterDetails();
    }, [selectedServiceId, selectedLetterType]);

    const openModalForEdit = (index) => {
      setModalRowIndex(index);
      setModalRowData(JSON.parse(JSON.stringify(rows[index])));
      setModalOpen(true);
    };

    const openModalForAdd = () => {
      setModalRowIndex(-1);
      setModalRowData({ label: "", transformString: "", selectedFields: [] });
      setModalOpen(true);
    };

    const closeModal = () => {
      setModalOpen(false);
      setModalRowIndex(-1);
      setModalRowData({ label: "", transformString: "", selectedFields: [] });
    };

    const saveModal = () => {
      if (!modalRowData.label) {
        toast.error("Label is required.");
        return;
      }
      if (!modalRowData.transformString) {
        toast.error("Transform String is required.");
        return;
      }
      if (
        modalRowData.selectedFields.some(
          (field) => !field || !formFields.some((f) => f.name === field),
        )
      ) {
        toast.error("All selected fields must be valid.");
        return;
      }

      const newRows = [...rows];
      if (modalRowIndex === -1) {
        newRows.push(modalRowData);
      } else {
        newRows[modalRowIndex] = modalRowData;
      }
      setRows(newRows);
      closeModal();
    };

    const updateLabel = (value) => {
      setModalRowData((prev) => ({ ...prev, label: value.toUpperCase() }));
    };

    const updateTransformString = (value) => {
      setModalRowData((prev) => ({ ...prev, transformString: value }));
    };

    const addSelectedField = () => {
      setModalRowData((prev) => ({
        ...prev,
        selectedFields: [...prev.selectedFields, ""],
      }));
    };

    const updateSelectedField = (index, value) => {
      setModalRowData((prev) => {
        const updatedFields = [...prev.selectedFields];
        updatedFields[index] = value;
        return { ...prev, selectedFields: updatedFields };
      });
    };

    const removeSelectedField = (index) => {
      setModalRowData((prev) => {
        const updatedFields = prev.selectedFields.filter((_, i) => i !== index);
        return { ...prev, selectedFields: updatedFields };
      });
    };

    const handleRemoveRow = (index) => {
      setRows(rows.filter((_, i) => i !== index));
    };

    // Fixed: Pure function without hooks
    const getPreview = useCallback((row) => {
      let preview = row.transformString;
      row.selectedFields.forEach((field, index) => {
        preview = preview.replace(`{${index}}`, `{${field}}`);
      });
      return preview;
    }, []);

    const handleDragEnd = (event) => {
      const { active, over } = event;
      if (active.id !== over.id) {
        const oldIndex = rows.findIndex((row) => row.label === active.id);
        const newIndex = rows.findIndex((row) => row.label === over.id);
        const newRows = [...rows];
        const [movedRow] = newRows.splice(oldIndex, 1);
        newRows.splice(newIndex, 0, movedRow);
        setRows(newRows);
      }
    };

    const handleGenerateJson = () => {
      const jsonOutput = {
        [selectedLetterType]: {
          letterFor,
          tableFields: rows.map((row) => ({
            label: row.label,
            transformString: row.transformString,
            selectedFields: row.selectedFields.filter((f) =>
              formFields.some((field) => field.name === f),
            ),
          })),
          information,
        },
      };
      console.log(JSON.stringify(jsonOutput, null, 2));
      return jsonOutput;
    };

    const saveLetter = async () => {
      if (!selectedServiceId) {
        toast.error("Please select a service first.");
        return;
      }
      if (!selectedLetterType) {
        toast.error("Please select a letter type.");
        return;
      }

      const jsonOutput = handleGenerateJson();

      const formData = new FormData();
      formData.append("serviceId", selectedServiceId);
      formData.append("objField", selectedLetterType);
      formData.append("letterData", JSON.stringify(jsonOutput));

      try {
        const response = await axiosInstance.post(
          "/Designer/SaveLetterDetails",
          formData,
        );
        if (response.data.status) {
          toast.success(`${selectedLetterType} letter saved successfully!`);
          // Optionally initiate withholding if applicable
          if (canDirectWithhold) {
            try {
              const withholdResponse = await axiosInstance.post(
                "/Officer/DirectWithheld",
                formData,
              );
              toast.success("Letter withheld successfully!");
            } catch (error) {
              console.error("Error initiating direct withhold:", error);
              toast.error("Failed to initiate direct withhold.");
            }
          } else {
            try {
              const withholdResponse = await axiosInstance.post(
                "/Officer/InitiateWithheld",
                formData,
              );
              toast.success(
                "Letter withhold process initiated; awaiting confirmation.",
              );
            } catch (error) {
              console.error("Error initiating withhold:", error);
              toast.error("Failed to initiate withhold process.");
            }
          }
        } else {
          toast.error(
            `Failed to save ${selectedLetterType} letter: ${
              response.data.message || "Unknown error"
            }`,
          );
        }
      } catch (error) {
        console.error(`Error saving ${selectedLetterType} letter:`, error);
        toast.error(
          `An error occurred while saving the ${selectedLetterType} letter.`,
        );
      }
    };

    // Setup sensors for drag-and-drop
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
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
            <Col md={6}>
              <Typography
                variant="h4"
                sx={{ color: "grey.800", mb: 4, fontWeight: "bold" }}
              >
                Configure Letter
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
                    onChange={(e) => {
                      setSelectedServiceId(e.target.value);
                      setSelectedLetterType("");
                      setRows([]);
                      setLetterFor("");
                      setInformation("");
                    }}
                  >
                    <MenuItem value="" disabled>
                      Select a Service
                    </MenuItem>
                    {services.length > 0 ? (
                      services.map((service) => (
                        <MenuItem
                          key={service.serviceId}
                          value={service.serviceId}
                        >
                          {service.serviceName}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>No services available</MenuItem>
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="letter-type-select-label">
                    Select Letter Type
                  </InputLabel>
                  <Select
                    labelId="letter-type-select-label"
                    value={selectedLetterType}
                    label="Select Letter Type"
                    onChange={(e) => setSelectedLetterType(e.target.value)}
                    disabled={!selectedServiceId}
                  >
                    <MenuItem value="" disabled>
                      Select a Letter Type
                    </MenuItem>
                    <MenuItem value="Sanction">Sanction</MenuItem>
                    <MenuItem value="Acknowledgement">Acknowledgement</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Letter For"
                  value={letterFor}
                  onChange={(e) => setLetterFor(e.target.value)}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2, bgcolor: "grey.50" }}
                  disabled={!selectedServiceId || !selectedLetterType}
                />
                <TextField
                  label="Letter Information"
                  value={information}
                  onChange={(e) => setInformation(e.target.value)}
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={4}
                  sx={{ bgcolor: "grey.50" }}
                  disabled={!selectedServiceId || !selectedLetterType}
                />
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                  Table Rows
                </Typography>
                {isFetchingFields && (
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <CircularProgress size={20} sx={{ mr: 2 }} />
                    <Typography variant="body2">
                      Loading form fields...
                    </Typography>
                  </Box>
                )}
                {fetchFieldsError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {fetchFieldsError}
                  </Alert>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={rows.map((row) => row.label)}
                    strategy={verticalListSortingStrategy}
                  >
                    {rows.map((row, index) => (
                      <SortableItem
                        key={row.label}
                        id={row.label}
                        disabled={
                          !selectedServiceId ||
                          !selectedLetterType ||
                          isFetchingFields
                        }
                      >
                        {(listeners) => (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              p: 2,
                              bgcolor: "grey.50",
                              borderRadius: 1,
                              mb: 2,
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <Row
                              className="w-100 align-items-center"
                              style={{ margin: 0 }}
                            >
                              <Col md={1} style={{ padding: 0 }}>
                                <IconButton
                                  {...listeners}
                                  sx={{ cursor: "grab" }}
                                  disabled={
                                    !selectedServiceId ||
                                    !selectedLetterType ||
                                    isFetchingFields
                                  }
                                >
                                  <DragIndicator fontSize="small" />
                                </IconButton>
                              </Col>
                              <Col md={4} style={{ padding: 0 }}>
                                <Box
                                  sx={{
                                    border: "1px solid #ccc",
                                    padding: "8px 12px",
                                    height: "100%",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  <Typography variant="body1">
                                    {row.label || `Row ${index + 1}`}
                                  </Typography>
                                </Box>
                              </Col>
                              <Col md={4} style={{ padding: 0 }}>
                                <Box
                                  sx={{
                                    border: "1px solid #ccc",
                                    padding: "8px 12px",
                                    height: "100%",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  <Typography variant="body1">
                                    {getPreview(row)}
                                  </Typography>
                                </Box>
                              </Col>
                              <Col
                                md={3}
                                className="d-flex justify-content-end"
                                style={{ padding: 0 }}
                              >
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => openModalForEdit(index)}
                                  sx={{ minWidth: "80px", mr: 1 }}
                                  disabled={
                                    !selectedServiceId ||
                                    !selectedLetterType ||
                                    isFetchingFields ||
                                    formFields.length === 0
                                  }
                                >
                                  Edit
                                </Button>
                                <IconButton
                                  onClick={() => handleRemoveRow(index)}
                                  color="error"
                                  size="small"
                                  disabled={
                                    !selectedServiceId ||
                                    !selectedLetterType ||
                                    isFetchingFields
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Col>
                            </Row>
                          </Box>
                        )}
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openModalForAdd}
                  sx={{ bgcolor: "primary.main", mt: 2 }}
                  disabled={
                    !selectedServiceId ||
                    !selectedLetterType ||
                    isFetchingFields ||
                    formFields.length === 0
                  }
                >
                  Add Row
                </Button>
              </Box>

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleGenerateJson}
                  disabled={
                    !selectedServiceId || !selectedLetterType || isFetchingFields
                  }
                >
                  Generate JSON
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={saveLetter}
                  disabled={
                    !selectedServiceId || !selectedLetterType || isFetchingFields
                  }
                >
                  Save Letter
                </Button>
              </Box>
            </Col>

            <Col md={6}>
              <Typography
                variant="h5"
                sx={{ color: "grey.800", mb: 2, fontWeight: "bold" }}
              >
                PDF Preview
              </Typography>
              <PDFPreview
                selectedServiceId={selectedServiceId}
                selectedLetterType={selectedLetterType}
                letterFor={letterFor}
                information={information}
                rows={rows}
                getPreview={getPreview}
              />
            </Col>
          </Row>

          <Modal open={modalOpen} onClose={closeModal}>
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
              <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
                Configure Row
              </Typography>
              <TextField
                label="Label"
                value={modalRowData.label}
                onChange={(e) => updateLabel(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ mb: 3 }}
                error={!modalRowData.label && modalRowData.label !== ""}
                helperText={
                  !modalRowData.label && modalRowData.label !== ""
                    ? "Label is required"
                    : ""
                }
              />
              <TextField
                label="Transform String"
                value={modalRowData.transformString}
                onChange={(e) => updateTransformString(e.target.value)}
                fullWidth
                variant="outlined"
                sx={{ mb: 3 }}
                error={
                  !modalRowData.transformString &&
                  modalRowData.transformString !== ""
                }
                helperText={
                  !modalRowData.transformString &&
                  modalRowData.transformString !== ""
                    ? "Transform String is required"
                    : ""
                }
              />

              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "bold" }}>
                Selected Fields
              </Typography>
              {isFetchingFields ? (
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <CircularProgress size={20} sx={{ mr: 2 }} />
                  <Typography variant="body2">Loading form fields...</Typography>
                </Box>
              ) : fetchFieldsError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {fetchFieldsError}
                </Alert>
              ) : formFields.length === 0 ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  No form fields or column names available for this service.
                </Alert>
              ) : (
                <>
                  {modalRowData.selectedFields.map((field, index) => (
                    <Box
                      key={index}
                      sx={{ display: "flex", alignItems: "center", mb: 2 }}
                    >
                      <FormControl
                        sx={{ width: "80%", mr: 2 }}
                        error={field && !formFields.some((f) => f.name === field)}
                      >
                        <InputLabel id={`field-select-${index}`}>
                          Select Field
                        </InputLabel>
                        <Select
                          labelId={`field-select-${index}`}
                          value={field}
                          label="Select Field"
                          onChange={(e) =>
                            updateSelectedField(index, e.target.value)
                          }
                          aria-label={`Select field ${
                            index + 1
                          } for row configuration`}
                        >
                          <MenuItem value="" disabled>
                            Select a Field
                          </MenuItem>
                          {formFields.map((formField) => (
                            <MenuItem
                              key={`${formField.name}-${formField.label}`}
                              value={formField.name}
                            >
                              {formField.label} ({formField.name})
                            </MenuItem>
                          ))}
                        </Select>
                        {field && !formFields.some((f) => f.name === field) && (
                          <Typography variant="caption" color="error">
                            Invalid field selected
                          </Typography>
                        )}
                      </FormControl>
                      <IconButton
                        onClick={() => removeSelectedField(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addSelectedField}
                    sx={{ mb: 3 }}
                  >
                    Add Field
                  </Button>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                <Button variant="outlined" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={saveModal}
                  disabled={isFetchingFields || formFields.length === 0}
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

  export default CreateLetterPdf;
