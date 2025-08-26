import React, { useEffect, useState, useRef, useCallback } from "react";
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
  ArrowRightAlt,
  FilterList,
  Refresh,
  PieChart,
  Assessment,
  ErrorOutline,
} from "@mui/icons-material";
import { styled, keyframes } from "@mui/material/styles";
import { Chart } from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import axiosIntance from "../../axiosConfig";
import ServerSideTable from "../../components/ServerSideTable";

Chart.register(ChartDataLabels);

// Animations
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

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
      "&::before": { opacity: 1 },
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

// Constants
const defaultCardData = [
  {
    title: "Applications Received",
    value: "0",
    category: "application",
    color: "primary",
    bgColor: "#f8faff",
    gradientStart: "#4f46e5",
    gradientEnd: "#3b82f6",
  },
  {
    title: "Sanctioned",
    value: "0",
    category: "application",
    color: "success",
    bgColor: "#f0fdf4",
    gradientStart: "#059669",
    gradientEnd: "#10b981",
  },
  {
    title: "Under Process",
    value: "0",
    category: "application",
    color: "warning",
    bgColor: "#fffbeb",
    gradientStart: "#fbbf24",
    gradientEnd: "#fbbf24",
  },
  {
    title: "Pending with Citizen",
    value: "0",
    category: "application",
    color: "info",
    bgColor: "#f0f9ff",
    gradientStart: "#0ea5e9",
    gradientEnd: "#38bdf8",
  },
  {
    title: "Rejected",
    value: "0",
    category: "application",
    color: "error",
    bgColor: "#fef2f2",
    gradientStart: "#ef4444",
    gradientEnd: "#f87171",
  },
];

const defaultCategoryData = [
  { name: "Old Age Pension", value: 0, color: "#4f46e5" },
  { name: "Women In Distress", value: 0, color: "#059669" },
  { name: "Physically Challenged Person", value: 0, color: "#f59e0b" },
  { name: "Transgender", value: 0, color: "#0ea5e9" },
];

const iconMap = {
  "Applications Received": AssignmentTurnedIn,
  Sanctioned: CheckCircle,
  "Under Process": HourglassEmpty,
  "Pending with Citizen": Group,
  Rejected: Cancel,
};

