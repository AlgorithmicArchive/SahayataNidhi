import React, { useState, useContext } from "react";
import { Box, Typography, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import ServerSideTable from "../../components/ServerSideTable";
import LoadingSpinner from "../../components/LoadingSpinner";
import { fetchData, SetServiceId } from "../../assets/fetch";
import axiosInstance from "../../axiosConfig";
import { UserContext } from "../../UserContext";

const MainContainer = styled(Box)`
  min-height: 100vh;
  background: linear-gradient(to bottom right, #f4f9ff 0%, #f9f3ec 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem; /* Reduced padding for smaller screens */
  box-sizing: border-box;
  width: 100%;

  @media (max-width: 600px) {
    padding: 1rem 0.5rem;
  }
`;

const TableCard = styled(Box)`
  background: #ffffff;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  width: 95%; /* Use percentage for responsiveness */
  max-width: 1200px; /* Limit max width for larger screens */
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 600px) {
    padding: 1rem;
    border-radius: 12px;
  }
`;

export default function Services() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { userId } = useContext(UserContext);

  const checkSubmissionLimit = async (serviceId) => {
    setError("");
    try {
      if (!userId) {
        setError("User not authenticated. Please log in.");
        return false;
      }

      const response = await axiosInstance.get("/User/CheckSubmissionLimit", {
        params: { userId, serviceId },
      });

      if (response.data.status) {
        if (!response.data.canSubmit) {
          const { limitType, limitCount } = response.data;
          setError(
            `Submission limit exceeded for this service. You can submit ${limitCount} time${
              limitCount === 1 ? "" : "s"
            } ${limitType}.`,
          );
        }
        return response.data.canSubmit;
      } else {
        setError(response.data.message || "Failed to check submission limit.");
        return false;
      }
    } catch (error) {
      console.error("Error checking submission limit:", error);
      setError("An error occurred while checking submission limits.");
      return false;
    }
  };

  const actionFunctions = {
    OpenForm: async (row) => {
      const userdata = row.original;
      const canProceed = await checkSubmissionLimit(userdata.serviceId);
      console.log("Can proceed:", canProceed);
      if (canProceed) {
        navigate("/user/form", { state: { ServiceId: userdata.serviceId } });
      }
    },
  };

  if (loading) {
    return (
      <MainContainer>
        <LoadingSpinner />
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <ServerSideTable
        url="User/GetServices"
        extraParams={{}}
        actionFunctions={actionFunctions}
        Title={"Available Services"}
      />
    </MainContainer>
  );
}
