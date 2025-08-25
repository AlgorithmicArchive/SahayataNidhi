import React, { useState, useEffect, useCallback, useMemo } from "react";
import { MaterialReactTable } from "material-react-table";
import {
  Box,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  IconButton,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import DescriptionIcon from "@mui/icons-material/Description";
import TableChartIcon from "@mui/icons-material/TableChart";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../axiosConfig";
import styled from "@emotion/styled";

const TableContainer = styled(Box)`
  background: linear-gradient(180deg, #e6f0fa 0%, #b3cde0 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
`;

const TableCard = styled(Box)`
  background: #ffffff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  width: 100%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  }
`;

const ActionButton = styled(Button)`
  background: linear-gradient(45deg, #1e88e5, #4fc3f7);
  color: #ffffff;
  font-weight: 600;
  text-transform: none;
  border-radius: 8px;
  padding: 0.5rem 1.5rem;
  transition: all 0.3s ease;
  &:hover {
    background: linear-gradient(45deg, #1565c0, #039be5);
    box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
  }
`;

const StyledIconButton = styled(IconButton)`
  color: #1e88e5;
  border: 1px solid #1e88e5;
  border-radius: 8px;
  padding: 0.5rem;
  transition: all 0.3s ease;
  &:hover {
    background: linear-gradient(45deg, #1e88e5, #4fc3f7);
    color: #ffffff;
    transform: scale(1.02);
  }
`;

const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  & .MuiToggleButton-root {
    text-transform: none;
    font-weight: 600;
    padding: 0.5rem 2rem;
    border-radius: 8px;
    border: 1px solid #b3cde0;
    color: #1f2937;
    transition: all 0.3s ease;
    &:hover {
      background: #e6f0fa;
      transform: scale(1.02);
    }
    &.Mui-selected {
      background: linear-gradient(45deg, #1e88e5, #4fc3f7);
      color: #ffffff;
      &:hover {
        background: linear-gradient(45deg, #1565c0, #039be5);
      }
    }
  }
`;

const StyledFormControl = styled(FormControl)`
  & .MuiOutlinedInput-root {
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #b3cde0;
    &:hover .MuiOutlinedInput-notchedOutline {
      border-color: #1e88e5;
    }
    &.Mui-focused .MuiOutlinedInput-notchedOutline {
      border-color: #1e88e5;
      border-width: 2px;
    }
  }
  & .MuiInputLabel-root {
    color: #1f2937;
    &.Mui-focused {
      color: #1e88e5;
    }
  }
  min-width: 150px;
  margin-right: 1rem;
`;

// Memoized Input Cell Component to prevent re-renders and focus loss
const InputCell = React.memo(({ row, inputValues, setInputValues }) => {
  const [localValue, setLocalValue] = useState(
    inputValues[row.original.sno] || "",
  );

  // Sync local value with parent state only when parent state changes externally
  useEffect(() => {
    if (inputValues[row.original.sno] !== localValue) {
      setLocalValue(inputValues[row.original.sno] || "");
    }
  }, [inputValues[row.original.sno], row.original.sno]); // Removed localValue from dependencies

  const handleInputChange = useCallback(
    (e) => {
      const value = e.target.value;
      setLocalValue(value);

      // Immediate update to parent state without debouncing
      setInputValues((prev) => ({
        ...prev,
        [row.original.sno]: value,
      }));
    },
    [row.original.sno, setInputValues],
  );

  return (
    <TextField
      type="text"
      variant="outlined"
      size="small"
      value={localValue}
      onChange={handleInputChange}
      fullWidth
      autoComplete="off"
      placeholder="Enter Aadhaar Number"
      inputProps={{
        maxLength: 12,
        pattern: "[0-9]*",
      }}
      onFocus={(e) => e.target.select()}
    />
  );
});

const ServerSideTable = React.forwardRef(
  (
    {
      url,
      actionFunctions,
      extraParams = {},
      canSanction = false,
      canHavePool = false,
      pendingApplications = false,
      serviceId,
      refreshTrigger,
      onPushToPool,
      onExecuteAction,
      actionOptions,
      selectedAction,
      setSelectedAction,
      Title,
    },
    ref,
  ) => {
    const [columns, setColumns] = useState([]);
    const [inboxData, setInboxData] = useState([]);
    const [poolData, setPoolData] = useState([]);
    const [pageCount, setPageCount] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [rowSelection, setRowSelection] = useState({});
    const [pagination, setPagination] = useState({
      pageIndex: 0,
      pageSize: 10,
    });
    const [viewType, setViewType] = useState("Inbox");
    const [hasActions, setHasActions] = useState(false);
    const [columnOrder, setColumnOrder] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const [downloadType, setDownloadType] = useState(null);
    const [inputValues, setInputValues] = useState({});

    // Storage key unique to the table instance
    const storageKey = Title.toLowerCase()
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase(),
      )
      .replace(/\s+/g, "");

    // Memoized setInputValues to prevent unnecessary re-renders
    const memoizedSetInputValues = useCallback((updater) => {
      setInputValues(updater);
    }, []);

    // Log props for debugging
    useEffect(() => {
      console.log("ServerSideTable props:", {
        url,
        serviceId,
        extraParams,
        Title,
      });
    }, [url, serviceId, extraParams, Title]);

    // Load saved column settings from localStorage on mount
    useEffect(() => {
      const fetchTableSettings = async () => {
        try {
          const response = await axiosInstance.get("/Base/GetTableSettings", {
            params: { storageKey: storageKey },
          });

          if (response.data?.status && response.data?.tableSettings) {
            try {
              const savedSettings = response.data.tableSettings;
              if (savedSettings) {
                const parsedSettings = JSON.parse(savedSettings);
                if (parsedSettings) {
                  const { savedColumnOrder, savedColumnVisibility } =
                    parsedSettings;
                  if (savedColumnOrder) setColumnOrder(savedColumnOrder);
                  if (savedColumnVisibility)
                    setColumnVisibility(savedColumnVisibility);
                }
              }
            } catch (parseError) {
              console.error("Error parsing table settings:", parseError);
              setColumnOrder([]);
              setColumnVisibility({});
            }
          }
        } catch (error) {
          console.error("Error fetching table settings:", error);
          setColumnOrder([]);
          setColumnVisibility({});
        }
      };
      fetchTableSettings();
    }, [storageKey]);

    // Save column settings to localStorage
    const saveColumnSettings = useCallback(async () => {
      const formData = new FormData();
      formData.append("storageKey", storageKey);
      formData.append(
        "storageValue",
        JSON.stringify({
          savedColumnOrder: columnOrder,
          savedColumnVisibility: columnVisibility,
        }),
      );

      await axiosInstance.post("/Base/SaveTableSettings", formData);
    }, [columnOrder, columnVisibility, storageKey]);

    // Update localStorage whenever columnOrder or columnVisibility changes
    useEffect(() => {
      if (columnOrder.length > 0 || Object.keys(columnVisibility).length > 0) {
        saveColumnSettings();
      }
    }, [columnOrder, columnVisibility, saveColumnSettings]);

    // Memoized function to create input column - removed inputValues dependency
    const createInputColumn = useCallback(() => {
      return {
        accessorKey: "customInput",
        header: "Aadhaar Number",
        size: 150,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => (
          <InputCell
            row={row}
            inputValues={inputValues}
            setInputValues={memoizedSetInputValues}
          />
        ),
      };
    }, [memoizedSetInputValues]); // Removed inputValues from dependencies

    const fetchData = useCallback(async () => {
      if (!url) {
        console.error("URL is undefined, cannot fetch data.");
        toast.error("Invalid configuration: URL is missing.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await axiosInstance.get(url, {
          params: {
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            ...extraParams,
          },
        });

        const json = response.data;

        const hasAnyActions =
          json.data?.some((row) => row.customActions?.length > 0) ||
          json.poolData?.some((row) => row.customActions?.length > 0) ||
          false;

        // base column config
        let updatedColumns = Object.values(json.columns || {}).map((col) =>
          col.accessorKey === "sno" ? { ...col, size: 20 } : col,
        );

        // 🔑 check if any row has "input: true"
        const hasInputColumn = json.data?.some((row) => row.input === true);

        if (hasInputColumn) {
          updatedColumns.push(createInputColumn());
        }

        setHasActions(hasAnyActions);
        setColumns(updatedColumns);
        setInboxData(json.data || []);
        setPoolData(json.poolData || []);
        setTotalRecords(json.totalRecords || 0);
        setPageCount(Math.ceil((json.totalRecords || 0) / pagination.pageSize));

        setColumnOrder((prevOrder) => {
          if (prevOrder.length === 0) {
            return updatedColumns.map((col) => col.accessorKey);
          }
          const newOrder = [...prevOrder];
          updatedColumns.forEach((col) => {
            if (!newOrder.includes(col.accessorKey)) {
              newOrder.push(col.accessorKey);
            }
          });
          return newOrder.filter((key) =>
            updatedColumns.some((col) => col.accessorKey === key),
          );
        });

        setColumnVisibility((prevVisibility) => {
          if (Object.keys(prevVisibility).length === 0) {
            const initialVisibility = {};
            updatedColumns.forEach((col) => {
              initialVisibility[col.accessorKey] = true;
            });
            return initialVisibility;
          }
          const newVisibility = { ...prevVisibility };
          updatedColumns.forEach((col) => {
            if (!(col.accessorKey in newVisibility)) {
              newVisibility[col.accessorKey] = true;
            }
          });
          Object.keys(newVisibility).forEach((key) => {
            if (!updatedColumns.some((col) => col.accessorKey === key)) {
              delete newVisibility[key];
            }
          });
          return newVisibility;
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load table data. Please try again.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
      } finally {
        setIsLoading(false);
      }
    }, [
      url,
      pagination.pageIndex,
      pagination.pageSize,
      extraParams,
      refreshTrigger,
      // Removed createInputColumn from dependencies to prevent refresh on input
    ]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    const handleDownload = async (format, scope) => {
      if (!url) {
        console.error("URL is undefined, cannot initiate download.");
        toast.error("Invalid configuration: URL is missing.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        return;
      }

      setIsLoading(true);
      setAnchorEl(null);
      setDownloadType(null);
      try {
        const formData = new FormData();
        formData.append("columnOrder", JSON.stringify(columnOrder));
        formData.append("columnVisibility", JSON.stringify(columnVisibility));
        formData.append("scope", scope);
        formData.append("format", format);
        formData.append("function", url.split("/").filter(Boolean).pop());

        if (scope === "InView") {
          formData.append("pageIndex", pagination.pageIndex.toString());
          formData.append("pageSize", pagination.pageSize.toString());
        }

        if (extraParams && typeof extraParams === "object") {
          Object.entries(extraParams).forEach(([key, value]) => {
            formData.append(key, value.toString());
          });
        }

        // Include input values in download
        if (Object.keys(inputValues).length > 0) {
          formData.append("inputValues", JSON.stringify(inputValues));
        }

        console.log("Sending formData:", {
          formData,
        });

        const response = await axiosInstance.post(
          "/Base/ExportData",
          formData,
          {
            responseType: "blob",
          },
        );

        const contentType = response.headers["content-type"];
        const extension = {
          Excel: "xlsx",
          Csv: "csv",
          Pdf: "pdf",
        }[format];
        const fileName = `${Title.replace(/\s+/g, "_")}_${scope}_${
          new Date().toISOString().split("T")[0]
        }.${extension}`;

        const blobUrl = window.URL.createObjectURL(
          new Blob([response.data], { type: contentType }),
        );
        const link = document.createElement("a");
        link.href = blobUrl;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        toast.success(`${format} file downloaded successfully!`, {
          position: "top-center",
          autoClose: 2000,
          theme: "colored",
        });
      } catch (error) {
        console.error(`Error downloading ${format} file:`, error);
        toast.error(`Failed to download ${format} file. Please try again.`, {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
      } finally {
        setIsLoading(false);
      }
    };

    const handleMenuOpen = (event, format) => {
      setAnchorEl(event.currentTarget);
      setDownloadType(format);
    };

    const handleMenuClose = () => {
      setAnchorEl(null);
      setDownloadType(null);
    };

    const isPoolView = viewType === "Pool";
    const tableData = isPoolView ? poolData : inboxData;
    const showToggleButtons =
      poolData && pendingApplications && canSanction && canHavePool;

    const handleViewTypeChange = (event, newViewType) => {
      if (newViewType !== null) {
        setViewType(newViewType);
        setRowSelection({});
      }
    };

    // Memoize the table data to prevent unnecessary re-renders
    const memoizedTableData = useMemo(() => tableData, [tableData]);
    const memoizedColumns = useMemo(() => columns, [columns]);

    return (
      <TableContainer ref={ref}>
        <TableCard>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#1f2937",
              fontFamily: "'Inter', sans-serif",
              mb: 2,
              textAlign: "center",
            }}
          >
            {Title}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="body2" color="#6b7280">
              Total Records: {totalRecords}
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Download as Excel" arrow>
                <StyledIconButton
                  onClick={(e) => handleMenuOpen(e, "Excel")}
                  aria-label="Download as Excel"
                >
                  <TableChartIcon />
                </StyledIconButton>
              </Tooltip>
              <Tooltip title="Download as CSV" arrow>
                <StyledIconButton
                  onClick={(e) => handleMenuOpen(e, "Csv")}
                  aria-label="Download as CSV"
                >
                  <DescriptionIcon />
                </StyledIconButton>
              </Tooltip>
              <Tooltip title="Download as PDF" arrow>
                <StyledIconButton
                  onClick={(e) => handleMenuOpen(e, "Pdf")}
                  aria-label="Download as PDF"
                >
                  <PictureAsPdfIcon />
                </StyledIconButton>
              </Tooltip>
              <Tooltip title="Refresh Data" arrow>
                <StyledIconButton
                  onClick={fetchData}
                  aria-label="Refresh table data"
                >
                  <RefreshIcon />
                </StyledIconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
                transformOrigin={{ vertical: "bottom", horizontal: "right" }}
                sx={{
                  "& .MuiPaper-root": {
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  },
                }}
              >
                <MenuItem onClick={() => handleDownload(downloadType, "All")}>
                  All Data
                </MenuItem>
                <MenuItem
                  onClick={() => handleDownload(downloadType, "InView")}
                >
                  Visible Screen Data
                </MenuItem>
              </Menu>
            </Box>
          </Box>
          {showToggleButtons && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
              <StyledToggleButtonGroup
                value={viewType}
                exclusive
                onChange={handleViewTypeChange}
                aria-label="View type selection"
              >
                <ToggleButton value="Inbox" aria-label="Inbox view">
                  Inbox ({inboxData.length})
                </ToggleButton>
                <ToggleButton value="Pool" aria-label="Pool view">
                  Pool ({poolData.length})
                </ToggleButton>
              </StyledToggleButtonGroup>
            </Box>
          )}
          <MaterialReactTable
            key={`table-${Title}`} // Stable key instead of pagination-based
            columns={memoizedColumns}
            data={memoizedTableData}
            state={{
              pagination,
              isLoading,
              columnOrder,
              columnVisibility,
              ...(canSanction && pendingApplications && { rowSelection }),
            }}
            onPaginationChange={setPagination}
            onRowSelectionChange={
              canSanction && pendingApplications ? setRowSelection : undefined
            }
            onColumnOrderChange={setColumnOrder}
            onColumnVisibilityChange={setColumnVisibility}
            enableRowSelection={canSanction && pendingApplications}
            enableColumnOrdering
            enableColumnHiding
            manualPagination
            enablePagination
            pageCount={pageCount}
            rowCount={totalRecords}
            muiTablePaperProps={{
              sx: {
                borderRadius: "12px",
                background: "#ffffff",
                border: "1px solid #b3cde0",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
              },
            }}
            muiTableContainerProps={{
              sx: { maxHeight: "600px", background: "#ffffff" },
            }}
            muiTableHeadCellProps={{
              sx: {
                background: "#e6f0fa",
                color: "#1f2937",
                fontWeight: 600,
                fontSize: { xs: 12, md: 14 },
                borderBottom: "2px solid #b3cde0",
                borderRight: "1px solid #b3cde0",
                "&:last-child": { borderRight: "none" },
              },
            }}
            muiTableBodyRowProps={{
              sx: {
                "&:hover": {
                  background: "#f8fafc",
                  transition: "background-color 0.2s ease",
                },
              },
            }}
            muiTableBodyCellProps={{
              sx: {
                color: "#1f2937",
                background: "#ffffff",
                fontSize: { xs: 12, md: 14 },
                borderRight: "1px solid #b3cde0",
                borderBottom: "1px solid #b3cde0",
                "&:last-child": { borderRight: "none" },
              },
            }}
            muiTableFooterRowProps={{
              sx: { borderTop: "2px solid #b3cde0" },
            }}
            muiTablePaginationProps={{
              rowsPerPageOptions: [10, 25, 50],
              showFirstButton: true,
              showLastButton: true,
              sx: {
                color: "#1f2937",
                background: "#ffffff",
                borderTop: "1px solid #b3cde0",
                fontSize: { xs: 12, md: 14 },
              },
            }}
            renderEmptyRowsFallback={() => (
              <Box
                sx={{
                  textAlign: "center",
                  py: 4,
                  color: "#6b7280",
                  fontSize: { xs: 14, md: 16 },
                }}
              >
                No {viewType.toLowerCase()} applications available.
              </Box>
            )}
            renderBottomToolbarCustomActions={() => (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {isLoading && (
                  <CircularProgress
                    size={24}
                    sx={{ color: "#1e88e5" }}
                    aria-label="Loading table data"
                  />
                )}
              </Box>
            )}
            {...(hasActions && {
              enableRowActions: true,
              positionActionsColumn: "last",
              renderRowActions: ({ row }) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                  {Array.isArray(row.original.customActions) ? (
                    (row.original.customActions || []).map((action, index) => (
                      <Tooltip key={index} title={action.tooltipText} arrow>
                        <ActionButton
                          variant="contained"
                          sx={{ width: "max-content" }}
                          onClick={() =>
                            actionFunctions[action.actionFunction]?.(
                              row,
                              action,
                              {
                                inputValue: inputValues[row.original.sno] || "",
                                allInputValues: inputValues,
                              },
                            )
                          }
                          aria-label={`${
                            action.name || action.tooltip
                          } for row ${row.original.sno}`}
                        >
                          {action.name || action.tooltip}
                        </ActionButton>
                      </Tooltip>
                    ))
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: "#1f2937" }}
                    >
                      {row.original.customActions}
                    </Typography>
                  )}
                </Box>
              ),
            })}
            renderTopToolbarCustomActions={({ table }) => {
              const selectedRows = table.getSelectedRowModel().rows;
              if (canSanction && pendingApplications && viewType === "Inbox") {
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ActionButton
                      variant="contained"
                      disabled={selectedRows.length === 0}
                      onClick={() => onPushToPool(selectedRows, inputValues)}
                      aria-label="Push selected applications to pool"
                    >
                      Push to Pool
                    </ActionButton>
                  </Box>
                );
              } else if (canHavePool && viewType === "Pool") {
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <StyledFormControl>
                      <InputLabel id="bulk-action-select-label">
                        Bulk Action
                      </InputLabel>
                      <Select
                        labelId="bulk-action-select-label"
                        value={selectedAction}
                        label="Bulk Action"
                        onChange={(e) => setSelectedAction(e.target.value)}
                        size="small"
                      >
                        {actionOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </StyledFormControl>
                    <ActionButton
                      variant="contained"
                      disabled={selectedRows.length === 0}
                      onClick={() => onExecuteAction(selectedRows, inputValues)}
                      aria-label={`Execute ${selectedAction.toLowerCase()} action`}
                    >
                      Execute
                    </ActionButton>
                  </Box>
                );
              }
              return null;
            }}
          />
        </TableCard>
      </TableContainer>
    );
  },
);

export default ServerSideTable;
