import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Fade,
  Container,
} from "@mui/material";
import { Row, Col } from "react-bootstrap";
import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useContext,
} from "react";
import PeopleIcon from "@mui/icons-material/People";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MiscellaneousServicesIcon from "@mui/icons-material/MiscellaneousServices";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../axiosConfig";
import ServerSideTable from "../../components/ServerSideTable";
import Chart from "chart.js/auto";
import styled from "@emotion/styled";
import { ArrowRightAlt } from "@mui/icons-material";
import { UserContext } from "../../UserContext";

// Styled components
const StatCard = styled(Card)(({ theme }) => ({
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  border: "1px solid rgba(0,0,0,0.08)",
  cursor: "pointer",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-8px) scale(1.02)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.15)",
    borderColor: "rgba(0,0,0,0.12)",
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

const StyledCard = styled(Card)(({ theme }) => ({
  background: "linear-gradient(135deg, #ffffff, #f8f9fa)",
  border: "1px solid #e0e0e0",
  borderRadius: "16px",
  boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  marginBottom: "24px",
  "&:hover": {
    transform: "translateY(-3px) scale(1.005)",
    boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 320px))",
  justifyContent: "center",
  marginBottom: theme.spacing(4),
  [theme.breakpoints.down("sm")]: {
    gridTemplateColumns: "1fr",
    gap: theme.spacing(2),
  },
}));

// Define card data with colors and types
const cardData = [
  {
    title: "Total Registered Officers",
    icon: <PeopleIcon />,
    color: "#1976d2",
    dataKey: "totalOfficers",
    type: "Officer",
  },
  {
    title: "Total Registered Citizens",
    icon: <PersonAddIcon />,
    color: "#dc004e",
    dataKey: "totalRegisteredUsers",
    type: "Citizen",
  },
  {
    title: "Total Applications Received",
    icon: <AssignmentIcon />,
    color: "#f57c00",
    dataKey: "totalApplicationsSubmitted",
    type: "Applications",
  },
  {
    title: "Total Services",
    icon: <MiscellaneousServicesIcon />,
    color: "#388e3c",
    dataKey: "totalServices",
    type: "Services",
  },
];

// Error Boundary Component
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="error">
            Something went wrong. Please try refreshing the page.
          </Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

// DashboardChart component with forwardRef
const DashboardChart = forwardRef(({ data }, ref) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["Officers", "Citizens", "Applications", "Services"],
          datasets: [
            {
              label: "Total",
              data: [
                data.totalOfficers,
                data.totalRegisteredUsers,
                data.totalApplicationsSubmitted,
                data.totalServices,
              ],
              backgroundColor: ["#1976d2", "#dc004e", "#f57c00", "#388e3c"],
              borderColor: ["#1976d2", "#dc004e", "#f57c00", "#388e3c"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          scales: {
            y: {
              beginAtZero: true,
            },
          },
          plugins: {
            legend: {
              position: "top",
              labels: {
                font: {
                  family: "'Inter', sans-serif",
                  size: 14,
                },
                color: "#333333",
              },
            },
          },
        },
      });

      return () => {
        chart.destroy();
      };
    }
  }, [data]);

  return <canvas ref={ref} style={{ maxWidth: "100%", height: "400px" }} />;
});

// Ensure DashboardChart has a display name for debugging
DashboardChart.displayName = "DashboardChart";

