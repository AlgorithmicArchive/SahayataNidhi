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
  Chip,
  Grid,
  Divider,
  Card,
  CardContent,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import HistoryIcon from "@mui/icons-material/History";
import DescriptionIcon from "@mui/icons-material/Description";
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
    files: [],
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [applicationDetails, setApplicationDetails] = useState(null);
  const [recordExists, setRecordExists] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [action, setAction] = useState("");
  const [actionOptions, setActionOptions] = useState([]);
  const [application, setApplication] = useState({});
  const [showRemoveFromWithheld, setShowRemoveFromWithheld] = useState(false);
  const [isWithheld, setIsWithheld] = useState(true);
  const [currentPlayerInfo, setCurrentPlayerInfo] = useState({
    playerId: -1,
    isLastPlayer: false,
    canWithhold: false,
    canDirectWithheld: false,
  });
  const [canRemoveFromWithheld, setCanRemoveFromWithheld] = useState(false);
  const [existingFilesToKeep, setExistingFilesToKeep] = useState([]);
  const [isWithholdingOfficer, setIsWithholdingOfficer] = useState(false);
  const [hasPendingReleaseRequest, setHasPendingReleaseRequest] = useState(false);
  const [pendingReleaseFromPlayer, setPendingReleaseFromPlayer] = useState("");

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

  const handleServiceId = (serviceId) => {
    setServiceId(serviceId);
  };

  const scrollToError = () => {
    setTimeout(() => {
      const errorElement = document.querySelector('.MuiAlert-root');
      if (errorElement) {
        errorElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
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
    setShowRemoveFromWithheld(false);
    setExistingFilesToKeep([]);
    setCurrentPlayerInfo({
      playerId: -1,
      isLastPlayer: false,
      canWithhold: false,
      canDirectWithheld: false,
    });
    setIsWithholdingOfficer(false);
    setHasPendingReleaseRequest(false);
    setPendingReleaseFromPlayer("");

    try {
      const res = await axiosInstance.get("/Officer/GetWithheldApplication", {
        params: { referenceNumber, serviceId: parseInt(serviceId) },
      });

      if (!res.data.status) {
        setError(res.data.response || "Failed to fetch details.");
        setRecordExists(false);
        setCanCreate(false);
        setHasChecked(false);
        return;
      }

      setRecordExists(!!res.data.recordExists);
      setCanCreate(res.data.canCreate);
      setHasChecked(true);
      setTableData(res.data.data || []);
      setTableColumns(res.data.columns || []);
      setActionOptions(res.data.options || []);
      setApplication(res.data.application);

      setCurrentPlayerInfo({
        playerId: res.data.currentPlayerId || -1,
        isLastPlayer: res.data.isLastPlayer || false,
        canWithhold: res.data.canWithhold || false,
        canDirectWithheld: res.data.canDirectWithheld || false,
      });

      setIsWithholdingOfficer(res.data.isWithholdingOfficer || false);
      setHasPendingReleaseRequest(res.data.hasPendingReleaseRequest || false);
      setPendingReleaseFromPlayer(res.data.pendingReleaseFromPlayer || "");

      setCanRemoveFromWithheld(res.data.canRemoveFromWithheld || false);

      let withheldFiles = res.data.application?.files || [];
      if (typeof withheldFiles === "string") {
        try {
          withheldFiles = JSON.parse(withheldFiles);
        } catch (e) {
          withheldFiles = [];
        }
      }
      if (!Array.isArray(withheldFiles)) {
        withheldFiles = [];
      }

      const newFormData = {
        withheldType: res.data.application?.withheldType || "",
        withheldReason: "",
        files: withheldFiles,
      };

      setFormData(newFormData);
      setExistingFilesToKeep(withheldFiles);

      const isCurrentlyWithheld = res.data.application?.isWithheld ?? false;
      setIsWithheld(true);

      if (res.data.application) {
        setInitialFormData({
          ...newFormData,
          isWithheld: isCurrentlyWithheld
        });
      }

      const shouldShowToggle =
        !!res.data.canCreate &&
        !!res.data.recordExists &&
        isCurrentlyWithheld === true &&
        (res.data.isWithholdingOfficer || res.data.canRemoveFromWithheld);

      setShowRemoveFromWithheld(shouldShowToggle);

      let appDetails = res.data.applicationDetails || {};
      setApplicationDetails({
        applicantName: appDetails.applicantName || "N/A",
        parentage: appDetails.parentage || "N/A",
        ro: appDetails["r/o"] || "N/A",
        files: withheldFiles,
        withheldType: res.data.application?.withheldType || "N/A",
        withheldReason: res.data.application?.withheldReason || "N/A",
        isWithheld: isCurrentlyWithheld,
      });

      if (res.data.application && !res.data.canCreate) {
        if (res.data.hasPendingReleaseRequest) {
          setError(`There's a pending release request from ${res.data.pendingReleaseFromPlayer}. You are not the current player to handle it.`);
        } else {
          setError("You are not authorized to update this withheld application.");
        }
      }

    } catch (err) {
      setError("Failed to fetch details. Please try again.");
      setCanCreate(false);
      setHasChecked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.type === "application/pdf"
    );
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...selectedFiles],
    }));
  };

  const handleRemoveFile = (fileToRemove) => {
    if (typeof fileToRemove === "string") {
      setExistingFilesToKeep((prev) =>
        prev.filter((file) => file !== fileToRemove)
      );
    } else {
      setFormData((prev) => ({
        ...prev,
        files: prev.files.filter((file) => file.name !== fileToRemove.name),
      }));
    }
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
    setError("");

    if (!formData.withheldType) {
      setError("Please select a Withheld Type.");
      scrollToError();
      return;
    }
    if (!formData.withheldReason.trim()) {
      setError("Please provide a Withheld Reason.");
      scrollToError();
      return;
    }
    if (!action) {
      setError("Please select an action.");
      scrollToError();
      return;
    }

    // if (action === "forward") {
    //   if (currentPlayerInfo.isLastPlayer) {
    //     setError("Last player in workflow cannot forward, must approve.");
    //     scrollToError();
    //     return;
    //   }
    //   if (!currentPlayerInfo.canWithhold) {
    //     setError("You don't have 'canWithhold' authority to forward.");
    //     scrollToError();
    //     return;
    //   }
    // }

    if (action === "approve") {
      if (!isWithheld) {
        const canApproveRelease = isWithholdingOfficer || currentPlayerInfo.isLastPlayer || currentPlayerInfo.canDirectWithheld;
        if (!canApproveRelease) {
          setError("Only the officer who withheld, last player, or direct authority can approve release.");
          scrollToError();
          return;
        }
      } else {
        if (!currentPlayerInfo.canDirectWithheld && !currentPlayerInfo.isLastPlayer) {
          setError("You need direct withhold authority or be the last player to approve withheld.");
          scrollToError();
          return;
        }
      }
    }

    if (application?.isWithheld === true && !isWithheld) {
      if (!canRemoveFromWithheld) {
        setError("You don't have permission to release this application.");
        scrollToError();
        return;
      }
    }

    if (recordExists && initialFormData) {
      const hasFieldChanges =
        formData.withheldType !== initialFormData.withheldType ||
        formData.withheldReason.trim() !== "" ||
        isWithheld !== initialFormData.isWithheld;

      const allCurrentFiles = [
        ...existingFilesToKeep,
        ...formData.files.map((file) => file.name),
      ].sort();

      const allInitialFiles = [
        ...(initialFormData.files || []).map((file) =>
          typeof file === "string" ? file : file.name
        )
      ].sort();

      const hasFileChanges = allCurrentFiles.join() !== allInitialFiles.join();

      if (!hasFieldChanges && !hasFileChanges) {
        setError("No changes detected. Please modify the application details or files to update.");
        scrollToError();
        return;
      }
    }

    if (recordExists && initialFormData?.withheldType === "Permanent") {
      if (formData.withheldType !== "Permanent" || !isWithheld) {
        if (!currentPlayerInfo.isLastPlayer && !currentPlayerInfo.canDirectWithheld) {
          setError("Only the final authority or direct withholding authority can change or remove a permanent withheld application.");
          scrollToError();
          return;
        }
      }
    }

    setConfirmDialogOpen(true);
  };

  const confirmSave = async () => {
    try {
      const form = new FormData();
      form.append("ServiceId", serviceId);
      form.append("ReferenceNumber", referenceNumber);
      form.append("IsWithheld", isWithheld.toString());
      form.append("WithheldType", formData.withheldType);
      form.append("WithheldReason", formData.withheldReason);
      form.append("Action", action);

      if (existingFilesToKeep.length > 0) {
        form.append("ExistingFiles", existingFilesToKeep.join(","));
      }

      formData.files.forEach((file) => {
        if (file instanceof File) {
          form.append("Files", file);
        }
      });

      let res;
      if (recordExists) {
        res = await axiosInstance.post(
          "/Officer/UpdateWithheldApplication",
          form,
        );
      } else {
        res = await axiosInstance.post(
          "/Officer/CreateWithheldApplication",
          form,
        );
      }

      setSuccessMessage(res.data.message || "Operation completed successfully.");

      setFormData({
        withheldType: "",
        withheldReason: "",
        files: [],
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
      setShowRemoveFromWithheld(false);
      setIsWithheld(true);
      setExistingFilesToKeep([]);
      setIsWithholdingOfficer(false);
      setHasPendingReleaseRequest(false);
      setPendingReleaseFromPlayer("");

      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.response ||
        "Failed to save application. Please try again."
      );
      setTimeout(() => setError(""), 5000);
    } finally {
      setConfirmDialogOpen(false);
    }
  };

  const handleClearForm = () => {
    setFormData({
      withheldType: "",
      withheldReason: "",
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
    setShowRemoveFromWithheld(false);
    setIsWithheld(true);
    setExistingFilesToKeep([]);
    setIsWithholdingOfficer(false);
    setHasPendingReleaseRequest(false);
    setPendingReleaseFromPlayer("");
    setCurrentPlayerInfo({
      playerId: -1,
      isLastPlayer: false,
      canWithhold: false,
      canDirectWithheld: false,
    });
  };

  const formatKey = (key) => {
    if (key === "r/o") return "Residence";
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "primary.main",
            mb: 1,
          }}
        >
          Withheld Application Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Search for applications and manage withheld status
        </Typography>
      </Box>

      <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Search Application
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={12}>
              <FormControl fullWidth>
                <ServiceSelectionForm
                  services={services}
                  value={serviceId}
                  onServiceSelect={handleServiceId}
                />
              </FormControl>
            </Grid>
            <Grid item xs={12} md={12}>
              <TextField
                fullWidth
                label="Reference Number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter application reference number"
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              onClick={handleCheck}
              disabled={loading || !services.length}
              sx={{ px: 4 }}
            >
              {loading ? "Searching..." : "Search Application"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearForm}
            >
              Clear
            </Button>
          </Stack>
        </CardContent>
      </Card>

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

      {hasChecked && (
        <>
          {applicationDetails && (
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DescriptionIcon /> Application Details
                </Typography>

                <Grid container spacing={3}>
                  {Object.entries(applicationDetails).map(
                    ([key, value]) =>
                      key !== "files" && (
                        <Grid item xs={12} md={6} key={key}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formatKey(key)}
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {value || "N/A"}
                            </Typography>
                          </Box>
                        </Grid>
                      )
                  )}
                </Grid>

                {recordExists && application && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Withheld Status
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Type:
                          </Typography>
                          <Chip
                            label={application.withheldType === "Permanent" ? "Permanent (Weedout)" : "Temporary"}
                            size="small"
                            color={application.withheldType === "Permanent" ? "error" : "warning"}
                            variant="outlined"
                          />
                        </Stack>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Current Status:
                          </Typography>
                          <Chip
                            label={application.isWithheld ? "Withheld" : "Not Withheld"}
                            size="small"
                            color={application.isWithheld ? "error" : "success"}
                          />
                        </Stack>
                      </Grid>
                    </Grid>
                  </>
                )}

                {existingFilesToKeep.length > 0 && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Attached Documents
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      {existingFilesToKeep.map((file, index) => (
                        <Chip
                          key={index}
                          label={file}
                          onClick={() => handleFileClick(file)}
                          onDelete={() => handleRemoveFile(file)}
                          deleteIcon={<DeleteIcon />}
                          icon={<VisibilityIcon />}
                          variant="outlined"
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {tableData.length > 0 && (
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HistoryIcon /> Action History
                </Typography>
                <TableContainer sx={{ borderRadius: 1, border: 1, borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        {tableColumns.map((column, index) => (
                          <TableCell
                            key={index}
                            sx={{ fontWeight: 600, color: 'text.primary' }}
                          >
                            {column.header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableData.map((row, index) => (
                        <TableRow key={index} hover>
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
              </CardContent>
            </Card>
          )}

          {canCreate && (
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                  {recordExists ? "Update Withheld Application" : "Create Withheld Application"}
                </Typography>

                {hasPendingReleaseRequest && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">
                      Pending Release Request
                    </Typography>
                    <Typography variant="body2">
                      There's a pending release request from {pendingReleaseFromPlayer}.
                      You can approve or forward this request.
                    </Typography>
                  </Alert>
                )}

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Withheld Type</InputLabel>
                      <Select
                        label="Withheld Type"
                        value={formData.withheldType}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            withheldType: e.target.value,
                          }))
                        }
                        disabled={application?.withheldType === "Permanent" && !currentPlayerInfo.isLastPlayer && !currentPlayerInfo.canDirectWithheld}
                      >
                        <MenuItem value="Permanent">Permanent (Weedout)</MenuItem>
                        <MenuItem value="Temporary">Temporary</MenuItem>
                      </Select>
                      <FormHelperText>
                        {formData.withheldType === "Permanent"
                          ? "Application will be permanently withheld"
                          : "Application will be temporarily withheld"}
                      </FormHelperText>
                    </FormControl>
                  </Grid>

                  {showRemoveFromWithheld && application?.isWithheld === true && (
                    <Grid item xs={12} md={6}>
                      <FormControl component="fieldset" fullWidth>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Withheld Status
                        </Typography>
                        <RadioGroup
                          row
                          value={isWithheld.toString()}
                          onChange={(e) => setIsWithheld(e.target.value === "true")}
                        >
                          <FormControlLabel
                            value="true"
                            control={<Radio />}
                            label="Keep Withheld"
                          />
                          <FormControlLabel
                            value="false"
                            control={<Radio />}
                            label="Release Application"
                            disabled={!canRemoveFromWithheld}
                          />
                        </RadioGroup>
                        <FormHelperText>
                          {isWithholdingOfficer
                            ? "You withheld this application. You can release it."
                            : canRemoveFromWithheld
                              ? "You have permission to release this application."
                              : "Only the officer who withheld can release this application."}
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid item xs={12}>
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
                      helperText={
                        recordExists && application?.isWithheld === false
                          ? "Application is currently NOT withheld. This will re-withhold it."
                          : "Provide detailed reason for withholding this application"
                      }
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={error.includes("action")}>
                      <InputLabel>Action</InputLabel>
                      <Select
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
                      {action && (
                        <FormHelperText>
                          {action === "forward"
                            ? "Forward to next officer in workflow"
                            : "Approve the withheld action immediately"}
                          {action === "approve" && !currentPlayerInfo.canDirectWithheld && !currentPlayerInfo.isLastPlayer && (
                            <Typography component="span" color="error" display="block" sx={{ mt: 0.5 }}>
                              You need direct withhold authority or be the last player to approve.
                            </Typography>
                          )}
                        </FormHelperText>
                      )}
                      {error.includes("action") && (
                        <FormHelperText error>Please select a valid action</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        Upload Supporting Documents (PDF only)
                      </Typography>

                      {existingFilesToKeep.length > 0 && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Current Documents
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {existingFilesToKeep.map((file, index) => (
                              <Chip
                                key={index}
                                label={file}
                                onClick={() => handleFileClick(file)}
                                onDelete={() => handleRemoveFile(file)}
                                deleteIcon={<DeleteIcon />}
                                icon={<VisibilityIcon />}
                                variant="outlined"
                                sx={{ mb: 1 }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      <Paper
                        variant="outlined"
                        sx={{
                          p: 4,
                          textAlign: 'center',
                          borderStyle: 'dashed',
                          borderWidth: 2,
                          borderColor: 'grey.300',
                          backgroundColor: 'grey.50',
                          '&:hover': {
                            borderColor: 'primary.main',
                            backgroundColor: 'action.hover',
                          },
                          cursor: 'pointer',
                        }}
                        onClick={() => document.getElementById('file-upload').click()}
                      >
                        <input
                          id="file-upload"
                          type="file"
                          accept="application/pdf"
                          multiple
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        <UploadFileIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                        <Typography variant="body1" gutterBottom>
                          Click to upload or drag and drop PDF files
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Maximum file size: 10MB per file
                        </Typography>
                      </Paper>

                      {formData.files.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            New files to upload:
                          </Typography>
                          <List dense>
                            {formData.files.map((file, index) => (
                              <ListItem
                                key={index}
                                secondaryAction={
                                  <IconButton
                                    edge="end"
                                    onClick={() => handleRemoveFile(file)}
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                }
                                sx={{ py: 0.5 }}
                              >
                                <ListItemText
                                  primary={file.name}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        onClick={handleClearForm}
                        startIcon={<ClearIcon />}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={loading || !action}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{ px: 4 }}
                      >
                        {recordExists ? "Update Application" : "Submit Application"}
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <BasicModal
        open={modalOpen}
        handleClose={handleModalClose}
        Title="View Document"
        pdf={selectedPdfUrl}
      />

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {recordExists ? "Update Withheld Application" : "Create Withheld Application"}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 3 }}>
            Are you sure you want to proceed with the following action?
          </Typography>

          <Stack spacing={2} sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">Action</Typography>
              <Typography fontWeight={500}>{action}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Withheld Type</Typography>
              <Typography fontWeight={500}>{formData.withheldType}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">Status</Typography>
              <Typography fontWeight={500}>
                {isWithheld
                  ? (application?.isWithheld === false
                    ? "Application will be WITHHELD (currently not withheld)"
                    : "Application will remain WITHHELD")
                  : "Application will be RELEASED from withheld"}
              </Typography>
            </Box>
            {!isWithheld && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                This will remove the application from withheld status
              </Alert>
            )}
            {application?.isWithheld === false && (
              <Alert severity="info" sx={{ mt: 1 }}>
                This will re-withhold the application (currently not withheld)
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={confirmSave}
            variant="contained"
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}