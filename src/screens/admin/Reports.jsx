import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  CircularProgress,
  Card,
  CardContent,
} from "@mui/material";
import { toast } from "react-toastify";
import { Container, Row, Col } from "react-bootstrap";
import styled from "@emotion/styled";
import ServerSideTable from "../../components/ServerSideTable";
import axiosInstance from "../../axiosConfig";

// Styled components
const StyledCard = styled(Card)`
  background: linear-gradient(135deg, #ffffff, #f8f9fa);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
  }
`;

const StyledButton = styled(Button)`
  background: linear-gradient(45deg, #1976d2, #2196f3);
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 8px;
  text-transform: none;
  &:hover {
    background: linear-gradient(45deg, #1565c0, #1976d2);
    transform: scale(1.05);
  }
  &:disabled {
    background: #cccccc;
    color: #666666;
  }
`;

export default function ReportsAdmin() {
  const [district, setDistrict] = useState("");
  const [service, setService] = useState("");
  const [districts, setDistricts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTehsil, setIsTehsil] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  const tableRef = useRef(null);

  // Fetch districts and services
  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch districts/access areas
        const districtsRes = await axiosInstance.get("/Base/GetAccessAreas");

        // Fetch services
        const servicesRes = await axiosInstance.get("/Base/GetServices");

        // Check if both responses are successful
        if (!districtsRes.data.status || !servicesRes.data.status) {
          throw new Error("Failed to fetch districts or services");
        }

        // Handle districts/tehsils logic
        if (districtsRes.data.tehsils) {
          setIsTehsil(true);
          setDistricts(
            districtsRes.data.tehsils.map((d) => ({
              value: d.tehsilId,
              label: d.tehsilName,
            }))
          );
        } else {
          setDistricts(
            districtsRes.data.districts.map((d) => ({
              value: d.districtId,
              label: d.districtName,
            }))
          );
        }

        // Set services
        setServices(
          servicesRes.data.services.map((s) => ({
            value: s.serviceId,
            label: s.serviceName,
          }))
        );
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Something went wrong";
        setError(message);
        toast.error(`Error: ${message}`, {
          position: "top-right",
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDropdowns();
  }, []);

  const handleDistrictChange = (event) => {
    setDistrict(event.target.value);
    if (service) {
      setIsButtonDisabled(false);
    }
  };

  const handleServiceChange = (event) => {
    setService(event.target.value);
    if (district) {
      setIsButtonDisabled(false);
    }
  };

  const handleGetReports = () => {
    setShowTable(true);
    setSelectedStatus(""); // Default to no status filter
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Extra params for ServerSideTable
  const extraParams = {
    AccessCode: district,
    ServiceId: service,
    StatusType: selectedStatus,
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
          bgcolor: "#f8f9fa",
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
          bgcolor: "#f8f9fa",
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
        bgcolor: "#f8f9fa",
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
        Reportsssssssssss
      </Typography>

      <Container>
        <Row className="mb-5 justify-content-center">
          <Col xs={12} md={6} lg={4}>
            <FormControl fullWidth sx={{ mb: { xs: 2, md: 0 } }}>
              <InputLabel id="district-select-label">
                {isTehsil ? "Tehsil" : "District"}
              </InputLabel>
              <Select
                labelId="district-select-label"
                value={district}
                label={isTehsil ? "Tehsil" : "District"}
                onChange={handleDistrictChange}
                sx={{ bgcolor: "#fff", borderRadius: "8px" }}
              >
                <MenuItem value="">
                  <em>Please Select</em>
                </MenuItem>
                {districts.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Col>
          <Col xs={12} md={6} lg={4}>
            <FormControl fullWidth>
              <InputLabel id="service-select-label">Service</InputLabel>
              <Select
                labelId="service-select-label"
                value={service}
                label="Service"
                onChange={handleServiceChange}
                sx={{ bgcolor: "#fff", borderRadius: "8px" }}
              >
                <MenuItem value="">
                  <em>Please Select</em>
                </MenuItem>
                {services.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Col>
        </Row>

        <Row className="mb-5 justify-content-center">
          <Col xs="auto">
            <StyledButton
              variant="contained"
              onClick={handleGetReports}
              disabled={isButtonDisabled}
            >
              Generate Reports
            </StyledButton>
          </Col>
        </Row>

        {showTable && (
          <Row ref={tableRef} className="mt-5">
            <Col xs={12}>
              <StyledCard>
                <CardContent>
                  <Typography
                    variant="h6"
                    sx={{ mb: 3, fontWeight: 600, color: "#2d3748" }}
                  >
                    Application Reports
                  </Typography>
                  <ServerSideTable
                    key={`${district}-${service}-${selectedStatus}`}
                    url={`/Admin/GetApplicationsForReports`}
                    extraParams={extraParams}
                    Title={"Tehsil Wise Reports"}
                    sx={{
                      "& .MuiTable-root": {
                        background: "#ffffff",
                      },
                      "& .MuiTableCell-root": {
                        color: "#2d3748",
                        borderColor: "#e0e0e0",
                      },
                      "& .MuiButton-root": {
                        color: "#1976d2",
                      },
                    }}
                  />
                </CardContent>
              </StyledCard>
            </Col>
          </Row>
        )}
      </Container>
    </Box>
  );
}
