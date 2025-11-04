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
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  Chip,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicator from "@mui/icons-material/DragIndicator";
import FilterListIcon from "@mui/icons-material/FilterList";
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
import { UserContext } from "../../UserContext";

/* --------------------------------------------------------------
   Sortable Item
   -------------------------------------------------------------- */
const SortableItem = ({ id, children, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Box ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </Box>
  );
};

/* --------------------------------------------------------------
   Report Preview
   -------------------------------------------------------------- */
const ReportPreview = memo(({ columns, filters }) => {
  if (columns.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        Add columns to see a preview.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.name} sx={{ fontWeight: "bold" }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.name}>{c.sample ?? "—"}</TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
      {filters.length > 0 && (
        <caption style={{ captionSide: "bottom", textAlign: "left", mt: 1 }}>
          <strong>Filters Applied:</strong>{" "}
          {filters.map((f, i) => (
            <Chip
              key={i}
              label={`${f.label} ${f.operator} ${f.value}`}
              size="small"
              sx={{ mr: 0.5 }}
            />
          ))}
        </caption>
      )}
    </TableContainer>
  );
});

/* --------------------------------------------------------------
   SQL Generator (Safe, No Injection)
   -------------------------------------------------------------- */
const generateSQL = (columns, filters, tableName = "beneficiaries") => {
  const select = columns.map((c) => c.name).join(", ") || "*";
  const whereClauses = filters
    .map((f) => {
      const value = typeof f.value === "string" ? `'${f.value}'` : f.value;
      return `${f.name} ${f.operator} ${value}`;
    })
    .join(" AND ");

  const where = whereClauses ? ` WHERE ${whereClauses}` : "";
  const orderBy = columns.length > 0 ? ` ORDER BY ${columns[0].name}` : "";

  return `SELECT ${select} FROM ${tableName}${where}${orderBy};`;
};

/* --------------------------------------------------------------
   Main Component
   -------------------------------------------------------------- */
