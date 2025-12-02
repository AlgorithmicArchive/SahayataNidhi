import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Divider,
  Stack,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  PlayArrow as RunIcon,
  DragHandle as DragIcon,
} from "@mui/icons-material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// ─────────────────────────────────────────────────────────────────────────────
// EASY UPDATE: Toggle between dummy and real API
// ─────────────────────────────────────────────────────────────────────────────
const USE_DUMMY_DATA = true; // Set to false to use real APIs
const METADATA_URL = "/api/report-metadata"; // Real endpoint for tables/relationships
const RUN_REPORT_URL = "/api/run-dynamic-report"; // Real endpoint for preview/run

// ─────────────────────────────────────────────────────────────────────────────
// DUMMY DATA: Replace this object when switching to API
// ─────────────────────────────────────────────────────────────────────────────
const DUMMY_METADATA = {
  tables: [
    {
      name: "Orders",
      label: "Orders",
      columns: [
        { name: "OrderId", label: "Order ID", type: "number" },
        { name: "OrderDate", label: "Order Date", type: "date" },
        { name: "CustomerId", label: "Customer ID", type: "number" },
        { name: "OrderDetails", label: "Order Details (JSON)", type: "json" },
      ],
    },
    {
      name: "Customers",
      label: "Customers",
      columns: [
        { name: "CustomerId", label: "Customer ID", type: "number" },
        { name: "Name", label: "Customer Name", type: "string" },
        { name: "Email", label: "Email", type: "string" },
      ],
    },
    {
      name: "Products",
      label: "Products",
      columns: [
        { name: "ProductId", label: "Product ID", type: "number" },
        { name: "Name", label: "Product Name", type: "string" },
        { name: "Price", label: "Price", type: "number" },
      ],
    },
  ],
  relationships: [
    {
      fromTable: "Orders",
      fromColumn: "CustomerId",
      toTable: "Customers",
      toColumn: "CustomerId",
    },
    {
      fromTable: "Orders",
      fromColumn: "OrderDetails",
      toTable: "Products",
      toColumn: "ProductId",
    }, // Assuming JSON path extraction
  ],
};

// DUMMY RESULTS: Simple mock rows based on selections (expand as needed)
const generateDummyResults = (selectedTables, selectedColumns) => {
  const rows = [
    {
      "Orders.OrderId": 1,
      "Customers.Name": "John Doe",
      "Orders.OrderDate": "2024-01-15",
      "JSON_VALUE(Orders.OrderDetails, '$.ProductId') AS ProductId": 101,
      "Products.Name": "Widget A",
    },
    {
      "Orders.OrderId": 2,
      "Customers.Name": "Jane Smith",
      "Orders.OrderDate": "2024-02-20",
      "JSON_VALUE(Orders.OrderDetails, '$.ProductId') AS ProductId": 102,
      "Products.Name": "Gadget B",
    },
    // Add more rows...
  ];

  // Filter/map to selected columns only
  return rows.map((row) => {
    const filtered = {};
    selectedColumns.forEach((col) => {
      const key = col.isJson
        ? `JSON_VALUE(${col.table}.${col.name}, '${
            col.jsonPath
          }') AS ${col.jsonPath.replace("$.", "")}`
        : `${col.table}.${col.name}`;
      filtered[key] = row[key] || "N/A";
    });
    return filtered;
  });
};

