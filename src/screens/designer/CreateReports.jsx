import React, { useState, useEffect, useMemo, memo } from "react";
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

// SortableItem component for draggable rows
const SortableItem = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

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

// Memoized Preview component
const Preview = memo(({ generateParams }) => {
  const params = generateParams();

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
      <Typography variant="h6">Generated Parameters</Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableBody>
            {Object.entries(params).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell>{key}</TableCell>
                <TableCell>{value || "(null)"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

const CreateDynamicReportUI = () => {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [formFields, setFormFields] = useState([]);
  const [columnNames, setColumnNames] = useState([]);
  const [table, setTable] = useState("");
  const [jsonColumn, setJsonColumn] = useState("");
  const [sections, setSections] = useState([]);
  const [normalGroupCols, setNormalGroupCols] = useState([]);
  const [selectCols, setSelectCols] = useState([]);
  const [filters, setFilters] = useState("1=1");
  const [normalFilters, setNormalFilters] = useState("");
  const [returnMode, setReturnMode] = useState("COUNT");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(null);
  const [serviceId, setServiceId] = useState(null);
  const [accessLevel, setAccessLevel] = useState("All");
  const [accessCode, setAccessCode] = useState(null);
  const [columnOrder, setColumnOrder] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSectionIndex, setModalSectionIndex] = useState(-1);
  const [modalSectionData, setModalSectionData] = useState({
    sectionName: "",
    fields: [],
  });

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

  // Fetch form elements and column names based on selected service
  useEffect(() => {
    const fetchFormElements = async () => {
      if (!selectedServiceId) return;
      try {
        const response = await axiosInstance.get("/Designer/GetFormElements", {
          params: { serviceId: selectedServiceId },
        });
        setFormFields(response.data.names || []);
        setColumnNames(response.data.columnNames || []);
      } catch (error) {
        console.error("Error fetching form fields:", error);
        toast.error("Failed to load form fields or column names.");
      }
    };
    fetchFormElements();
  }, [selectedServiceId]);

  const openModalForAddSection = () => {
    setModalSectionIndex(-1);
    setModalSectionData({ sectionName: "", fields: [] });
    setModalOpen(true);
  };

  const openModalForEditSection = (index) => {
    setModalSectionIndex(index);
    setModalSectionData({ ...sections[index] });
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const saveModal = () => {
    const newSections = [...sections];
    if (modalSectionIndex === -1) {
      newSections.push(modalSectionData);
    } else {
      newSections[modalSectionIndex] = modalSectionData;
    }
    setSections(newSections);
    closeModal();
  };

  const updateSectionName = (value) => {
    setModalSectionData((prev) => ({ ...prev, sectionName: value }));
  };

  const addField = () => {
    setModalSectionData((prev) => ({
      ...prev,
      fields: [...prev.fields, { alias: "", source: "" }],
    }));
  };

  const updateFieldAlias = (index, value) => {
    setModalSectionData((prev) => {
      const updatedFields = [...prev.fields];
      updatedFields[index].alias = value;
      return { ...prev, fields: updatedFields };
    });
  };

  const updateFieldSource = (index, value) => {
    setModalSectionData((prev) => {
      const updatedFields = [...prev.fields];
      updatedFields[index].source = value;
      if (!updatedFields[index].alias) updatedFields[index].alias = value;
      return { ...prev, fields: updatedFields };
    });
  };

  const removeField = (index) => {
    setModalSectionData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveSection = (index) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  // Normal Group Columns
  const addNormalGroupCol = () => setNormalGroupCols([...normalGroupCols, ""]);
  const updateNormalGroupCol = (index, value) => {
    const updated = [...normalGroupCols];
    updated[index] = value;
    setNormalGroupCols(updated);
  };
  const removeNormalGroupCol = (index) =>
    setNormalGroupCols(normalGroupCols.filter((_, i) => i !== index));

  // Select Columns
  const addSelectCol = () => setSelectCols([...selectCols, ""]);
  const updateSelectCol = (index, value) => {
    const updated = [...selectCols];
    updated[index] = value;
    setSelectCols(updated);
  };
  const removeSelectCol = (index) =>
    setSelectCols(selectCols.filter((_, i) => i !== index));

  // Column order for drag/drop
  const possibleColumns = useMemo(() => {
    const jsonAliases = sections.flatMap((s) =>
      s.fields.map((f) => f.alias).filter((a) => a),
    );
    const normals =
      returnMode === "COUNT"
        ? normalGroupCols.filter((c) => c)
        : selectCols.filter((c) => c);
    return [...new Set([...jsonAliases, ...normals])];
  }, [sections, normalGroupCols, selectCols, returnMode]);

  const loadPossibleColumns = () => setColumnOrder(possibleColumns);

  const handleDragEndColumn = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columnOrder.findIndex((col) => col === active.id);
    const newIndex = columnOrder.findIndex((col) => col === over.id);
    const newOrder = [...columnOrder];
    const [moved] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, moved);
    setColumnOrder(newOrder);
  };

  const removeColumnOrder = (index) =>
    setColumnOrder(columnOrder.filter((_, i) => i !== index));

  // Generate parameters for API
  const generateParams = () => {
    const sectionsStr = sections.map((s) => s.sectionName).join(",");
    const fieldsStr = sections
      .map((s) =>
        s.fields
          .map((f) => f.alias + (f.alias !== f.source ? "|" + f.source : ""))
          .join(","),
      )
      .join(";");
    const normalGroupColsStr = normalGroupCols.join(",");
    const selectColsStr = selectCols.join(",");
    const columnOrderStr = columnOrder.join(",");
    return {
      table,
      jsonColumn,
      Sections: sectionsStr,
      Fields: fieldsStr,
      NormalGroupCols: normalGroupColsStr,
      SelectCols: selectColsStr,
      filters,
      NormalFilters: normalFilters,
      ReturnMode: returnMode,
      PageIndex: pageIndex,
      PageSize: pageSize,
      ServiceId: serviceId,
      AccessLevel: accessLevel,
      AccessCode: accessCode,
      ColumnOrder: columnOrderStr,
    };
  };

  const handleGenerateJson = () =>
    console.log(JSON.stringify(generateParams(), null, 2));

  const saveReport = async () => {
    if (!selectedServiceId) {
      toast.error("Please select a service first.");
      return;
    }
    const jsonOutput = generateParams();
    const formData = new FormData();
    formData.append("serviceId", selectedServiceId);
    formData.append("reportData", JSON.stringify(jsonOutput));
    try {
      const response = await axiosInstance.post(
        "/Designer/SaveReportDetails",
        formData,
      );
      if (response.data.status) toast.success("Report saved successfully!");
      else toast.error("Failed to save report.");
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error("An error occurred while saving the report.");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      <Container
        maxWidth
        sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 3, p: 4 }}
      >
        <Row>
          <Col md={6}>
            <Typography
              variant="h4"
              sx={{ color: "grey.800", mb: 4, fontWeight: "bold" }}
            >
              Configure Dynamic Report
            </Typography>

            {/* Service Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Service</InputLabel>
              <Select
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

            {/* Table & JSON Column */}
            <TextField
              label="Table"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="JSON Column"
              value={jsonColumn}
              onChange={(e) => setJsonColumn(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            {/* Return Mode */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Return Mode</InputLabel>
              <Select
                value={returnMode}
                label="Return Mode"
                onChange={(e) => setReturnMode(e.target.value)}
              >
                <MenuItem value="COUNT">COUNT</MenuItem>
                <MenuItem value="ROWS">ROWS</MenuItem>
              </Select>
            </FormControl>

            {/* Page Index & Page Size */}
            {returnMode === "ROWS" && (
              <>
                <TextField
                  label="Page Index"
                  value={pageIndex}
                  onChange={(e) =>
                    setPageIndex(e.target.value ? parseInt(e.target.value) : 0)
                  }
                  fullWidth
                  type="number"
                  sx={{ mb: 2 }}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="Page Size"
                  value={pageSize || ""}
                  onChange={(e) =>
                    setPageSize(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  fullWidth
                  type="number"
                  sx={{ mb: 2 }}
                  inputProps={{ min: 1 }}
                />
              </>
            )}

            {/* Access & Filters */}
            <TextField
              label="Service Id"
              value={serviceId || ""}
              onChange={(e) =>
                setServiceId(e.target.value ? parseInt(e.target.value) : null)
              }
              fullWidth
              type="number"
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Access Level</InputLabel>
              <Select
                value={accessLevel}
                label="Access Level"
                onChange={(e) => setAccessLevel(e.target.value)}
              >
                <MenuItem value="All">All</MenuItem>
                <MenuItem value="District">District</MenuItem>
                <MenuItem value="Tehsil">Tehsil</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Access Code"
              value={accessCode || ""}
              onChange={(e) =>
                setAccessCode(e.target.value ? parseInt(e.target.value) : null)
              }
              fullWidth
              type="number"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Filters"
              value={filters}
              onChange={(e) => setFilters(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Normal Filters"
              value={normalFilters}
              onChange={(e) => setNormalFilters(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />

            {/* Sections */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Sections
            </Typography>
            {sections.map((section, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  mb: 2,
                }}
              >
                <Typography sx={{ flex: 1 }}>
                  {section.sectionName} ({section.fields.length} fields)
                </Typography>
                <Button onClick={() => openModalForEditSection(index)}>
                  Edit
                </Button>
                <IconButton
                  onClick={() => handleRemoveSection(index)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="contained"
              onClick={openModalForAddSection}
              sx={{ mb: 4 }}
            >
              Add Section
            </Button>

            {/* Normal Group Columns */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Normal Group Columns
            </Typography>
            {normalGroupCols.map((col, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
              >
                <FormControl fullWidth sx={{ mr: 2 }}>
                  <InputLabel>{`Column ${index + 1}`}</InputLabel>
                  <Select
                    value={col}
                    label={`Column ${index + 1}`}
                    onChange={(e) =>
                      updateNormalGroupCol(index, e.target.value)
                    }
                  >
                    {columnNames.map((colName) => (
                      <MenuItem key={colName} value={colName}>
                        {colName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  onClick={() => removeNormalGroupCol(index)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="contained"
              onClick={addNormalGroupCol}
              sx={{ mb: 4 }}
            >
              Add Normal Group Column
            </Button>

            {/* Select Columns */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Select Columns
            </Typography>
            {selectCols.map((col, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
              >
                <FormControl fullWidth sx={{ mr: 2 }}>
                  <InputLabel>{`Column ${index + 1}`}</InputLabel>
                  <Select
                    value={col}
                    label={`Column ${index + 1}`}
                    onChange={(e) => updateSelectCol(index, e.target.value)}
                  >
                    {columnNames.map((colName) => (
                      <MenuItem key={colName} value={colName}>
                        {colName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton
                  onClick={() => removeSelectCol(index)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button variant="contained" onClick={addSelectCol} sx={{ mb: 4 }}>
              Add Select Column
            </Button>

            {/* Column Order */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              Column Order
            </Typography>
            <Button
              variant="outlined"
              onClick={loadPossibleColumns}
              sx={{ mb: 2 }}
            >
              Load Possible Columns
            </Button>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndColumn}
            >
              <SortableContext
                items={columnOrder}
                strategy={verticalListSortingStrategy}
              >
                {columnOrder.map((col, index) => (
                  <SortableItem key={col} id={col}>
                    {(listeners) => (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 2,
                          bgcolor: "grey.50",
                          borderRadius: 1,
                          mb: 2,
                        }}
                      >
                        <IconButton {...listeners} sx={{ cursor: "grab" }}>
                          <DragIndicator />
                        </IconButton>
                        <Typography sx={{ flex: 1 }}>{col}</Typography>
                        <IconButton
                          onClick={() => removeColumnOrder(index)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateJson}
              >
                Generate JSON
              </Button>
              <Button variant="contained" color="success" onClick={saveReport}>
                Save Report
              </Button>
            </Box>
          </Col>

          {/* Preview */}
          <Col md={6}>
            <Typography
              variant="h5"
              sx={{ color: "grey.800", mb: 2, fontWeight: "bold" }}
            >
              Preview
            </Typography>
            <Preview generateParams={generateParams} />
          </Col>
        </Row>

        {/* Modal for Section */}
        <Modal open={modalOpen} onClose={closeModal}>
          <Box
            sx={{
              bgcolor: "white",
              p: 4,
              borderRadius: 2,
              maxWidth: 500,
              mx: "auto",
              mt: "20px",
              boxShadow: 24,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <Typography variant="h5" sx={{ mb: 3 }}>
              Configure Section
            </Typography>
            <TextField
              label="Section Name"
              value={modalSectionData.sectionName}
              onChange={(e) => updateSectionName(e.target.value)}
              fullWidth
              sx={{ mb: 3 }}
            />
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Fields
            </Typography>
            {modalSectionData.fields.map((field, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", mb: 2 }}
              >
                <TextField
                  label="Alias"
                  value={field.alias}
                  onChange={(e) => updateFieldAlias(index, e.target.value)}
                  sx={{ width: "40%", mr: 2 }}
                />
                <FormControl sx={{ width: "40%", mr: 2 }}>
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={field.source}
                    label="Source"
                    onChange={(e) => updateFieldSource(index, e.target.value)}
                  >
                    <MenuItem value="" disabled>
                      Select Source
                    </MenuItem>
                    {formFields.map((formField) => (
                      <MenuItem key={formField} value={formField}>
                        {formField}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <IconButton onClick={() => removeField(index)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addField}
              sx={{ mb: 3 }}
            >
              Add Field
            </Button>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="contained" onClick={saveModal}>
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

export default CreateDynamicReportUI;