export default function AdminHome() {
  const [dashboardData, setDashboardData] = useState({
    totalOfficers: 0,
    totalRegisteredUsers: 0,
    totalApplicationsSubmitted: 0,
    totalServices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [url, setUrl] = useState("");
  const [listType, setListType] = useState("");
  const tableRef = useRef(null);

  const { department } = useContext(UserContext);

  const actionFunctions = {
    ValidateOfficer: async (row) => {
      const userdata = row.original;
      console.log("Validating officer:", userdata.username);
      const formdata = new FormData();
      formdata.append("username", userdata.username);
      try {
        const response = await axiosInstance.post(
          "/Admin/ValidateOfficer",
          formdata,
        );

        if (response.data.status) {
          toast.success("Officer validated successfully!", {
            position: "top-right",
            autoClose: 2000,
            theme: "colored",
          });
        } else {
          toast.error("Validation failed.", {
            position: "top-right",
            autoClose: 3000,
            theme: "colored",
          });
        }
      } catch (error) {
        console.error("Error validating officer:", error);
        toast.error("An error occurred while validating officer.", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      }
    },
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(
          "/Admin/GetDetailsForDashboard",
        );
        setDashboardData(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
        toast.error("Failed to load dashboard data", {
          position: "top-right",
          autoClose: 3000,
          theme: "colored",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleCardClick = (type) => {
    if (type === "Officer") {
      setUrl("/Admin/GetOfficersList");
    } else if (type === "Citizen") {
      setUrl("/Admin/GetUsersList");
    } else if (type === "Applications") {
      setUrl("/Admin/GetApplicationsList");
    } else if (type === "Services") {
      setUrl("/Admin/GetServices");
    }
    setListType(type);
    setShowTable(true);
    requestAnimationFrame(() => {
      if (tableRef.current) {
        tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        console.warn(
          "tableRef.current is null, table may not be rendered yet.",
        );
        setTimeout(() => {
          if (tableRef.current) {
            tableRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } else {
            console.error("tableRef.current is still null after retry.");
          }
        }, 500);
      }
    });
  };

  const renderStatCard = (card, index) => (
    <StatCard
      key={index}
      sx={{
        backgroundColor: card.color,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "200px",
        minHeight: "200px",
        position: "relative",
        overflow: "visible",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, ${card.color}, ${card.color
            .replace(")", ", 0.8)")
            .replace("rgb", "rgba")})`,
          borderRadius: "inherit",
        },
        "& > *": {
          position: "relative",
          zIndex: 1,
        },
      }}
      onClick={() => handleCardClick(card.type)}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: "700",
            color: "#FFFFFF",
            fontSize: "0.95rem",
            lineHeight: 1.3,
            flex: 1,
            pr: 1,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {card.title}
        </Typography>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          {React.cloneElement(card.icon, {
            sx: { fontSize: 24, color: "#FFFFFF" },
          })}
        </Box>
      </Box>

      <Typography
        variant="h2"
        sx={{
          fontWeight: "800",
          color: "#FFFFFF",
          textAlign: "center",
          fontSize: "3.5rem",
          lineHeight: 1,
          fontFamily: "'Inter', sans-serif",
          textShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {dashboardData[card.dataKey]}
      </Typography>

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          mt: "auto",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "#FFFFFF",
            fontSize: "0.8rem",
            display: "inline-flex",
            alignItems: "center",
            fontWeight: "600",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.2s ease",
            "&:hover": { transform: "translateX(4px)" },
          }}
        >
          View All <ArrowRightAlt sx={{ fontSize: 18, ml: 0.5 }} />
        </Typography>
      </Box>
    </StatCard>
  );

  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f9fafb",
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
          bgcolor: "#f9fafb",
        }}
      >
        <Typography color="error" variant="h6" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button
          variant="contained"
          sx={{
            background: "linear-gradient(45deg, #1976d2, #2196f3)",
            padding: "12px 24px",
            fontWeight: 600,
            borderRadius: "8px",
            textTransform: "none",
            color: "#ffffff",
            "&:hover": {
              background: "linear-gradient(45deg, #1565c0, #1976d2)",
              transform: "scale(1.05)",
            },
          }}
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Box
        sx={{
          width: "100%",
          minHeight: "100vh",
          backgroundColor: "#f9fafb",
          pb: 6,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            py: 6,
            mb: 6,
          }}
        >
          <Container>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "#FFFFFF",
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
                textShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              {department}
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
              Admin Dashboard
            </Typography>
          </Container>
        </Box>

        <SectionContainer>
          {/* Cards Section */}
          <Typography
            variant="h4"
            sx={{
              mb: 4,
              fontWeight: 600,
              color: "#2d3748",
              textAlign: "center",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Dashboard Overview
          </Typography>

          <CardGrid>
            {cardData.map((card, index) => renderStatCard(card, index))}
          </CardGrid>

          {/* Chart Section
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
                Data Distribution
              </Typography>
              <Box
                sx={{ height: "400px", width: "100%", position: "relative" }}
              >
                <Fade in={!loading}>
                  <DashboardChart data={dashboardData} />
                </Fade>
              </Box>
            </CardContent>
          </StyledCard> */}

          {/* Table Section */}
          {showTable && (
            <Box ref={tableRef} sx={{ mt: 6 }}>
              <StyledCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      mb: 4,
                      fontWeight: 600,
                      color: "#2d3748",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    List of {listType}
                  </Typography>
                  <ServerSideTable
                    key={listType}
                    url={url}
                    extraParams={{}}
                    actionFunctions={actionFunctions}
                    Title={listType}
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
            </Box>
          )}
        </SectionContainer>

        <ToastContainer />
      </Box>
    </ErrorBoundary>
  );
}
