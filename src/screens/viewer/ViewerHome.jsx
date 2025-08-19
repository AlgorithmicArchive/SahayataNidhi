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
  Grid2,
  Chip,
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
  TrendingDown,
  AccountBalanceWallet,
  MonetizationOn,
  ErrorOutline,
  EmojiEvents,
  ArrowRightAlt,
  FilterList,
  Refresh,
  PieChart,
  Assessment,
  TrendingFlat,
} from "@mui/icons-material";
import { styled, keyframes } from "@mui/material/styles";
import Chart from "chart.js/auto";

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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
      newValue = `₹${Math.round(amount * multiplier).toLocaleString()}`;
    } else {
      const num = parseInt(card.value.replace(/[^0-9]/g, ""), 10);
      newValue = Math.round(num * multiplier).toString();
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
      return Promise.resolve({
        data: {
          districts: [
            { districtName: "Srinagar", districtId: 1 },
            { districtName: "Jammu", districtId: 2 },
            { districtName: "Anantnag", districtId: 3 },
          ],
        },
      });
    }
    if (url === "/Base/GetTeshilForDistrict") {
      return Promise.resolve({
        data: {
          tehsils: [
            { tehsilName: "Central", tehsilId: 1 },
            { tehsilName: "North", tehsilId: 2 },
            { tehsilName: "South", tehsilId: 3 },
          ],
        },
      });
    }
    return Promise.reject(new Error("Unknown endpoint"));
  },
};

// Enhanced card data with Material UI colors
const defaultCardData = [
  {
    title: "Applications Received",
    value: "1,234",
    change: "+12%",
    trend: "up",
    category: "application",
    color: "primary",
    bgColor: "#e3f2fd",
    gradientStart: "#1976d2",
    gradientEnd: "#1565c0",
  },
  {
    title: "Sanctioned",
    value: "856",
    change: "+8%",
    trend: "up",
    category: "application",
    color: "success",
    bgColor: "#e8f5e8",
    gradientStart: "#388e3c",
    gradientEnd: "#2e7d32",
  },
  {
    title: "Under Process",
    value: "200",
    change: "0%",
    trend: "neutral",
    category: "application",
    color: "warning",
    bgColor: "#fff3e0",
    gradientStart: "#f57c00",
    gradientEnd: "#ef6c00",
  },
  {
    title: "Pending with Citizen",
    value: "20",
    change: "+15%",
    trend: "up",
    category: "application",
    color: "secondary",
    bgColor: "#f3e5f5",
    gradientStart: "#7b1fa2",
    gradientEnd: "#6a1b9a",
  },
  {
    title: "Rejected",
    value: "178",
    change: "-3%",
    trend: "down",
    category: "application",
    color: "error",
    bgColor: "#ffebee",
    gradientStart: "#d32f2f",
    gradientEnd: "#c62828",
  },
  {
    title: "Total Amount Disbursed",
    value: "₹5,67,89,000",
    change: "+22%",
    trend: "up",
    category: "disbursement",
    color: "success",
    bgColor: "#e8f5e8",
    gradientStart: "#388e3c",
    gradientEnd: "#2e7d32",
  },
  {
    title: "New Sanctions",
    value: "320",
    change: "+18%",
    trend: "up",
    category: "disbursement",
    color: "info",
    bgColor: "#e1f5fe",
    gradientStart: "#0288d1",
    gradientEnd: "#0277bd",
  },
  {
    title: "Beneficiaries Paid",
    value: "542",
    change: "+12%",
    trend: "up",
    category: "disbursement",
    color: "primary",
    bgColor: "#e3f2fd",
    gradientStart: "#1976d2",
    gradientEnd: "#1565c0",
  },
  {
    title: "Successful Disbursements",
    value: "519",
    change: "+10%",
    trend: "up",
    category: "disbursement",
    color: "success",
    bgColor: "#e8f5e8",
    gradientStart: "#388e3c",
    gradientEnd: "#2e7d32",
  },
  {
    title: "Failed Disbursements",
    value: "23",
    change: "-8%",
    trend: "down",
    category: "disbursement",
    color: "error",
    bgColor: "#ffebee",
    gradientStart: "#d32f2f",
    gradientEnd: "#c62828",
  },
  {
    title: "Arrear Amount Disbursed",
    value: "₹12,50,000",
    change: "+25%",
    trend: "up",
    category: "disbursement",
    color: "warning",
    bgColor: "#fff3e0",
    gradientStart: "#f57c00",
    gradientEnd: "#ef6c00",
  },
];

