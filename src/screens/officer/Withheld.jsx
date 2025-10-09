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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ServiceSelectionForm from "../../components/ServiceSelectionForm";
import { fetchServiceList } from "../../assets/fetch";
import axiosInstance from "../../axiosConfig";
import BasicModal from "../../components/BasicModal";
import { useLocation } from "react-router-dom";

export default function Withheld() {
  const location = useLocation();
  const { applicationId } = location.state || {};
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
  const [initialFormData, setInitialFormData] = useState(null);
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [recordExists, setRecordExists] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [hasPermanentToTemporary, setCanPermanentToTemporary] = useState(true);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [action, setAction] = useState("");
  const [actionOptions, setActionOptions] = useState([]);
  const [application, setApplication] = useState({});

  useEffect(() => {
    fetchServiceList(setServices);
  }, []);

  useEffect(() => {
    if (applicationId) {
      setReferenceNumber(applicationId);
    }
  }, [applicationId]);

  useEffect(() => {
    if (referenceNumber && services.length > 0 && !serviceId && !hasChecked) {
      setServiceId(services[0]?.ServiceId?.toString() || "");
    }
  }, [services, referenceNumber, serviceId, hasChecked]);

  useEffect(() => {
    if (referenceNumber && serviceId && !hasChecked) {
      handleCheck();
    }
  }, [referenceNumber, serviceId, hasChecked]);

  const handleServiceId = (serviceId) => {
    console.log(serviceId);
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
    setAction("");
    setActionOptions([]);

    try {
      const res = await axiosInstance.get("/Officer/GetWithheldApplication", {
        params: { referenceNumber, serviceId: parseInt(serviceId) },
      });

      console.log("API response:", res.data);

      if (!res.data.status) {
        setError(res.data.response || "Failed to fetch details.");
        setRecordExists(false);
        setCanCreate(false);
        setHasChecked(false);
        return;
      }

      setRecordExists(!!res.data.recordExists);
      setCanPermanentToTemporary(res.data.canPermanentToTemporary ?? true);
      setCanCreate(res.data.canCreate);
      setHasChecked(true);
      setTableData(res.data.data || []);
      setTableColumns(res.data.columns || []);
      setActionOptions(res.data.options || []);
      setApplication(res.data.application);

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
        withheldFiles = [];
      }

      const newFormData = {
        withheldType: res.data.application?.withheldType || "",
        withheldReason: res.data.application?.withheldReason || "",
        isWithheld: res.data.application?.isWithheld ?? true,
        files: withheldFiles,
      };

      setFormData(newFormData);
      if (res.data.application) {
        setInitialFormData({ ...newFormData });
      }

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
      files: [...prev.files, ...selectedFiles],
    }));
  };

  const handleRemoveFile = (fileToRemove) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter(
        (file) =>
          (typeof file === "string" ? file : file.name) !==
          (typeof fileToRemove === "string" ? fileToRemove : fileToRemove.name),
      ),
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
    if (!formData.withheldType) {
      setError("Please select a Withheld Type.");
      return;
    }
    if (!formData.withheldReason.trim()) {
      setError("Please provide a Withheld Reason.");
      return;
    }
    if (!action) {
      setError("Please select an action.");
      return;
    }

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

      if (
        noFieldChanges &&
        noFileChanges &&
        action === initialFormData.action
      ) {
        setError(
          "No changes detected. Please modify the application details, files, or action to update.",
        );
        return;
      }

      // Restrict action for Permanent withheld when isWithheld or withheldType is updated
      if (
        initialFormData.withheldType === "Permanent" &&
        initialFormData.isWithheld &&
        (formData.withheldType !== initialFormData.withheldType ||
          !formData.isWithheld) &&
        canPermanentToTemporary &&
        action !== "approve"
      ) {
        setError(
          "For a Permanent withheld application, only the 'Approve' action is allowed when updating Withheld Type or removing from withheld, until reviewed by the final authority.",
        );
        return;
      }
    }

    setConfirmDialogOpen(true);
  };

  const confirmSave = async () => {
    try {
      const form = new FormData();
      form.append("ServiceId", serviceId);
      form.append("ReferenceNumber", referenceNumber);
      form.append("IsWithheld", formData.isWithheld.toString());
      form.append("WithheldType", formData.withheldType);
      form.append("WithheldReason", formData.withheldReason);
      form.append("Action", action);

      formData.files.forEach((file) => {
        if (file instanceof File) {
          form.append("Files", file);
        } else {
          form.append("ExistingFiles", file);
        }
      });

      console.log(form);

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
      setAction("");
      setActionOptions([]);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.message || "Failed to save application");
      setTimeout(() => setError(""), 5000);
    } finally {
      setConfirmDialogOpen(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      withheldType: "",
      withheldReason: "",
      isWithheld: true,
      files: [],
    });
    setServiceId("");
    setReferenceNumber("");
    setError("");
    setSuccessMessage("");
    setHasChecked(false);
    setCanCreate(false);
    setRecordExists(false);
    setApplicationDetails(null);
    setTableData([]);
    setTableColumns([]);
    setInitialFormData(null);
    setAction("");
    setActionOptions([]);
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
      borderRadius: "8px",
    },
    "& .MuiInputLabel-root": {
      color: "text.secondary",
      "&.Mui-focused": { color: "primary.main" },
    },
    marginBottom: 3,
  };

  const buttonStyles = {
    backgroundColor: "primary.main",
    color: "common.white",
    fontWeight: 600,
    textTransform: "none",
    py: 1.5,
    px: 4,
    borderRadius: "8px",
    "&:hover": {
      backgroundColor: "primary.dark",
      transform: "scale(1.02)",
      transition: "all 0.2s ease",
    },
    "&:disabled": {
      backgroundColor: "grey.400",
      color: "grey.600",
    },
  };

  const fileUploadStyles = {
    border: "2px dashed",
    borderColor: "grey.400",
    borderRadius: "8px",
    padding: 2,
    textAlign: "center",
    backgroundColor: "grey.50",
    "&:hover": {
      borderColor: "primary.main",
      backgroundColor: "primary.50",
    },
    cursor: "pointer",
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 800,
        mx: "auto",
        minHeight: "100vh",
        bgcolor: "background.default",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Playfair Display', serif",
          color: "primary.main",
          fontWeight: 700,
          textAlign: "center",
        }}
      >
        Withheld Application Management
      </Typography>

      <Paper
        sx={{
          p: 3,
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        }}
      >
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

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              sx={buttonStyles}
              onClick={handleCheck}
              disabled={loading || !services.length}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? "Checking..." : "Check Application"}
            </Button>
            <Button
              variant="outlined"
              sx={{
                ...buttonStyles,
                backgroundColor: "transparent",
                borderColor: "primary.main",
                color: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.50",
                  borderColor: "primary.dark",
                },
              }}
              onClick={handleClearForm}
            >
              Clear Form
            </Button>
          </Box>
        </Box>
      </Paper>

      {successMessage && (
        <Alert severity="success" sx={{ borderRadius: "8px" }}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: "8px" }}>
          {error}
        </Alert>
      )}

      {hasChecked && applicationDetails && (
        <Paper
          sx={{
            p: 3,
            borderRadius: "12px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Application Details
          </Typography>

          {/* Applicant Details */}
          {Object.entries(applicationDetails).map(
            ([key, value]) =>
              key !== "files" && (
                <Typography key={key} variant="body1" sx={{ mb: 1 }}>
                  <strong>{formatKey(key)}:</strong> {value || "N/A"}
                </Typography>
              ),
          )}

          {/* Withheld Application Details */}
          {recordExists && application && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Withheld Information
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Type:</strong>{" "}
                {application.withheldType === "Permanent"
                  ? "Weedout"
                  : application.withheldType || "N/A"}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Reason:</strong> {application.withheldReason || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong>{" "}
                {application.isWithheld ? "Currently Withheld" : "Not Withheld"}
              </Typography>
            </Box>
          )}

          {/* Uploaded Documents */}
          {Array.isArray(formData.files) && formData.files.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
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
                        backgroundColor: "primary.50",
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
          )}

          {/* Action History Table */}
          {hasChecked && tableData.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Action History
              </Typography>
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
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
                            backgroundColor: "grey.100",
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
        </Paper>
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
            borderRadius: "12px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
          }}
        >
          <Typography
            variant="h6"
            sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}
          >
            {recordExists
              ? "Update Withheld Application"
              : "Create Withheld Application"}
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
              <MenuItem value="Permanent">Weedout</MenuItem>
              <MenuItem value="Temporary">Temporary</MenuItem>
            </Select>
            <FormHelperText>
              {formData.withheldType === "Permanent"
                ? "Permanently withhold the application."
                : "Temporarily withhold; can be reversed later."}
            </FormHelperText>
          </FormControl>

          <TextField
            label="Withheld Reason"
            fullWidth
            multiline
            rows={4}
            value={formData.withheldReason}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                withheldReason: e.target.value,
              }))
            }
            sx={formControlStyles}
            helperText="Provide a detailed reason for withholding the application."
          />

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "text.primary" }}
            >
              Remove from Withheld
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
                label="Keep Withheld"
              />
              <FormControlLabel
                value="false"
                control={<Radio />}
                label="Remove from Withheld"
              />
            </RadioGroup>
            <FormHelperText>
              Select "Remove from Withheld" to release the application.
            </FormHelperText>
          </FormControl>

          <FormControl
            fullWidth
            sx={formControlStyles}
            error={error.includes("action")}
          >
            <InputLabel id="action-label">Action</InputLabel>
            <Select
              labelId="action-label"
              label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              {actionOptions.map((option, index) => (
                <MenuItem key={index} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {initialFormData?.withheldType === "Permanent" &&
              initialFormData?.isWithheld &&
              (formData.withheldType !== initialFormData.withheldType ||
                !formData.isWithheld) &&
              canPermanentToTemporary
                ? "Only 'Approve' action is allowed when updating Withheld Type or removing a Permanent withheld application, until reviewed by the final authority."
                : "Select the action to take for this application."}
            </FormHelperText>
            {error.includes("action") && (
              <FormHelperText>Please select a valid action</FormHelperText>
            )}
          </FormControl>

          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: "text.primary", mb: 1 }}
            >
              Upload PDF Files
            </Typography>
            <Box sx={fileUploadStyles}>
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileChange}
                style={{ display: "block", margin: "8px auto" }}
              />
              <Typography variant="body2" color="text.secondary">
                Drag and drop PDF files here or click to upload
              </Typography>
            </Box>
            {Array.isArray(formData.files) && formData.files.length > 0 && (
              <List dense sx={{ mt: 2 }}>
                {formData.files.map((file, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <Tooltip title="Remove File">
                        <IconButton
                          edge="end"
                          onClick={() => handleRemoveFile(file)}
                        >
                          <DeleteIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemText
                      primary={typeof file === "string" ? file : file.name}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              sx={buttonStyles}
              onClick={handleSave}
              disabled={loading || !action}
            >
              {recordExists ? "Update Application" : "Submit Application"}
            </Button>
            <Button
              variant="outlined"
              sx={{
                ...buttonStyles,
                backgroundColor: "transparent",
                borderColor: "primary.main",
                color: "primary.main",
                "&:hover": {
                  backgroundColor: "primary.50",
                  borderColor: "primary.dark",
                },
              }}
              onClick={handleClearForm}
            >
              Clear Form
            </Button>
          </Box>
        </Paper>
      )}

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {recordExists ? "update" : "submit"} this
            withheld application with action: {action}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmSave} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
