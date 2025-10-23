import { Box, Tab, Tabs } from "@mui/material";
import React, { useState } from "react";
import { Container } from "react-bootstrap";
import ServerSideTable from "../../components/ServerSideTable";
import axiosInstance from "../../axiosConfig";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState(0); // 0 for Services, 1 for Web Services
  const [servicesRefreshTrigger, setServicesRefreshTrigger] = useState(0);
  const [webServicesRefreshTrigger, setWebServicesRefreshTrigger] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const actionFunctions = {
    ToggleServiceActivation: async (row) => {
      const userdata = row.original;
      const serviceId = userdata.serviceId;
      const isActive = !userdata.isActive;
      try {
        const formdata = new FormData();
        formdata.append("serviceId", serviceId);
        formdata.append("active", isActive);
        const response = await axiosInstance.post(
          "/Designer/ToggleServiceActive",
          formdata,
        );

        if (response.data.status) {
          toast.success(
            response.data.message ||
              `Service ${isActive ? "activated" : "deactivated"} successfully`,
          );
          setServicesRefreshTrigger((r) => r + 1);
        } else {
          toast.error(response.data.message || "Something went wrong");
        }

        return response.data;
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Failed to toggle service activation",
        );
        console.error("ToggleServiceActivation error:", error);
        throw error;
      }
    },
    ToggleServiceActiveForOfficers: async (row) => {
      const userdata = row.original;
      const serviceId = userdata.serviceId;
      const isActiveForOfficers = !userdata.isActiveForOfficers;
      try {
        const formdata = new FormData();
        formdata.append("serviceId", serviceId);
        formdata.append("activeForOfficers", isActiveForOfficers);
        const response = await axiosInstance.post(
          "/Designer/ToggleServiceActiveForOfficers",
          formdata,
        );

        if (response.data.status) {
          toast.success(
            response.data.message ||
              `Service ${
                isActiveForOfficers
                  ? "activated for officers"
                  : "deactivated for officers"
              } successfully`,
          );
          setServicesRefreshTrigger((r) => r + 1);
        } else {
          toast.error(response.data.message || "Something went wrong");
        }

        return response.data;
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Failed to toggle service activation for officers",
        );
        console.error("ToggleServiceActiveForOfficers error:", error);
        throw error;
      }
    },
    ToggleWebServiceActivation: async (row) => {
      const userdata = row.original;
      const webserviceId = userdata.webserviceId;
      const isActive = !userdata.isActive;
      try {
        const formdata = new FormData();
        formdata.append("webserviceId", webserviceId);
        formdata.append("active", isActive);
        const response = await axiosInstance.post(
          "/Designer/ToggleWebServiceActive",
          formdata,
        );

        if (response.data.status) {
          toast.success(
            response.data.message ||
              `Web Service ${
                isActive ? "activated" : "deactivated"
              } successfully`,
          );
          setWebServicesRefreshTrigger((r) => r + 1);
        } else {
          toast.error(response.data.message || "Something went wrong");
        }

        return response.data;
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Failed to toggle web service activation",
        );
        console.error("ToggleWebServiceActivation error:", error);
        throw error;
      }
    },
  };

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.100",
        py: 4,
      }}
    >
      <Container>
        <Box sx={{ mb: 3, bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            centered
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: "bold",
                fontSize: "1rem",
                color: "grey.600",
              },
              "& .Mui-selected": {
                color: "primary.main",
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "primary.main",
              },
            }}
          >
            <Tab label="Services" />
            <Tab label="Web Services" />
          </Tabs>
        </Box>
        {activeTab === 0 && (
          <ServerSideTable
            key={`services-${servicesRefreshTrigger}`} // for services tab
            url={"/Designer/GetServicesDashboard"}
            extraParams={{}}
            actionFunctions={actionFunctions}
            Title={"Services"}
          />
        )}
        {activeTab === 1 && (
          <ServerSideTable
            key={`webservices-${webServicesRefreshTrigger}`} // for web services tab
            url={"/Designer/GetWebServicesDashboard"}
            extraParams={{}}
            actionFunctions={actionFunctions}
            Title={"Web Services"}
          />
        )}
        <ToastContainer position="top-right" autoClose={3000} />
      </Container>
    </Box>
  );
}