// Icon mapping (corrected)
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
  "Arrear Amount Disbursed": MonetizationOn, // Corrected from "Ar_factors"
};

// Styled components
const GradientCard = styled(Card)(
  ({ theme, bgcolor, gradientstart, gradientend }) => ({
    borderRadius: theme.spacing(2),
    background: `linear-gradient(135deg, ${bgcolor} 0%, ${alpha(
      bgcolor,
      0.7,
    )} 100%)`,
    backdropFilter: "blur(10px)",
    border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `linear-gradient(135deg, ${gradientstart}20 0%, ${gradientend}10 100%)`,
      opacity: 0,
      transition: "opacity 0.3s ease",
    },
    "&:hover": {
      transform: "translateY(-8px) scale(1.02)",
      boxShadow: `0 20px 40px ${alpha(gradientstart, 0.3)}`,
      "&::before": {
        opacity: 1,
      },
    },
    "&:active": {
      transform: "translateY(-4px) scale(1.01)",
    },
  }),
);

const IconAvatar = styled(Avatar)(({ theme, gradientstart, gradientend }) => ({
  background: `linear-gradient(135deg, ${gradientstart} 0%, ${gradientend} 100%)`,
  width: 56,
  height: 56,
  boxShadow: `0 8px 16px ${alpha(gradientstart, 0.3)}`,
  animation: `${float} 6s ease-in-out infinite`,
  "& .MuiSvgIcon-root": {
    fontSize: "1.5rem",
  },
}));

const TrendChip = styled(Chip)(({ trend, theme }) => {
  let colors = {};
  if (trend === "up") {
    colors = {
      bgcolor: alpha(theme.palette.success.main, 0.1),
      color: theme.palette.success.main,
      borderColor: alpha(theme.palette.success.main, 0.3),
    };
  } else if (trend === "down") {
    colors = {
      bgcolor: alpha(theme.palette.error.main, 0.1),
      color: theme.palette.error.main,
      borderColor: alpha(theme.palette.error.main, 0.3),
    };
  } else {
    colors = {
      bgcolor: alpha(theme.palette.grey[500], 0.1),
      color: theme.palette.grey[600],
      borderColor: alpha(theme.palette.grey[500], 0.3),
    };
  }

  return {
    ...colors,
    border: `1px solid ${colors.borderColor}`,
    fontWeight: 600,
    fontSize: "0.75rem",
    height: 24,
    "& .MuiChip-icon": {
      fontSize: "1rem",
      color: "inherit",
    },
  };
});

const GlassCard = styled(Card)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: "blur(20px)",
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  borderRadius: theme.spacing(3),
  boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
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
    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    borderRadius: 2,
  },
}));

