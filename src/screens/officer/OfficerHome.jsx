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
  Container as MuiContainer,
  IconButton,
} from "@mui/material";
import { useForm } from "react-hook-form";
import axiosInstance from "../../axiosConfig";
import { Container, Row, Col } from "react-bootstrap";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
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
  Reply,
  SyncAlt,
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
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import CustomLegend from "../../components/CustomLegend";

// Styled components
const StatCard = styled(Card)(({ theme }) => ({
  borderRadius: "16px",
  boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  border: "1px solid #d1d5db",
  background: "#ffffff",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-8px) scale(1.02)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
    borderColor: "#9ca3af",
  },
  "&:active": {
    transform: "translateY(-4px) scale(1.01)",
  },
  [theme.breakpoints.down("sm")]: {
    "&:hover": {
      transform: "translateY(-4px) scale(1.01)",
    },
  },
}));

const StyledButton = styled(Button)`
  background: linear-gradient(45deg, #1976d2, #2196f3);
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 8px;
  text-transform: none;
  color: #ffffff;
  margin-left: 4px;
  transition: all 0.3s ease;
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
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    background: #ffffff;
    padding: 32px;
    max-width: 94vw;
  }
`;

const StyledCard = styled(Card)(({ theme }) => ({
  background: "linear-gradient(135deg, #ffffff, #fafafa)",
  border: "1px solid #d1d5db",
  borderRadius: "16px",
  boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  marginBottom: "24px",
  "&:hover": {
    transform: "translateY(-3px) scale(1.005)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
  },
}));

const SectionContainer = styled(Box)(({ theme }) => ({
  maxWidth: "1400px",
  margin: "0 auto",
  padding: theme.spacing(0, 2),
  [theme.breakpoints.up("md")]: {
    padding: theme.spacing(0, 4),
  },
}));

const CardGrid = styled(Box)(({ theme }) => ({
  display: "grid",
  gap: theme.spacing(3),
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  justifyContent: "center",
  marginBottom: theme.spacing(4),
  alignItems: "start",
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: "1fr",
    gap: theme.spacing(2),
  },
}));

const ViewOnlySection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(6),
  paddingTop: theme.spacing(4),
  borderTop: `2px dashed ${theme.palette.divider}`,
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: "1.5rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: theme.spacing(3),
  fontFamily: "'Inter', sans-serif",
}));