export default function CreateReports() {
  const [activeStep, setActiveStep] = useState(0);
  const [tables, setTables] = useState([]); // { name, label, columns: [{name, label, type, isJson, jsonPath}] }
  const [relationships, setRelationships] = useState([]); // [{fromTable, fromColumn, toTable, toColumn}]
  const [selectedTables, setSelectedTables] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]); // {id, column, operator, value}
  const [sortOrder, setSortOrder] = useState([]); // [{column, dir}]
  const [reportName, setReportName] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewSql, setPreviewSql] = useState("");
  const [result, setResult] = useState([]);
  const [error, setError] = useState("");

  const steps = [
    "Select Tables",
    "Choose Columns",
    "Add Filters",
    "Sort",
    "Preview & Run",
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // Load metadata: Dummy or API
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (USE_DUMMY_DATA) {
      setTables(DUMMY_METADATA.tables);
      setRelationships(DUMMY_METADATA.relationships);
    } else {
      // Real API call
      // axios.get(METADATA_URL).then(res => {
      //   setTables(res.data.tables || []);
      //   setRelationships(res.data.relationships || []);
      // }).catch(() => setError("Failed to load metadata"));
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-detect joins (FK → PK)
  // ─────────────────────────────────────────────────────────────────────────────
  const getAutoJoins = () => {
    const joins = [];
    const used = new Set();

    selectedTables.forEach((t1) => {
      selectedTables.forEach((t2) => {
        if (t1 === t2) return;
        const key = `${t1}-${t2}`;
        if (used.has(key) || used.has(`${t2}-${t1}`)) return;

        const rel = relationships.find(
          (r) =>
            (r.fromTable === t1 && r.toTable === t2) ||
            (r.fromTable === t2 && r.toTable === t1),
        );
        if (rel) {
          const dir = rel.fromTable === t1 ? "INNER" : "INNER";
          joins.push(
            `${dir} JOIN ${rel.toTable} ON ${rel.fromTable}.${rel.fromColumn} = ${rel.toTable}.${rel.toColumn}`,
          );
          used.add(key);
        }
      });
    });
    return joins.join(" ");
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Build safe payload for backend (or dummy)
  // ─────────────────────────────────────────────────────────────────────────────
  const generatePayload = () => ({
    reportName,
    tables: selectedTables,
    columns: selectedColumns.map((c) => ({
      table: c.table,
      name: c.name,
      label: c.label,
      isJson: !!c.isJson,
      jsonPath: c.jsonPath || null,
    })),
    joins: getAutoJoins(),
    filters: filters,
    sort: sortOrder,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Generate preview SQL (client-side dummy; move to server for real)
  // ─────────────────────────────────────────────────────────────────────────────
  const generatePreviewSQL = () => {
    let sql = `SELECT `;
    sql += selectedColumns
      .map((c) => {
        if (c.isJson) {
          return `JSON_VALUE(${c.table}.${c.name}, '${
            c.jsonPath
          }') AS ${c.jsonPath.replace("$.", "")}`;
        }
        return `${c.table}.${c.name}`;
      })
      .join(", ");
    sql += ` FROM ${selectedTables.join(", ")}`;
    if (getAutoJoins()) sql += ` ${getAutoJoins()}`;
    if (filters.length)
      sql += ` WHERE ${filters
        .map((f) => `${f.column} ${f.operator} '${f.value}'`)
        .join(" AND ")}`;
    if (sortOrder.length)
      sql += ` ORDER BY ${sortOrder
        .map((s) => `${s.column} ${s.dir}`)
        .join(", ")}`;
    return sql;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Preview: Dummy or API
  // ─────────────────────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    setLoading(true);
    try {
      if (USE_DUMMY_DATA) {
        setPreviewSql(generatePreviewSQL());
      } else {
        // Real API: const res = await axios.post(RUN_REPORT_URL, { ...generatePayload(), preview: true });
        // setPreviewSql(res.data.sql);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Preview failed");
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Run: Dummy or API
  // ─────────────────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    setLoading(true);
    setResult([]);
    try {
      if (USE_DUMMY_DATA) {
        const dummyRows = generateDummyResults(selectedTables, selectedColumns);
        // Apply filters/sort dummy-logic here if needed
        setResult(dummyRows);
      } else {
        // Real API: const res = await axios.post(RUN_REPORT_URL, generatePayload());
        // setResult(res.data.rows);
      }
      setActiveStep(steps.length - 1);
    } catch (e) {
      setError(e.response?.data?.message || "Run failed");
    }
    setLoading(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Step navigation
  // ─────────────────────────────────────────────────────────────────────────────
  const nextStep = () =>
    setActiveStep((a) => Math.min(a + 1, steps.length - 1));
  const prevStep = () => setActiveStep((a) => Math.max(a - 1, 0));

  // ─────────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────────
  const availableColumns = tables
    .filter((t) => selectedTables.includes(t.name))
    .flatMap((t) =>
      t.columns.map((c) => ({ ...c, table: t.name, tableLabel: t.label })),
    );

  // Enhance columns with JSON support (dummy example for OrderDetails)
  const enhancedColumns = availableColumns
    .map((col) => {
      if (col.table === "Orders" && col.name === "OrderDetails") {
        return [
          col,
          {
            ...col,
            isJson: true,
            jsonPath: "$.ProductId",
            label: `${col.label} → ProductId`,
          },
          {
            ...col,
            isJson: true,
            jsonPath: "$.Quantity",
            label: `${col.label} → Quantity`,
          },
        ];
      }
      return col;
    })
    .flat();

  const operatorOptions = {
    string: ["equals", "contains", "in"],
    number: ["equals", ">", "<", ">=", "<=", "between"],
    date: ["equals", ">", "<", ">=", "<="],
  };

  const getOperatorOptionsForColumn = (column) => {
    const type =
      enhancedColumns.find((c) => `${c.table}.${c.name}` === column)?.type ||
      "string";
    return operatorOptions[type] || operatorOptions.string;
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h4" gutterBottom>
        Create Dynamic Reports
      </Typography>

      <Stepper activeStep={activeStep} sx={{ my: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ───── Step 1: Tables ───── */}
      {activeStep === 0 && (
        <Paper sx={{ p: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Select Tables</InputLabel>
            <Select
              multiple
              value={selectedTables}
              onChange={(e) => setSelectedTables(e.target.value)}
              input={<OutlinedInput label="Select Tables" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((v) => (
                    <Chip
                      key={v}
                      label={tables.find((t) => t.name === v)?.label || v}
                    />
                  ))}
                </Box>
              )}
            >
              {tables.map((t) => (
                <MenuItem key={t.name} value={t.name}>
                  <Checkbox checked={selectedTables.includes(t.name)} />
                  <ListItemText primary={t.label || t.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {/* ───── Step 2: Columns ───── */}
      {activeStep === 1 && (
        <Paper sx={{ p: 3 }}>
          <FormControl fullWidth>
            <InputLabel>Choose Columns</InputLabel>
            <Select
              multiple
              value={selectedColumns}
              onChange={(e) => setSelectedColumns(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((c) => (
                    <Chip
                      key={`${c.table}.${c.name}${
                        c.isJson ? `-${c.jsonPath}` : ""
                      }`}
                      label={c.label || c.name}
                    />
                  ))}
                </Box>
              )}
            >
              {enhancedColumns.map((col) => (
                <MenuItem
                  key={`${col.table}.${col.name}${
                    col.isJson ? `-${col.jsonPath}` : ""
                  }`}
                  value={col}
                >
                  <Checkbox
                    checked={selectedColumns.some(
                      (c) =>
                        c.table === col.table &&
                        c.name === col.name &&
                        c.isJson === col.isJson &&
                        c.jsonPath === col.jsonPath,
                    )}
                  />
                  <ListItemText
                    primary={`${col.tableLabel} → ${col.label || col.name}`}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
      )}

      {/* ───── Step 3: Filters ───── */}
      {activeStep === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add Filters
          </Typography>
          {filters.map((f, i) => (
            <Stack
              direction="row"
              spacing={2}
              key={f.id}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Select
                value={f.column}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i].column = e.target.value;
                  newFilters[i].operator = getOperatorOptionsForColumn(
                    e.target.value,
                  )[0];
                  newFilters[i].value = "";
                  setFilters(newFilters);
                }}
                size="small"
              >
                <MenuItem value="">Select Column</MenuItem>
                {enhancedColumns.map((c) => (
                  <MenuItem
                    key={`${c.table}.${c.name}${
                      c.isJson ? `-${c.jsonPath}` : ""
                    }`}
                    value={`${c.table}.${c.name}${
                      c.isJson ? ` (JSON: ${c.jsonPath})` : ""
                    }`}
                  >
                    {c.tableLabel} → {c.label || c.name}
                  </MenuItem>
                ))}
              </Select>

              <Select
                value={f.operator}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i].operator = e.target.value;
                  setFilters(newFilters);
                }}
                size="small"
              >
                {getOperatorOptionsForColumn(f.column).map((op) => (
                  <MenuItem key={op} value={op}>
                    {op}
                  </MenuItem>
                ))}
              </Select>

              <TextField
                size="small"
                placeholder="Value"
                value={f.value}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[i].value = e.target.value;
                  setFilters(newFilters);
                }}
              />

              <IconButton
                onClick={() =>
                  setFilters(filters.filter((_, idx) => idx !== i))
                }
              >
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}

          <Button
            startIcon={<AddIcon />}
            onClick={() =>
              setFilters([
                ...filters,
                {
                  id: Date.now().toString(),
                  column: "",
                  operator: "equals",
                  value: "",
                },
              ])
            }
          >
            Add Filter
          </Button>
        </Paper>
      )}

      {/* ───── Step 4: Sort ───── */}
      {activeStep === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sort Order (drag to reorder)
          </Typography>
          <DragDropContext
            onDragEnd={(result) => {
              if (!result.destination) return;
              const items = Array.from(sortOrder);
              const [moved] = items.splice(result.source.index, 1);
              items.splice(result.destination.index, 0, moved);
              setSortOrder(items);
            }}
          >
            <Droppable droppableId="sort">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {sortOrder.map((s, i) => (
                    <Draggable key={s.column} draggableId={s.column} index={i}>
                      {(provided) => (
                        <Box
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 1,
                            background: "#f5f5f5",
                            p: 1,
                            borderRadius: 1,
                          }}
                        >
                          <span {...provided.dragHandleProps}>
                            <DragIcon />
                          </span>
                          <Typography sx={{ flex: 1, ml: 2 }}>
                            {enhancedColumns.find(
                              (c) =>
                                `${c.table}.${c.name}${
                                  c.isJson ? `-${c.jsonPath}` : ""
                                }` === s.column,
                            )?.label || s.column}
                          </Typography>
                          <Select
                            size="small"
                            value={s.dir}
                            onChange={(e) => {
                              const newOrder = [...sortOrder];
                              newOrder[i].dir = e.target.value;
                              setSortOrder(newOrder);
                            }}
                          >
                            <MenuItem value="ASC">Ascending</MenuItem>
                            <MenuItem value="DESC">Descending</MenuItem>
                          </Select>
                          <IconButton
                            onClick={() =>
                              setSortOrder(
                                sortOrder.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <Box sx={{ mt: 2 }}>
            <Select
              displayEmpty
              size="small"
              onChange={(e) => {
                const col = e.target.value;
                if (col && !sortOrder.some((s) => s.column === col)) {
                  setSortOrder([...sortOrder, { column: col, dir: "ASC" }]);
                }
              }}
            >
              <MenuItem value="" disabled>
                Add column to sort
              </MenuItem>
              {enhancedColumns.map((c) => (
                <MenuItem
                  key={`${c.table}.${c.name}${
                    c.isJson ? `-${c.jsonPath}` : ""
                  }`}
                  value={`${c.table}.${c.name}${
                    c.isJson ? `-${c.jsonPath}` : ""
                  }`}
                >
                  {c.tableLabel} → {c.label || c.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </Paper>
      )}

      {/* ───── Step 5: Preview & Run ───── */}
      {activeStep === 4 && (
        <Paper sx={{ p: 3 }}>
          <TextField
            fullWidth
            label="Report Name"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            disabled={loading}
          >
            Preview SQL
          </Button>

          {previewSql && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                background: "#f9f9f9",
                borderRadius: 1,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
              }}
            >
              {previewSql}
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<RunIcon />}
              onClick={handleRun}
              disabled={loading || !reportName}
            >
              Run Report
            </Button>
          </Box>

          {loading && <CircularProgress sx={{ mt: 3 }} />}

          {result.length > 0 && (
            <TableContainer component={Paper} sx={{ mt: 4 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(result[0] || {}).map((h) => (
                      <TableCell key={h}>
                        <strong>{h}</strong>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.slice(0, 100).map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((v, j) => (
                        <TableCell key={j}>{String(v)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.length > 100 && (
                <Typography sx={{ p: 2 }}>Showing first 100 rows...</Typography>
              )}
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ───── Navigation Buttons ───── */}
      <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between" }}>
        <Button disabled={activeStep === 0} onClick={prevStep}>
          Back
        </Button>
        {activeStep < steps.length - 1 && (
          <Button
            variant="contained"
            onClick={nextStep}
            disabled={
              (activeStep === 0 && selectedTables.length === 0) ||
              (activeStep === 1 && selectedColumns.length === 0)
            }
          >
            Next
          </Button>
        )}
      </Box>
    </Box>
  );
}
