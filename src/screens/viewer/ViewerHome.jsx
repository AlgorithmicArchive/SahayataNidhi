import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Typography,
  useTheme,
  TextField,
  MenuItem,
  Tooltip as MuiTooltip,
} from "@mui/material";
import { styled } from "@mui/system";
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
} from "@mui/icons-material";
import { Col, Row } from "react-bootstrap";
import axiosInstance from "../../axiosConfig";

// Mock function to simulate dashboard data API response
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

// Mock axios instance
const mockAxiosInstance = {
  get: (url, config) => {
    if (url === "/api/dashboard/stats") {
      console.log(
        "Mock API call for dashboard stats with params:",
        config.params,
      );
      return Promise.resolve({ data: mockDashboardData(config.params) });
    }
    return axiosInstance.get(url, config);
  },
};

// Default card data
const defaultCardData = [
  {
    title: "Applications Received",
    value: "1,234",
    cardColor: "#B8C8FF",
    textColor: "#212121",
  },
  {
    title: "Sanctioned",
    value: "856",
    cardColor: "#C0E8C2",
    textColor: "#212121",
  },
  {
    title: "Under Process",
    value: "200",
    cardColor: "#E5F8B8",
    textColor: "#212121",
  },
  {
    title: "Pending with Citizen",
    value: "20",
    cardColor: "#D2B8F8",
    textColor: "#212121",
  },
  {
    title: "Rejected",
    value: "178",
    cardColor: "#F8B8B8",
    textColor: "#212121",
  },
  {
    title: "Total Amount Disbursed (Latest Month)",
    value: "₹5,67,89,000",
    cardColor: "#C0E8C2",
    textColor: "#212121",
  },
  {
    title: "New Sanctions (After Latest Disbursements)",
    value: "320",
    cardColor: "#C0E8C2",
    textColor: "#212121",
  },
  {
    title: "No. of Beneficiaries Paid (Latest Month)",
    value: "542",
    cardColor: "#C0E8C2",
    textColor: "#212121",
  },
  {
    title: "Successful Disbursements (Latest Month)",
    value: "519",
    cardColor: "#C0E8C2",
    textColor: "#212121",
  },
  {
    title: "Failed Disbursements (Latest Month)",
    value: "23",
    cardColor: "#F8B8B8",
    textColor: "#212121",
  },
  {
    title: "Arrear Amount Disbursed (Latest Month)",
    value: "₹12,50,000",
    cardColor: "#C0E8C2",
    textColor: "#212121",
  },
];

// Icon mapping
const iconMap = {
  "Applications Received": <AssignmentTurnedIn />,
  Sanctioned: <CheckCircle />,
  "Under Process": <HourglassEmpty />,
  "Pending with Citizen": <Group />,
  Rejected: <Cancel />,
  "Total Amount Disbursed (Latest Month)": <MonetizationOn />,
  "New Sanctions (After Latest Disbursements)": <TrendingUp />,
  "No. of Beneficiaries Paid (Latest Month)": <AccountBalanceWallet />,
  "Successful Disbursements (Latest Month)": <EmojiEvents />,
  "Failed Disbursements (Latest Month)": <ErrorOutline />,
  "Arrear Amount Disbursed (Latest Month)": <MonetizationOn />,
};

// Styled StatCard component
const StatCard = styled(Card)(({ theme }) => ({
  minWidth: 250,
  borderRadius: "16px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-6px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
}));

