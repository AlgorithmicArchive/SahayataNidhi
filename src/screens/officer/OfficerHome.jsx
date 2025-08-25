import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  useContext,
} from "react";
import { fetchServiceList, fetchCertificateDetails } from "../../assets/fetch";
import ServiceSelectionForm from "../../components/ServiceSelectionForm";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  TextField,
  Typography,
  CircularProgress,
  Card,
  Tooltip as MuiTooltip,
  CardContent,
  Divider,
} from "@mui/material";
import { useForm } from "react-hook-form";
import axiosInstance from "../../axiosConfig";
import { Container, Row, Col } from "react-bootstrap";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import ServerSideTable from "../../components/ServerSideTable";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BasicModal from "../../components/BasicModal";
import styled from "@emotion/styled";
import debounce from "lodash/debounce";
import { UserContext } from "../../UserContext";
import {
  AssignmentTurnedIn,
  Cancel,
  CheckCircle,
  EditNote,
  Forward,
  HourglassEmpty,
  Group,
  Reply,
  SyncAlt,
  ArrowRightAlt,
  Summarize,
  ForwardToInbox,
  Verified,
  Block,
  Description,
  AccessTime,
  Inventory,
  PauseCircle,
  DoNotDisturbAlt,
  Person,
  SwapHoriz,
} from "@mui/icons-material";

// Register Chart.js components and datalabels plugin
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartDataLabels,
);

// Styled components with minor improvements
const StatCard = styled(Card)(({ theme }) => ({
  width: "380px",
  height: "180px",
  borderRadius: "14px", // slightly more rounded
  boxShadow: "0 4px 15px rgba(0,0,0,0.12)", // softer shadow
  transition:
    "transform 0.26s ease, box-shadow 0.26s ease, border-color 0.2s ease",
  border: "1px solid rgba(0,0,0,0.08)",
  margin: "8px 0", // added vertical space between cards
  "&:hover": {
    transform: "translateY(-6px) scale(1.03)", // subtle scale and shadow
    boxShadow: "0 14px 32px rgba(0,0,0,0.17)",
    borderColor: "rgba(0,0,0,0.15)",
  },
  [theme.breakpoints.down("sm")]: {
    width: "100%",
    maxWidth: "340px",
    height: "220px", // improved mobile card ratio
    marginBottom: "24px", // more space below on mobile
  },
}));

const StyledButton = styled(Button)`
  background: linear-gradient(45deg, #1976d2, #2196f3);
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 8px; /* fixed radius */
  text-transform: none;
  color: #ffffff;
  margin-left: 4px;
  &:hover {
    background: linear-gradient(45deg, #1565c0, #1976d2);
    transform: scale(1.05);
  }
  &:disabled {
    background: #cccccc;
    color: #666666;
  }
`;

const StyledDialog = styled(Dialog)`
  & .MuiDialog-paper {
    border-radius: 14px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.13);
    background: #ffffff;
    padding: 28px; /* more padding */
    max-width: 94vw;
  }
`;

const StyledCard = styled(Card)(({ theme }) => ({
  background: "linear-gradient(135deg, #ffffff, #f8f9fa)",
  border: "1px solid #e0e0e0", // changed black to gentle border
  borderRadius: "16px",
  boxShadow: "0 6px 24px rgba(0,0,0,0.11)",
  transition: "transform 0.30s ease, box-shadow 0.30s ease",
  marginBottom: "24px",
  "&:hover": {
    transform: "translateY(-3px) scale(1.01)",
    boxShadow: "0 12px 36px rgba(0,0,0,0.13)",
  },
}));

