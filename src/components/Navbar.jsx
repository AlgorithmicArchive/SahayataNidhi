import React, { useContext, useState, useEffect, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Paper,
  MenuList,
  MenuItem,
  Popper,
  Menu,
  CircularProgress,
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../UserContext";
import TokenTimer from "./TokenTimer";
import axiosInstance from "../axiosConfig";
import MenuIcon from "@mui/icons-material/Menu";
import { toast } from "react-toastify";

const MyNavbar = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [popperAnchor, setPopperAnchor] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    userType,
    setUserType,
    setToken,
    setUsername,
    setProfile,
    username,
    profile,
    designation,
    verified,
    setVerified,
    officerAuthorities,
    actualUserType, // NEW
  } = useContext(UserContext);

  /* -------------------------------------------------
     Toggle role (Officer ↔ Citizen)
  ------------------------------------------------- */
  const handleToggleRole = async () => {
    const isCurrentCitizen = userType === "Citizen";
    try {
      const res = await axiosInstance.get("/Base/RedirectToCitizen", {
        params: { username, isCitizen: isCurrentCitizen }, // true → Officer, false → Citizen
      });
      window.location.href = res.data.url;
    } catch (e) {
      toast.error("Role switch failed.");
    }
  };

  /* -------------------------------------------------
     Resize detection
  ------------------------------------------------- */
  useEffect(() => {
    const handle = () => setIsSmallScreen(window.innerWidth < 992);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  useEffect(() => {
    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, []);

  /* -------------------------------------------------
     Logout & navigation
  ------------------------------------------------- */
  const handleLogout = async () => {
    try {
      const r = await axiosInstance.post("/Home/LogOut");
      if (r.data.sso) window.location.href = r.data.logoutUrl;
    } catch { }
    setToken(null);
    setUserType(null);
    setUsername(null);
    setProfile(null);
    setVerified(false);
    sessionStorage.clear();
    closeAllMenus();
    navigate("/login");
  };

  const closeAllMenus = () => {
    setMobileMenuAnchor(null);
    setPopperAnchor(null);
    setOpenSubmenu(null);
    setHoveredKey(null);
  };

  const handleNavigate = async (path) => {
    if (path === "/login") {
      try {
        navigate("/login")
        // setLoginLoading(true);
        // const r = await fetch("/Home/InitiateSSO", { method: "POST" });
        // const d = await r.json();
        // if (d.redirectUrl) {
        //   setTimeout(() => (window.location.href = d.redirectUrl), 300);
        // } else {
        //   toast.error("Failed to start SSO.");
        //   setLoginLoading(false);
        // }
      } catch {
        toast.error("Login error.");
        setLoginLoading(false);
      }
    } else {
      navigate(path);
      closeAllMenus();
    }
  };

  const handleMobileMenuOpen = (e) => setMobileMenuAnchor(e.currentTarget);
  const handleMobileMenuClose = () => setMobileMenuAnchor(null);

  /* -------------------------------------------------
     Hover (desktop)
  ------------------------------------------------- */
  const handleMouseEnter = (key, el) => {
    if (!isSmallScreen) {
      clearTimeout(timeoutRef.current);
      setHoveredKey(key);
      setPopperAnchor(el);
    }
  };
  const handleMouseLeave = () => {
    if (!isSmallScreen) {
      timeoutRef.current = setTimeout(() => setHoveredKey(null), 200);
    }
  };
  const handleMenuMouseEnter = () => clearTimeout(timeoutRef.current);
  const handleMenuMouseLeave = () => handleMouseLeave();

  /* -------------------------------------------------
     Styles
  ------------------------------------------------- */
  const getActivePaths = (item) => {
    if (item.path) return [item.path];
    if (item.subItems) return item.subItems.map((s) => s.path).filter(Boolean);
    return [];
  };
  const getNavItemStyle = (item) => {
    const active = getActivePaths(item).includes(location.pathname);
    return {
      color: active ? "#FFF" : "#000",
      fontWeight: active ? 600 : "normal",
      padding: "5px 15px",
      transition: "all .3s ease",
      background: active
        ? "linear-gradient(to right, #10B582, #0D9588)"
        : "transparent",
      borderRadius: 2,
      "&:hover": {
        transform: active ? "scale(1.05)" : "none",
        color: !active ? "#0FB282" : undefined,
      },
      ...(item.isSpecial && {
        backgroundColor: "#E5620A",
        color: "#fff",
        "&:hover": { backgroundColor: "#DE6E08" },
        marginLeft: 2,
      }),
      display: "flex",
      alignItems: "center",
      gap: 0.5,
    };
  };
  const getMenuItemStyle = (path) => {
    const active = location.pathname === path;
    return {
      backgroundColor: active
        ? "linear-gradient(to right, #10B582, #0D9588)"
        : "transparent",
      color: active ? "#0D9588" : "#000",
      fontWeight: active ? 600 : "normal",
      "&:hover": {
        backgroundColor: active
          ? "linear-gradient(to right, #10B582, #0D9588)"
          : "#f0f0f0",
        color: active ? "#0D9588" : "#10B582",
      },
    };
  };

  /* -------------------------------------------------
     Dynamic menu config
  ------------------------------------------------- */
  const getMenuConfig = () => {
    const m = [];

    // ---- unauthenticated ----
    if (!userType && !verified) {
      m.push(
        { name: "Home", path: "/", key: "home" },
        { name: "Login", path: "/login", key: "login", isSpecial: true },
        {
          name: "Department Officer Register",
          path: "/officerRegistration",
          key: "officerRegistration",
          isSpecial: true,
        },
      );
    }

    // ---- Citizen ----
    if (userType === "Citizen" && verified) {
      m.push(
        { name: "Home", path: "/user/home", key: "citizen-home" },
        {
          name: "Apply for Service",
          path: "/user/services",
          key: "apply-service",
        },
        {
          name: "Application Status",
          key: "app-status",
          subItems: [
            { name: "Initiated Applications", path: "/user/initiated" },
            { name: "Incomplete Applications", path: "/user/incomplete" },
          ],
        },
      );
    }

    // ---- Officer ----
    if (userType === "Officer" && verified) {
      m.push(
        { name: "Home", path: "/officer/home", key: "officer-home" },
        { name: "Reports", path: "/officer/reports", key: "officer-reports" },
        {
          name: "DSC Management",
          key: "dsc-mgmt",
          subItems: [{ name: "Register DSC", path: "/officer/registerdsc" }],
        },
      );

      if (officerAuthorities?.canManageBankFiles) {
        m.push({
          name: "Bank Files",
          key: "bank-files",
          subItems: [
            { name: "Create Bank File", path: "/officer/bankFile" },
            {
              name: "Update Bank Response File",
              path: "/officer/responseFile",
            },
          ],
        });
      }

      const upd = [];
      if (officerAuthorities?.canCorrigendum)
        upd.push({ name: "Data Updation", path: "/officer/issuecorrigendum" });
      if (officerAuthorities?.canWithhold)
        upd.push({ name: "Withheld Application", path: "/officer/withheld" });
      if (officerAuthorities?.canValidateAadhaar)
        upd.push({
          name: "Validate Aadhaar",
          path: "/officer/validateaadhaar",
        });
      if (upd.length)
        m.push({
          name: "Applications Updations",
          key: "updations",
          subItems: upd,
        });

      m.push({
        name: "View Applications",
        key: "view-apps",
        subItems: [
          { name: "Aadhaar Validations", path: "/officer/aadhaarvalidations" },
          { name: "Search Application", path: "/officer/searchapplication" },
        ],
      });
    }

    // ---- Viewer, Admin, Designer (unchanged) ----
    if (userType === "Viewer" && verified) {
      m.push(
        { name: "Home", path: "/viewer/home", key: "viewer-home" },
        {
          name: "Aadhaar Validations",
          path: "/viewer/aadhaarvalidations",
          key: "viewer-aadhaar",
        },
      );
    }
    if (userType === "Admin" && verified) {
      m.push(
        { name: "Dashboard", path: "/admin/home", key: "admin-home" },
        { name: "Reports", path: "/admin/reports", key: "admin-reports" },
        {
          name: "Add",
          key: "admin-add",
          subItems: [
            { name: "Admin", path: "/admin/addadmin" },
            { name: "Designation", path: "/admin/addDesignations" },
            { name: "Offices Type", path: "/admin/addOffices" },
            { name: "Offices Details", path: "/admin/addOfficeDetails" },
            ...(designation === "System Admin"
              ? [{ name: "Department", path: "/admin/addDepartment" }]
              : []),
          ],
        },
        {
          name: "Validate Officers",
          path: "/admin/validateofficer",
          key: "admin-validate",
        },
        {
          name: "View Feedbacks",
          path: "/admin/viewFeedbacks",
          key: "admin-feedback",
        },
      );
    }
    if (userType === "Designer" && verified) {
      m.push(
        {
          name: "Dashboard",
          path: "/designer/dashboard",
          key: "designer-dashboard",
        },
        {
          name: "Dynamic Form",
          path: "/designer/dynamicform",
          key: "dynamic-form",
        },
        {
          name: "Create/Update",
          key: "designer-create",
          subItems: [
            { name: "Service", path: "/designer/createservice" },
            { name: "Workflow", path: "/designer/createworkflow" },
            { name: "Corrections/Corrigendum", path: "/designer/corrections" },
            { name: "Letter Pdf", path: "/designer/createletterpdf" },
            { name: "Web Service", path: "/designer/createwebservice" },
            { name: "Email", path: "/designer/emailsettings" },
            {
              name: "Submission Limitations",
              path: "/designer/submissionlimitations",
            },
          ],
        },
      );
    }
    return m;
  };
  const menuConfig = getMenuConfig();

  /* -------------------------------------------------
     Mobile menu – adds profile submenu with switch
  ------------------------------------------------- */
  const mobileMenuItems = React.useMemo(() => {
    if (!userType || !verified) return menuConfig;

    const profileSub = [{ name: "Settings", path: "/settings" }];

    // ---- show switch only for non-Citizen original role ----
    if (actualUserType !== "Citizen") {
      profileSub.push({
        name:
          userType === "Citizen" ? "Switch to Officer" : "Switch to Citizen",
        action: handleToggleRole,
      });
    }

    profileSub.push({ name: "Logout", action: handleLogout });

    return [
      ...menuConfig,
      { name: "Feedback", path: "/feedback", key: "feedback" },
      { name: "Profile", key: "profile", subItems: profileSub },
    ];
  }, [menuConfig, userType, verified, actualUserType]);

  /* -------------------------------------------------
     Render helpers
  ------------------------------------------------- */
  const renderDesktopItem = (item, idx) => {
    const isDrop = !!item.subItems;
    if (!isDrop) {
      const isLogin = item.path === "/login";
      return (
        <Button
          key={idx}
          component={isLogin ? "button" : Link}
          to={!isLogin ? item.path : undefined}
          sx={getNavItemStyle(item)}
          onClick={() => handleNavigate(item.path)}
          disabled={isLogin && loginLoading}
        >
          {isLogin && loginLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} sx={{ color: "#fff" }} />
              <span>Redirecting...</span>
            </Box>
          ) : (
            item.name
          )}
        </Button>
      );
    }

    return (
      <Box
        key={idx}
        sx={{ position: "relative" }}
        onMouseEnter={(e) => handleMouseEnter(item.key, e.currentTarget)}
        onMouseLeave={handleMouseLeave}
      >
        <Button sx={getNavItemStyle(item)}>
          {item.name}
          <Box component="span" sx={{ fontSize: 12 }}>
            ▼
          </Box>
        </Button>

        <Popper
          open={hoveredKey === item.key}
          anchorEl={popperAnchor}
          placement="bottom-start"
          disablePortal={false}
        >
          <Paper
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            <MenuList>
              {item.subItems.map((sub, i) => (
                <MenuItem
                  key={i}
                  sx={getMenuItemStyle(sub.path)}
                  onClick={() => handleNavigate(sub.path)}
                >
                  {sub.name}
                </MenuItem>
              ))}
            </MenuList>
          </Paper>
        </Popper>
      </Box>
    );
  };

  const renderMobileItem = (item, idx) => {
    const isDrop = !!item.subItems;
    const open = openSubmenu === item.key;

    if (!isDrop) {
      return (
        <MenuItem
          key={idx}
          onClick={() => handleNavigate(item.path)}
          sx={getMenuItemStyle(item.path)}
        >
          {item.path === "/login" && loginLoading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} />
              <span>Redirecting...</span>
            </Box>
          ) : (
            item.name
          )}
        </MenuItem>
      );
    }

    return (
      <React.Fragment key={idx}>
        <MenuItem
          onClick={() => setOpenSubmenu(open ? null : item.key)}
          sx={{
            fontWeight: 600,
            justifyContent: "space-between",
            "&:hover": { backgroundColor: "#f0f0f0", color: "#10B582" },
          }}
        >
          {item.name} <Box>{open ? "−" : "→"}</Box>
        </MenuItem>
        {open &&
          item.subItems.map((sub, i) => (
            <MenuItem
              key={i}
              sx={{ pl: 4, ...getMenuItemStyle(sub.path) }}
              onClick={() =>
                sub.action ? sub.action() : handleNavigate(sub.path)
              }
            >
              {sub.name}
            </MenuItem>
          ))}
      </React.Fragment>
    );
  };

  /* -------------------------------------------------
     JSX
  ------------------------------------------------- */
  return (
    <AppBar position="static" sx={{ backgroundColor: "#fff" }}>
      <Toolbar>
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
          <img
            src="/assets/images/logo.png"
            alt="Logo"
            style={{
              height: 50,
              width: 50,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
          <Box sx={{ ml: 2 }}>
            <Typography variant="h6" sx={{ color: "#333", fontWeight: "bold" }}>
              ISSS Pension
            </Typography>
            <Typography variant="body2" sx={{ color: "#666" }}>
              Social Welfare Department
            </Typography>
          </Box>
        </Box>

        {/* Mobile hamburger */}
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleMobileMenuOpen}
          sx={{ display: { xs: "block", md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Desktop menu */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 1,
            backgroundColor: "#F3F4F6",
            borderRadius: 5,
            p: 1,
          }}
        >
          {menuConfig.map(renderDesktopItem)}

          {userType && verified && (
            <Button
              component={Link}
              to="/feedback"
              sx={getNavItemStyle({ key: "feedback", path: "/feedback" })}
              onClick={() => handleNavigate("/feedback")}
            >
              Feedback
            </Button>
          )}

          {/* Profile (desktop) */}
          {userType && verified && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: 2 }}>
              <Typography sx={{ color: "#333", fontWeight: "bold" }}>
                {username}
              </Typography>
              <TokenTimer />
              <Box
                onMouseEnter={(e) =>
                  handleMouseEnter("profile", e.currentTarget)
                }
                onMouseLeave={handleMouseLeave}
                sx={{ position: "relative" }}
              >
                <IconButton sx={{ p: 0 }}>
                  <img
                    src={`/Base/DisplayFile?fileName=${profile}`}
                    alt="Profile"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                    onError={(e) =>
                      (e.currentTarget.src = "/assets/images/profile.jpg")
                    }
                  />
                </IconButton>

                <Popper
                  open={hoveredKey === "profile"}
                  anchorEl={popperAnchor}
                  placement="bottom-end"
                  disablePortal={false}
                >
                  <Paper
                    onMouseEnter={handleMenuMouseEnter}
                    onMouseLeave={handleMenuMouseLeave}
                  >
                    <MenuItem onClick={() => navigate('/settings')}>
                      Settings
                    </MenuItem>
                    <MenuList>
                      {/* SWITCH – only for non-Citizen original role */}
                      {actualUserType !== "Citizen" && (
                        <MenuItem onClick={handleToggleRole}>
                          {userType === "Citizen"
                            ? "Switch to Officer"
                            : "Switch to Citizen"}
                        </MenuItem>
                      )}
                      <MenuItem onClick={handleLogout}>Logout</MenuItem>
                    </MenuList>
                  </Paper>
                </Popper>
              </Box>
            </Box>
          )}
        </Box>

        {/* Mobile menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor) && isSmallScreen}
          onClose={handleMobileMenuClose}
        >
          {mobileMenuItems.map(renderMobileItem)}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default MyNavbar;
