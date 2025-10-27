// App.jsx
import React, { useContext, useEffect, useState } from "react";
import { BrowserRouter as Router, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box } from "@mui/material";
import { GovSoftTheme } from "./themes/TwilightBlossom";
import RoutesComponent from "./components/RoutesComponent";
import Header from "./components/Header";
import { UserProvider, UserContext } from "./UserContext";
import ScrollToTop from "./components/ScrollToTop";
import Footer from "./components/Footer";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

const App = () => {
  return (
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
};

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
  } = useContext(UserContext);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const navigate = useNavigate();

  // === SSO REDIRECT HANDLER ===
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoParam = params.get("sso");

    if (ssoParam) {
      try {
        const data = JSON.parse(decodeURIComponent(ssoParam));
        if (data.status) {
          setToken(data.token);
          setUserType(data.userType);
          setUsername(data.username);
          setUserId(data.userId);
          setDesignation(data.designation || "");
          if (data.department) setDepartment(data.department);
          setProfile("/assets/images/profile.jpg"); // default
          setVerified(true); // JanParichay users are verified

          // Clean URL
          window.history.replaceState({}, document.title, "/");

          toast.success("Logged in with JanParichay!");
          navigate("/verification");
        }
      } catch (err) {
        console.error("SSO parse error:", err);
        toast.error("SSO login failed.");
      }
    }
  }, [
    navigate,
    setToken,
    setUserType,
    setUsername,
    setUserId,
    setDesignation,
    setDepartment,
  ]);

  // === TOKEN EXPIRY CHECK ===
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const exp = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = exp - now;

        if (timeUntilExpiry <= 0) {
          logoutAll();
        } else {
          setTokenExpiry(exp);
          const timeout = setTimeout(logoutAll, timeUntilExpiry);
          return () => clearTimeout(timeout);
        }
      } catch (err) {
        logoutAll();
      }
    } else {
      setTokenExpiry(null);
    }
  }, [token]);

  const logoutAll = () => {
    setToken(null);
    setUserType(null);
    setUsername(null);
    setProfile(null);
    setVerified(false);
    setDesignation(null);
    setDepartment(null);
    setUserId(null);
    setTokenExpiry(null);
    sessionStorage.clear();
    toast.error("Session expired. Please log in again.");
    navigate("/login");
  };

  // === INITIAL LOAD + TOKEN VALIDATION ===
  useEffect(() => {
    const isInitialLoadStored = sessionStorage.getItem("initialLoad") === null;

    if (isInitialLoadStored && token) {
      const validateToken = async () => {
        try {
          const result = await fetch("/Home/ValidateToken");
          if (result.ok) {
            const data = await result.json();
            if (data.status) {
              if (!verified) {
                navigate("/verification");
              } else {
                redirectByUserType();
              }
            }
          }
        } catch (err) {
          console.error("Token validation failed:", err);
        } finally {
          sessionStorage.setItem("initialLoad", "false");
          setIsInitialLoad(false);
        }
      };

      validateToken();
    } else {
      sessionStorage.setItem("initialLoad", "false");
      setIsInitialLoad(false);
    }
  }, [token, userType, verified, navigate]);

  const redirectByUserType = () => {
    if (userType === "Citizen") navigate("/user/home");
    else if (userType === "Officer") navigate("/officer/home");
    else if (userType === "Admin") navigate("/admin/home");
    else if (userType === "Designer") navigate("/designer/dashboard");
    else if (userType === "Viewer") navigate("/viewer/home");
  };

  return (
    <Box sx={{ width: "100%" }}>
      <RoutesComponent />
      <ToastContainer />
    </Box>
  );
};

export default App;
