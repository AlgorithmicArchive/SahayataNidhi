import { Box, Typography, TextField } from "@mui/material";
import React, { useState, useEffect } from "react";
import { Col, Container, Row } from "react-bootstrap";
import { toast } from "react-toastify";
import ServiceSelectionForm from "../../components/ServiceSelectionForm";
import axiosInstance from "../../axiosConfig";
import { fetchServiceList } from "../../assets/fetch";
import ServerSideTable from "../../components/ServerSideTable";
import CollapsibleFormDetails from "../../components/officer/CollapsibleFormDetails";
import BasicModal from "../../components/BasicModal";

export default function SearchApplication() {
  const [services, setServices] = useState([]);
  const [serviceId, setServiceId] = useState("");
  const [officerRole, setOfficerRole] = useState("");
  const [officerArea, setOfficerArea] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [formDetails, setFormDetails] = useState({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isSignedPdf, setIsSignedPdf] = useState(false);

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

  const handleReferenceNumberChange = (e) => {
    setReferenceNumber(e.target.value);
  };

  const handleViewPdf = (url) => {
    setPdfUrl(url);
    setIsSignedPdf(false);
    setPdfModalOpen(true);
  };

  const handleModalClose = () => {
    setPdfModalOpen(false);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
    setPdfBlob(null);
    setIsSignedPdf(false);
  };

  const handleSearch = async () => {
    if (!serviceId && !referenceNumber) {
      toast.error("Please select a service or enter a reference number.", {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setResponseMessage("");
      setShowTable(false);
      const response = await axiosInstance.get("/Officer/SearchApplication", {
        params: { ServiceId: serviceId, ReferenceNumber: referenceNumber },
      });
      if (response.data.status) {
        if (response.data.isAccessible) {
          setFormDetails(response.data.formDetailsToken);
          setShowTable(true);
          toast.success("Application found!", {
            position: "top-right",
            autoClose: 3000,
            theme: "colored",
          });
        } else setResponseMessage(response.data.message);
      } else {
        setResponseMessage(response.data.message);
      }
    } catch (error) {
      setError(error.message);
      toast.error(error.message, {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        p: { xs: 3, md: 5 },
        backgroundColor: "#f9fafb",
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
        {officerRole && officerArea
          ? `${officerRole} ${officerArea}`
          : "Search Applications"}
      </Typography>

      {loading && <Typography>Loading...</Typography>}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Container fluid>
        <Row className="mb-4 justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <ServiceSelectionForm
              services={services}
              errors={error ? { serviceId: error } : {}}
              onServiceSelect={setServiceId}
              sx={{
                "& .MuiFormControl-root": {
                  bgcolor: "#ffffff",
                  borderRadius: "8px",
                },
              }}
            />
          </Col>
        </Row>
        <Row className="mb-4 justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <TextField
              label="Reference Number"
              value={referenceNumber}
              onChange={handleReferenceNumberChange}
              fullWidth
              variant="outlined"
              sx={{
                bgcolor: "#ffffff",
                borderRadius: "8px",
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "#d1d5db",
                  },
                  "&:hover fieldset": {
                    borderColor: "#3b82f6",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#3b82f6",
                  },
                },
              }}
            />
          </Col>
        </Row>
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6} className="text-center">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn btn-primary"
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                borderRadius: "8px",
              }}
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </Col>
        </Row>
      </Container>

      {responseMessage != "" && (
        <Typography
          variant="h6"
          color="error"
          sx={{ padding: 5, boxShadow: 5, borderRadius: 5, mt: 5 }}
        >
          {responseMessage}
        </Typography>
      )}

      <Container fluid style={{ marginTop: 5 }}>
        {showTable && (
          <>
            <CollapsibleFormDetails
              applicationId={referenceNumber}
              detailsOpen={detailsOpen}
              formDetails={formDetails}
              setDetailsOpen={setDetailsOpen}
              onViewPdf={handleViewPdf}
            />
            <ServerSideTable
              url={"/Officer/GetApplicationHistory"}
              extraParams={{
                ApplicationId: referenceNumber,
              }}
              actionFunctions={{}}
              Title={"Application History"}
            />
          </>
        )}
        <BasicModal
          open={pdfModalOpen}
          handleClose={handleModalClose}
          handleActionButton={() => setConfirmOpen(true)}
          buttonText={null}
          Title={isSignedPdf ? "Signed Document" : "Document Preview"}
          pdf={pdfUrl}
          sx={{
            "& .MuiDialog-paper": {
              width: { xs: "90%", md: "80%" },
              maxWidth: "800px",
              height: "80vh",
              borderRadius: "12px",
            },
          }}
        />
      </Container>
    </Box>
  );
}
