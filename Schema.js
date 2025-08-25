import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Grid,
  Avatar,
  Paper,
  Container,
  Divider,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";
import {
  AssignmentTurnedIn,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Group,
  TrendingUp,
  AccountBalanceWallet,
  MonetizationOn,
  ErrorOutline,
  EmojiEvents,
  ArrowRightAlt,
  FilterList,
  Refresh,
  PieChart,
  Assessment,
} from "@mui/icons-material";
import { styled, keyframes } from "@mui/material/styles";
import { Chart } from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import axios from "axios";
import axiosInstance from "../../axiosConfig";

Chart.register(ChartDataLabels);

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

// Mock API functions
const mockDashboardData = (params) => {
  const { state, division, district, tehsil } = params;
  let multiplier = 1;
  if (tehsil != null) multiplier = 0.1;
  else if (district != null) multiplier = 0.2;
  else if (division != null) multiplier = 0.5;
  else if (state != null && state !== "") multiplier = 1;

  return defaultCardData.map((card) => {
    let newValue;
    if (card.value.startsWith("₹")) {
      const amount = parseInt(card.value.replace(/[^0-9]/g, ""), 10);
      newValue = `₹${Math.round(amount * multiplier).toLocaleString("en-IN")}`;
    } else {
      const num = parseInt(card.value.replace(/[^0-9]/g, ""), 10);
      newValue = Math.round(num * multiplier).toLocaleString("en-IN");
    }
    return { ...card, value: newValue };
  });
};

const mockAxiosInstance = {
  get: (url, config) => {
    if (url === "/api/dashboard/stats") {
      return Promise.resolve({ data: mockDashboardData(config.params) });
    }
    if (url === "/Base/GetDistricts") {
      return axios.get(url, config);
    }
    if (url === "/Base/GetTeshilForDistrict") {
      return axios.get(url, config);
    }
    return Promise.reject(new Error("Unknown endpoint"));
  },
};

// Enhanced card data with improved color scheme
const defaultCardData = [
  {
    title: "Applications Received",
    value: "12,34,567",
    change: "+12%",
    trend: "up",
    category: "application",
    color: "primary",
    bgColor: "#f8faff",
    gradientStart: "#4f46e5",
    gradientEnd: "#3b82f6",
  },
  {
    title: "Sanctioned",
    value: "8,56,432",
    change: "+8%",
    trend: "up",
    category: "application",
    color: "success",
    bgColor: "#f0fdf4",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  },
  {
    title: "Under Process",
    value: "2,00,135",
    change: "0%",
    trend: "neutral",
    category: "application",
    color: "warning",
    bgColor: "#fffbeb",
    gradientStart: "#f59e0b",
    gradientEnd: "#fbbf24",
  },
  {
    title: "Pending with Citizen",
    value: "20,000",
    change: "+15%",
    trend: "up",
    category: "application",
    color: "info",
    bgColor: "#f0f9ff",
    gradientStart: "#0ea5e9",
    gradientEnd: "#38bdf8",
  },
  {
    title: "Rejected",
    value: "1,78,900",
    change: "-3%",
    trend: "down",
    category: "application",
    color: "error",
    bgColor: "#fef2f2",
    gradientStart: "#ef4444",
    gradientEnd: "#f87171",
  },
  {
    title: "Total Amount Disbursed",
    value: "₹5,67,89,00,000",
    change: "+22%",
    trend: "up",
    category: "disbursement",
    color: "success",
    bgColor: "#f0fdf4",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  },
  {
    title: "New Sanctions",
    value: "3,20,456",
    change: "+18%",
    trend: "up",
    category: "disbursement",
    color: "primary",
    bgColor: "#f8faff",
    gradientStart: "#4f46e5",
    gradientEnd: "#3b82f6",
  },
  {
    title: "Beneficiaries Paid",
    value: "5,42,789",
    change: "+12%",
    trend: "up",
    category: "disbursement",
    color: "info",
    bgColor: "#f0f9ff",
    gradientStart: "#0ea5e9",
    gradientEnd: "#38bdf8",
  },
  {
    title: "Successful Disbursements",
    value: "5,19,123",
    change: "+10%",
    trend: "up",
    category: "disbursement",
    color: "success",
    bgColor: "#f0fdf4",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  },
  {
    title: "Failed Disbursements",
    value: "23,666",
    change: "-8%",
    trend: "down",
    category: "disbursement",
    color: "error",
    bgColor: "#fef2f2",
    gradientStart: "#ef4444",
    gradientEnd: "#f87171",
  },
  {
    title: "Arrear Amount Disbursed",
    value: "₹12,50,00,000",
    change: "+25%",
    trend: "up",
    category: "disbursement",
    color: "warning",
    bgColor: "#fffbeb",
    gradientStart: "#f59e0b",
    gradientEnd: "#fbbf24",
  },
];