// Modern StatCard component
const ModernStatCard = ({ card, onClick }) => {
  const theme = useTheme();
  const IconComponent = iconMap[card.title] || AssignmentTurnedIn;

  const getTrendIcon = () => {
    switch (card.trend) {
      case "up":
        return <TrendingUp />;
      case "down":
        return <TrendingDown />;
      default:
        return <TrendingFlat />;
    }
  };

  return (
    <GradientCard
      onClick={() => onClick(card.title, card.category)}
      bgcolor={card.bgColor}
      gradientstart={card.gradientStart}
      gradientend={card.gradientEnd}
      elevation={0}
    >
      <CardContent sx={{ p: 3, position: "relative", zIndex: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={2}
        >
          <IconAvatar
            gradientstart={card.gradientStart}
            gradientend={card.gradientEnd}
          >
            <IconComponent />
          </IconAvatar>
          <TrendChip
            icon={getTrendIcon()}
            label={card.change}
            trend={card.trend}
            size="small"
          />
        </Stack>

        <Typography
          variant="h4"
          component="div"
          fontWeight="bold"
          color="text.primary"
          mb={1}
          sx={{
            background: `linear-gradient(135deg, ${card.gradientStart}, ${card.gradientEnd})`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {card.value}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          fontWeight="medium"
          mb={2}
        >
          {card.title}
        </Typography>

        <Box display="flex" alignItems="center" justifyContent="flex-end">
          <Typography
            variant="caption"
            color="primary"
            fontWeight="600"
            sx={{
              display: "flex",
              alignItems: "center",
              opacity: 0.8,
              transition: "opacity 0.3s ease",
              "&:hover": { opacity: 1 },
            }}
          >
            View Details
            <ArrowRightAlt sx={{ ml: 0.5, fontSize: "1rem" }} />
          </Typography>
        </Box>
      </CardContent>
    </GradientCard>
  );
};

// StatusChart component (using Chart.js)
const StatusChart = ({ data }) => {
  const theme = useTheme();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Prepare chart data
  const chartData = data
    .filter((card) =>
      [
        "Sanctioned",
        "Under Process",
        "Pending with Citizen",
        "Rejected",
      ].includes(card.title),
    )
    .map((card) => ({
      name: card.title === "Pending with Citizen" ? "Pending" : card.title,
      value: parseInt(card.value.replace(/[^0-9]/g, ""), 10) || 0,
      color: card.gradientStart,
    }))
    .filter((item) => item.value > 0); // Ensure no zero or invalid values

  // Debug log to verify chart data
  console.log("Chart Data:", chartData);

  const COLORS = ["#388e3c", "#f57c00", "#7b1fa2", "#d32f2f"];

  useEffect(() => {
    if (chartRef.current && chartData.length > 0) {
      // Destroy existing chart instance if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Create new Chart.js instance
      chartInstance.current = new Chart(chartRef.current, {
        type: "pie",
        data: {
          labels: chartData.map((item) => item.name),
          datasets: [
            {
              data: chartData.map((item) => item.value),
              backgroundColor: COLORS,
              borderColor: COLORS.map((color) => alpha(color, 0.3)),
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 20,
                padding: 20,
                font: {
                  size: 12,
                  family: theme.typography.fontFamily,
                },
                color: theme.palette.text.primary,
                usePointStyle: true,
              },
            },
            tooltip: {
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
              titleFont: { size: 14, weight: "bold" },
              bodyFont: { size: 16 },
              borderColor: alpha(theme.palette.divider, 0.2),
              borderWidth: 1,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const label = context.label || "";
                  const value = context.parsed || 0;
                  return `${label}: ${value.toLocaleString()}`;
                },
              },
            },
          },
        },
      });
    }

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [chartData, theme]);

  return (
    <Box sx={{ width: "100%", height: 400 }}>
      {chartData.length === 0 ? (
        <Typography variant="body1" color="text.secondary" align="center">
          No data available for the chart
        </Typography>
      ) : (
        <canvas ref={chartRef} />
      )}
    </Box>
  );
};

// Main dashboard component
export default function ModernMUIDashboard() {
  const theme = useTheme();
  const [state, setState] = useState("");
  const [division, setDivision] = useState("");
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState("");
  const [tehsils, setTehsils] = useState([]);
  const [tehsil, setTehsil] = useState("");
  const [dashboardData, setDashboardData] = useState(defaultCardData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // API calls
  useEffect(() => {
    const fetchDistricts = async () => {
      if (division !== "") {
        try {
          const response = await mockAxiosInstance.get("/Base/GetDistricts", {
            params: { division },
          });
          const result = response.data;
          const Districts = result.districts.map((item) => ({
            label: item.districtName,
            value: item.districtId,
          }));
          setDistricts(Districts);
        } catch (err) {
          console.error("Failed to fetch districts", err);
          setError("Failed to fetch districts");
        }
      } else {
        setDistricts([]);
      }
    };
    fetchDistricts();
  }, [division]);

  useEffect(() => {
    const fetchTehsils = async () => {
      if (district !== "") {
        try {
          const response = await mockAxiosInstance.get(
            "/Base/GetTeshilForDistrict",
            {
              params: { districtId: district },
            },
          );
          const result = response.data;
          const Tehsils = result.tehsils.map((item) => ({
            label: item.tehsilName,
            value: item.tehsilId,
          }));
          setTehsils(Tehsils);
        } catch (err) {
          console.error("Failed to fetch tehsils", err);
          setError("Failed to fetch tehsils");
        }
      } else {
        setTehsils([]);
      }
    };
    fetchTehsils();
  }, [district]);

  useEffect(() => {
    setDistrict("");
    setTehsil("");
  }, [division]);

  useEffect(() => {
    setTehsil("");
  }, [district]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {};
        if (state !== "") params.state = state;
        if (division !== "") params.division = division;
        if (district !== "") params.district = district;
        if (tehsil !== "") params.tehsil = tehsil;

        const response = await mockAxiosInstance.get("/api/dashboard/stats", {
          params,
        });
        setDashboardData(response.data);
      } catch (err) {
        setError("Failed to fetch dashboard data");
        console.error(err);
        setDashboardData(defaultCardData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [state, division, district, tehsil]);

  const handleCardClick = (label, type) => {
    console.log(`Clicked card: ${label}, type: ${type}`);
  };

  const handleResetFilters = () => {
    setState("");
    setDivision("");
    setDistrict("");
    setTehsil("");
  };

  const applicationCards = dashboardData.filter(
    (card) => card.category === "application",
  );
  const disbursementCards = dashboardData.filter(
    (card) => card.category === "disbursement",
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        py: 2,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          position: "sticky",
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
              <Typography variant="h4" fontWeight="bold" color="primary">
                Dashboard Overview
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Real-time application and disbursement metrics
              </Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "success.main",
                  animation: `${pulse} 2s infinite`,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Live Data
              </Typography>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        {/* Filters */}
        <GlassCard sx={{ p: 3, mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={3}>
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <FilterList />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Filter Options
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customize your data view
              </Typography>
            </Box>
          </Stack>

          <Grid2 container spacing={3}>
            <Grid2 xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                variant="outlined"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Select State</MenuItem>
                <MenuItem value="0">Jammu & Kashmir</MenuItem>
              </TextField>
            </Grid2>

            <Grid2 xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label="Division"
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                variant="outlined"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Select Division</MenuItem>
                <MenuItem value="1">Jammu</MenuItem>
                <MenuItem value="2">Kashmir</MenuItem>
              </TextField>
            </Grid2>

            <Grid2 xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label="District"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                variant="outlined"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Select District</MenuItem>
                {districts.map((item, index) => (
                  <MenuItem key={index} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>

            <Grid2 xs={12} sm={6} md={2.4}>
              <TextField
                select
                fullWidth
                label="Tehsil"
                value={tehsil}
                onChange={(e) => setTehsil(e.target.value)}
                variant="outlined"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              >
                <MenuItem value="">Select Tehsil</MenuItem>
                {tehsils.map((item, index) => (
                  <MenuItem key={index} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid2>

            <Grid2 xs={12} sm={6} md={2.4}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleResetFilters}
                startIcon={<Refresh />}
                sx={{
                  height: "56px",
                  borderRadius: 2,
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
                  },
                }}
              >
                Reset
              </Button>
            </Grid2>
          </Grid2>
        </GlassCard>

        {/* Main Content */}
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
            }}
          >
            <ErrorOutline sx={{ fontSize: 60, color: "error.main", mb: 2 }} />
            <Typography variant="h6" color="error.main">
              {error}
            </Typography>
          </Paper>
        ) : (
          <Grid2 container spacing={4}>
            {/* Application Status Section */}
            <Grid2 xs={12}>
              <GlassCard sx={{ p: 4 }}>
                <SectionHeader>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{ bgcolor: "primary.main", width: 48, height: 48 }}
                    >
                      <Assessment />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        Application Status
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overview of application processing status
                      </Typography>
                    </Box>
                  </Stack>
                </SectionHeader>

                <Grid2 container spacing={3} mb={4}>
                  {applicationCards.map((card, index) => (
                    <Grid2 xs={12} sm={6} md={4} lg={2.4} key={index}>
                      <ModernStatCard card={card} onClick={handleCardClick} />
                    </Grid2>
                  ))}
                </Grid2>

                <Divider sx={{ my: 4 }} />

                <Box
                  sx={{
                    bgcolor: alpha(theme.palette.background.default, 0.5),
                    borderRadius: 3,
                    p: 4,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <PieChart color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Status Distribution
                    </Typography>
                  </Stack>
                  <StatusChart data={dashboardData} />
                </Box>
              </GlassCard>
            </Grid2>

            {/* Disbursement Metrics Section */}
            <Grid2 xs={12}>
              <GlassCard sx={{ p: 4 }}>
                <SectionHeader>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{ bgcolor: "success.main", width: 48, height: 48 }}
                    >
                      <MonetizationOn />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        Disbursement Metrics
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Financial disbursement and beneficiary statistics
                      </Typography>
                    </Box>
                  </Stack>
                </SectionHeader>

                <Grid2 container spacing={3}>
                  {disbursementCards.map((card, index) => (
                    <Grid2 xs={12} sm={6} md={4} key={index}>
                      <ModernStatCard card={card} onClick={handleCardClick} />
                    </Grid2>
                  ))}
                </Grid2>
              </GlassCard>
            </Grid2>
          </Grid2>
        )}
      </Container>
    </Box>
  );
}