const CreateReportsg = () => {
  const { userType } = useContext(UserContext);

  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [columns, setColumns] = useState([]); // { name, label, sample, order }
  const [filters, setFilters] = useState([]); // { name, label, type, operator, value }
  const [formFields, setFormFields] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(-1);
  const [modalData, setModalData] = useState({
    label: "",
    name: "",
    sample: "",
  });

  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterData, setFilterData] = useState({
    name: "",
    label: "",
    type: "text",
    operator: "=",
    value: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  /* ---------- Fetch Services ---------- */
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await axiosInstance.get("/Base/GetServices");
        if (data.status && Array.isArray(data.services)) {
          setServices(data.services);
        } else {
          toast.error("No services found.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load services.");
      }
    };
    fetchServices();
  }, []);

  /* ---------- Fetch Fields ---------- */
  useEffect(() => {
    if (!selectedServiceId) {
      setFormFields([]);
      setColumns([]);
      setFilters([]);
      return;
    }

    const fetchFields = async () => {
      setIsFetching(true);
      try {
        const { data } = await axiosInstance.get("/Designer/GetFormElements", {
          params: { serviceId: selectedServiceId },
        });

        if (data.status) {
          const sectionFields = Array.isArray(data.sections)
            ? data.sections.flatMap((s) =>
                s.fields.map((f) => ({ name: f.name, label: f.label })),
              )
            : [];

          const columnFields = Array.isArray(data.columnNames)
            ? data.columnNames.map((n) => ({ name: n, label: n }))
            : [];

          const uniq = new Map();
          [...sectionFields, ...columnFields].forEach((f) =>
            uniq.set(f.name, f),
          );
          setFormFields(Array.from(uniq.values()));

          // Load saved config
          try {
            const saved = await axiosInstance.get("/Designer/GetReportConfig", {
              params: { serviceId: selectedServiceId },
            });
            if (saved.data?.config) {
              setColumns(saved.data.config.columns || []);
              setFilters(saved.data.config.filters || []);
              toast.success("Report config loaded.");
            }
          } catch {}
        } else {
          toast.warn("No fields found.");
        }
      } catch (err) {
        toast.error("Failed to load fields.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchFields();
  }, [selectedServiceId]);

  /* ---------- Column Modal ---------- */
  const openAddColumn = () => {
    setModalIndex(-1);
    setModalData({ label: "", name: "", sample: "" });
    setModalOpen(true);
  };

  const openEditColumn = (idx) => {
    const col = columns[idx];
    setModalIndex(idx);
    setModalData({
      label: col.label,
      name: col.name,
      sample: col.sample || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalIndex(-1);
    setModalData({ label: "", name: "", sample: "" });
  };

  const saveColumn = () => {
    if (!modalData.label.trim()) return toast.error("Label required.");
    if (!modalData.name) return toast.error("Select a field.");

    const newCols = [...columns];
    const sample = modalData.sample.trim() || "Sample";

    if (modalIndex === -1) {
      newCols.push({ ...modalData, order: columns.length, sample });
    } else {
      newCols[modalIndex] = {
        ...modalData,
        order: newCols[modalIndex].order,
        sample,
      };
    }
    setColumns(newCols);
    closeModal();
  };

  const removeColumn = (idx) => {
    setColumns(columns.filter((_, i) => i !== idx));
  };

  /* ---------- Filter Modal ---------- */
  const openFilterModal = () => {
    setFilterData({
      name: "",
      label: "",
      type: "text",
      operator: "=",
      value: "",
    });
    setFilterModalOpen(true);
  };

  const saveFilter = () => {
    if (!filterData.name) return toast.error("Select a field.");
    if (!filterData.value && filterData.value !== 0)
      return toast.error("Enter a value.");

    const field = formFields.find((f) => f.name === filterData.name);
    setFilters((prev) => [
      ...prev.filter((f) => f.name !== filterData.name),
      { ...filterData, label: field.label },
    ]);
    setFilterModalOpen(false);
  };

  const removeFilter = (name) => {
    setFilters(filters.filter((f) => f.name !== name));
  };

  /* ---------- Drag End ---------- */
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = columns.findIndex((c) => c.name === active.id);
    const newIdx = columns.findIndex((c) => c.name === over.id);
    const newCols = [...columns];
    const [moved] = newCols.splice(oldIdx, 1);
    newCols.splice(newIdx, 0, moved);
    newCols.forEach((c, i) => (c.order = i));
    setColumns(newCols);
  };

  /* ---------- Generate Config + SQL ---------- */
  const generateReportConfig = () => {
    const sql = generateSQL(columns, filters);
    return { columns, filters, sql };
  };

  /* ---------- Save Report ---------- */
  const saveReport = async () => {
    if (!selectedServiceId) return toast.error("Select a service.");
    if (columns.length === 0) return toast.error("Add at least one column.");

    const config = generateReportConfig();

    const payload = new FormData();
    payload.append("serviceId", selectedServiceId);
    payload.append("config", JSON.stringify(config));

    try {
      const { data } = await axiosInstance.post(
        "/Designer/SaveReportConfig",
        payload,
      );
      if (data.status) {
        toast.success("Report saved! SQL:\n" + config.sql);
      } else {
        toast.error(data.message ?? "Save failed.");
      }
    } catch (err) {
      toast.error("Error saving report.");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      <Container
        maxWidth="lg"
        sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 3, p: 4 }}
      >
        <Row>
          {/* LEFT: Config */}
          <Col md={6}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
              Dynamic Report Builder
            </Typography>

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Service</InputLabel>
              <Select
                value={selectedServiceId}
                label="Select Service"
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  setColumns([]);
                  setFilters([]);
                }}
              >
                <MenuItem value="" disabled>
                  Choose...
                </MenuItem>
                {services.map((s) => (
                  <MenuItem key={s.serviceId} value={s.serviceId}>
                    {s.serviceName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {isFetching && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography>Loading fields...</Typography>
              </Box>
            )}
            {fetchError && <Alert severity="error">{fetchError}</Alert>}

            {/* Columns */}
            <Typography variant="h6" sx={{ mb: 1 }}>
              Columns
            </Typography>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.name)}
                strategy={verticalListSortingStrategy}
              >
                {columns.map((col, idx) => (
                  <SortableItem
                    key={col.name}
                    id={col.name}
                    disabled={isFetching}
                  >
                    {(listeners) => (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1.5,
                          bgcolor: "grey.50",
                          borderRadius: 1,
                          mb: 1,
                          boxShadow: 1,
                        }}
                      >
                        <IconButton {...listeners} sx={{ cursor: "grab" }}>
                          <DragIndicator fontSize="small" />
                        </IconButton>
                        <Box sx={{ flex: 1, mx: 1 }}>
                          <Typography variant="body2">
                            <strong>{col.label}</strong> ({col.name})
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditColumn(idx)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeColumn(idx)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openAddColumn}
              disabled={isFetching || formFields.length === 0}
              sx={{ mt: 1, mb: 2 }}
            >
              Add Column
            </Button>

            {/* Filters */}
            <Typography variant="h6" sx={{ mb: 1, mt: 3 }}>
              Filters
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
              {filters.map((f) => (
                <Chip
                  key={f.name}
                  label={`${f.label} ${f.operator} ${f.value}`}
                  onDelete={() => removeFilter(f.name)}
                  color="primary"
                  variant="outlined"
                />
              ))}
              <Button
                size="small"
                startIcon={<FilterListIcon />}
                onClick={openFilterModal}
                variant="outlined"
              >
                Add Filter
              </Button>
            </Stack>

            {/* Actions */}
            <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => toast.info(generateSQL(columns, filters))}
              >
                Show SQL
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={saveReport}
                disabled={isFetching || columns.length === 0}
              >
                Save Report
              </Button>
            </Box>
          </Col>

          {/* RIGHT: Preview */}
          <Col md={6}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
              Live Preview
            </Typography>
            <ReportPreview columns={columns} filters={filters} />
          </Col>
        </Row>

        {/* Column Modal */}
        <Modal open={modalOpen} onClose={closeModal}>
          <Box
            sx={{
              bgcolor: "background.paper",
              p: 4,
              borderRadius: 2,
              maxWidth: 560,
              mx: "auto",
              mt: "8%",
              boxShadow: 24,
            }}
          >
            <Typography variant="h6" sx={{ mb: 3 }}>
              {modalIndex === -1 ? "Add Column" : "Edit Column"}
            </Typography>
            <TextField
              label="Label"
              value={modalData.label}
              onChange={(e) =>
                setModalData((p) => ({ ...p, label: e.target.value }))
              }
              fullWidth
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Field</InputLabel>
              <Select
                value={modalData.name}
                label="Field"
                onChange={(e) => {
                  const field = formFields.find(
                    (f) => f.name === e.target.value,
                  );
                  setModalData((p) => ({
                    ...p,
                    name: e.target.value,
                    label: p.label || field?.label || "",
                  }));
                }}
              >
                <MenuItem value="" disabled>
                  Select field
                </MenuItem>
                {formFields.map((f) => (
                  <MenuItem key={f.name} value={f.name}>
                    {f.label} ({f.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Sample Value"
              value={modalData.sample}
              onChange={(e) =>
                setModalData((p) => ({ ...p, sample: e.target.value }))
              }
              fullWidth
              placeholder="e.g. John"
              helperText="For preview only"
              sx={{ mb: 3 }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" onClick={closeModal}>
                Cancel
              </Button>
              <Button variant="contained" onClick={saveColumn}>
                {modalIndex === -1 ? "Add" : "Update"}
              </Button>
            </Box>
          </Box>
        </Modal>

        {/* Filter Modal */}
        <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)}>
          <Box
            sx={{
              bgcolor: "background.paper",
              p: 4,
              borderRadius: 2,
              maxWidth: 560,
              mx: "auto",
              mt: "8%",
              boxShadow: 24,
            }}
          >
            <Typography variant="h6" sx={{ mb: 3 }}>
              Add Filter
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Field</InputLabel>
              <Select
                value={filterData.name}
                onChange={(e) => {
                  const field = formFields.find(
                    (f) => f.name === e.target.value,
                  );
                  setFilterData((p) => ({
                    ...p,
                    name: e.target.value,
                    label: field?.label || "",
                    type: "text", // You can infer type from field metadata later
                  }));
                }}
              >
                <MenuItem value="" disabled>
                  Select field
                </MenuItem>
                {formFields.map((f) => (
                  <MenuItem key={f.name} value={f.name}>
                    {f.label} ({f.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Operator</InputLabel>
              <Select
                value={filterData.operator}
                onChange={(e) =>
                  setFilterData((p) => ({ ...p, operator: e.target.value }))
                }
              >
                <MenuItem value="=">=</MenuItem>
                <MenuItem value="!=">≠</MenuItem>
                <MenuItem value=">">Greater Than</MenuItem>
                <MenuItem value="<">Lesser Than</MenuItem>
                <MenuItem value=">=">≥</MenuItem>
                <MenuItem value="<=">≤</MenuItem>
                <MenuItem value="contains">contains</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Value"
              value={filterData.value}
              onChange={(e) =>
                setFilterData((p) => ({ ...p, value: e.target.value }))
              }
              fullWidth
              sx={{ mb: 3 }}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setFilterModalOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="contained" onClick={saveFilter}>
                Add Filter
              </Button>
            </Box>
          </Box>
        </Modal>
      </Container>

      <ToastContainer />
    </Box>
  );
};

export default CreateReportsg;