// Custom Hook for Filter Management
const useFilters = (category) => {
  const [state, setState] = useState("0");
  const [division, setDivision] = useState("");
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState("");
  const [tehsils, setTehsils] = useState([]);
  const [tehsil, setTehsil] = useState("");
  const [wise, setWise] = useState("State");
  const [wiseName, setWiseName] = useState("Jammu & Kashmir");
  const [filterLoading, setFilterLoading] = useState(false);

  const resetFilters = useCallback(() => {
    setState("0");
    setDivision("");
    setDistrict("");
    setTehsil("");
    setDistricts([]);
    setTehsils([]);
    setWise("State");
    setWiseName("Jammu & Kashmir");
  }, []);

  const getFilterTitle = (type, value) => {
    if (!value) return type;
    if (type === "State") return value === "0" ? "Jammu & Kashmir" : type;
    if (type === "Division")
      return value === "1" ? "Jammu" : value === "2" ? "Kashmir" : type;
    if (type === "District") {
      return districts.find((d) => d.value === value)?.label || type;
    }
    if (type === "Tehsil") {
      return tehsils.find((t) => t.value === value)?.label || type;
    }
    return type;
  };

  useEffect(() => {
    const fetchDistricts = async () => {
      if (division) {
        setFilterLoading(true);
        try {
          const response = await axiosIntance.get("/Base/GetDistricts", {
            params: { division },
          });
          setDistricts(
            response.data.districts.map((item) => ({
              label: item.districtName,
              value: item.districtId,
            })),
          );
          setDistrict("");
          setTehsils([]);
          setTehsil("");
        } catch (err) {
          console.error(`Failed to fetch districts for ${category}:`, err);
          setDistricts([]);
        } finally {
          setFilterLoading(false);
        }
      } else {
        setDistricts([]);
        setDistrict("");
        setTehsils([]);
        setTehsil("");
      }
    };
    fetchDistricts();
  }, [division, category]);

  useEffect(() => {
    const fetchTehsils = async () => {
      if (district) {
        setFilterLoading(true);
        try {
          const response = await axiosIntance.get(
            "/Base/GetTeshilForDistrict",
            {
              params: { districtId: district },
            },
          );
          setTehsils(
            response.data.tehsils.map((item) => ({
              label: item.tehsilName,
              value: item.tehsilId,
            })),
          );
          setTehsil("");
        } catch (err) {
          console.error(`Failed to fetch tehsils for ${category}:`, err);
          setTehsils([]);
        } finally {
          setFilterLoading(false);
        }
      } else {
        setTehsils([]);
        setTehsil("");
      }
    };
    fetchTehsils();
  }, [district, category]);

  useEffect(() => {
    if (tehsil) {
      setWise("Tehsil");
      setWiseName(
        tehsils.find((item) => item.value === tehsil)?.label || "Tehsil",
      );
    } else if (district) {
      setWise("District");
      setWiseName(
        districts.find((item) => item.value === district)?.label || "District",
      );
    } else if (division) {
      setWise("Division");
      setWiseName(
        division === "1" ? "Jammu" : division === "2" ? "Kashmir" : "Division",
      );
    } else {
      setWise("State");
      setWiseName("Jammu & Kashmir");
    }
  }, [division, district, tehsil, districts, tehsils]);

  return {
    state,
    setState,
    division,
    setDivision,
    district,
    setDistrict,
    tehsil,
    setTehsil,
    districts,
    tehsils,
    wise,
    wiseName,
    filterLoading,
    resetFilters,
    getFilterTitle,
  };
};

// Custom Hook for Dashboard Data
const useDashboardData = (category, filters) => {
  const [data, setData] = useState(
    defaultCardData.filter((c) => c.category === category),
  );
  const [categoryData, setCategoryData] = useState(defaultCategoryData);
  const [locationData, setLocationData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        serviceId: "1",
        division: filters.division || null,
        district: filters.district || null,
        tehsil: filters.tehsil || null,
      };
      const response = await axiosIntance.get(
        "/Viewer/GetAadhaarValidationCount",
        {
          params,
        },
      );
      setData(response.data.dataList.filter((c) => c.category === category));
      setCategoryData(response.data.categoryData || defaultCategoryData);
      setLocationData(response.data.locationData || []);
    } catch (err) {
      setError(`

Failed to fetch ${category} data`);
      setData(defaultCardData.filter((c) => c.category === category));
      setCategoryData(defaultCategoryData);
      setLocationData([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters.division, filters.district, filters.tehsil, category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, categoryData, locationData, isLoading, error };
};

// Donut Chart Component
const DonutChart = ({ data, chartTitle }) => {
  const theme = useTheme();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current && data.length > 0) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const total = data.reduce((sum, item) => sum + item.value, 0);
      chartInstance.current = new Chart(chartRef.current, {
        type: "doughnut",
        data: {
          labels: data.map((item) => item.name),
          datasets: [
            {
              data: data.map((item) => item.value),
              backgroundColor: data.map((item) => item.color),
              borderColor: data.map((item) => alpha(item.color, 0.3)),
              borderWidth: 2,
              hoverBorderWidth: 3,
              hoverBackgroundColor: data.map((item) => alpha(item.color, 0.8)),
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
                font: { size: 11, family: theme.typography.fontFamily },
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
                label: (context) =>
                  `${context.label}: ${context.parsed.toLocaleString("en-IN")}`,
              },
            },
            datalabels: {
              color: "#ffffff",
              formatter: (value) => `${((value / total) * 100).toFixed(1)}%`,
              font: { weight: "bold", size: 12 },
              textAlign: "center",
              anchor: "center",
              align: "center",
            },
          },
        },
      });

      return () => {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
      };
    }
  }, [data, theme]);

  return (
    <Box sx={{ width: "100%", height: 350, position: "relative" }}>
      <canvas ref={chartRef} style={{ maxWidth: "100%" }} />
      {data.length === 0 && (
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
          No data available
        </Typography>
      )}
    </Box>
  );
};

