import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  FormHelperText,
  MenuItem,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  Paper,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ServiceSelectionForm from "../../components/ServiceSelectionForm";
import { fetchServiceList } from "../../assets/fetch";
import axiosInstance from "../../axiosConfig";
import BasicModal from "../../components/BasicModal";

export default function Withheld() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    withheldType: "",
    withheldReason: "",
    isWithheld: true,
    files: [],
  });
  const [initialFormData, setInitialFormData] = useState(null); // Track initial form data
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [recordExists, setRecordExists] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [canPermanentToTemporary, setCanPermanentToTemporary] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");

  useEffect(() => {
    fetchServiceList(setServices);
  }, []);

  const handleServiceId = (serviceId) => {
    console.log("Selected serviceId:", serviceId);
    setServiceId(serviceId);
  };

  const handleCheck = async () => {
    if (!referenceNumber.trim()) {
      setError("Please enter a valid Reference Number.");
      return;
    }
    if (!serviceId || isNaN(parseInt(serviceId))) {
      setError("Please select a valid Service.");
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoading(true);
    setHasChecked(false);
    setCanCreate(false);
    setApplicationDetails(null);
    setTableData([]);
    setTableColumns([]);
    setModalOpen(false);
    setSelectedPdfUrl("");
    setInitialFormData(null);

    try {
      const res = await axiosInstance.get("/Officer/GetWithheldApplication", {
        params: { referenceNumber, serviceId: parseInt(serviceId) },
      });

      console.log("API response:", res.data);

      if (!res.data.status) {
        if (res.data.response === "Application not found.") {
          setError("Application not found.");
          setRecordExists(false);
          setCanCreate(false);
          setHasChecked(false);
        } else if (
          res.data.response ===
          "Application is not sanctioned and cannot be withheld."
        ) {
          setError("Application is not sanctioned and cannot be withheld.");
          setRecordExists(false);
          setCanCreate(false);
          setHasChecked(false);
        } else if (
          res.data.response === "Error parsing application form details."
        ) {
          setError("Error parsing application form details.");
          setRecordExists(false);
          setCanCreate(false);
          setHasChecked(false);
        } else {
          setError(res.data.response || "Failed to fetch details.");
          setRecordExists(false);
          setCanCreate(false);
          setHasChecked(false);
        }
        return;
      }

      setRecordExists(!!res.data.recordExists);
      setCanPermanentToTemporary(res.data.canPermanentToTemporary ?? true);
      setCanCreate(true);
      setHasChecked(true);
      setTableData(res.data.data || []);
      setTableColumns(res.data.columns || []);

      // Handle files for withheld application
      let withheldFiles = res.data.application?.files || [];
      if (typeof withheldFiles === "string") {
        try {
          withheldFiles = JSON.parse(withheldFiles);
        } catch (e) {
          console.error("Failed to parse withheld application files:", e);
          withheldFiles = [];
        }
      }
      if (!Array.isArray(withheldFiles)) {
        console.warn("Withheld files is not an array:", withheldFiles);
        withheldFiles = [];
      }

      const newFormData = {
        withheldType: res.data.application?.withheldType || "",
        withheldReason: res.data.application?.withheldReason || "",
        isWithheld: res.data.application?.isWithheld ?? true,
        files: withheldFiles,
      };

      setFormData(newFormData);
      // Store initial form data for update comparison
      if (res.data.application) {
        setInitialFormData({ ...newFormData });
      }

      // Handle application details
      let appDetails = res.data.applicationDetails || {};
      setApplicationDetails({
        applicantName: appDetails.applicantName || "N/A",
        parentage: appDetails.parentage || "N/A",
        ro: appDetails["r/o"] || "N/A",
        files: withheldFiles,
      });
    } catch (err) {
      console.error("API error:", err);
      setError("Failed to fetch details.");
      setCanCreate(false);
      setHasChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.type === "application/pdf",
    );
    console.log(
      "Selected files:",
      selectedFiles.map((f) => f.name),
    );
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...selectedFiles], // Append new files
    }));
  };

  const handleFileClick = (fileName) => {
    setSelectedPdfUrl(`${fileName}`);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedPdfUrl("");
  };

  const handleSave = async () => {
    // Prevent update if no changes were made to withheldType, isWithheld, or withheldReason
    if (recordExists && initialFormData) {
      const noFieldChanges =
        formData.withheldType === initialFormData.withheldType &&
        formData.isWithheld === initialFormData.isWithheld &&
        formData.withheldReason === initialFormData.withheldReason;

      const initialFileNames = initialFormData.files
        .map((file) => (typeof file === "string" ? file : file.name))
        .sort();
      const currentFileNames = formData.files
        .map((file) => (typeof file === "string" ? file : file.name))
        .sort();
      const noFileChanges = initialFileNames.join() === currentFileNames.join();

      if (noFieldChanges && noFileChanges) {
        setError(
          "No changes detected. Please modify the application details or files to update.",
        );
        return;
      }
    }

    try {
      const form = new FormData();
      form.append("ServiceId", serviceId);
      form.append("ReferenceNumber", referenceNumber);
      form.append("IsWithheld", formData.isWithheld.toString());
      form.append("WithheldType", formData.withheldType);
      form.append("WithheldReason", formData.withheldReason);

      // Append new files
      formData.files.forEach((file) => {
        if (file instanceof File) {
          form.append("Files", file);
        } else {
          form.append("ExistingFiles", file); // Existing files as strings
        }
      });

      let res;
      if (recordExists) {
        res = await axiosInstance.put(
          "/Officer/UpdateWithheldApplication",
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      } else {
        res = await axiosInstance.post(
          "/Officer/CreateWithheldApplication",
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      }

      console.log("Save response:", res.data);
      setSuccessMessage(res.data.message);

      // Update files from response if available
      let updatedFiles = res.data.files || [];
      if (typeof updatedFiles === "string") {
        try {
          updatedFiles = JSON.parse(updatedFiles);
        } catch (e) {
          console.error("Failed to parse response files:", e);
          updatedFiles = [];
        }
      }
      if (!Array.isArray(updatedFiles)) {
        updatedFiles = [];
      }

      setFormData({
        withheldType: "",
        withheldReason: "",
        isWithheld: true,
        files: updatedFiles,
      });
      setInitialFormData(null);

      // Reset form
      setServiceId("");
      setReferenceNumber("");
      setRecordExists(false);
      setHasChecked(false);
      setCanCreate(false);
      setApplicationDetails(null);
      setError("");
      setTableData([]);
      setTableColumns([]);
      setModalOpen(false);
      setSelectedPdfUrl("");
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to save application");
    }
  };

  const formatKey = (key) => {
    if (key === "r/o") return "Residence";
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const formControlStyles = {
    "& .MuiOutlinedInput-root": {
      "& fieldset": { borderColor: "divider" },
      "&:hover fieldset": { borderColor: "primary.main" },
      "&.Mui-focused fieldset": {
        borderColor: "primary.main",
        borderWidth: "2px",
      },
      backgroundColor: "background.paper",
      color: "text.primary",
      borderRadius: 1,
    },
    "& .MuiInputLabel-root": {
      color: "text.secondary",
      "&.Mui-focused": { color: "primary.main" },
    },
    marginBottom: 2,
  };

  const buttonStyles = {
    backgroundColor: "primary.main",
    color: "background.paper",
    fontWeight: 600,
    textTransform: "none",
    py: 1,
    px: 3,
    borderRadius: 2,
    "&:hover": {
      backgroundColor: "primary.dark",
      transform: "scale(1.02)",
      transition: "all 0.2s ease",
    },
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 700,
        mx: "auto",
        minHeight: "100vh",
        bgcolor: "background.default",
        borderRadius: 3,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontFamily: "'Playfair Display', serif",
          color: "primary.main",
          mb: 3,
          fontWeight: 700,
        }}
      >
        Withheld Application Management
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl
          fullWidth
          sx={formControlStyles}
          error={error.includes("Service")}
        >
          <ServiceSelectionForm
            services={services}
            value={serviceId}
            onServiceSelect={handleServiceId}
          />
          {error.includes("Service") && (
            <FormHelperText>Please select a valid service</FormHelperText>
          )}
        </FormControl>

        <TextField
          fullWidth
          label="Reference Number"
          value={referenceNumber}
          onChange={(e) => {
            console.log("Reference Number:", e.target.value);
            setReferenceNumber(e.target.value);
          }}
          sx={formControlStyles}
          error={error.includes("Reference Number")}
          helperText={
            error.includes("Reference Number")
              ? "Please enter a valid reference number"
              : ""
          }
        />

        <Button
          variant="contained"
          sx={buttonStyles}
          onClick={handleCheck}
          disabled={loading || !services.length}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading ? "Checking..." : "Check Application"}
        </Button>

        {hasChecked && applicationDetails && (
          <Box sx={{ mb: 3, p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Application Details
            </Typography>
            {Object.entries(applicationDetails).map(
              ([key, value]) =>
                key !== "files" && (
                  <Typography key={key} variant="body2">
                    <strong>{formatKey(key)}:</strong> {value || "N/A"}
                  </Typography>
                ),
            )}
            {Array.isArray(formData.files) &&
              formData.files.length > 0 &&
              recordExists && (
                <>
                  <List dense>
                    {formData.files.map((file, index) => (
                      <Box sx={{ mt: 3 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, mb: 2 }}
                        >
                          Uploaded Documents
                        </Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                          {formData.files.map((file, index) => (
                            <Button
                              key={index}
                              variant="outlined"
                              sx={{
                                textTransform: "none",
                                borderColor: "primary.main",
                                color: "primary.main",
                                "&:hover": {
                                  backgroundColor: "primary.light",
                                  borderColor: "primary.dark",
                                },
                              }}
                              onClick={() =>
                                handleFileClick(
                                  typeof file === "string" ? file : file.name,
                                )
                              }
                            >
                              {typeof file === "string" ? file : file.name}
                            </Button>
                          ))}
                        </Box>
                      </Box>
                    ))}
                  </List>
                </>
              )}

            {hasChecked && tableData.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Action History
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{
                    bgcolor: "grey.100",
                    borderRadius: 2,
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        {tableColumns.map((column, index) => (
                          <TableCell
                            key={index}
                            sx={{
                              fontWeight: 600,
                              color: "text.primary",
                              backgroundColor: "grey.200",
                            }}
                          >
                            {column.header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData.map((row, index) => (
                        <TableRow key={index}>
                          {tableColumns.map((column, colIndex) => (
                            <TableCell key={colIndex}>
                              {row[column.accessorKey] || "N/A"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* {hasChecked &&
              Array.isArray(formData.files) &&
              formData.files.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    View Documents
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {formData.files.map((file, index) => (
                      <Button
                        key={index}
                        variant="outlined"
                        sx={{
                          textTransform: "none",
                          borderColor: "primary.main",
                          color: "primary.main",
                          "&:hover": {
                            backgroundColor: "primary.light",
                            borderColor: "primary.dark",
                          },
                        }}
                        onClick={() =>
                          handleFileClick(
                            typeof file === "string" ? file : file.name,
                          )
                        }
                      >
                        {typeof file === "string" ? file : file.name}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )} */}
          </Box>
        )}

        <BasicModal
          open={modalOpen}
          handleClose={handleModalClose}
          Title="View Document"
          pdf={selectedPdfUrl}
        />

        {hasChecked && canCreate && (
          <Paper
            sx={{
              p: 3,
              mt: 3,
              borderRadius: 2,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
            }}
          >
            <Typography
              variant="h6"
              sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}
            >
              {recordExists
                ? "Update Withheld Application"
                : "Create New Withheld Application"}
            </Typography>

            <FormControl fullWidth sx={formControlStyles}>
              <InputLabel id="withheld-type-label">Withheld Type</InputLabel>
              <Select
                labelId="withheld-type-label"
                label="Withheld Type"
                value={formData.withheldType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    withheldType: e.target.value,
                  }))
                }
              >
                <MenuItem value="Permanent">Permanent</MenuItem>
                <MenuItem value="Temporary">Temporary</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Withheld Reason"
              fullWidth
              multiline
              rows={3}
              value={formData.withheldReason}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  withheldReason: e.target.value,
                }))
              }
              sx={formControlStyles}
            />

            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: "text.primary" }}
              >
                Is Withheld
              </Typography>
              <RadioGroup
                row
                value={formData.isWithheld.toString()}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isWithheld: e.target.value === "true",
                  }))
                }
              >
                <FormControlLabel
                  value="true"
                  control={<Radio />}
                  label="Yes"
                />
                <FormControlLabel
                  value="false"
                  control={<Radio />}
                  label="No"
                />
              </RadioGroup>
            </FormControl>

            <Box sx={{ mb: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: "text.primary" }}
              >
                Upload PDF Files
              </Typography>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                style={{ marginTop: "8px" }}
              />
              {Array.isArray(formData.files) && formData.files.length > 0 && (
                <List dense>
                  {formData.files.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={typeof file === "string" ? file : file.name}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-start" }}>
              <Button
                variant="contained"
                sx={buttonStyles}
                onClick={handleSave}
                disabled={loading}
              >
                {recordExists ? "Update Application" : "Submit Application"}
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