// Icon mapping
const iconMap = {
  "Applications Received": AssignmentTurnedIn,
  Sanctioned: CheckCircle,
  "Under Process": HourglassEmpty,
  "Pending with Citizen": Group,
  Rejected: Cancel,
  "Total Amount Disbursed": MonetizationOn,
  "New Sanctions": TrendingUp,
  "Beneficiaries Paid": AccountBalanceWallet,
  "Successful Disbursements": EmojiEvents,
  "Failed Disbursements": ErrorOutline,
  "Arrear Amount Disbursed": MonetizationOn,
};

// Dummy data for sanctioned/disbursed applications by category
const categoryData = [
  {
    name: "Old Age Pension",
    value: 350000,
    color: "#4f46e5",
  },
  {
    name: "Women In Distress",
    value: 200000,
    color: "#059669",
  },
  {
    name: "Physically Challenged Person",
    value: 150000,
    color: "#f59e0b",
  },
  {
    name: "Transgender",
    value: 50000,
    color: "#0ea5e9",
  },
];

// Dummy data for sanctioned/disbursed applications by division
const divisionData = [
  {
    name: "Jammu",
    value: 450000,
    color: "#4f46e5",
  },
  {
    name: "Kashmir",
    value: 406432,
    color: "#059669",
  },
];

// Styled components
const GradientCard = styled(Card)(
  ({ theme, bgcolor, gradientstart, gradientend }) => ({
    borderRadius: theme.spacing(2),
    background: bgcolor,
    border: `1px solid ${alpha(gradientstart, 0.1)}`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(135deg, ${gradientstart}08 0%, ${gradientend}05 100%)`,
      opacity: 0,
      transition: "opacity 0.3s ease",
    },
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: `0 12px 24px ${alpha(gradientstart, 0.15)}`,
      "&::before": {
        opacity: 1,
      },
    },
    "&:active": {
      transform: "translateY(-2px)",
    },
  }),
);

const IconAvatar = styled(Avatar)(({ theme, gradientstart, gradientend }) => ({
  background: `linear-gradient(135deg, ${gradientstart} 0%, ${gradientend} 100%)`,
  width: 48,
  height: 48,
  boxShadow: `0 4px 12px ${alpha(gradientstart, 0.25)}`,
  animation: `${float} 6s ease-in-out infinite`,
  "& .MuiSvgIcon-root": {
    fontSize: "1.3rem",
    color: "#ffffff",
  },
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(20px)",
  border: `1px solid ${alpha(theme.palette.common.white, 0.3)}`,
  borderRadius: theme.spacing(3),
  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
  width: "100%",
  maxWidth: "100%",
  margin: 0,
  padding: theme.spacing(3),
}));

const SectionHeader = styled(Box)(({ theme }) => ({
  position: "relative",
  marginBottom: theme.spacing(3),
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: -8,
    left: 0,
    width: 60,
    height: 4,
    background: `linear-gradient(90deg, #4f46e5, #3b82f6)`,
    borderRadius: 2,
  },
}));

