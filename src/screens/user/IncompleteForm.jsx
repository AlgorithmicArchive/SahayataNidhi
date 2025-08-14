import { Box } from "@mui/material";
import React, { useEffect, useState } from "react";
import DynamicScrollableForm from "../../components/form/DynamicScrollableForm";
import { useLocation } from "react-router-dom";
import axiosInstance from "../../axiosConfig";

export default function IncompleteForm() {
  const location = useLocation();
  const [formData, setFormData] = useState({});
  const { ServiceId, referenceNumber } = location.state || {};
  useEffect(() => {
    async function FetchFormDetails() {
      const response = await axiosInstance.get("/User/GetFormFields", {
        params: { referenceNumber },
      });
      const result = response.data;
      setFormData(result.formDetails);
    }
    FetchFormDetails();
  }, []);
  return (
    <Box
      sx={{
        minHeight: { xs: "120vh", lg: "90vh" }, // Use min-height to ensure at least full viewport height
        display: { xs: "flex" },
        justifyContent: { xs: "center" }, // Center content vertically
        alignItems: { xs: "center", lg: "start" }, // Center content horizontally
        boxSizing: "border-box",
        paddingBottom: 5,
      }}
    >
      <DynamicScrollableForm mode="incomplete" data={formData} />
    </Box>
  );
}
