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
    setTokenExpiry,
  } = useContext(UserContext);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const navigate = useNavigate();

  // Proactive token expiration check and timer setup
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const exp = decoded.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = exp - now;

        if (timeUntilExpiry <= 0) {
          // Token already expired
          setToken(null);
          setUserType(null);
          setUsername(null);
          setProfile(null);
          setVerified(false);
          setDesignation(null);
          setTokenExpiry(null);
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("userType");
          sessionStorage.removeItem("username");
          sessionStorage.removeItem("profile");
          sessionStorage.removeItem("verified");
          sessionStorage.removeItem("designation");
          toast.error("Session expired. Please log in again.");
          navigate("/login");
        } else {
          // Update token expiry in UserContext for timer display
          setTokenExpiry(exp);

          // Set timeout to log out when token expires
          const timeout = setTimeout(() => {
            setToken(null);
            setUserType(null);
            setUsername(null);
            setProfile(null);
            setVerified(false);
            setDesignation(null);
            setTokenExpiry(null);
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("userType");
            sessionStorage.removeItem("username");
            sessionStorage.removeItem("profile");
            sessionStorage.removeItem("verified");
            sessionStorage.removeItem("designation");
            toast.error("Session expired. Please log in again.");
            navigate("/login");
          }, timeUntilExpiry);

          // Cleanup timeout on unmount or token change
          return () => clearTimeout(timeout);
        }
      } catch (err) {
        console.error("Token decode error:", err);
        setToken(null);
        setUserType(null);
        setUsername(null);
        setProfile(null);
        setVerified(false);
        setDesignation(null);
        setTokenExpiry(null);
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("userType");
        sessionStorage.removeItem("username");
        sessionStorage.removeItem("profile");
        sessionStorage.removeItem("verified");
        sessionStorage.removeItem("designation");
        toast.error("Invalid token. Please log in again.");
        navigate("/login");
      }
    } else {
      setTokenExpiry(null);
    }
  }, [
    token,
    navigate,
    setToken,
    setUserType,
    setUsername,
    setProfile,
    setVerified,
    setDesignation,
    setTokenExpiry,
  ]);

  // Initial load token validation
  useEffect(() => {
    const isInitialLoadStored = sessionStorage.getItem("initialLoad") === null;

    if (isInitialLoadStored && token) {
      const validateToken = async () => {
        try {
          const result = await fetch("/Home/ValidateToken");
          if (result.status) {
            if (!verified) {
              navigate("/Verification");
            } else if (verified) {
              if (userType === "Citizen") {
                navigate("/user/home");
              } else if (userType === "Officer") {
                navigate("/officer/home");
              } else if (userType === "Admin") {
                navigate("/admin/home");
              } else if (userType === "Designer") {
                navigate("/designer/dashboard");
              } else if (userType == "Viewer") {
                navigate("/viewer/home");
              }
            }
          }
        } catch (err) {
          // Errors (including 401) are handled by apiFetch
        } finally {
          sessionStorage.setItem("initialLoad", "false");
          setIsInitialLoad(false);
        }
      };

      validateToken();
    } else {
      sessionStorage.setItem("initialLoad", "false");
      setIsInitialLoad(false);
      // if (!token) {
      //   navigate("/login");
      // }
    }
  }, [
    token,
    userType,
    verified,
    navigate,
    setToken,
    setUserType,
    setUsername,
    setProfile,
    setVerified,
    setDesignation,
  ]);

  return (
    <Box sx={{ width: "100%" }}>
      <RoutesComponent />
      <ToastContainer />
    </Box>
  );
};

export default App;
