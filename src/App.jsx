import React, { useContext, useEffect, useState } from "react";
import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, CircularProgress, Typography } from "@mui/material";
import { GovSoftTheme } from "./themes/TwilightBlossom";
import RoutesComponent from "./components/RoutesComponent";
import Header from "./components/Header";
import { UserProvider, UserContext } from "./UserContext";
import ScrollToTop from "./components/ScrollToTop";
import Footer from "./components/Footer";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

const App = () => (
  <ThemeProvider theme={GovSoftTheme}>
    <UserProvider>
      <CssBaseline />
      <Router>
        <ScrollToTop />
        <Header />
        <MainContent />
        <Footer />
      </Router>
    </UserProvider>
  </ThemeProvider>
);

const MainContent = () => {
  const {
    token,
    userType,
    verified,
    setToken,
    setUserType,
    setUsername,
    setProfile,
    setVerified,
    setDesignation,
    setDepartment,
    setUserId,
    setTokenExpiry,
    setActualUserType, // NEW
  } = useContext(UserContext);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [ssoLoading, setSsoLoading] = useState(false);
  const navigate = useNavigate();

  /* -------------------------------------------------
     1. SSO ?sso= handling
  ------------------------------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoParam = params.get("sso");

    if (ssoParam) {
      setSsoLoading(true);
      try {
        const data = JSON.parse(decodeURIComponent(ssoParam));

        if (data.status && data.token && data.userType) {
          // ---- persist ----
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data));

          // ---- context ----
          setToken(data.token);
          const viewType = data.userType === "user" ? "Citizen" : data.userType;
          setUserType(viewType);

          // ---- actual (original) role ----
          const original = data.actualUserType || data.userType; // backend may send it
          setActualUserType(original);
          sessionStorage.setItem("actualUserType", original); // keep across toggles

          setUsername(data.username);
          setUserId(data.userId);
          setDesignation(data.designation || "");
          if (data.department) setDepartment(data.department);
          setProfile(data.profile || "/assets/images/profile.jpg");
          setVerified(true);

          toast.success("Logged in with JanParichay!");
        } else {
          throw new Error("Invalid SSO payload");
        }
      } catch (err) {
        console.error("SSO parse error:", err);
        toast.error("SSO login failed.");
        setSsoLoading(false);
      }
    } else {
      setSsoLoading(false);
    }
  }, []);

  /* -------------------------------------------------
     2. Redirect after SSO context is ready
  ------------------------------------------------- */
  useEffect(() => {
    if (userType && ssoLoading) {
      window.history.replaceState({}, document.title, "/");
      redirectByUserType();
      setSsoLoading(false);
    }
  }, [userType, ssoLoading]);

  /* -------------------------------------------------
     3. Token expiry handling
  ------------------------------------------------- */
  useEffect(() => {
    if (token) {
      try {
        const { exp } = jwtDecode(token);
        const expMs = exp * 1000;
        const now = Date.now();
        const until = expMs - now;

        if (until <= 0) {
          logoutAll();
        } else {
          setTokenExpiry(expMs);
          const t = setTimeout(logoutAll, until);
          return () => clearTimeout(t);
        }
      } catch {
        logoutAll();
      }
    } else {
      setTokenExpiry(null);
    }
  }, [token]);

  /* -------------------------------------------------
     4. Initial load – validate persisted token
  ------------------------------------------------- */
  useEffect(() => {
    const first = sessionStorage.getItem("initialLoad") === null;
    if (first && token && !ssoLoading) {
      (async () => {
        try {
          const r = await fetch("/Home/ValidateJWTToken");
          if (r.ok) {
            const d = await r.json();
            if (d.status) {
              if (!verified) navigate("/verification");
              else redirectByUserType();
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          sessionStorage.setItem("initialLoad", "false");
          setIsInitialLoad(false);
        }
      })();
    } else {
      sessionStorage.setItem("initialLoad", "false");
      setIsInitialLoad(false);
    }
  }, [token, userType, verified, navigate, ssoLoading]);

  /* -------------------------------------------------
     Helpers
  ------------------------------------------------- */
  const logoutAll = () => {
    setToken(null);
    setUserType(null);
    setActualUserType(null);
    setUsername(null);
    setProfile(null);
    setVerified(false);
    setDesignation(null);
    setDepartment(null);
    setUserId(null);
    setTokenExpiry(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    toast.error("Session expired. Please log in again.");
    navigate("/login");
  };

  const redirectByUserType = () => {
    if (userType === "Citizen" || userType === "user") navigate("/user/home");
    else if (userType === "Officer") navigate("/officer/home");
    else if (userType === "Admin") navigate("/admin/home");
    else if (userType === "Designer") navigate("/designer/dashboard");
    else if (userType === "Viewer") navigate("/viewer/home");
    else navigate("/user/home");
  };

  /* -------------------------------------------------
     Render
  ------------------------------------------------- */
  if (ssoLoading) {
    return (
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          e: 2,
        }}
      >
        <CircularProgress sx={{ color: "primary.main" }} />
        <Typography variant="body1" color="text.primary">
          Completing JanParichay login...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <RoutesComponent />
      <ToastContainer />
    </Box>
  );
};

export default App;
