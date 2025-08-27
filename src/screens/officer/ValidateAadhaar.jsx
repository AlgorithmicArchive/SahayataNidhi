import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  styled,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import ServerSideTable from "../../components/ServerSideTable";
import axiosInstance from "../../axiosConfig";

const MainContainer = styled(Box)`
  min-height: 100vh;
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
  width: 90%;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  }
`;

export default function ValidateAadhaar() {
  // Modal + flow state (local state only)
  const [open, setOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null); // row.original
  const [aadhaar, setAadhaar] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("enter"); // 'enter' | 'otpSent' | 'verified'
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({
    open: false,
    severity: "info",
    message: "",
  });
  const [aadhaarToken, setAadhaarToken] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // For fallback table refresh
  const [activeTab, setActiveTab] = useState("pending"); // Track active tab

  // Table refs for both tables
  const pendingTableRef = useRef(null);
  const validatedTableRef = useRef(null);

  // Stable params for tables
  const extraParams = useMemo(() => ({ refreshKey }), [refreshKey]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle validate action for pending table
  const handleValidateAadhaar = useCallback((row, action, inputData) => {
    console.log(row.original);
    const incomingAadhaar = inputData?.inputValue?.toString().trim() ?? "";
    setSelectedApp(row?.original ?? row);
    setAadhaar(incomingAadhaar);
    setOtp("");
    setStage("enter");
    setAadhaarToken(null);
    setOpen(true);
  }, []);

  const closeModal = () => {
    setOpen(false);
    setSelectedApp(null);
    setAadhaar("");
    setOtp("");
    setStage("enter");
    setAadhaarToken(null);
  };

  function isAadhaarValidFormat(a) {
    return /^\d{12}$/.test(a);
  }

  async function sendOtp() {
    if (!aadhaar || aadhaar.trim().length === 0) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Aadhaar number not provided.",
      });
      return;
    }
    if (!isAadhaarValidFormat(aadhaar)) {
      setSnack({
        open: true,
        severity: "warning",
        message: "Aadhaar must be 12 digits.",
      });
      return;
    }

    try {
      setLoading(true);
      const body = new URLSearchParams();
      body.append("aadhaarNumber", aadhaar);

      const res = await fetch("/Home/SendAadhaarOTP", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const json = await res.json();
      if (res.ok && json && json.status) {
        setStage("otpSent");
        setSnack({
          open: true,
          severity: "success",
          message: "OTP sent. Check email.",
        });
      } else {
        setSnack({
          open: true,
          severity: "error",
          message: json?.message || "Failed to send OTP.",
        });
      }
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        severity: "error",
        message: "Network error sending OTP.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Persist token and refresh the pending table
  const persistTokenAndRefresh = useCallback(
    async (referenceNumber, token) => {
      if (!referenceNumber) {
        setSnack({
          open: true,
          severity: "error",
          message: "ReferenceNumber missing.",
        });
        return false;
      }
      try {
        setLoading(true);

        const form = new FormData();
        form.append("referenceNumber", referenceNumber);
        form.append("aadhaarToken", token);

        const res = await axiosInstance.post(
          "/Officer/UpdateAadhaarToken",
          form,
        );
        const json = res.data;

        if (res.status >= 200 && res.status < 300 && json && json.success) {
          // Always refresh the pending table, as validation moves records from pending to validated
          const t = pendingTableRef.current;
          if (t && typeof t.reload === "function") {
            console.log("Triggering pending table reload");
            t.reload();
          } else {
            console.warn(
              "Pending table refresh method not available, using fallback",
            );
            setRefreshKey((prev) => prev + 1);
          }

          // Optionally refresh validated table if active
          if (activeTab === "validated") {
            const vt = validatedTableRef.current;
            if (vt && typeof vt.reload === "function") {
              console.log("Triggering validated table reload");
              vt.reload();
            }
          }

          setSnack({
            open: true,
            severity: "success",
            message: json.message || "Token saved and table refreshed.",
          });
          return true;
        } else {
          setSnack({
            open: true,
            severity: "error",
            message: json?.message || "Failed to save token.",
          });
          return false;
        }
      } catch (err) {
        console.error(err);
        setSnack({
          open: true,
          severity: "error",
          message: "Network error saving token.",
        });
        return false;
      } finally {
        setLoading(false);
      }
    },
    [activeTab],
  );

  async function verifyOtp() {
    if (!otp || otp.trim().length === 0) {
      setSnack({ open: true, severity: "warning", message: "Enter OTP." });
      return;
    }

    try {
      setLoading(true);
      const form = new FormData();
      form.append("aadhaarNumber", aadhaar);
      form.append("otp", otp.trim());

      const res = await fetch("/Home/ValidateAadhaarOTP", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (res.ok && json && json.status === true) {
        const token = json.aadhaarToken || null;
        setAadhaarToken(token);
        setStage("verified");
        setSnack({
          open: true,
          severity: "success",
          message: json.message || "OTP validated.",
        });

        console.log("SelectedApp in verifyOtp:", selectedApp);
        const ref =
          selectedApp?.ReferenceNumber ?? selectedApp?.referenceNumber ?? null;
        console.log(ref);
        const saved = await persistTokenAndRefresh(ref, token);

        if (saved) {
          setTimeout(() => closeModal(), 700);
        }
      } else {
        setSnack({
          open: true,
          severity: "error",
          message: json?.message || "OTP validation failed.",
        });
      }
    } catch (err) {
      console.error(err);
      setSnack({
        open: true,
        severity: "error",
        message: "Network error validating OTP.",
      });
    } finally {
      setLoading(false);
    }
  }

  // Stable actionFunctions for pending table
  const actionFunctions = useMemo(
    () => ({ handleValidateAadhaar }),
    [handleValidateAadhaar],
  );

  return (
    <MainContainer>
      <TableCard>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          centered
          sx={{ mb: 2 }}
        >
          <Tab label="Pending Validation" value="pending" />
          <Tab label="Validated Applications" value="validated" />
        </Tabs>

        {activeTab === "pending" && (
          <ServerSideTable
            url="/Officer/GetApplicationsForAadhaarValidation"
            extraParams={extraParams}
            Title="Aadhaar Validation - Pending"
            actionFunctions={actionFunctions}
            tableRef={pendingTableRef}
          />
        )}

        {activeTab === "validated" && (
          <ServerSideTable
            url="/Officer/GetValidatedAadhaarApplications"
            extraParams={extraParams}
            Title="Aadhaar Validation - Validated"
            tableRef={validatedTableRef}
          />
        )}
      </TableCard>

      <Dialog open={open} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle>Aadhaar Validation</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" gutterBottom>
            Application: {selectedApp?.ReferenceNumber ?? "—"}
          </Typography>

          <Box sx={{ mt: 1, display: "flex", gap: 2, flexDirection: "column" }}>
            <TextField
              label="Aadhaar Number"
              value={aadhaar}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText={
                !aadhaar
                  ? "No Aadhaar provided by the action."
                  : "Aadhaar provided by action (read-only)."
              }
            />

            {stage !== "enter" && (
              <TextField
                label="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                fullWidth
                autoFocus
              />
            )}

            {aadhaarToken && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Aadhaar Token</Typography>
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
                  {aadhaarToken}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ pr: 3, pb: 2 }}>
          <Button onClick={closeModal} color="inherit" disabled={loading}>
            Cancel
          </Button>

          {stage === "enter" && (
            <Button
              variant="contained"
              onClick={sendOtp}
              disabled={loading || !aadhaar}
            >
              {loading ? <CircularProgress size={18} /> : "Send OTP"}
            </Button>
          )}

          {stage === "otpSent" && (
            <Button variant="contained" onClick={verifyOtp} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : "Verify OTP"}
            </Button>
          )}

          {stage === "verified" && (
            <Button variant="contained" onClick={closeModal}>
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        sx={{
          zIndex: 9999,
          "& .MuiSnackbar-root": {
            top: "80px !important",
          },
        }}
      >
        <Alert
          onClose={() => setSnack({ ...snack, open: false })}
          severity={snack.severity}
          variant="filled"
          sx={{
            width: "100%",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </MainContainer>
  );
}