export default function OfficerHome() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [countList, setCountList] = useState([]);
  const [corrigendumList, setCorrigendumList] = useState([]);
  const [amendmentList, setAmendmentList] = useState([]);
  const [correctionList, setCorrectionList] = useState([]);
  const [legacyCountList, setLegacyCountList] = useState([]);
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
  const [dataType, setDataType] = useState("new");
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
      "Total Applications": "#6B7280",
      "Total Corrigendum": "#5B21B6",
      "Total Correction": "#0D9488",
      "Total Amendment": "#15803D",
      "Total Withheld Applications": "#B45309",
      Pending: "#F76F15",
      "Pending With Citizen": "#a855f7",
      "Withheld Pending": "#F76F15",
      "Withheld Forwarded": "#0ea5e9",
      "Withheld Approved": "#10b981",
      Forwarded: "#0ea5e9",
      "Shifted To Another Location": "#ec4899",
      Returned: "#f97316",
      Rejected: "#ef4444",
      "Permanent Withheld": "#b91c1c",
      "Temporary Withheld": "#F76F15",
      Sanctioned: "#10b981",
      Issued: "#059669",
      "PCP-UDID Expires in 3 Months": "#14b8a6",
      "PCP Applications": "#3b82f6",
      "Pension's Stopped": "#9333ea",
    }),
    [],
  );

  const textColors = useMemo(
    () => ({
      "Total Applications": "#FFFFFF",
      "Total Amendment": "#FFFFFF",
      "Total Corrigendum": "#FFFFFF",
      "Total Correction": "#FFFFFF",
      "Total Withheld Applications": "#FFFFFF",
      Pending: "#FFFFFF",
      Forwarded: "#FFFFFF",
      Returned: "#FFFFFF",
      "Pending With Citizen": "#FFFFFF",
      Rejected: "#FFFFFF",
      Sanctioned: "#FFFFFF",
      "Shifted To Another Location": "#FFFFFF",
      Issued: "#FFFFFF",
      "Pension's Stopped": "#FFFFFF",
      "PCP Applications": "#FFFFFF",
      "PCP-UDID Expires in 3 Months": "#FFFFFF",
      "Temporary Withheld": "#FFFFFF",
      "Permanent Withheld": "#FFFFFF",
    }),
    [],
  );

  const iconMap = useMemo(() => {
    const makeIcon = (Icon, key) => (
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backdropFilter: "blur(10px)",
        }}
      >
        <Icon sx={{ fontSize: 18, color: "#FFFFFF" }} />
      </Box>
    );

    return {
      "Total Applications": makeIcon(Summarize, "Total Applications"),
      "Total Corrigendum": makeIcon(EditNote, "Total Corrigendum"),
      "Total Correction": makeIcon(EditNote, "Total Correction"),
      "Total Amendment": makeIcon(EditNote, "Total Amendment"),
      "Total Withheld Applications": makeIcon(
        Inventory,
        "Total Withheld Applications",
      ),
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
      Issued: makeIcon(CheckCircle, "Issued"),
      "Pension's Stopped": makeIcon(Block, "Pension's Stopped"),
      "PCP Applications": makeIcon(Description, "PCP Applications"),
      "PCP-UDID Expires in 3 Months": makeIcon(
        AccessTime,
        "PCP-UDID Expires in 3 Months",
      ),
      "Temporary Withheld": makeIcon(PauseCircle, "Temporary Withheld"),
      "Permanent Withheld": makeIcon(DoNotDisturbAlt, "Permanent Withheld"),
    };
  }, []);

  const debouncedHandleRecords = useCallback(
    debounce(async (newServiceId) => {
      if (!newServiceId || newServiceId === lastServiceId) return;
      setLoading(true);
      setError(null);
      try {
        setServiceId(newServiceId);
        setLastServiceId(newServiceId);

        const response = await axiosInstance.get(
          "/Officer/GetApplicationsCount",
          {
            params: { ServiceId: newServiceId },
          },
        );
        setCountList(response.data.countList || []);
        setCorrigendumList(response.data.corrigendumList || []);
        setAmendmentList(response.data.amendmentList || []);
        setCorrectionList(response.data.correctionList || []);
        setTemporaryCountList(response.data.temporaryCountList || []);
        setWithheldCountList(response.data.withheldCountList || []);
        setCitizenPendingList(response.data.citizenPendingList || []);
        setCanSanction(response.data.canSanction || false);
        setCanHavePool(response.data.canHavePool || false);
        setOfficerAuthorities(response.data.officerAuthorities || {});

        const legacyResponse = await axiosInstance.get(
          "/Officer/GetLegacyCount",
          {
            params: { ServiceId: newServiceId },
          },
        );
        setLegacyCountList(legacyResponse.data.countList || []);

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
      const pdfHeader = [37, 80, 68, 70];
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
      "Total Amendment": "total",
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
      "PCP-UDID Expires in 3 Months": "expiringeligibility",
      "PCP Applications": "totalpcpapplication",
      "Withheld Pending": "pending",
      "Withheld Forwarded": "forwarded",
      "Withheld Approved": "approved",
    };

    let mappedType = typeMap[cleanedStatus] || cleanedStatus.toLowerCase();
    if (isWithheld) {
      mappedType = `withheld_${mappedType}`;
    }

    if (tableTile) {
      setTableTitle(tableTile);
    }

    setType(mappedType);
    setDataType(isLegacy ? "legacy" : "new");

    const url =
      type === "Corrigendum" || type === "Correction"
        ? "/Officer/GetCorrigendumApplications"
        : statusName === "PCP-UDID Expires in 3 Months" ||
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
          state: { applicationId: data.referenceNumber, notaction: false },
        });
      },
      handleViewWithheldApplication: (row) => {
        {
          const data = row.original;
          navigate("/officer/withheld", {
            state: { applicationId: data.referenceNumber },
          });
        }
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
        const { referenceNumber, applicationType } = row.original;
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
            )}_${applicationType}SanctionLetter.pdf`;
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
        const referenceNumber = userdata.referenceNumber;
        const expirationDate = userdata.expiryDate?.split(" ")[0] || "";
        const formdata = new FormData();
        formdata.append("referenceNumber", referenceNumber);
        formdata.append("expirationDate", expirationDate);
        try {
          const response = await axiosInstance.post(
            "/Officer/SendExpirationEmail",
            formdata,
          );
          if (response.data.status) {
            setLoading(false);
            refreshTable();
            toast.success("Expiration email sent successfully!", {
              position: "top-right",
              autoClose: 2000,
              theme: "colored",
            });
          }
        } catch (error) {
          setLoading(false);
          toast.error("Failed to send expiration email.", {
            position: "top-right",
            autoClose: 3000,
            theme: "colored",
          });
        }
      },
    }),
    [navigate, refreshTable],
  );

  const handlePushToPool = useCallback(
    async (selectedRows) => {
      if (!selectedRows || selectedRows.length === 0) {
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
          `Error processing ${selectedAction.toLowerCase()} for ID ${id}: ${error.message
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
    [selectedAction, serviceId],
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
        `${selectedAction === "toInbox"
          ? "Returned to Inbox"
          : selectedAction === "Sanction"
            ? "Sanctioned"
            : "Rejected"
        } ${successCount} of ${ids.length} application${ids.length > 1 ? "s" : ""
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
              `Sanctioned ${pendingIds.length} application${pendingIds.length > 1 ? "s" : ""
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
            `Sanctioned ${pendingIds.length} application${pendingIds.length > 1 ? "s" : ""
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
      options.push({ value: "Sanction", label: "Sanction" });
    }
    return options;
  }, [canSanction, dataType]);

  const barData = useMemo(() => {
    const labels = ["Total", "Pending"];
    const data = [Math.max(counts.total, 0), Math.max(counts.pending, 0)];
    const backgroundColor = ["#374151", "#F76F15"];
    const borderColor = ["#374151", "#F76F15"];
    console.log("Officer Authorities in barData:", officerAuthorities);
    if (officerAuthorities.canForwardToPlayer) {
      labels.push("Forwarded");
      data.push(Math.max(counts.forwarded, 0));
      backgroundColor.push("#0ea5e9");
      borderColor.push("#0ea5e9");
    }

    if (officerAuthorities.canReturnToCitizen) {
      labels.push("Citizen Pending");
      data.push(Math.max(counts.citizenPending, 0));
      backgroundColor.push("#a855f7");
      borderColor.push("#a855f7");
    }

    if (officerAuthorities.canReturnToPlayer) {
      labels.push("Returned");
      data.push(Math.max(counts.returnedCount, 0));
      backgroundColor.push("#f97316");
      borderColor.push("#f97316");
    }

    labels.push("Rejected");
    data.push(Math.max(counts.rejected, 0));
    backgroundColor.push("#ef4444");
    borderColor.push("#ef4444");

    if (officerAuthorities.canSanction) {
      labels.push("Sanctioned");
      data.push(Math.max(counts.sanctioned, 0));
      backgroundColor.push("#10b981");
      borderColor.push("#10b981");
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
    const data = [Math.max(counts.pending, 0)];
    const backgroundColor = ["#F76F15"];

    if (officerAuthorities.canForwardToPlayer) {
      labels.push("Forwarded");
      data.push(Math.max(counts.forwarded, 0));
      backgroundColor.push("#0ea5e9");
    }

    if (officerAuthorities.canReturnToPlayer) {
      labels.push("Returned");
      data.push(Math.max(counts.returnedCount, 0));
      backgroundColor.push("#f97316");
    }

    if (officerAuthorities.canReturnToCitizen) {
      labels.push("Citizen Pending");
      data.push(Math.max(counts.citizenPending, 0));
      backgroundColor.push("#a855f7");
    }

    labels.push("Rejected");
    data.push(Math.max(counts.rejected, 0));
    backgroundColor.push("#ef4444");

    if (officerAuthorities.canSanction) {
      labels.push("Sanctioned");
      data.push(Math.max(counts.sanctioned, 0));
      backgroundColor.push("#10b981");
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

  const barChartOptions = useMemo(
    () => ({
      margin: { top: 20, right: 30, left: 20, bottom: 50 },
    }),
    [],
  );

  const pieChartOptions = useMemo(
    () => ({
      margin: { top: 40, right: 80, bottom: 80, left: 80 },
      innerRadius: 0.5,
      padAngle: 0.7,
      cornerRadius: 3,
      arcLinkLabelsTextColor: "#333333",
      arcLinkLabelsThickness: 2,
      arcLabelsTextColor: { from: "color", modifiers: [["darker", 2]] },
    }),
    [],
  );

  const extraParams = useMemo(() => {
    const params = {
      ServiceId: serviceId,
      type: type,
      dataType: dataType,
    };

    if (
      applicationType === "Corrigendum" ||
      applicationType === "Correction" ||
      applicationType === "Amendment"
    ) {
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

  const ConsolidatedStatCard = ({
    title,
    items,
    type,
    sectionTooltip = "",
  }) => {
    const [expanded, setExpanded] = React.useState(false);

    if (!items || items.length === 0) return null;

    const sortedItems = [...items].sort((a, b) => {
      if (a.label.startsWith("Total")) return -1;
      if (b.label.startsWith("Total")) return 1;
      return 0;
    });

    const toggleExpanded = () => setExpanded((prev) => !prev);
    const itemsToShow = expanded ? sortedItems : [sortedItems[0]];

    return (
      <StatCard sx={{ padding: "24px", borderRadius: "12px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <MuiTooltip title={sectionTooltip} arrow>
            <Typography
              sx={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "#2d3748",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {title}
            </Typography>
          </MuiTooltip>

          <IconButton size="small" onClick={toggleExpanded}>
            <Typography
              sx={{
                fontSize: "1.8rem",
                fontWeight: 300,
                lineHeight: 1,
                color: "#2d3748",
                userSelect: "none",
              }}
            >
              {expanded ? "−" : "+"}
            </Typography>
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {itemsToShow.map((item, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                borderRadius: "8px",
                backgroundColor: statusColors[item.label] || "#1976d2",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateX(4px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                },
                "&:hover .forwarded-row": {
                  display: "flex",
                },
              }}
              onClick={() => handleCardClick(item.label, type, item.tableTitle)}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {iconMap[item.label] || (
                    <AssignmentTurnedIn
                      sx={{ fontSize: 18, color: "#FFFFFF" }}
                    />
                  )}
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: textColors[item.label] || "#FFFFFF",
                      fontSize: "0.9rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: textColors[item.label] || "#FFFFFF",
                    fontSize: "1rem",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {item.count || 0}
                </Typography>
              </Box>

              {item.forwardedSanctionedCount != null && (
                <Box
                  className="forwarded-row"
                  sx={{
                    display: "none",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "4px 12px",
                    backgroundColor: "rgba(0,0,0,0.1)",
                    borderRadius: "0 0 8px 8px",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: textColors[item.label] || "#FFFFFF",
                      fontSize: "0.8rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {title.includes("Applications") ? "Sanctioned" : "Issued"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: textColors[item.label] || "#FFFFFF",
                      fontSize: "0.8rem",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {item.forwardedSanctionedCount || 0}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </StatCard>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f5f5f5, #eceff1)",
        }}
      >
        <CircularProgress size={60} sx={{ color: "#1976d2" }} />
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
          background: "linear-gradient(135deg, #f5f5f5, #eceff1)",
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
        background:
          "linear-gradient(to bottom right, #F4F9FF 0%, #F9F3EC 100%)",
        pb: 6,
      }}
    >
      <Box
        sx={{
          background: "linear-gradient(135deg, #F67015 0%, #0FB282 100%)",
          py: { xs: 4, md: 6 },
          mb: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "200px",
        }}
      >
        <MuiContainer maxWidth="lg">
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              justifyContent: "center",
              gap: { xs: 0, md: 2 },
              mb: 1,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: "#FFFFFF",
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {officerRole}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: "#FFFFFF",
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              Dashboard
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 400,
              color: "rgba(255, 255, 255, 0.9)",
              textAlign: "center",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {officerArea}
          </Typography>
        </MuiContainer>
      </Box>

      <SectionContainer>
        <Box sx={{ mb: 6, width: "100%" }}>
          <ServiceSelectionForm
            services={services}
            errors={errors}
            onServiceSelect={debouncedHandleRecords}
            sx={{
              maxWidth: 600,
              margin: "0 auto",
              "& .MuiFormControl-root": {
                bgcolor: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              },
            }}
          />
        </Box>

        {/* Actionable Cards Section */}
        <SectionTitle>Actions</SectionTitle>
        <CardGrid>
          {counts && countList?.length > 0 && (
            <ConsolidatedStatCard
              title="Applications Overview"
              items={countList}
              type="application"
              sectionTooltip="Overview of all application statuses"
            />
          )}

          {withheldCountList.length > 0 && (
            <ConsolidatedStatCard
              title="Withheld Payments"
              items={withheldCountList}
              type="withheld"
              sectionTooltip="Applications withheld after sanction"
            />
          )}



          {corrigendumList?.length > 0 && (
            <ConsolidatedStatCard
              title="Corrigendums"
              items={corrigendumList}
              type="Corrigendum"
              sectionTooltip="Corrigendums issued after cases are sanctioned"
            />
          )}

          {correctionList?.length > 0 && (
            <ConsolidatedStatCard
              title="Corrections"
              items={correctionList}
              type="Correction"
              sectionTooltip="Corrections made before cases are sanctioned"
            />
          )}


        </CardGrid>

        {/* View-Only Cards Section */}

        <ViewOnlySection>
          <SectionTitle>View Only</SectionTitle>
          <CardGrid>
            {citizenPendingList.length > 0 && (
              <ConsolidatedStatCard
                title="Pending With Citizens"
                items={citizenPendingList}
                type="application"
                sectionTooltip="Applications pending with citizens (View Only)"
              />
            )}

            {temporaryCountList.length > 0 && (
              <ConsolidatedStatCard
                title="Physically Challenged"
                items={temporaryCountList}
                type="application"
                sectionTooltip="Physically challenged applications"
              />
            )}

            {legacyCountList?.length > 0 && (
              <ConsolidatedStatCard
                title="Legacy Applications"
                items={legacyCountList}
                type="Legacy"
                sectionTooltip="Legacy applications overview"
              />
            )}
          </CardGrid>
        </ViewOnlySection>

        <Divider sx={{ borderColor: "#d1d5db", borderBottomWidth: 2, my: 6 }} />

        {counts && countList?.length > 0 && (
          <Row>
            <Col xs={12} lg={6} className="mb-4">
              <StyledCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 3,
                      fontWeight: 600,
                      color: "#2d3748",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Application Status Distribution
                  </Typography>

                  <Box
                    sx={{
                      height: "400px",
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {pieData.datasets[0].data.some((value) => value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData.labels.map((label, index) => ({
                              name: label,
                              value: pieData.datasets[0].data[index],
                            }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            innerRadius="50%"
                            paddingAngle={2}
                            cornerRadius={5}
                            label
                          >
                            {pieData.labels.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  pieData.datasets[0].backgroundColor[index]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend content={<CustomLegend />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography>No data available for pie chart</Typography>
                    )}
                  </Box>
                </CardContent>
              </StyledCard>
            </Col>

            <Col xs={12} lg={6} className="mb-4">
              <StyledCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 3,
                      fontWeight: 600,
                      color: "#2d3748",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Applications Count Overview
                  </Typography>

                  <Box
                    sx={{
                      height: "400px",
                      width: "100%",
                      position: "relative",
                    }}
                  >
                    {barData.datasets[0].data.some((value) => value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={barData.labels.map((label, index) => ({
                            name: label,
                            value: barData.datasets[0].data[index],
                          }))}
                          margin={barChartOptions.margin}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={60}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                            {barData.labels.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  barData.datasets[0].backgroundColor[index]
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography>No data available for bar chart</Typography>
                    )}
                  </Box>
                </CardContent>
              </StyledCard>
            </Col>
          </Row>
        )}

        {showTable && (
          <Box ref={tableRef} sx={{ mt: 6 }}>
            <StyledCard>
              <CardContent sx={{ p: 4 }}>
                <ServerSideTable
                  ref={tableInstanceRef}
                  key={`table-${tableKey}-${serviceId}-${type}`}
                  url={url}
                  extraParams={extraParams}
                  actionFunctions={actionFunctions}
                  canSanction={canSanction}
                  canHavePool={canHavePool}
                  pendingApplications={
                    type === "pending" &&
                    !tableTitle?.includes("Corrigendum") &&
                    !tableTitle?.includes("Correction")
                  }
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
                      borderColor: "#d1d5db",
                    },
                    "& .MuiButton-root": { color: "#1976d2" },
                  }}
                />
              </CardContent>
            </StyledCard>
          </Box>
        )}
      </SectionContainer>

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
            Are you sure you want to reject {pendingRejectRows.length} selected{" "}
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
        handleActionButton={isSignedPdf ? null : handleSignPdf}
        buttonText={isSignedPdf ? null : "Sign PDF"}
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