// Modern StatCard component
const ModernStatCard = ({ card, onCardClick }) => {
  const theme = useTheme();
  const IconComponent = iconMap[card.title] || AssignmentTurnedIn;

  return (
    <GradientCard
      onClick={() => onCardClick(card.title, card.category)}
      bgcolor={card.bgColor}
      gradientstart={card.gradientStart}
      gradientend={card.gradientEnd}
      elevation={0}
    >
      <CardContent
        sx={{ p: 3, position: "relative", zIndex: 1, flex: 1, height: "100%" }}
      >
        <Stack spacing={2} sx={{ height: "100%" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-end"
          >
            <IconAvatar
              gradientstart={card.gradientStart}
              gradientend={card.gradientEnd}
            >
              <IconComponent />
            </IconAvatar>
          </Stack>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              fontWeight="medium"
              sx={{
                fontSize: "1.3rem",
                lineHeight: 1.3,
                minHeight: "2.6em",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={card.title}
            >
              {card.title}
            </Typography>
            <Typography
              variant="h4"
              component="div"
              fontWeight="bold"
              color="text.primary"
              sx={{
                background: `linear-gradient(135deg, ${card.gradientStart}, ${card.gradientEnd})`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
                lineHeight: 1.2,
                wordBreak: "break-all",
              }}
              title={card.value}
            >
              {card.value}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" justifyContent="flex-end">
            <Typography
              variant="caption"
              sx={{
                color: card.gradientStart,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                opacity: 0.8,
                transition: "opacity 0.3s ease",
                fontSize: "0.75rem",
                "&:hover": { opacity: 1 },
              }}
            >
              Details
              <ArrowRightAlt sx={{ ml: 0.5, fontSize: "1rem" }} />
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </GradientCard>
  );
};

// Donut Chart component
const DonutChart = ({ data, chartTitle }) => {
  const theme = useTheme();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const filteredData = data.filter((item) => item.value > 0);
  const COLORS = filteredData.map((item) => item.color);

  useEffect(() => {
    if (chartRef.current && filteredData.length > 0) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }

      const total = filteredData.reduce((sum, item) => sum + item.value, 0);

      chartInstance.current = new Chart(chartRef.current, {
        type: "doughnut",
        data: {
          labels: filteredData.map((item) => item.name),
          datasets: [
            {
              data: filteredData.map((item) => item.value),
              backgroundColor: COLORS,
              borderColor: COLORS.map((color) => alpha(color, 0.3)),
              borderWidth: 2,
              hoverBorderWidth: 3,
              hoverBackgroundColor: COLORS.map((color) => alpha(color, 0.8)),
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 16,
                padding: 15,
                font: {
                  size: 11,
                  family: theme.typography.fontFamily,
                },
                color: theme.palette.text.primary,
                usePointStyle: true,
              },
            },
            tooltip: {
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              titleColor: "#374151",
              bodyColor: "#374151",
              titleFont: { size: 14, weight: "bold" },
              bodyFont: { size: 12 },
              borderColor: "#e5e7eb",
              borderWidth: 1,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const label = context.label || "";
                  const value = context.parsed || 0;
                  return `${label}: ${value.toLocaleString("en-IN")}`;
                },
              },
            },
            datalabels: {
              color: "#ffffff",
              formatter: (value) => {
                const percentage = ((value / total) * 100).toFixed(1);
                return `${percentage}%`;
              },
              font: {
                weight: "bold",
                size: 12,
              },
              textAlign: "center",
              anchor: "center",
              align: "center",
            },
          },
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [filteredData, theme]);

  return (
    <Box
      sx={{
        width: "100%",
        height: 350,
        maxWidth: "100%",
        position: "relative",
      }}
    >
      <canvas ref={chartRef} style={{ maxWidth: "100%" }} />
      {filteredData.length === 0 && (
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          No data available for the chart
        </Typography>
      )}
    </Box>
  );
};

// Main dashboard component
export default function ModernMUIDashboard() {
  const theme = useTheme();
  // Application filters
  const [appState, setAppState] = useState("0");
  const [appDivision, setAppDivision] = useState("");
  const [appDistricts, setAppDistricts] = useState([]);
  const [appDistrict, setAppDistrict] = useState("");
  const [appTehsils, setAppTehsils] = useState([]);
  const [appTehsil, setAppTehsil] = useState("");
  const [appWise, setAppWise] = useState("State");
  const [appWiseName, setAppWiseName] = useState("Jammu & Kashmir");
  // Disbursement filters
  const [disbState, setDisbState] = useState("0");
  const [disbDivision, setDisbDivision] = useState("");
  const [disbDistricts, setDisbDistricts] = useState([]);
  const [disbDistrict, setDisbDistrict] = useState("");
  const [disbTehsils, setDisbTehsils] = useState([]);
  const [disbTehsil, setDisbTehsil] = useState("");
  const [disbWise, setDisbWise] = useState("State");
  const [disbWiseName, setDisbWiseName] = useState("Jammu & Kashmir");
  // Common states
  const appDefaultData = defaultCardData.filter(
    (c) => c.category === "application",
  );
  const disbDefaultData = defaultCardData.filter(
    (c) => c.category === "disbursement",
  );
  const [appDashboardData, setAppDashboardData] = useState(appDefaultData);
  const [disbDashboardData, setDisbDashboardData] = useState(disbDefaultData);
  const [isLoading, setIsLoading] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);

  // Dynamic filter titles
  const getFilterTitle = (type, value, districts, tehsils) => {
    if (!value) return type;
    if (type === "State") return value === "0" ? "Jammu & Kashmir" : type;
    if (type === "Division")
      return value === "1" ? "Jammu" : value === "2" ? "Kashmir" : type;
    if (type === "District") {
      const districtLabel = districts.find((d) => d.value === value)?.label;
      return districtLabel || type;
    }
    if (type === "Tehsil") {
      const tehsilLabel = tehsils.find((t) => t.value === value)?.label;
      return tehsilLabel || type;
    }
    return type;
  };

  // API calls for application filters
  useEffect(() => {
    const fetchDistricts = async () => {
      if (appDivision !== "") {
        setFilterLoading(true);
        try {
          const response = await mockAxiosInstance.get("/Base/GetDistricts", {
            params: { division: appDivision },
          });
          const result = response.data;
          const Districts = result.districts.map((item) => ({
            label: item.districtName,
            value: item.districtId,
          }));
          setAppDistricts(Districts);
          setAppDistrict("");
          setAppTehsils([]);
          setAppTehsil("");
        } catch (err) {
          console.error("Failed to fetch districts for application:", err);
          setError("Failed to fetch districts");
          setAppDistricts([]);
        } finally {
          setFilterLoading(false);
        }
      } else {
        setAppDistricts([]);
        setAppDistrict("");
        setAppTehsils([]);
        setAppTehsil("");
      }
    };
    fetchDistricts();
  }, [appDivision]);

  useEffect(() => {
    const fetchTehsils = async () => {
      if (appDistrict !== "") {
        setFilterLoading(true);
        try {
          const response = await mockAxiosInstance.get(
            "/Base/GetTeshilForDistrict",
            {
              params: { districtId: appDistrict },
            },
          );
          const result = response.data;
          const Tehsils = result.tehsils.map((item) => ({
            label: item.tehsilName,
            value: item.tehsilId,
          }));
          setAppTehsils(Tehsils);
          setAppTehsil("");
        } catch (err) {
          console.error("Failed to fetch tehsils for application:", err);
          setError("Failed to fetch tehsils");
          setAppTehsils([]);
        } finally {
          setFilterLoading(false);
        }
      } else {
        setAppTehsils([]);
        setAppTehsil("");
      }
    };
    fetchTehsils();
  }, [appDistrict]);

  // API calls for disbursement filters
  useEffect(() => {
    const fetchDistricts = async () => {
      if (disbDivision !== "") {
        setFilterLoading(true);
        try {
          const response = await mockAxiosInstance.get("/Base/GetDistricts", {
            params: { division: disbDivision },
          });
          const result = response.data;
          const Districts = result.districts.map((item) => ({
            label: item.districtName,
            value: item.districtId,
          }));
          setDisbDistricts(Districts);
          setDisbDistrict("");
          setDisbTehsils([]);
          setDisbTehsil("");
        } catch (err) {
          console.error("Failed to fetch districts for disbursement:", err);
          setError("Failed to fetch districts");
          setDisbDistricts([]);
        } finally {
          setFilterLoading(false);
        }
      } else {
        setDisbDistricts([]);
        setDisbDistrict("");
        setDisbTehsils([]);
        setDisbTehsil("");
      }
    };
    fetchDistricts();
  }, [disbDivision]);

  useEffect(() => {
    const fetchTehsils = async () => {
      if (disbDistrict !== "") {
        setFilterLoading(true);
        try {
          const response = await mockAxiosInstance.get(
            "/Base/GetTeshilForDistrict",
            {
              params: { districtId: disbDistrict },
            },
          );
          const result = response.data;
          const Tehsils = result.tehsils.map((item) => ({
            label: item.tehsilName,
            value: item.tehsilId,
          }));
          setDisbTehsils(Tehsils);
          setDisbTehsil("");
        } catch (err) {
          console.error("Failed to fetch tehsils for disbursement:", err);
          setError("Failed to fetch tehsils");
          setDisbTehsils([]);
        } finally {
          setFilterLoading(false);
        }
      } else {
        setDisbTehsils([]);
        setDisbTehsil("");
      }
    };
    fetchTehsils();
  }, [disbDistrict]);

  // Update wise and wiseName for application filters
  useEffect(() => {
    console.log("Updating appWise and appWiseName", {
      appDivision,
      appDistrict,
      appTehsil,
    });
    if (appTehsil) {
      const tehsilName =
        appTehsils.find((item) => item.value === appTehsil)?.label || "Tehsil";
      setAppWise("Tehsil");
      setAppWiseName(tehsilName);
    } else if (appDistrict) {
      const districtName =
        appDistricts.find((item) => item.value === appDistrict)?.label ||
        "District";
      setAppWise("District");
      setAppWiseName(districtName);
    } else if (appDivision) {
      setAppWise("Division");
      setAppWiseName(
        appDivision === "1"
          ? "Jammu"
          : appDivision === "2"
          ? "Kashmir"
          : "Division",
      );
    } else {
      setAppWise("State");
      setAppWiseName("Jammu & Kashmir");
    }
  }, [appDivision, appDistrict, appTehsil, appDistricts, appTehsils]);

  // Update wise and wiseName for disbursement filters
  useEffect(() => {
    console.log("Updating disbWise and disbWiseName", {
      disbDivision,
      disbDistrict,
      disbTehsil,
    });
    if (disbTehsil) {
      const tehsilName =
        disbTehsils.find((item) => item.value === disbTehsil)?.label ||
        "Tehsil";
      setDisbWise("Tehsil");
      setDisbWiseName(tehsilName);
    } else if (disbDistrict) {
      const districtName =
        disbDistricts.find((item) => item.value === disbDistrict)?.label ||
        "District";
      setDisbWise("District");
      setDisbWiseName(districtName);
    } else if (disbDivision) {
      setDisbWise("Division");
      setDisbWiseName(
        disbDivision === "1"
          ? "Jammu"
          : disbDivision === "2"
          ? "Kashmir"
          : "Division",
      );
    } else {
      setDisbWise("State");
      setDisbWiseName("Jammu & Kashmir");
    }
  }, [disbDivision, disbDistrict, disbTehsil, disbDistricts, disbTehsils]);

  // Fetch dashboard data for applications
  const fetchAppData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get("/Viewer/GetApplicationStatus", {
        params: {
          serviceId: "1", // replace with real serviceId
          division: appDivision || null,
          district: appDistrict || null,
          tehsil: appTehsil || null,
        },
      });

      // Now response.data looks like { dataList: [...] }
      setAppDashboardData(
        response.data.dataList.filter((c) => c.category === "application"),
      );
    } catch (err) {
      setError("Failed to fetch application data");
      console.error("Application data fetch error:", err);
      setAppDashboardData(appDefaultData);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch dashboard data for disbursements
  const fetchDisbData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {};
      if (disbState !== "") params.state = disbState;
      if (disbDivision !== "") params.division = disbDivision;
      if (disbDistrict !== "") params.district = disbDistrict;
      if (disbTehsil !== "") params.tehsil = disbTehsil;

      console.log("Fetching disbursement data with params:", params);
      const response = await mockAxiosInstance.get("/api/dashboard/stats", {
        params,
      });
      setDisbDashboardData(
        response.data.filter((c) => c.category === "disbursement"),
      );
    } catch (err) {
      setError("Failed to fetch disbursement data");
      console.error("Disbursement data fetch error:", err);
      setDisbDashboardData(disbDefaultData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, [appState, appDivision, appDistrict, appTehsil]);

  useEffect(() => {
    fetchDisbData();
  }, [disbState, disbDivision, disbDistrict, disbTehsil]);

  const handleCardClick = (title, category) => {
    setSelectedTable({ title, category });
    setTimeout(() => {
      const tableId = `table-${title.replace(/\s+/g, "-").toLowerCase()}`;
      const element = document.getElementById(tableId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleResetAppFilters = () => {
    console.log("Resetting application filters");
    setAppState("0");
    setAppDivision("");
    setAppDistrict("");
    setAppTehsil("");
    setAppDistricts([]);
    setAppTehsils([]);
    setAppWise("State");
    setAppWiseName("Jammu & Kashmir");
  };

  const handleResetDisbFilters = () => {
    console.log("Resetting disbursement filters");
    setDisbState("0");
    setDisbDivision("");
    setDisbDistrict("");
    setDisbTehsil("");
    setDisbDistricts([]);
    setDisbTehsils([]);
    setDisbWise("State");
    setDisbWiseName("Jammu & Kashmir");
  };

  const applicationCards = appDashboardData;
  const disbursementCards = disbDashboardData;

  const statusDistributionData = appDashboardData
    .filter((card) =>
      [
        "Sanctioned",
        "Under Process",
        "Pending with Citizen",
        "Rejected",
      ].includes(card.title),
    )
    .map((card) => ({
      name: card.title,
      value: parseInt(card.value.replace(/[^0-9]/g, ""), 10) || 0,
      color: card.gradientStart,
    }))
    .filter((item) => item.value > 0);

  const disbursementDistributionData = disbDashboardData
    .filter((card) =>
      ["Successful Disbursements", "Failed Disbursements"].includes(card.title),
    )
    .map((card) => ({
      name: card.title,
      value: parseInt(card.value.replace(/[^0-9]/g, ""), 10) || 0,
      color: card.gradientStart,
    }))
    .filter((item) => item.value > 0);

  const getAppDynamicDistributionData = () => {
    const colors = [
      "#4f46e5",
      "#059669",
      "#f59e0b",
      "#0ea5e9",
      "#ef4444",
      "#ec4899",
      "#6366f1",
      "#14b8a6",
      "#8b5cf6",
      "#f97316",
      "#6d28d9",
      "#047857",
      "#d97706",
      "#06b6d4",
      "#dc2626",
      "#a21caf",
      "#15803d",
      "#b45309",
      "#0891b2",
      "#b91c1c",
    ];
    let multiplier = 1;
    if (appTehsil) multiplier = 0.1;
    else if (appDistrict) multiplier = 0.2;
    else if (appDivision) multiplier = 0.5;

    if (appDistrict && !appTehsil) {
      return {
        data: appTehsils.map((tehsil, index) => ({
          name: tehsil.label,
          value: Math.round(100000 * multiplier * (1 + index * 0.2)),
          color: colors[index % colors.length],
        })),
        title: "Tehsil-wise Sanctioned Applications",
      };
    } else if (appDivision) {
      return {
        data: appDistricts.map((district, index) => ({
          name: district.label,
          value: Math.round(200000 * multiplier * (1 + index * 0.3)),
          color: colors[index % colors.length],
        })),
        title: "District-wise Sanctioned Applications",
      };
    }

    return {
      data: divisionData,
      title: `${
        appWise === "State"
          ? "Division"
          : appWise === "Division"
          ? "District"
          : "Tehsil"
      }-wise Sanctioned Applications`,
    };
  };

  const getDisbDynamicDistributionData = () => {
    const colors = [
      "#4f46e5",
      "#059669",
      "#f59e0b",
      "#0ea5e9",
      "#ef4444",
      "#ec4899",
      "#6366f1",
      "#14b8a6",
      "#8b5cf6",
      "#f97316",
      "#6d28d9",
      "#047857",
      "#d97706",
      "#06b6d4",
      "#dc2626",
      "#a21caf",
      "#15803d",
      "#b45309",
      "#0891b2",
      "#b91c1c",
    ];
    let multiplier = 1;
    if (disbTehsil) multiplier = 0.1;
    else if (disbDistrict) multiplier = 0.2;
    else if (disbDivision) multiplier = 0.5;

    if (disbDistrict && !disbTehsil) {
      return {
        data: disbTehsils.map((tehsil, index) => ({
          name: tehsil.label,
          value: Math.round(100000 * multiplier * (1 + index * 0.2)),
          color: colors[index % colors.length],
        })),
        title: "Tehsil-wise Disbursed Cases",
      };
    } else if (disbDivision) {
      return {
        data: disbDistricts.map((district, index) => ({
          name: district.label,
          value: Math.round(200000 * multiplier * (1 + index * 0.3)),
          color: colors[index % colors.length],
        })),
        title: "District-wise Disbursed Cases",
      };
    }

    return {
      data: divisionData,
      title: `${
        disbWise === "State"
          ? "Division"
          : disbWise === "Division"
          ? "District"
          : "Tehsil"
      }-wise Disbursed Cases`,
    };
  };

  const {
    data: appDynamicDistributionData,
    title: appDynamicDistributionTitle,
  } = getAppDynamicDistributionData();
  const {
    data: disbDynamicDistributionData,
    title: disbDynamicDistributionTitle,
  } = getDisbDynamicDistributionData();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        py: 2,
      }}
    >
      <Box
        sx={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          top: 0,
          zIndex: 1000,
          py: 2,
        }}
      >
        <Container maxWidth="xl">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="h4"
                fontWeight="bold"
                sx={{ color: "#1e293b" }}
              >
                Dashboard Overview
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <GlassCard sx={{ p: 3, mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Avatar sx={{ bgcolor: "#4f46e5" }}>
              <FilterList />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Application Filters
              </Typography>
            </Box>
            {filterLoading && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label={getFilterTitle(
                  "State",
                  appState,
                  appDistricts,
                  appTehsils,
                )}
                value={appState}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("Setting appState:", value);
                  setAppState(value);
                }}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">Select State</MenuItem>
                <MenuItem value="0">Jammu & Kashmir</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label={getFilterTitle(
                  "Division",
                  appDivision,
                  appDistricts,
                  appTehsils,
                )}
                value={appDivision}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("Setting appDivision:", value);
                  setAppDivision(value);
                }}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">Select Division</MenuItem>
                <MenuItem value="1">Jammu</MenuItem>
                <MenuItem value="2">Kashmir</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label={getFilterTitle(
                  "District",
                  appDistrict,
                  appDistricts,
                  appTehsils,
                )}
                value={appDistrict}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("Setting appDistrict:", value);
                  setAppDistrict(value);
                }}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">Select District</MenuItem>
                {appDistricts.map((item, index) => (
                  <MenuItem key={index} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label={getFilterTitle(
                  "Tehsil",
                  appTehsil,
                  appDistricts,
                  appTehsils,
                )}
                value={appTehsil}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log("Setting appTehsil:", value);
                  setAppTehsil(value);
                }}
                variant="outlined"
                size="small"
              >
                <MenuItem value="">Select Tehsil</MenuItem>
                {appTehsils.map((item, index) => (
                  <MenuItem key={index} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2.4}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleResetAppFilters}
                startIcon={<Refresh />}
                sx={{
                  height: 40,
                  background:
                    "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #4338ca 0%, #2563eb 100%)",
                  },
                }}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </GlassCard>

        {isLoading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={8}
          >
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" ml={3} color="text.secondary">
              Loading dashboard data...
            </Typography>
          </Box>
        ) : error ? (
          <Paper
            sx={{
              p: 4,
              textAlign: "center",
              bgcolor: alpha(theme.palette.error.main, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <ErrorOutline sx={{ fontSize: 60, color: "error.main", mb: 2 }} />
            <Typography variant="h6" color="error.main">
              {error}
            </Typography>
          </Paper>
        ) : (
          <>
            <GlassCard sx={{ p: 3, mb: 4 }}>
              <SectionHeader>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "#4f46e5", width: 48, height: 48 }}>
                    <Assessment />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      Application Status ({appWise}-{appWiseName})
                    </Typography>
                  </Box>
                </Stack>
              </SectionHeader>

              <Grid container spacing={3} mb={4}>
                {applicationCards.map((card, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
                    <ModernStatCard card={card} onCardClick={handleCardClick} />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box
                sx={{
                  bgcolor: alpha("#f8fafc", 0.5),
                  borderRadius: 3,
                  p: 3,
                  width: "100%",
                  maxWidth: "100%",
                }}
                id="application-charts"
              >
                <Typography variant="h6" fontWeight="bold" mb={3}>
                  Status Distribution
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={appTehsil ? 6 : 4}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      mb={2}
                    >
                      <PieChart sx={{ color: "#4f46e5" }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        Status of Applications ({appWise}-{appWiseName})
                      </Typography>
                    </Stack>
                    <DonutChart
                      data={statusDistributionData}
                      chartTitle="Application Status"
                    />
                  </Grid>
                  <Grid item xs={12} md={appTehsil ? 6 : 4}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      mb={2}
                    >
                      <PieChart sx={{ color: "#059669" }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        Category-wise Sanctioned Applications ({appWise}-
                        {appWiseName})
                      </Typography>
                    </Stack>
                    <DonutChart
                      data={categoryData}
                      chartTitle="Category-wise Sanctioned Applications"
                    />
                  </Grid>
                  {!appTehsil && (
                    <Grid item xs={12} md={4}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        mb={2}
                      >
                        <PieChart sx={{ color: "#0ea5e9" }} />
                        <Typography variant="subtitle1" fontWeight="medium">
                          {appDynamicDistributionTitle}
                        </Typography>
                      </Stack>
                      <DonutChart
                        data={appDynamicDistributionData}
                        chartTitle={appDynamicDistributionTitle}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </GlassCard>

            <GlassCard sx={{ p: 3, mb: 4 }}>
              <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                <Avatar sx={{ bgcolor: "#059669" }}>
                  <FilterList />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Disbursement Filters
                  </Typography>
                </Box>
                {filterLoading && <CircularProgress size={20} sx={{ ml: 2 }} />}
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    select
                    fullWidth
                    label={getFilterTitle(
                      "State",
                      disbState,
                      disbDistricts,
                      disbTehsils,
                    )}
                    value={disbState}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log("Setting disbState:", value);
                      setDisbState(value);
                    }}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="">Select State</MenuItem>
                    <MenuItem value="0">Jammu & Kashmir</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    select
                    fullWidth
                    label={getFilterTitle(
                      "Division",
                      disbDivision,
                      disbDistricts,
                      disbTehsils,
                    )}
                    value={disbDivision}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log("Setting disbDivision:", value);
                      setDisbDivision(value);
                    }}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="">Select Division</MenuItem>
                    <MenuItem value="1">Jammu</MenuItem>
                    <MenuItem value="2">Kashmir</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    select
                    fullWidth
                    label={getFilterTitle(
                      "District",
                      disbDistrict,
                      disbDistricts,
                      disbTehsils,
                    )}
                    value={disbDistrict}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log("Setting disbDistrict:", value);
                      setDisbDistrict(value);
                    }}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="">Select District</MenuItem>
                    {disbDistricts.map((item, index) => (
                      <MenuItem key={index} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    select
                    fullWidth
                    label={getFilterTitle(
                      "Tehsil",
                      disbTehsil,
                      disbDistricts,
                      disbTehsils,
                    )}
                    value={disbTehsil}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log("Setting disbTehsil:", value);
                      setDisbTehsil(value);
                    }}
                    variant="outlined"
                    size="small"
                  >
                    <MenuItem value="">Select Tehsil</MenuItem>
                    {disbTehsils.map((item, index) => (
                      <MenuItem key={index} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6} md={2.4}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleResetDisbFilters}
                    startIcon={<Refresh />}
                    sx={{
                      height: 40,
                      background:
                        "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #4338ca 0%, #2563eb 100%)",
                      },
                    }}
                  >
                    Reset
                  </Button>
                </Grid>
              </Grid>
            </GlassCard>

            <GlassCard sx={{ p: 3, mb: 4 }}>
              <SectionHeader>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: "#059669", width: 48, height: 48 }}>
                    <MonetizationOn />
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      Disbursement Metrics ({disbWise}-{disbWiseName})
                    </Typography>
                  </Box>
                </Stack>
              </SectionHeader>

              <Grid container spacing={3} mb={4}>
                {disbursementCards.map((card, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                    <ModernStatCard card={card} onCardClick={handleCardClick} />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box
                sx={{
                  bgcolor: alpha("#f8fafc", 0.5),
                  borderRadius: 3,
                  p: 3,
                  width: "100%",
                  maxWidth: "100%",
                }}
                id="disbursement-charts"
              >
                <Typography variant="h6" fontWeight="bold" mb={3}>
                  Disbursement Distribution
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={disbTehsil ? 6 : 4}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      mb={2}
                    >
                      <PieChart sx={{ color: "#059669" }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        Status of Disbursements ({disbWise}-{disbWiseName})
                      </Typography>
                    </Stack>
                    <DonutChart
                      data={disbursementDistributionData}
                      chartTitle="Disbursement Metrics"
                    />
                  </Grid>
                  <Grid item xs={12} md={disbTehsil ? 6 : 4}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      mb={2}
                    >
                      <PieChart sx={{ color: "#f59e0b" }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        Category-wise Disbursed Cases ({disbWise}-{disbWiseName}
                        )
                      </Typography>
                    </Stack>
                    <DonutChart
                      data={categoryData}
                      chartTitle="Category-wise Disbursed Cases"
                    />
                  </Grid>
                  {!disbTehsil && (
                    <Grid item xs={12} md={4}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        mb={2}
                      >
                        <PieChart sx={{ color: "#0ea5e9" }} />
                        <Typography variant="subtitle1" fontWeight="medium">
                          {disbDynamicDistributionTitle}
                        </Typography>
                      </Stack>
                      <DonutChart
                        data={disbDynamicDistributionData}
                        chartTitle={disbDynamicDistributionTitle}
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </GlassCard>

            <GlassCard sx={{ p: 3 }}>
              {selectedTable && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <ServerSideTable
                    url={`/api/${
                      selectedTable.category
                    }/details?title=${encodeURIComponent(selectedTable.title)}`}
                    extraParams={
                      selectedTable.category === "application"
                        ? {
                            state: appState,
                            division: appDivision,
                            district: appDistrict,
                            tehsil: appTehsil,
                          }
                        : {
                            state: disbState,
                            division: disbDivision,
                            district: disbDistrict,
                            tehsil: disbTehsil,
                          }
                    }
                    Title={selectedTable.title}
                    actionFunctions={{}}
                    canSanction={false}
                    canHavePool={false}
                    pendingApplications={false}
                    serviceId={null}
                    onPushToPool={() => {}}
                    onExecuteAction={() => {}}
                    actionOptions={[]}
                    selectedAction=""
                    setSelectedAction={() => {}}
                  />
                </>
              )}
            </GlassCard>
          </>
        )}
      </Container>
    </Box>
  );
}