export default function OfficerHome() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [countList, setCountList] = useState([]);
  const [corrigendumList, setCorrigendumList] = useState([]);
  const [correctionList, setCorrectionList] = useState([]);
  const [legacyCountList, setLegacyCountList] = useState([]); // New state for legacy counts
  const [temporaryCountList, setTemporaryCountList] = useState([]);
  const [withheldCountList, setWithheldCountList] = useState([]);
  const [citizenPendingList, setCitizenPendingList] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    forwarded: 0,
    citizenPending: 0,
    rejected: 0,
    sanctioned: 0,
    returnedCount: 0,
    shiftedCount: 0,
    corrigendumCount: 0,
    correctionCount: 0,
    legacyTotal: 0,
    legacyRejected: 0,
    legacySanctioned: 0,
  });
  const [canSanction, setCanSanction] = useState(false);
  const [canHavePool, setCanHavePool] = useState(false);
  const [type, setType] = useState("");
  const [dataType, setDataType] = useState("new"); // New state for data type (new/legacy)
  const [showTable, setShowTable] = useState(false);
  const [selectedAction, setSelectedAction] = useState("Sanction");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [pullConfirmOpen, setPullConfirmOpen] = useState(false);
  const [pendingRejectRows, setPendingRejectRows] = useState([]);
  const [pin, setPin] = useState("");
  const [storedPin, setStoredPin] = useState(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [isSignedPdf, setIsSignedPdf] = useState(false);
  const [currentApplicationId, setCurrentApplicationId] = useState("");
  const [pendingIds, setPendingIds] = useState([]);
  const [currentIdIndex, setCurrentIdIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [officerRole, setOfficerRole] = useState("");
  const [officerArea, setOfficerArea] = useState("");
  const [lastServiceId, setLastServiceId] = useState("");
  const [tableKey, setTableKey] = useState(0);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [pullRow, setPullRow] = useState({});
  const [url, setUrl] = useState("/Officer/GetApplications");
  const [applicationType, setApplicationType] = useState("application");
  const [tableTitle, setTableTitle] = useState(null);

  const tableRef = useRef(null);
  const tableInstanceRef = useRef(null);
  const navigate = useNavigate();
  const { setOfficerAuthorities, officerAuthorities } = useContext(UserContext);

  const {
    control,
    formState: { errors },
    reset,
  } = useForm();

  const statusColors = useMemo(
    () => ({
      "Total Applications": "#009dd6",
      Pending: "#ffd42f",
      Forwarded: "#009dd6",
      Returned: "#fb6330",
      "Pending With Citizen": "#7849b8",
      Rejected: "#ec111a",
      Sanctioned: "#138468",
      "Shifted To Another Location": "#f2609e",
      "Total Corrigendum": "#009dd6",
      "Total Correction": "#009dd6",
      Issued: "#138468",
      "Pension's Stopped": "#7849b8",
      "PCP Applications": "#009dd6",
      "PCP-UDID Expires 3 Months": "#138468",
      "Total Withheld Applications": "#009dd6",
      "Temporary Withheld": "#ffd42f",
      "Permanent Withheld": "#ec111a",
    }),
    [],
  );

  const textColors = useMemo(
    () => ({
      "Total Applications": "#FFFFFF",
      Pending: "#000000",
      Forwarded: "#FFFFFF",
      Returned: "#FFFFFF",
      "Pending With Citizen": "#FFFFFF",
      Rejected: "#FFFFFF",
      Sanctioned: "#FFFFFF",
      "Shifted To Another Location": "#FFFFFF",
      "Total Corrigendum": "#FFFFFF",
      "Total Correction": "#FFFFFF",
      Issued: "#FFFFFF",
      "Pension's Stopped": "#FFFFFF",
      "PCP Applications": "#FFFFFF",
      "PCP-UDID Expires 3 Months": "#FFFFFF",
      "Total Withheld Applications": "#FFFFFF",
      "Temporary Withheld": "#000000",
      "Permanent Withheld": "#FFFFFF",
    }),
    [],
  );

  const iconMap = useMemo(() => {
    const makeIcon = (Icon, key) => (
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon sx={{ fontSize: 28, color: statusColors[key] }} />
      </Box>
    );

    return {
      "Total Applications": makeIcon(Summarize, "Total Applications"),
      Pending: makeIcon(HourglassEmpty, "Pending"),
      Forwarded: makeIcon(ForwardToInbox, "Forwarded"),
      Returned: makeIcon(Reply, "Returned"),
      "Pending With Citizen": makeIcon(Person, "Pending With Citizen"),
      Rejected: makeIcon(Cancel, "Rejected"),
      Sanctioned: makeIcon(Verified, "Sanctioned"),
      "Shifted To Another Location": makeIcon(
        SwapHoriz,
        "Shifted To Another Location",
      ),
      "Total Corrigendum": makeIcon(EditNote, "Total Corrigendum"),
      "Total Correction": makeIcon(EditNote, "Total Correction"),
      Issued: makeIcon(CheckCircle, "Issued"),
      "Pension's Stopped": makeIcon(Block, "Pension's Stopped"),
      "PCP Applications": makeIcon(Description, "PCP Applications"),
      "PCP-UDID Expires 3 Months": makeIcon(
        AccessTime,
        "PCP-UDID Expires 3 Months",
      ),
      "Total Withheld Applications": makeIcon(
        Inventory,
        "Total Withheld Applications",
      ),
      "Temporary Withheld": makeIcon(PauseCircle, "Temporary Withheld"),
      "Permanent Withheld": makeIcon(DoNotDisturbAlt, "Permanent Withheld"),
    };
  }, [statusColors, textColors]);

  const debouncedHandleRecords = useCallback(
    debounce(async (newServiceId) => {
      if (!newServiceId || newServiceId === lastServiceId) return;
      setLoading(true);
      setError(null);
      try {
        setServiceId(newServiceId);
        setLastServiceId(newServiceId);

        // Fetch new application counts
        const response = await axiosInstance.get(
          "/Officer/GetApplicationsCount",
          {
            params: { ServiceId: newServiceId },
          },
        );
        setCountList(response.data.countList);
        setCorrigendumList(response.data.corrigendumList || []);
        setCorrectionList(response.data.correctionList || []);
        setTemporaryCountList(response.data.temporaryCountList || []);
        setWithheldCountList(response.data.withheldCountList || []);
        setCitizenPendingList(response.data.citizenPendingList || []);
        setCanSanction(response.data.canSanction);
        setCanHavePool(response.data.canHavePool);
        setOfficerAuthorities(response.data.officerAuthorities);

        // Fetch legacy counts
        const legacyResponse = await axiosInstance.get(
          "/Officer/GetLegacyCount",
          {
            params: { ServiceId: newServiceId },
          },
        );
        setLegacyCountList(legacyResponse.data.countList || []);

        // Update counts with both new and legacy data
        const newCounts = {
          total:
            response.data.countList.find(
              (item) => item.label === "Total Applications",
            )?.count || 0,
          pending:
            response.data.countList.find((item) => item.label === "Pending")
              ?.count || 0,
          forwarded:
            response.data.countList.find((item) => item.label === "Forwarded")
              ?.count || 0,
          citizenPending:
            response.data.countList.find(
              (item) => item.label === "Pending With Citizen",
            )?.count ||
            response.data.citizenPendingList[0]?.count ||
            0,
          rejected:
            response.data.countList.find((item) => item.label === "Rejected")
              ?.count || 0,
          sanctioned:
            response.data.countList.find((item) => item.label === "Sanctioned")
              ?.count || 0,
          returnedCount:
            response.data.countList.find((item) => item.label === "Returned")
              ?.count || 0,
          shiftedCount:
            response.data.countList.find(
              (item) => item.label === "Shifted To Another Location",
            )?.count || 0,
          corrigendumCount:
            response.data.corrigendumList?.reduce(
              (sum, item) => sum + (item.count || 0),
              0,
            ) || 0,
          correctionCount:
            response.data.correctionList?.reduce(
              (sum, item) => sum + (item.count || 0),
              0,
            ) || 0,
          legacyTotal:
            legacyResponse.data.countList.find(
              (item) => item.label === "Total Applications",
            )?.count || 0,
          legacyRejected:
            legacyResponse.data.countList.find(
              (item) => item.label === "Rejected",
            )?.count || 0,
          legacySanctioned:
            legacyResponse.data.countList.find(
              (item) => item.label === "Sanctioned",
            )?.count || 0,
        };
        setCounts(newCounts);
      } catch (error) {
        setError("Failed to fetch application counts.");
        toast.error("Failed to load application counts. Please try again.", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      } finally {
        setLoading(false);
      }
    }, 500),
    [lastServiceId],
  );

  useEffect(() => {
    return () => {
      debouncedHandleRecords.cancel();
    };
  }, [debouncedHandleRecords]);

  const fetchCertificates = async (pin) => {
    const formData = new FormData();
    formData.append("pin", pin);
    const response = await fetch("http://localhost:8000/certificates", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  };

  const isValidPdf = async (blob) => {
    try {
      if (blob.type !== "application/pdf") return false;
      const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
      const header = new Uint8Array(arrayBuffer);
      const pdfHeader = [37, 80, 68, 70]; // %PDF
      return header.every((byte, i) => byte === pdfHeader[i]);
    } catch (error) {
      console.error("Error validating PDF blob:", error);
      return false;
    }
  };

  const handleCardClick = useCallback((statusName, type, tableTile = null) => {
    const isCorrigendum = type.toLowerCase().includes("corrigendum");
    const isCorrection = type.toLowerCase().includes("correction");
    const isLegacy = type.toLowerCase().includes("legacy");
    const isWithheld = type.toLowerCase().includes("withheld");
    const cleanedStatus = statusName
      .replace(/(Corrigendum|Correction|Legacy|Withheld)\s*/gi, "")
      .trim();

    const typeMap = {
      "Total Applications": "total",
      "Total Corrigendum": "total",
      "Total Correction": "total",
      Pending: isCorrigendum || isCorrection ? "pending" : "pending",
      Forwarded: isCorrigendum || isCorrection ? "forwarded" : "forwarded",
      Returned: isCorrigendum || isCorrection ? "returned" : "returned",
      Rejected:
        isCorrigendum || isCorrection || isLegacy ? "rejected" : "rejected",
      Sanctioned:
        isCorrigendum || isCorrection || isLegacy ? "sanctioned" : "sanctioned",
      Issued: isCorrigendum ? "sanctioned" : "verified",
      "Pending With Citizen": "returntoedit",
      "Shifted To Another Location": "shifted",
      "Pension's Stopped": "pensionstopped",
      "PCP-UDID Expires 3 Months": "expiringeligibility",
      "PCP Applications": "totalpcpapplication",
    };

    let mappedType = typeMap[cleanedStatus] || cleanedStatus.toLowerCase();
    if (isWithheld) {
      mappedType = `withheld_${mappedType}`;
    }

    if (tableTile != null) {
      setTableTitle(tableTile);
    }

    setType(mappedType);
    setDataType(isLegacy ? "legacy" : "new"); // Set dataType based on card type

    const url =
      type === "Corrigendum" || type === "Correction"
        ? "/Officer/GetCorrigendumApplications"
        : statusName === "PCP-UDID Expires 3 Months" ||
          statusName === "PCP Applications"
        ? "/Officer/GetTemporaryDisability"
        : statusName.includes("Withheld")
        ? "/Officer/GetWithheldApplications"
        : "/Officer/GetApplications";

    setUrl(url);
    setApplicationType(type);
    setShowTable(true);

    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const refreshTable = useCallback(() => {
    if (
      tableInstanceRef.current &&
      typeof tableInstanceRef.current.refetch === "function"
    ) {
      tableInstanceRef.current.refetch();
    }
    setTableKey((prev) => prev + 1);
  }, []);

  const actionFunctions = useMemo(
    () => ({
      handleOpenApplication: (row) => {
        const userdata = row.original;
        navigate("/officer/userDetails", {
          state: { applicationId: userdata.referenceNumber, notaction: false },
        });
      },
      handleViewApplication: (row) => {
        const data = row.original;
        navigate("/officer/userDetails", {
          state: { applicationId: data.referenceNumber, notaction: true },
        });
      },
      pullApplication: async (row) => {
        setPullRow(row.original);
        setPullConfirmOpen(true);
      },
      handleViewCorrigendumApplication: (row) => {
        const userdata = row.original;
        navigate("/officer/viewcorrigendumdetails", {
          state: {
            referenceNumber: userdata.referenceNumber,
            ...(userdata.applicationId && {
              applicationId: userdata.applicationId,
            }),
            type: userdata.applicationType,
          },
        });
      },
      handleViewPdf: async (row, action) => {
        const { referenceNumber } = row.original;
        const { type, corrigendumId } = action;

        try {
          let filename;

          if (type === "DownloadSL") {
            filename = `${referenceNumber.replace(
              /\//g,
              "_",
            )}_SanctionLetter.pdf`;
          } else if (type === "DownloadCorrigendum") {
            if (!corrigendumId) {
              throw new Error("Corrigendum ID is missing in action");
            }
            filename = `${corrigendumId.replace(
              /\//g,
              "_",
            )}_CorrigendumSanctionLetter.pdf`;
          } else if (type === "DownloadCorrection") {
            if (!corrigendumId) {
              throw new Error("Correction ID is missing in action");
            }
            filename = `${corrigendumId.replace(
              /\//g,
              "_",
            )}_CorrectionSanctionLetter.pdf`;
          } else {
            throw new Error(`Invalid action type: ${type}`);
          }

          setPdfUrl(filename);
          setPdfBlob(null);
          setIsSignedPdf(true);
          setCurrentApplicationId(referenceNumber);
          setPdfModalOpen(true);
        } catch (error) {
          console.error("Error in handleViewPdf:", error);
          toast.error(`Error preparing PDF: ${error.message}`, {
            position: "top-right",
            autoClose: 3000,
            theme: "colored",
          });
        }
      },
      handleEditCorrigendumApplication: (row) => {
        const userdata = row.original;
        navigate("/officer/issuecorrigendum", {
          state: {
            ReferenceNumber: userdata.referenceNumber,
            ServiceId: userdata.serviceId,
            applicationId: userdata.applicationId,
          },
        });
      },
      handleEditCorrectionApplication: (row) => {
        const userdata = row.original;
        navigate("/officer/issuecorrection", {
          state: {
            ReferenceNumber: userdata.referenceNumber,
            ServiceId: userdata.serviceId,
            applicationId: userdata.applicationId,
          },
        });
      },
      sendExpirationEmail: async (row) => {
        setLoading(true);
        const userdata = row.original;
        console.log(userdata);
        const referenceNumber = userdata.referenceNumber;
        const expirationDate = userdata.expiryDate.split(" ")[0];
        const formdata = new FormData();
        formdata.append("referenceNumber", referenceNumber);
        formdata.append("expirationDate", expirationDate);
        const response = await axiosInstance.post(
          "/Officer/SendExpirationEmail",
          formdata,
        );
        if (response.data.status) {
          setLoading(false);
          refreshTable();
        }
      },
    }),
    [navigate],
  );

  const handlePushToPool = useCallback(
    async (selectedRows) => {
      if (selectedRows.length === 0) {
        toast.error("No applications selected.", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
        return;
      }

      const selectedData = selectedRows.map(
        (row) => row.original.referenceNumber,
      );
      const list = JSON.stringify(selectedData);

      try {
        const response = await axiosInstance.get("/Officer/UpdatePool", {
          params: { serviceId: serviceId, list: list },
        });
        toast.success("Successfully pushed to pool!", {
          position: "top-right",
          autoClose: 2000,
          theme: "colored",
        });
        refreshTable();
        if (serviceId) debouncedHandleRecords(serviceId);
      } catch (error) {
        toast.error("Failed to push to pool. Please try again.", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      }
    },
    [serviceId, debouncedHandleRecords, refreshTable],
  );

  const signPdf = async (pdfBlob, pin) => {
    const formData = new FormData();
    formData.append("pdf", pdfBlob, "document.pdf");
    formData.append("pin", pin);
    formData.append(
      "original_path",
      currentApplicationId.replace(/\//g, "_") + "_SanctionLetter.pdf",
    );
    try {
      const response = await fetch("http://localhost:8000/sign", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Signing failed: ${errorText}`);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(
        "Error signing PDF: " +
          error.message +
          " Check if Desktop App is started.",
      );
    }
  };

  const handleModalClose = useCallback(() => {
    setPdfModalOpen(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl("");
    setPdfBlob(null);
    setIsSignedPdf(false);
  }, [pdfUrl]);

  const processSingleId = useCallback(
    async (id, index, totalIds) => {
      setCurrentApplicationId(id);
      const formData = new FormData();
      formData.append("applicationId", id);
      formData.append("defaultAction", selectedAction);
      formData.append(
        "Remarks",
        selectedAction === "Sanction"
          ? "Sanctioned"
          : selectedAction === "Reject"
          ? "Rejected"
          : "Returned to Inbox",
      );

      let hasError = false;

      try {
        if (selectedAction === "toInbox") {
          const response = await axiosInstance.get("/Officer/RemoveFromPool", {
            params: { ServiceId: serviceId, itemToRemove: id },
          });
          if (!response.data.status) {
            throw new Error(
              response.data.message || "Failed to remove from pool.",
            );
          }
        } else if (selectedAction === "Sanction") {
          const response = await axiosInstance.get(
            "/Officer/GetSanctionLetter",
            {
              params: { applicationId: id },
            },
          );
          const result = response.data;
          if (!result.status) {
            throw new Error(result.response || "Something went wrong");
          }
          const pdfResponse = await axiosInstance.get(`/Base/DisplayFile`, {
            params: { filename: result.path },
            responseType: "blob",
          });
          const newPdfBlob = new Blob([pdfResponse.data], {
            type: "application/pdf",
          });
          const blobUrl = URL.createObjectURL(newPdfBlob);
          setPdfBlob(newPdfBlob);
          setPdfUrl(result.path);
          setIsSignedPdf(false);
          setPdfModalOpen(true);
          setPendingFormData(formData);
          return false;
        } else {
          const { data: result } = await axiosInstance.post(
            "/Officer/HandleAction",
            formData,
          );
          if (!result.status) {
            throw new Error(result.response || "Something went wrong");
          }
          try {
            await axiosInstance.get("/Officer/RemoveFromPool", {
              params: { ServiceId: serviceId, itemToRemove: id },
            });
          } catch (error) {
            toast.error(
              `Failed to remove application ${id} from pool: ${error.message}`,
              {
                position: "top-right",
                autoClose: 3000,
                theme: "colored",
              },
            );
            hasError = true;
          }
        }
      } catch (error) {
        toast.error(
          `Error processing ${selectedAction.toLowerCase()} for ID ${id}: ${
            error.message
          }`,
          {
            position: "top-right",
            autoClose: 3000,
            theme: "colored",
          },
        );
        hasError = true;
      }

      return !hasError;
    },
    [selectedAction, serviceId, pdfUrl],
  );

  const processAllIds = useCallback(
    async (ids) => {
      setPendingIds(ids);
      setCurrentIdIndex(0);
      let successCount = 0;

      for (let i = 0; i < ids.length; i++) {
        setCurrentIdIndex(i);
        const success = await processSingleId(ids[i], i, ids.length);
        if (selectedAction === "Sanction" && !success) {
          return;
        }
        if (success) {
          successCount++;
        }
      }

      setPendingIds([]);
      setCurrentIdIndex(0);
      setCurrentApplicationId("");
      toast.success(
        `${
          selectedAction === "toInbox"
            ? "Returned to Inbox"
            : selectedAction === "Sanction"
            ? "Sanctioned"
            : "Rejected"
        } ${successCount} of ${ids.length} application${
          ids.length > 1 ? "s" : ""
        }!`,
        { position: "top-right", autoClose: 2000, theme: "colored" },
      );
      refreshTable();
      if (serviceId) debouncedHandleRecords(serviceId);
    },
    [
      selectedAction,
      serviceId,
      processSingleId,
      debouncedHandleRecords,
      refreshTable,
    ],
  );

  const handlePinSubmit = useCallback(async () => {
    if (!pin) {
      toast.error("Please enter the USB token PIN.", {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
      return;
    }
    try {
      await signAndUpdatePdf(pin);
      setStoredPin(pin);
      setConfirmOpen(false);
      setPin("");
    } catch (error) {
      setConfirmOpen(false);
      setPin("");
      toast.error(`Error signing PDF: ${error.message}`, {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
    }
  }, [pin]);

  const handleSignPdf = useCallback(async () => {
    if (storedPin) {
      try {
        await signAndUpdatePdf(storedPin);
      } catch (error) {
        if (
          error.message.includes("No certificates found") ||
          error.message.includes("Not the registered certificate") ||
          error.message.includes("The registered certificate has expired")
        ) {
          setStoredPin(null);
          setConfirmOpen(true);
        } else {
          const nextIndex = currentIdIndex + 1;
          if (nextIndex < pendingIds.length) {
            setCurrentIdIndex(nextIndex);
            setCurrentApplicationId(pendingIds[nextIndex]);
            await new Promise((resolve) => setTimeout(resolve, 500));
            await processSingleId(
              pendingIds[nextIndex],
              nextIndex,
              pendingIds.length,
            );
          } else {
            setPendingIds([]);
            setCurrentIdIndex(0);
            setCurrentApplicationId("");
            toast.success(
              `Sanctioned ${pendingIds.length} application${
                pendingIds.length > 1 ? "s" : ""
              }!`,
              {
                position: "top-right",
                autoClose: 2000,
                theme: "colored",
              },
            );
            refreshTable();
            if (serviceId) debouncedHandleRecords(serviceId);
          }
        }
      }
    } else {
      setConfirmOpen(true);
    }
  }, [
    storedPin,
    currentIdIndex,
    pendingIds,
    serviceId,
    processSingleId,
    debouncedHandleRecords,
    refreshTable,
  ]);

  const signAndUpdatePdf = useCallback(
    async (pinToUse) => {
      try {
        if (!pdfBlob) {
          throw new Error("No PDF blob available for signing");
        }
        const isValid = await isValidPdf(pdfBlob);
        if (!isValid) {
          throw new Error("Invalid PDF structure detected");
        }
        const certDetails = await fetchCertificateDetails();
        if (!certDetails) {
          throw new Error("No registered DSC found");
        }
        const certificates = await fetchCertificates(pinToUse);
        if (!certificates || certificates.length === 0) {
          throw new Error("No certificates found on the USB token");
        }
        const selectedCertificate = certificates[0];
        const expiration = new Date(certDetails.expirationDate);
        const now = new Date();
        const tokenSerial = selectedCertificate.serial_number
          ?.toString()
          .replace(/\s+/g, "")
          .toUpperCase();
        const registeredSerial = certDetails.serial_number
          ?.toString()
          .replace(/\s+/g, "")
          .toUpperCase();
        if (tokenSerial !== registeredSerial) {
          throw new Error("Not the registered certificate");
        }
        if (expiration < now) {
          throw new Error("The registered certificate has expired");
        }

        const signedBlob = await signPdf(pdfBlob, pinToUse);
        const updateFormData = new FormData();
        updateFormData.append("signedPdf", signedBlob, "signed.pdf");
        updateFormData.append("applicationId", currentApplicationId);
        const updateResponse = await axiosInstance.post(
          "/Officer/UpdatePdf",
          updateFormData,
        );
        if (!updateResponse.data.status) {
          throw new Error(
            "Failed to update PDF on server: " +
              (updateResponse.data.response || "Unknown error"),
          );
        }

        if (pendingFormData) {
          const { data: result } = await axiosInstance.post(
            "/Officer/HandleAction",
            pendingFormData,
          );
          if (!result.status) {
            throw new Error(
              result.response || "Failed to sanction application",
            );
          }
        }

        try {
          await axiosInstance.get("/Officer/RemoveFromPool", {
            params: {
              ServiceId: serviceId,
              itemToRemove: currentApplicationId,
            },
          });
          toast.success("Application sanctioned and removed from pool!", {
            position: "top-right",
            autoClose: 2000,
            theme: "colored",
          });
        } catch (error) {
          toast.error("Failed to remove application from pool.", {
            position: "top-right",
            autoClose: 3000,
            theme: "colored",
          });
        }

        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        const blobUrl = URL.createObjectURL(signedBlob);
        setPdfUrl(updateResponse.data.path);
        setPdfBlob(null);
        setIsSignedPdf(true);
        setPendingFormData(null);
        toast.success("PDF signed successfully!", {
          position: "top-right",
          autoClose: 2000,
          theme: "colored",
        });

        if (serviceId) {
          await debouncedHandleRecords(serviceId);
        }

        const nextIndex = currentIdIndex + 1;
        if (nextIndex < pendingIds.length) {
          setCurrentIdIndex(nextIndex);
          setCurrentApplicationId(pendingIds[nextIndex]);
          await new Promise((resolve) => setTimeout(resolve, 500));
          await processSingleId(
            pendingIds[nextIndex],
            nextIndex,
            pendingIds.length,
          );
        } else {
          setPendingIds([]);
          setCurrentIdIndex(0);
          setCurrentApplicationId("");
          setConfirmOpen(false);
          toast.success(
            `Sanctioned ${pendingIds.length} application${
              pendingIds.length > 1 ? "s" : ""
            }!`,
            {
              position: "top-right",
              autoClose: 2000,
              theme: "colored",
            },
          );
          if (serviceId) {
            await debouncedHandleRecords(serviceId);
          }
          refreshTable();
        }
      } catch (error) {
        toast.error("Error signing PDF: " + error.message, {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
        setPendingFormData(null);
        throw error;
      }
    },
    [
      pdfBlob,
      currentApplicationId,
      pdfUrl,
      pendingIds,
      currentIdIndex,
      serviceId,
      processSingleId,
      debouncedHandleRecords,
      refreshTable,
      pendingFormData,
    ],
  );

  const handleRejectConfirm = useCallback(async () => {
    setLoading(true);
    setRejectConfirmOpen(false);
    await processAllIds(
      pendingRejectRows.map((row) => row.original.referenceNumber),
    );
    setLoading(false);
  }, [pendingRejectRows, processAllIds]);

  const handlePullApplication = async () => {
    const data = pullRow;
    try {
      const response = await axiosInstance.get("/Officer/PullApplication", {
        params: { applicationId: data.referenceNumber },
      });
      if (response.data.status) {
        toast.success("Successfully pulled application!", {
          position: "top-right",
          autoClose: 2000,
          theme: "colored",
        });
        setPullConfirmOpen(false);
        refreshTable();
        if (serviceId) debouncedHandleRecords(serviceId);
      }
    } catch (error) {
      toast.error("Failed to pull application. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
    }
  };

  const handleExecuteAction = useCallback(
    async (selectedRows) => {
      if (!selectedRows || selectedRows.length === 0) {
        toast.error("No applications selected.", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
        return;
      }
      const ids = selectedRows.map((item) => item.original.referenceNumber);
      if (selectedAction === "Reject") {
        setPendingRejectRows(selectedRows);
        setRejectConfirmOpen(true);
      } else {
        await processAllIds(ids);
      }
    },
    [selectedAction, processAllIds],
  );

  const getActionOptions = useMemo(() => {
    const options = [
      { value: "Reject", label: "Reject" },
      { value: "toInbox", label: "Return to Inbox" },
    ];
    if (canSanction && dataType === "new") {
      // Only allow sanction for new data
      options.push({ value: "Sanction", label: "Sanction" });
    }
    return options;
  }, [canSanction, dataType]);

  const barData = useMemo(() => {
    const labels = ["Total", "Pending"];
    const data = [counts.total, counts.pending];
    const backgroundColor = ["#009dd6", "#ffd42f"]; // Total=Blue, Pending=Yellow
    const borderColor = ["#009dd6", "#ffd42f"];

    if (officerAuthorities.canForwardToPlayer) {
      labels.push("Forwarded");
      data.push(counts.forwarded);
      backgroundColor.push("#009dd6"); // Blue
      borderColor.push("#009dd6");
    }

    if (officerAuthorities.canReturnToCitizen) {
      labels.push("Citizen Pending");
      data.push(counts.citizenPending);
      backgroundColor.push("#7849b8"); // Purple
      borderColor.push("#7849b8");
    }

    if (officerAuthorities.canReturnToPlayer) {
      labels.push("Returned");
      data.push(counts.returnedCount);
      backgroundColor.push("#fb6330"); // Orange
      borderColor.push("#fb6330");
    }

    labels.push("Rejected");
    data.push(counts.rejected);
    backgroundColor.push("#ec111a"); // Red
    borderColor.push("#ec111a");

    if (officerAuthorities.canSanction) {
      labels.push("Sanctioned");
      data.push(counts.sanctioned);
      backgroundColor.push("#138468"); // Teal Green
      borderColor.push("#138468");
    }

    return {
      labels,
      datasets: [
        {
          label: "Applications",
          data,
          backgroundColor,
          borderColor,
          borderWidth: 1,
        },
      ],
    };
  }, [counts, officerAuthorities]);

  const pieData = useMemo(() => {
    const labels = ["Pending"];
    const data = [counts.pending];
    const backgroundColor = ["#ffd42f"]; // Yellow

    if (officerAuthorities.canForwardToPlayer) {
      labels.push("Forwarded");
      data.push(counts.forwarded);
      backgroundColor.push("#009dd6"); // Blue
    }

    if (officerAuthorities.canReturnToPlayer) {
      labels.push("Returned");
      data.push(counts.returnedCount);
      backgroundColor.push("#fb6330"); // Orange
    }

    if (officerAuthorities.canReturnToCitizen) {
      labels.push("Citizen Pending");
      data.push(counts.citizenPending);
      backgroundColor.push("#7849b8"); // Purple
    }

    labels.push("Rejected");
    data.push(counts.rejected);
    backgroundColor.push("#ec111a"); // Red

    if (officerAuthorities.canSanction) {
      labels.push("Sanctioned");
      data.push(counts.sanctioned);
      backgroundColor.push("#138468"); // Teal Green
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor: new Array(labels.length).fill("#FFFFFF"),
          borderWidth: 1,
        },
      ],
    };
  }, [counts, officerAuthorities]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          enable: false,
        },
        legend: {
          position: "top",
          labels: {
            font: { size: 14, family: "'Inter', sans-serif" },
          },
        },
        datalabels: {
          display: false,
        },
      },
    }),
    [],
  );

  const extraParams = useMemo(() => {
    const params = {
      ServiceId: serviceId,
      type: type,
      dataType: dataType, // Use dataType for new or legacy
    };

    if (applicationType === "Corrigendum" || applicationType === "Correction") {
      params.applicationType = applicationType;
    }

    return params;
  }, [serviceId, type, applicationType, dataType]);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchServiceList(setServices, setOfficerRole, setOfficerArea);
      } catch (error) {
        setError("Failed to load services.");
        toast.error("Failed to load services. Please try again.", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#ffffffff",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#ffffffff",
        }}
      >
        <Typography color="error" variant="h6" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <StyledButton
          variant="contained"
          onClick={() => window.location.reload()}
        >
          Retry
        </StyledButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: { xs: 3, md: 5 },
        backgroundColor: "#FFFFFF",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          mb: 5,
          fontWeight: 700,
          color: "#2d3748",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {officerRole} {officerArea}
      </Typography>

      <Container fluid>
        <Row className="mb-1 justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <ServiceSelectionForm
              services={services}
              errors={errors}
              onServiceSelect={debouncedHandleRecords}
              sx={{
                "& .MuiFormControl-root": {
                  bgcolor: "#ffffff",
                  borderRadius: "8px",
                },
              }}
            />
          </Col>
        </Row>

        {counts && countList?.length > 0 && (
          <>
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                fontWeight: 600,
                color: "#2d3748",
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Applications
            </Typography>
            <Row
              className="mb-1 justify-content-center"
              style={{ width: "100%" }}
            >
              {countList.map((item, index) => (
                <Col
                  key={index}
                  xs={12}
                  sm={6}
                  md={4}
                  lg={2}
                  className="mb-4"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <StatCard
                    sx={{
                      backgroundColor: statusColors[item.label] || "#1976d2",
                      padding: "16px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                    onClick={() =>
                      handleCardClick(
                        item.label,
                        "application",
                        item.tableTitle,
                      )
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: "bold",
                          color: textColors[item.label] || "#FFFFFF",
                          fontSize: "1rem",
                        }}
                      >
                        {item.label}
                      </Typography>

                      {React.cloneElement(
                        iconMap[item.label] || (
                          <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                        ),
                      )}
                    </Box>

                    <MuiTooltip
                      title={
                        item.tooltipText || `View ${item.label} applications`
                      }
                      enterTouchDelay={0}
                      leaveTouchDelay={2000}
                      arrow
                    >
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: "bold",
                          color: textColors[item.label] || "#FFFFFF",
                          textAlign: "left",
                          fontSize: "3rem",
                        }}
                      >
                        {item.count}
                      </Typography>
                    </MuiTooltip>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: 1,
                        width: "100%",
                      }}
                    >
                      {item.forwardedSanctionedCount != null ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            color: "#ffffffff",
                            cursor: "pointer",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Sanctioned Applications");
                            handleCardClick(
                              "Forwarded",
                              "application",
                              item.tableTitle,
                            );
                          }}
                        >
                          Sanctioned: {item.forwardedSanctionedCount}
                        </Typography>
                      ) : (
                        <span />
                      )}

                      {item.label == "Total Applications" ? (
                        <>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: "bolder",
                              fontSize: "0.8rem",
                              color: "#ffffffff",
                            }}
                          >
                            New: {item.count}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: "bolder",
                              fontSize: "0.8rem",
                              color: "#ffffffff",
                            }}
                          >
                            Legacy: {legacyCountList[0].count}
                          </Typography>
                        </>
                      ) : (
                        <span />
                      )}

                      <Typography
                        variant="body2"
                        sx={{
                          color: textColors[item.label] || "#FFFFFF",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        View All{" "}
                        <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                      </Typography>
                    </Box>
                  </StatCard>
                </Col>
              ))}
            </Row>
            <Divider
              sx={{
                borderColor: "#000", // sets the divider color
                borderBottomWidth: 2, // thickness of the line
              }}
            />

            {!officerAuthorities.CanReturnToCitizen &&
              citizenPendingList.length > 0 && (
                <>
                  <MuiTooltip title=" Pending With Citizens" arrow>
                    <Typography
                      variant="h5"
                      sx={{
                        mb: 3,
                        fontWeight: 600,
                        color: "#2d3748",
                        textAlign: "center",
                        fontFamily: "'Inter', sans-serif",
                        mt: 2,
                      }}
                    >
                      Pending With Citizens
                    </Typography>
                  </MuiTooltip>
                  <Row
                    className="mb-1 justify-content-center"
                    style={{ width: "100%" }}
                  >
                    {citizenPendingList.map((item, index) => (
                      <Col
                        key={index}
                        xs={12}
                        sm={6}
                        md={4}
                        lg={2}
                        className="mb-4"
                        style={{
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <StatCard
                          sx={{
                            backgroundColor:
                              statusColors[item.label] || "#1976d2",
                            padding: "16px",
                            borderRadius: "12px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            height: "160px",
                          }}
                          onClick={() =>
                            handleCardClick(
                              item.label,
                              "application",
                              item.tableTitle,
                            )
                          }
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: "bold",
                                color: textColors[item.label] || "#FFFFFF",
                                fontSize: "0.85rem",
                              }}
                            >
                              {item.label}
                            </Typography>

                            {React.cloneElement(
                              iconMap[item.label] || (
                                <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                              ),
                            )}
                          </Box>

                          <MuiTooltip
                            title={
                              item.tooltipText ||
                              `View ${item.label} applications`
                            }
                            enterTouchDelay={0}
                            leaveTouchDelay={2000}
                            arrow
                          >
                            <Typography
                              variant="h3"
                              sx={{
                                fontWeight: "bold",
                                color: textColors[item.label] || "#FFFFFF",
                                textAlign: "left",
                                fontSize: "2.5rem",
                              }}
                            >
                              {item.count}
                            </Typography>
                          </MuiTooltip>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mt: 1,
                              width: "100%",
                            }}
                          >
                            {item.forwardedSanctionedCount != null ? (
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: "bold",
                                  fontSize: "0.8rem",
                                  color: "#ffffffff",
                                }}
                              >
                                Sanctioned: {item.forwardedSanctionedCount}
                              </Typography>
                            ) : (
                              <span />
                            )}

                            <Typography
                              variant="body2"
                              sx={{
                                color: textColors[item.label] || "#FFFFFF",
                                fontSize: "0.85rem",
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              View All{" "}
                              <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                            </Typography>
                          </Box>
                        </StatCard>
                      </Col>
                    ))}
                  </Row>
                  <Divider
                    sx={{
                      borderColor: "#000", // sets the divider color
                      borderBottomWidth: 2, // thickness of the line
                    }}
                  />
                </>
              )}
            <MuiTooltip title="Withheld Applications After Sanction" arrow>
              <Typography
                variant="h5"
                sx={{
                  mb: 3,
                  fontWeight: 600,
                  color: "#2d3748",
                  textAlign: "center",
                  fontFamily: "'Inter', sans-serif",
                  mt: 2,
                }}
              >
                Withheld Application Payments (After Sanction)
              </Typography>
            </MuiTooltip>
            <Row
              className="mb-1 justify-content-center"
              style={{ width: "100%" }}
            >
              {withheldCountList.map((item, index) => (
                <Col
                  key={index}
                  xs={12}
                  sm={6}
                  md={4}
                  lg={2}
                  className="mb-4"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <StatCard
                    sx={{
                      backgroundColor: statusColors[item.label] || "#1976d2",
                      padding: "16px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "160px",
                    }}
                    onClick={() =>
                      handleCardClick(item.label, "withheld", item.tableTitle)
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: "bold",
                          color: textColors[item.label] || "#FFFFFF",
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.label}
                      </Typography>

                      {React.cloneElement(
                        iconMap[item.label] || (
                          <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                        ),
                      )}
                    </Box>

                    <MuiTooltip
                      title={
                        item.tooltipText || `View ${item.label} applications`
                      }
                      enterTouchDelay={0}
                      leaveTouchDelay={2000}
                      arrow
                    >
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: "bold",
                          color: textColors[item.label] || "#FFFFFF",
                          textAlign: "left",
                          fontSize: "2.5rem",
                        }}
                      >
                        {item.count}
                      </Typography>
                    </MuiTooltip>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: 1,
                        width: "100%",
                      }}
                    >
                      {item.forwardedSanctionedCount != null ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            color: "#000000",
                          }}
                        >
                          Sanctioned: {item.forwardedSanctionedCount}
                        </Typography>
                      ) : (
                        <span />
                      )}

                      <Typography
                        variant="body2"
                        sx={{
                          color: textColors[item.label] || "#FFFFFF",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        View All{" "}
                        <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                      </Typography>
                    </Box>
                  </StatCard>
                </Col>
              ))}
            </Row>
            <Divider
              sx={{
                borderColor: "#000", // sets the divider color
                borderBottomWidth: 2, // thickness of the line
              }}
            />
            <Typography
              variant="h5"
              sx={{
                mb: 3,
                fontWeight: 600,
                color: "#2d3748",
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
                mt: 2,
              }}
            >
              Physically Challenged Applications
            </Typography>
            <Row
              className="mb-1 justify-content-center"
              style={{ width: "100%" }}
            >
              {temporaryCountList.map((item, index) => (
                <Col
                  key={index}
                  xs={12}
                  sm={6}
                  md={4}
                  lg={2}
                  className="mb-4"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <StatCard
                    sx={{
                      backgroundColor: statusColors[item.label] || "#1976d2",
                      padding: "16px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "160px",
                    }}
                    onClick={() =>
                      handleCardClick(
                        item.label,
                        "application",
                        item.tableTitle,
                      )
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: "bold",
                          color: textColors[item.label] || "#FFFFFF",
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.label}
                      </Typography>

                      {React.cloneElement(
                        iconMap[item.label] || (
                          <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                        ),
                      )}
                    </Box>

                    <MuiTooltip
                      title={
                        item.tooltipText || `View ${item.label} applications`
                      }
                      enterTouchDelay={0}
                      leaveTouchDelay={2000}
                      arrow
                    >
                      <Typography
                        variant="h3"
                        sx={{
                          fontWeight: "bold",
                          color: textColors[item.label] || "#FFFFFF",
                          textAlign: "left",
                          fontSize: "2.5rem",
                        }}
                      >
                        {item.count}
                      </Typography>
                    </MuiTooltip>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mt: 1,
                        width: "100%",
                      }}
                    >
                      {item.forwardedSanctionedCount != null ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: "bold",
                            fontSize: "0.8rem",
                            color: "#000000",
                            cursor: "grab",
                          }}
                        >
                          Sanctioned: {item.forwardedSanctionedCount}
                        </Typography>
                      ) : (
                        <span />
                      )}

                      <Typography
                        variant="body2"
                        sx={{
                          color: textColors[item.label] || "#FFFFFF",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        View All{" "}
                        <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                      </Typography>
                    </Box>
                  </StatCard>
                </Col>
              ))}
            </Row>
            <Divider
              sx={{
                borderColor: "#000", // sets the divider color
                borderBottomWidth: 2, // thickness of the line
              }}
            />
            {corrigendumList?.length > 0 && (
              <>
                <MuiTooltip
                  title="Corrgendum are issued after cases are sanctioned"
                  arrow
                >
                  <Typography
                    variant="h5"
                    sx={{
                      mb: 3,
                      fontWeight: 600,
                      color: "#2d3748",
                      textAlign: "center",
                      fontFamily: "'Inter', sans-serif",
                      mt: 2,
                    }}
                  >
                    Corrigendums
                  </Typography>
                </MuiTooltip>
                <Row
                  className="mb-1 justify-content-center align-items-center"
                  style={{ width: "100%" }}
                >
                  {corrigendumList.map((item, index) => (
                    <Col
                      key={index}
                      xs={12}
                      sm={6}
                      md={4}
                      lg={2}
                      className="mb-4"
                      style={{ display: "flex", justifyContent: "center" }}
                    >
                      <StatCard
                        sx={{
                          backgroundColor:
                            statusColors[item.label] || "#1976d2",
                          padding: "16px",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          height: "160px",
                        }}
                        onClick={() =>
                          handleCardClick(
                            item.label,
                            "Corrigendum",
                            item.tableTitle,
                          )
                        }
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color: textColors[item.label] || "#FFFFFF",
                              fontSize: "0.85rem",
                            }}
                          >
                            {item.label}
                          </Typography>

                          {React.cloneElement(
                            iconMap[item.label] || (
                              <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                            ),
                          )}
                        </Box>

                        <MuiTooltip
                          title={
                            item.tooltipText ||
                            `View ${item.label} corrigendums`
                          }
                          enterTouchDelay={0}
                          leaveTouchDelay={2000}
                          arrow
                        >
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: "bold",
                              color: textColors[item.label] || "#FFFFFF",
                              textAlign: "left",
                              fontSize: "2.5rem",
                            }}
                          >
                            {item.count}
                          </Typography>
                        </MuiTooltip>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: 1,
                            width: "100%",
                          }}
                        >
                          {item.forwardedSanctionedCount != null ? (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                                color: "#ffffffff",
                              }}
                            >
                              Issued: {item.forwardedSanctionedCount}
                            </Typography>
                          ) : (
                            <span />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              color: textColors[item.label] || "#FFFFFF",
                              fontSize: "0.85rem",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            View All{" "}
                            <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                          </Typography>
                        </Box>
                      </StatCard>
                    </Col>
                  ))}
                </Row>
              </>
            )}
            <Divider
              sx={{
                borderColor: "#000", // sets the divider color
                borderBottomWidth: 2, // thickness of the line
              }}
            />
            {correctionList?.length > 0 && (
              <>
                <MuiTooltip
                  title="Corrections are made before cases are sanctioned"
                  arrow
                >
                  <Typography
                    variant="h5"
                    sx={{
                      mb: 3,
                      fontWeight: 600,
                      color: "#2d3748",
                      textAlign: "center",
                      fontFamily: "'Inter', sans-serif",
                      mt: 2,
                    }}
                  >
                    Corrections
                  </Typography>
                </MuiTooltip>
                <Row
                  className="mb-1 justify-content-center align-items-center"
                  style={{ width: "100%" }}
                >
                  {correctionList.map((item, index) => (
                    <Col
                      key={index}
                      xs={12}
                      sm={6}
                      md={4}
                      lg={2}
                      className="mb-4"
                      style={{ display: "flex", justifyContent: "center" }}
                    >
                      <StatCard
                        sx={{
                          backgroundColor:
                            statusColors[item.label] || "#1976d2",
                          padding: "16px",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          height: "160px",
                        }}
                        onClick={() =>
                          handleCardClick(
                            item.label,
                            "Correction",
                            item.tableTitle,
                          )
                        }
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color: textColors[item.label] || "#FFFFFF",
                              fontSize: "0.85rem",
                            }}
                          >
                            {item.label}
                          </Typography>

                          {React.cloneElement(
                            iconMap[item.label] || (
                              <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                            ),
                          )}
                        </Box>

                        <MuiTooltip
                          title={
                            item.tooltipText || `View ${item.label} corrections`
                          }
                          enterTouchDelay={0}
                          leaveTouchDelay={2000}
                          arrow
                        >
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: "bold",
                              color: textColors[item.label] || "#FFFFFF",
                              textAlign: "left",
                              fontSize: "2.5rem",
                            }}
                          >
                            {item.count}
                          </Typography>
                        </MuiTooltip>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mt: 1,
                            width: "100%",
                          }}
                        >
                          {item.forwardedSanctionedCount != null ? (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: "bold",
                                fontSize: "0.8rem",
                                color: "#000000",
                              }}
                            >
                              Verified: {item.forwardedSanctionedCount}
                            </Typography>
                          ) : (
                            <span />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              color: textColors[item.label] || "#FFFFFF",
                              fontSize: "0.85rem",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            View All{" "}
                            <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                          </Typography>
                        </Box>
                      </StatCard>
                    </Col>
                  ))}
                </Row>
              </>
            )}
            <Divider
              sx={{
                borderColor: "#000", // sets the divider color
                borderBottomWidth: 2, // thickness of the line
              }}
            />
            {legacyCountList?.length > 0 && (
              <>
                <Typography
                  variant="h5"
                  sx={{
                    mb: 3,
                    fontWeight: 600,
                    color: "#2d3748",
                    textAlign: "center",
                    fontFamily: "'Inter', sans-serif",
                    mt: 2,
                  }}
                >
                  Legacy Applications
                </Typography>
                <Row
                  className="mb-1 justify-content-center align-items-center"
                  style={{ width: "100%" }}
                >
                  {legacyCountList.map((item, index) => (
                    <Col
                      key={index}
                      xs={12}
                      sm={6}
                      md={4}
                      lg={2}
                      className="mb-4"
                      style={{ display: "flex", justifyContent: "center" }}
                    >
                      <StatCard
                        sx={{
                          backgroundColor:
                            statusColors[item.label] || "#1976d2",
                          padding: "16px",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          height: "160px",
                        }}
                        onClick={() =>
                          handleCardClick(item.label, "Legacy", item.tableTitle)
                        }
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color: textColors[item.label] || "#FFFFFF",
                              fontSize: "0.85rem",
                            }}
                          >
                            {item.label}
                          </Typography>

                          {React.cloneElement(
                            iconMap[item.label] || (
                              <AssignmentTurnedIn sx={{ fontSize: 16 }} />
                            ),
                          )}
                        </Box>

                        <MuiTooltip
                          title={
                            item.tooltipText ||
                            `View ${item.label} legacy applications`
                          }
                          enterTouchDelay={0}
                          leaveTouchDelay={2000}
                          arrow
                        >
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: "bold",
                              color: textColors[item.label] || "#FFFFFF",
                              textAlign: "left",
                              fontSize: "2.5rem",
                            }}
                          >
                            {item.count}
                          </Typography>
                        </MuiTooltip>

                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            mt: 1,
                            width: "100%",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: textColors[item.label] || "#FFFFFF",
                              fontSize: "0.85rem",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            View All{" "}
                            <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                          </Typography>
                        </Box>
                      </StatCard>
                    </Col>
                  ))}
                </Row>
              </>
            )}

            <Row>
              <Col xs={12} lg={6} className="mb-4 ">
                <StyledCard>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{ mb: 3, fontWeight: 600, color: "#2d3748" }}
                    >
                      Application Status Distribution
                    </Typography>
                    <Box sx={{ height: "350px" }}>
                      <Pie data={pieData} options={chartOptions} />
                    </Box>
                  </CardContent>
                </StyledCard>
              </Col>
              <Col xs={12} lg={6} className="mb-4 ">
                <StyledCard>
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{ mb: 3, fontWeight: 600, color: "#2d3748" }}
                    >
                      Application Counts
                    </Typography>
                    <Box sx={{ height: "350px" }}>
                      <Bar data={barData} options={chartOptions} />
                    </Box>
                  </CardContent>
                </StyledCard>
              </Col>
            </Row>
          </>
        )}

        {showTable && (
          <Row ref={tableRef} className="mt-5">
            <Col xs={12}>
              <StyledCard>
                <CardContent>
                  <ServerSideTable
                    ref={tableInstanceRef}
                    key={`table-${tableKey}-${serviceId}-${type}`}
                    url={url}
                    extraParams={extraParams}
                    actionFunctions={actionFunctions}
                    canSanction={canSanction}
                    canHavePool={canHavePool}
                    pendingApplications={type === "pending"}
                    serviceId={serviceId}
                    onPushToPool={handlePushToPool}
                    onExecuteAction={handleExecuteAction}
                    actionOptions={getActionOptions}
                    selectedAction={selectedAction}
                    setSelectedAction={setSelectedAction}
                    Title={tableTitle}
                    sx={{
                      "& .MuiTable-root": { background: "#ffffff" },
                      "& .MuiTableCell-root": {
                        color: "#2d3748",
                        borderColor: "#e0e0e0",
                      },
                      "& .MuiButton-root": { color: "#1976d2" },
                    }}
                  />
                </CardContent>
              </StyledCard>
            </Col>
          </Row>
        )}
      </Container>

      <StyledDialog
        open={rejectConfirmOpen}
        onClose={() => {
          setRejectConfirmOpen(false);
          setPendingRejectRows([]);
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            color: "#2d3748",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Confirm Reject Action
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ mb: 2, color: "#2d3748", fontFamily: "'Inter', sans-serif" }}
          >
            Are you sure you want to reject {pendingRejectRows.length} selected
            {type === "corrigendum"
              ? "corrigendum"
              : type === "correction"
              ? "correction"
              : dataType === "legacy"
              ? "legacy application"
              : "application"}
            {pendingRejectRows.length > 1 ? "s" : ""}? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <StyledButton
            onClick={() => {
              setRejectConfirmOpen(false);
              setPendingRejectRows([]);
            }}
            aria-label="Cancel"
          >
            Cancel
          </StyledButton>
          <StyledButton
            onClick={handleRejectConfirm}
            aria-label="Confirm Reject"
            sx={{
              background: "linear-gradient(45deg, #d32f2f, #f44336)",
              "&:hover": {
                background: "linear-gradient(45deg, #b71c1c, #d32f2f)",
              },
            }}
          >
            Confirm Reject
          </StyledButton>
        </DialogActions>
      </StyledDialog>

      <StyledDialog
        open={pullConfirmOpen}
        onClose={() => {
          setPullConfirmOpen(false);
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            color: "#2d3748",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Confirm Pull Action
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ mb: 2, color: "#2d3748", fontFamily: "'Inter', sans-serif" }}
          >
            Are you sure you want to pull {pullRow.referenceNumber}{" "}
            {type === "corrigendum"
              ? "corrigendum"
              : type === "correction"
              ? "correction"
              : dataType === "legacy"
              ? "legacy application"
              : "application"}
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <StyledButton
            onClick={() => setPullConfirmOpen(false)}
            aria-label="Cancel"
          >
            Cancel
          </StyledButton>
          <StyledButton
            onClick={handlePullApplication}
            aria-label="Confirm Pull"
            sx={{
              background: "linear-gradient(45deg, #d32f2f, #f44336)",
              "&:hover": {
                background: "linear-gradient(45deg, #b71c1c, #d32f2f)",
              },
            }}
          >
            Confirm Pull
          </StyledButton>
        </DialogActions>
      </StyledDialog>

      <StyledDialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle
          sx={{
            fontWeight: 600,
            color: "#2d3748",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Enter USB Token PIN
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ mb: 2, color: "#2d3748", fontFamily: "'Inter', sans-serif" }}
          >
            Please enter the PIN for your USB token to sign the document.
          </Typography>
          <TextField
            type="password"
            label="USB Token PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            fullWidth
            margin="normal"
            aria-label="USB Token PIN"
            inputProps={{ "aria-describedby": "pin-helper-text" }}
            sx={{
              bgcolor: "#ffffff",
              borderRadius: "8px",
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#e0e0e0" },
                "&:hover fieldset": { borderColor: "#1976d2" },
              },
            }}
          />
          <FormHelperText id="pin-helper-text">
            Required to sign the document.
          </FormHelperText>
        </DialogContent>
        <DialogActions>
          <StyledButton
            onClick={() => setConfirmOpen(false)}
            aria-label="Cancel"
          >
            Cancel
          </StyledButton>
          <StyledButton
            onClick={handlePinSubmit}
            disabled={!pin}
            aria-label="Submit PIN"
          >
            Submit
          </StyledButton>
        </DialogActions>
      </StyledDialog>

      <BasicModal
        open={pdfModalOpen}
        handleClose={handleModalClose}
        handleActionButton={!isSignedPdf ? handleSignPdf : null}
        buttonText={!isSignedPdf ? "Sign PDF" : null}
        Title={isSignedPdf ? "Signed Document" : "Document Preview"}
        pdf={pdfUrl}
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", md: "80%" },
            maxWidth: 800,
            height: "80vh",
            borderRadius: 12,
            background: "#ffffff",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          },
        }}
      />
    </Box>
  );
}