// Stat Card Component
const ModernStatCard = ({ card, onCardClick }) => {
  const theme = useTheme();
  const IconComponent = iconMap[card.title] || AssignmentTurnedIn;

  return (
    <GradientCard
      onClick={() => onCardClick(card.title, card.category)}
      bgcolor={card.bgColor}
      gradientstart={card.gradientStart}
      gradientend={card.gradientEnd}
    >
      <CardContent sx={{ p: 3, zIndex: 1, height: "100%" }}>
        <Stack spacing={2} sx={{ height: "100%" }}>
          <IconAvatar
            gradientstart={card.gradientStart}
            gradientend={card.gradientEnd}
          >
            <IconComponent />
          </IconAvatar>
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
              fontWeight="bold"
              sx={{
                background: `linear-gradient(135deg, ${card.gradientStart}, ${card.gradientEnd})`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
                wordBreak: "break-all",
              }}
              title={card.value}
            >
              {card.value}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: card.gradientStart,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              opacity: 0.8,
              "&:hover": { opacity: 1 },
            }}
          >
            Details
            <ArrowRightAlt sx={{ ml: 0.5, fontSize: "1rem" }} />
          </Typography>
        </Stack>
      </CardContent>
    </GradientCard>
  );
};

// Filter Section Component
const FilterSection = ({ category, filters, filterLoading }) => {
  const {
    state,
    setState,
    division,
    setDivision,
    district,
    setDistrict,
    tehsil,
    setTehsil,
    districts,
    tehsils,
    resetFilters,
    getFilterTitle,
  } = filters;

  return (
    <GlassCard sx={{ p: 3, mb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar sx={{ bgcolor: "#4f46e5" }}>
          <FilterList />
        </Avatar>
        <Typography variant="h6" fontWeight="bold">
          {category.charAt(0).toUpperCase() + category.slice(1)} Filters
        </Typography>
        {filterLoading && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Stack>
      <Grid container spacing={2}>
        {[
          {
            label: "State",
            value: state,
            onChange: setState,
            options: [{ value: "0", label: "Jammu & Kashmir" }],
          },
          {
            label: "Division",
            value: division,
            onChange: setDivision,
            options: [
              { value: "1", label: "Jammu" },
              { value: "2", label: "Kashmir" },
            ],
          },
          {
            label: "District",
            value: district,
            onChange: setDistrict,
            options: districts,
          },
          {
            label: "Tehsil",
            value: tehsil,
            onChange: setTehsil,
            options: tehsils,
          },
        ].map(({ label, value, onChange, options }, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <TextField
              select
              fullWidth
              label={getFilterTitle(label, value)}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              variant="outlined"
              size="small"
            >
              <MenuItem value="">Select {label}</MenuItem>
              {options.map((item, idx) => (
                <MenuItem key={idx} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={2.4}>
          <Button
            fullWidth
            variant="contained"
            onClick={resetFilters}
            startIcon={<Refresh />}
            sx={{
              height: 40,
              background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #4338ca 0%, #2563eb 100%)",
              },
            }}
          >
            Reset
          </Button>
        </Grid>
      </Grid>
    </GlassCard>
  );
};

// Main Dashboard Component
export default function AadhaarValidations() {
  const theme = useTheme();
  const appFilters = useFilters("application");
  const {
    data: appData,
    categoryData,
    locationData,
    isLoading: appLoading,
    error: appError,
  } = useDashboardData("application", appFilters);

  const [selectedTable, setSelectedTable] = useState(null);
  const tableRef = useRef(null);

  const handleCardClick = useCallback((title, category) => {
    // Map card title to type parameter for GetMainApplicationStatusData
    const titleToTypeMap = {
      "Total Sanctioned": "sanctioned",
      "Aadhaar Validated": "not_empty",
      "Aadhaar Not Validated": "empty",
    };
    const type = titleToTypeMap[title] || "total"; // Default to "total" if no match

    setSelectedTable({ title, category, type });
    setTimeout(() => {
      tableRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, []);

  const statusDistributionData = appData
    .filter((card) =>
      ["Sanctioned", "Aadhaar Validated", "Aadhaar Not Validated"].includes(
        card.title,
      ),
    )
    .map((card) => ({
      name: card.title,
      value: parseInt(card.value.replace(/[^0-9]/g, ""), 10) || 0,
      color: card.gradientStart,
    }))
    .filter((item) => item.value > 0);

  const appDynamicTitle = `${
    appFilters.wise === "State"
      ? "Division"
      : appFilters.wise === "Division"
      ? "District"
      : "Tehsil"
  }-wise Sanctioned Applications`;

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
          py: 2,
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#1e293b" }}>
            Dashboard
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <FilterSection
          category="application"
          filters={appFilters}
          filterLoading={appFilters.filterLoading}
        />

        {appLoading ? (
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
        ) : appError ? (
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
              {appError}
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
                  <Typography variant="h5" fontWeight="bold">
                    Legacy Data Application Status ({appFilters.wise}-
                    {appFilters.wiseName})
                  </Typography>
                </Stack>
              </SectionHeader>
              <Grid container spacing={3} mb={4}>
                {appData.map((card, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={4} key={index}>
                    <ModernStatCard card={card} onCardClick={handleCardClick} />
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 3 }} />
              <Box
                sx={{ bgcolor: alpha("#f8fafc", 0.5), borderRadius: 3, p: 3 }}
                id="application-charts"
              >
                <Typography variant="h6" fontWeight="bold" mb={3}>
                  Status Distribution
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={12}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      mb={2}
                    >
                      <PieChart sx={{ color: "#4f46e5" }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        Status of Applications ({appFilters.wise}-
                        {appFilters.wiseName})
                      </Typography>
                    </Stack>
                    <DonutChart
                      data={statusDistributionData}
                      chartTitle="Application Status"
                    />
                  </Grid>
                  {/* <Grid item xs={12} md={appFilters.tehsil ? 6 : 4}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    mb={2}
                  >
                    <PieChart sx={{ color: "#059669" }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      Category-wise Sanctioned Applications ({appFilters.wise}
                      -{appFilters.wiseName})
                    </Typography>
                  </Stack>
                  <DonutChart
                    data={categoryData}
                    chartTitle="Category-wise Sanctioned Applications"
                  />
                </Grid>
                {!appFilters.tehsil && (
                  <Grid item xs={12} md={4}>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      mb={2}
                    >
                      <PieChart sx={{ color: "#0ea5e9" }} />
                      <Typography variant="subtitle1" fontWeight="medium">
                        {appDynamicTitle}
                      </Typography>
                    </Stack>
                    <DonutChart
                      data={locationData}
                      chartTitle={appDynamicTitle}
                    />
                  </Grid>
                )} */}
                </Grid>
              </Box>
            </GlassCard>

            <GlassCard sx={{ p: 3 }}>
              {selectedTable && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <ServerSideTable
                    ref={tableRef}
                    url={`/Viewer/GetAadhaarValidationData?serviceId=1&type=${encodeURIComponent(
                      selectedTable.type,
                    )}`}
                    extraParams={{
                      state: appFilters.state,
                      division: appFilters.division,
                      district: appFilters.district,
                      tehsil: appFilters.tehsil,
                    }}
                    Title={selectedTable.title}
                    actionFunctions={{}}
                    canSanction={false}
                    canHavePool={false}
                    pendingApplications={false}
                    serviceId="1"
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