export default function ViewerHome() {
  const theme = useTheme();
  const [state, setState] = useState(0);
  const [division, setDivision] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState(null);
  const [tehsils, setTehsils] = useState([]);
  const [tehsil, setTehsil] = useState(null);
  const [dashboardData, setDashboardData] = useState(defaultCardData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch districts when division changes
  useEffect(() => {
    const fetchDistricts = async () => {
      if (division != null && division !== "") {
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

  // Fetch tehsils when district changes
  useEffect(() => {
    const fetchTehsils = async () => {
      if (district != null && district !== "") {
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

  // Reset district and tehsil when division changes
  useEffect(() => {
    setDistrict(null);
    setTehsil(null);
  }, [division]);

  // Reset tehsil when district changes
  useEffect(() => {
    setTehsil(null);
  }, [district]);

  // Fetch dashboard data when filters change
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = {};
        if (state !== "" && state != null) params.state = state;
        if (division != null) params.division = division;
        if (district != null) params.district = district;
        if (tehsil != null) params.tehsil = tehsil;

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

  // Handle card click
  const handleCardClick = (label, type) => {
    console.log(`Clicked card: ${label}, type: ${type}`);
  };

  return (
    <Box
      sx={{
        padding: "32px",
        minHeight: "100vh",
        background: `linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)`,
      }}
    >
      <Typography
        variant="h4"
        align="center"
        sx={{
          mb: 6,
          fontWeight: "bold",
          color: theme.palette.text.primary,
        }}
      >
        Dashboard
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          justifyContent: "center",
        }}
      >
        <Row style={{ width: "100%", justifyContent: "center" }}>
          <Col xs={12} lg={2}>
            <TextField
              select
              name="State"
              label="Select State"
              fullWidth
              value={state}
              onChange={(e) => setState(e.target.value)}
            >
              {[
                { label: "Please Select", value: "" },
                { label: "Jammu & Kashmir", value: 0 },
              ].map((item, index) => (
                <MenuItem key={index} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Col>
          <Col xs={12} lg={2}>
            <TextField
              select
              name="Division"
              label="Select Division"
              fullWidth
              value={division || ""}
              onChange={(e) => setDivision(e.target.value)}
            >
              {[
                { label: "Please Select", value: "" },
                { label: "Jammu", value: 1 },
                { label: "Kashmir", value: 2 },
              ].map((item, index) => (
                <MenuItem key={index} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Col>
          <Col xs={12} lg={2}>
            <TextField
              select
              name="District"
              label="Select District"
              fullWidth
              value={district || ""}
              onChange={(e) => setDistrict(e.target.value)}
            >
              <MenuItem value="">Please Select</MenuItem>
              {districts.map((item, index) => (
                <MenuItem key={index} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Col>
          <Col xs={12} lg={2}>
            <TextField
              select
              name="Tehsil"
              label="Select Tehsil"
              fullWidth
              value={tehsil || ""}
              onChange={(e) => setTehsil(e.target.value)}
            >
              <MenuItem value="">Please Select</MenuItem>
              {tehsils.map((item, index) => (
                <MenuItem key={index} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Col>
        </Row>

        {isLoading ? (
          <Typography>Loading...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Row style={{ justifyContent: "center", width: "100%" }}>
            {dashboardData.map((card, index) => (
              <Col
                key={index}
                lg={
                  index > 4 && index < 7
                    ? 6
                    : index > 6
                    ? 3
                    : index === 9
                    ? 12
                    : 2
                }
                xs={12}
                style={{
                  marginBottom: 40,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <StatCard
                  sx={{
                    backgroundColor: card.cardColor,
                    padding: "16px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "160px",
                    width: "100%",
                    maxWidth: 300,
                  }}
                  onClick={() => handleCardClick(card.title, "application")}
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
                        color: card.textColor,
                        fontSize: "0.85rem",
                      }}
                    >
                      {card.title}
                    </Typography>
                    {React.cloneElement(
                      iconMap[card.title] || <AssignmentTurnedIn />,
                      {
                        style: { color: "#000000", fontSize: 16 },
                      },
                    )}
                  </Box>
                  <MuiTooltip
                    title={`View ${
                      card.title === "Pending with Citizen"
                        ? "Pending With Citizen"
                        : card.title
                    } applications`}
                    enterTouchDelay={0}
                    leaveTouchDelay={2000}
                    arrow
                  >
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: "bold",
                        color: card.textColor,
                        textAlign: "left",
                        fontSize: "2.5rem",
                      }}
                    >
                      {card.value}
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
                    <span /> {/* No forwardedSanctionedCount in data */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: card.textColor,
                        fontSize: "0.85rem",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      View All <ArrowRightAlt sx={{ fontSize: 16, ml: 0.5 }} />
                    </Typography>
                  </Box>
                </StatCard>
              </Col>
            ))}
          </Row>
        )}
      </Box>
    </Box>
  );
}
