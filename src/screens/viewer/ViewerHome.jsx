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
  InputLabel,
  FormControl,
  Select,
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
  LocationCity,
  Public,
  Map,
  Home,
} from "@mui/icons-material";
import { styled, keyframes } from "@mui/material/styles";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axiosInstance from "../../axiosConfig";
import ServerSideTable from "../../components/ServerSideTable";

// === ANIMATIONS ===
const popIn = keyframes`
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// === MODERN SOLID CARD ===
const SolidStatCard = styled(Card)(({ theme, bgcolor, iconcolor }) => ({
  backgroundColor: bgcolor,
  color: "#FFFFFF",
  borderRadius: "20px",
  overflow: "hidden",
  height: "100%",
  position: "relative",
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  boxShadow: `0 8px 20px ${alpha(iconcolor || bgcolor, 0.4)}`,
  animation: `${popIn} 0.4s ease-out forwards`,
  "&:hover": {
    transform: "translateY(-10px) scale(1.04)",
    boxShadow: `0 20px 40px ${alpha(iconcolor || bgcolor, 0.5)}`,
    "& .icon-avatar": {
      animation: `${bounce} 1s infinite`,
      backgroundColor: "#FFFFFF",
      "& svg": { color: bgcolor },
    },
    "& .details-arrow": { transform: "translateX(8px)" },
  },
}));

const IconAvatar = styled(Avatar)(({ theme, iconcolor }) => ({
  width: 68,
  height: 68,
  backgroundColor: "#FFFFFF",
  color: iconcolor,
  boxShadow: `0 6px 16px ${alpha(iconcolor, 0.3)}`,
  transition: "all 0.3s ease",
  "& svg": { fontSize: "2rem", fontWeight: "bold" },
}));

// === MODERN FILTER CARD ===
const ModernFilterCard = styled(Card)(({ theme }) => ({
  background: "rgba(255, 255, 255, 0.97)",
  backdropFilter: "blur(12px)",
  borderRadius: "24px",
  border: `1px solid ${alpha("#e2e8f0", 0.6)}`,
  boxShadow: `0 12px 32px ${alpha("#000", 0.08)}`,
  padding: theme.spacing(4),
  marginBottom: theme.spacing(4),
}));

// Animated Input Label
const AnimatedLabel = styled(InputLabel)(({ theme }) => ({
  fontWeight: 600,
  color: "#64748b",
  transition: "all 0.2s ease",
  "&.Mui-focused": {
    color: "#4f46e5",
    fontWeight: 700,
  },
}));

// Custom Select with Icon
const IconSelect = styled(Select)(({ theme }) => ({
  "& .MuiSelect-icon": {
    color: "#4f46e5",
    fontSize: "1.4rem",
  },
}));

// === STATUS COLORS ===
const STATUS_COLORS = {
  "Applications Received": "#6B7280",
  Sanctioned: "#10B981",
  "Under Process": "#F97316",
  "Pending with Citizen": "#A855F7",
  Rejected: "#EF4444",
};

const getColor = (title) => STATUS_COLORS[title] || "#6B7280";

// === ICON MAPS ===
const iconMap = {
  "Applications Received": AssignmentTurnedIn,
  Sanctioned: CheckCircle,
  "Under Process": HourglassEmpty,
  "Pending with Citizen": Group,
  Rejected: Cancel,
};

const filterIcons = {
  State: <Public />,
  Division: <LocationCity />,
  District: <Map />,
  Tehsil: <Home />,
};

// === DEFAULT DATA ===
const defaultCardData = [
  { title: "Applications Received", value: "0", category: "application" },
  { title: "Sanctioned", value: "0", category: "application" },
  { title: "Under Process", value: "0", category: "application" },
  { title: "Pending with Citizen", value: "0", category: "application" },
  { title: "Rejected", value: "0", category: "application" },
];

// === FILTERS HOOK ===
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
    if (type === "District")
      return districts.find((d) => d.value === value)?.label || type;
    if (type === "Tehsil")
      return tehsils.find((t) => t.value === value)?.label || type;
    return type;
  };

  useEffect(() => {
    const fetchDistricts = async () => {
      if (division) {
        setFilterLoading(true);
        try {
          const res = await axiosInstance.get("/Base/GetDistricts", {
            params: { division },
          });
          setDistricts(
            res.data.districts.map((d) => ({
              label: d.districtName,
              value: d.districtId,
            })),
          );
          setDistrict("");
          setTehsils([]);
          setTehsil("");
        } catch (err) {
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
          const res = await axiosInstance.get("/Base/GetTeshilForDistrict", {
            params: { districtId: district },
          });
          setTehsils(
            res.data.tehsils.map((t) => ({
              label: t.tehsilName,
              value: t.tehsilId,
            })),
          );
          setTehsil("");
        } catch (err) {
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
      setWiseName(tehsils.find((t) => t.value === tehsil)?.label || "Tehsil");
    } else if (district) {
      setWise("District");
      setWiseName(
        districts.find((d) => d.value === district)?.label || "District",
      );
    } else if (division) {
      setWise("Division");
      setWiseName(division === "1" ? "Jammu" : "Kashmir");
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

// === DASHBOARD DATA HOOK ===
const useDashboardData = (category, filters) => {
  const [data, setData] = useState(
    defaultCardData.filter((c) => c.category === category),
  );
  const [categoryData, setCategoryData] = useState([]);
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
      const res = await axiosInstance.get("/Viewer/GetApplicationStatus", {
        params,
      });
      const filtered = res.data.dataList.filter((c) => c.category === category);

      setData(
        filtered.map((card) => ({
          ...card,
          bgcolor: getColor(card.title),
          iconcolor: getColor(card.title),
        })),
      );

      setCategoryData(res.data.categoryData || []);
      setLocationData(res.data.locationData || []);
    } catch (err) {
      setError(`Failed to load data`);
      setData(
        defaultCardData
          .filter((c) => c.category === category)
          .map((c) => ({
            ...c,
            bgcolor: getColor(c.title),
            iconcolor: getColor(c.title),
          })),
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters.division, filters.district, filters.tehsil, category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, categoryData, locationData, isLoading, error };
};

// === MODERN STAT CARD ===
const ModernStatCard = ({ card, onCardClick }) => {
  const Icon = iconMap[card.title] || AssignmentTurnedIn;
  const color = card.bgcolor || "#6B7280";

  return (
    <SolidStatCard
      bgcolor={color}
      iconcolor={color}
      onClick={() => onCardClick(card.title, card.category)}
    >
      <CardContent
        sx={{
          p: 4,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box textAlign="center">
          <IconAvatar iconcolor={color} className="icon-avatar">
            <Icon />
          </IconAvatar>
        </Box>

        <Box mt={2} textAlign="center">
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: "1rem",
              letterSpacing: "0.5px",
              mb: 1,
              opacity: 0.9,
            }}
          >
            {card.title}
          </Typography>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "2.2rem", md: "2.8rem" },
              lineHeight: 1,
            }}
          >
            {card.value}
          </Typography>
        </Box>

        <Box mt={3} textAlign="center">
          <Typography
            className="details-arrow"
            sx={{
              fontSize: "0.95rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              transition: "transform 0.3s ease",
            }}
          >
            Details
            <ArrowRightAlt sx={{ fontSize: "1.1rem", fontWeight: "bold" }} />
          </Typography>
        </Box>
      </CardContent>
    </SolidStatCard>
  );
};

// === DONUT CHART ===
const DonutChart = ({ pieData, chartTitle }) => {
  const theme = useTheme();
  const hasData = pieData?.datasets?.[0]?.data?.some((v) => v > 0) ?? false;

  if (!hasData) {
    return (
      <Typography
        variant="body1"
        color="text.secondary"
        align="center"
        sx={{ py: 8 }}
      >
        No data for {chartTitle}
      </Typography>
    );
  }

  const filtered = pieData.labels
    .map((label, i) => ({
      name: label,
      value: pieData.datasets[0].data[i],
      color: pieData.datasets[0].backgroundColor[i],
    }))
    .filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsPieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="68%"
          innerRadius="45%"
          paddingAngle={4}
          cornerRadius={10}
        >
          {filtered.map((e, i) => (
            <Cell key={i} fill={e.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => v.toLocaleString("en-IN")} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

// === MODERN FILTER SECTION ===
const ModernFilterSection = ({ category, filters, filterLoading }) => {
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

  const filterFields = [
    {
      label: "State",
      value: state,
      onChange: setState,
      options: [{ value: "0", label: "Jammu & Kashmir" }],
      icon: filterIcons.State,
    },
    {
      label: "Division",
      value: division,
      onChange: setDivision,
      options: [
        { value: "1", label: "Jammu" },
        { value: "2", label: "Kashmir" },
      ],
      icon: filterIcons.Division,
    },
    {
      label: "District",
      value: district,
      onChange: setDistrict,
      options: districts,
      icon: filterIcons.District,
    },
    {
      label: "Tehsil",
      value: tehsil,
      onChange: setTehsil,
      options: tehsils,
      icon: filterIcons.Tehsil,
    },
  ];

  return (
    <ModernFilterCard>
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar
          sx={{
            bgcolor: "#4f46e5",
            width: 56,
            height: 56,
            boxShadow: `0 8px 20px ${alpha("#4f46e5", 0.3)}`,
          }}
        >
          <FilterList sx={{ fontSize: "1.6rem" }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color="#1e293b">
            Filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Refine your dashboard view
          </Typography>
        </Box>
        {filterLoading && (
          <CircularProgress size={24} sx={{ ml: "auto", color: "#4f46e5" }} />
        )}
      </Stack>

      <Grid container spacing={3}>
        {filterFields.map(({ label, value, onChange, options, icon }, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <FormControl fullWidth variant="outlined">
              <AnimatedLabel shrink>
                {getFilterTitle(label, value)}
              </AnimatedLabel>
              <IconSelect
                value={value}
                onChange={(e) => onChange(e.target.value)}
                displayEmpty
                IconComponent={() => icon}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      borderRadius: "16px",
                      mt: 1,
                      boxShadow: `0 10px 30px ${alpha("#000", 0.1)}`,
                    },
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha("#94a3b8", 0.5),
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#4f46e5",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#4f46e5",
                    borderWidth: 2,
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <Typography color="text.secondary">Select {label}</Typography>
                </MenuItem>
                {options.map((opt) => (
                  <MenuItem
                    key={opt.value}
                    value={opt.value}
                    sx={{ fontWeight: 500 }}
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </IconSelect>
            </FormControl>
          </Grid>
        ))}
      </Grid>

      <Box mt={4} textAlign="right">
        <Button
          variant="contained"
          onClick={resetFilters}
          startIcon={
            <Refresh sx={{ animation: `${spin} 1s linear infinite` }} />
          }
          sx={{
            bgcolor: "#4f46e5",
            color: "#fff",
            fontWeight: 700,
            px: 4,
            py: 1.5,
            borderRadius: "16px",
            boxShadow: `0 8px 20px ${alpha("#4f46e5", 0.3)}`,
            "&:hover": {
              bgcolor: "#4338ca",
              transform: "translateY(-2px)",
              boxShadow: `0 12px 28px ${alpha("#4f46e5", 0.4)}`,
            },
            transition: "all 0.3s ease",
          }}
        >
          Reset All Filters
        </Button>
      </Box>
    </ModernFilterCard>
  );
};

// === MAIN DASHBOARD ===
export default function ModernMUIDashboard() {
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

  const handleCardClick = useCallback((title) => {
    const map = {
      "Applications Received": "total",
      Sanctioned: "sanctioned",
      "Under Process": "pending",
      "Pending with Citizen": "returntoedit",
      Rejected: "rejected",
    };
    setSelectedTable({ title, type: map[title] || "total" });
    setTimeout(
      () => tableRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  }, []);

  const statusPieData = {
    labels: ["Sanctioned", "Under Process", "Pending with Citizen", "Rejected"]
      .map((t) => appData.find((d) => d.title === t)?.title)
      .filter(Boolean),
    datasets: [
      {
        data: [
          "Sanctioned",
          "Under Process",
          "Pending with Citizen",
          "Rejected",
        ].map((t) =>
          parseInt(appData.find((d) => d.title === t)?.value || "0"),
        ),
        backgroundColor: ["#10B981", "#F97316", "#A855F7", "#EF4444"],
      },
    ],
  };

  const dynamicTitle = `${
    appFilters.wise === "State"
      ? "Division"
      : appFilters.wise === "Division"
      ? "District"
      : "Tehsil"
  }-wise Sanctioned Applications`;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", py: 4 }}>
      <Container maxWidth="xl">
        <Typography
          variant="h3"
          fontWeight="bold"
          color="#1e293b"
          mb={2}
          sx={{ display: "flex", alignItems: "center", gap: 2 }}
        >
          <Assessment sx={{ color: "#4f46e5", fontSize: "2.5rem" }} />
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" mb={4}>
          Real-time application status and analytics
        </Typography>

        <ModernFilterSection
          category="application"
          filters={appFilters}
          filterLoading={appFilters.filterLoading}
        />

        {appLoading ? (
          <Box textAlign="center" py={12}>
            <CircularProgress
              size={80}
              thickness={5}
              sx={{ color: "#4f46e5" }}
            />
            <Typography variant="h6" mt={3} color="text.secondary">
              Loading dashboard...
            </Typography>
          </Box>
        ) : appError ? (
          <Paper
            sx={{
              p: 6,
              textAlign: "center",
              bgcolor: alpha("#EF4444", 0.1),
              borderRadius: "20px",
            }}
          >
            <ErrorOutline sx={{ fontSize: 80, color: "#EF4444", mb: 2 }} />
            <Typography variant="h6" color="#EF4444">
              {appError}
            </Typography>
          </Paper>
        ) : (
          <>
            <ModernFilterCard sx={{ p: 4 }}>
              <Box mb={4}>
                <Typography variant="h5" fontWeight="bold" color="#1e293b">
                  Application Status Overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {appFilters.wise} - {appFilters.wiseName}
                </Typography>
              </Box>

              <Grid container spacing={3} mb={5}>
                {appData.map((card, i) => (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={i}>
                    <ModernStatCard card={card} onCardClick={handleCardClick} />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 6, borderColor: alpha("#e2e8f0", 0.6) }} />

              <Grid container spacing={4}>
                <Grid item xs={12} md={appFilters.tehsil ? 6 : 4}>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    mb={2}
                    color="#1e293b"
                  >
                    Status Distribution
                  </Typography>
                  <DonutChart pieData={statusPieData} />
                </Grid>
                <Grid item xs={12} md={appFilters.tehsil ? 6 : 4}>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    mb={2}
                    color="#1e293b"
                  >
                    Category-wise
                  </Typography>
                  <DonutChart
                    pieData={{
                      labels: categoryData.map((c) => c.name),
                      datasets: [
                        {
                          data: categoryData.map((c) => c.value),
                          backgroundColor: categoryData.map((c) => c.color),
                        },
                      ],
                    }}
                  />
                </Grid>
                {!appFilters.tehsil && (
                  <Grid item xs={12} md={4}>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      mb={2}
                      color="#1e293b"
                    >
                      {dynamicTitle}
                    </Typography>
                    <DonutChart
                      pieData={{
                        labels: locationData.map((l) => l.name),
                        datasets: [
                          {
                            data: locationData.map((l) => l.value),
                            backgroundColor: locationData.map((l) => l.color),
                          },
                        ],
                      }}
                    />
                  </Grid>
                )}
              </Grid>
            </ModernFilterCard>

            {selectedTable && (
              <ModernFilterCard sx={{ p: 3 }}>
                <div ref={tableRef}>
                  <ServerSideTable
                    url={`/Viewer/GetMainApplicationStatusData?serviceId=1&type=${encodeURIComponent(
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
                </div>
              </ModernFilterCard>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
