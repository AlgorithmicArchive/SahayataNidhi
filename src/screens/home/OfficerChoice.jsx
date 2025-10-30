// OfficerChoice.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";

export default function OfficerChoice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [ssoObj, setSsoObj] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("sso");
    if (!raw) {
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(raw));
      setSsoObj(parsed);
    } catch (e) {
      console.error("Failed to parse SSO payload", e);
    } finally {
      setLoading(false);
    }
  }, [location.search]);

  const goToVerification = async (newUserType) => {
    if (!ssoObj) return;

    try {
      const response = await fetch("/Home/GetJWTToken");
      if (!response.ok) throw new Error("Failed to fetch token");
      const { token } = await response.json(); // Now correct

      const modified = {
        ...ssoObj,
        UserType: newUserType,
        Token: token, // Optional: update token with new role
      };
      const encoded = JSON.stringify(modified);
      navigate(`/verification?sso=${encoded}`);
    } catch (err) {
      console.error("Error in goToVerification:", err);
      alert("Failed to proceed. Please try again.");
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 8,
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading…</Typography>
      </Box>
    );
  }

  if (!ssoObj) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
        <Typography color="error">
          Invalid or missing SSO data. Please try logging in again.
        </Typography>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="sm"
      sx={{
        mt: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        height: "90vh",
      }}
    >
      <Typography variant="h5" component="h1" fontWeight="bold">
        Choose Login Role
      </Typography>

      <Typography variant="body1" align="center">
        You are authenticated as <strong>{ssoObj.Username}</strong>.<br />
        Please select how you want to proceed:
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mt: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => goToVerification("Officer")}
          sx={{ flex: 1, minWidth: 160 }}
        >
          Login as Officer
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={() => goToVerification("Citizen")}
          sx={{ flex: 1, minWidth: 160 }}
        >
          Login as Citizen
        </Button>
      </Box>
    </Container>
  );
}
