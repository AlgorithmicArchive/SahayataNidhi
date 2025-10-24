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
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../UserContext";
import TokenTimer from "./TokenTimer";
import axiosInstance from "../axiosConfig";
import MenuIcon from "@mui/icons-material/Menu";

const MyNavbar = () => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [popperAnchor, setPopperAnchor] = useState(null);
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
  } = useContext(UserContext);

  /* ------------------ Resize detection ------------------ */
  useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 992);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, []);

  /* ------------------ Logout & navigation ------------------ */
  const handleLogout = async () => {
    await axiosInstance.get("/Home/LogOut");
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

  const handleNavigate = (path) => {
    navigate(path);
    closeAllMenus();
  };

  const handleMobileMenuOpen = (e) => setMobileMenuAnchor(e.currentTarget);
  const handleMobileMenuClose = () => setMobileMenuAnchor(null);

  /* ------------------ Hover handling (desktop) ------------------ */
  const handleMouseEnter = (key, anchorEl) => {
    if (!isSmallScreen) {
      clearTimeout(timeoutRef.current);
      setHoveredKey(key);
      setPopperAnchor(anchorEl);
    }
  };

  const handleMouseLeave = () => {
    if (!isSmallScreen) {
      timeoutRef.current = setTimeout(() => setHoveredKey(null), 200);
    }
  };

  const handleMenuMouseEnter = () => clearTimeout(timeoutRef.current);
  const handleMenuMouseLeave = () => handleMouseLeave();

  /* ------------------ Style helpers ------------------ */
  const getActivePaths = (item) => {
    if (item.path) return [item.path];
    if (item.subItems) return item.subItems.map((s) => s.path).filter(Boolean);
    return [];
  };

  const getNavItemStyle = (item) => {
    const activePaths = getActivePaths(item);
    const isActive = activePaths.includes(location.pathname);

    return {
      color: isActive ? "#FFF" : "#000", // changed from white to green
      fontWeight: isActive ? 600 : "normal",
      padding: "5px 15px",
      transition: "all 0.3s ease",
      background: isActive
        ? "linear-gradient(to right, #10B582, #0D9588)" // lighter background for better contrast
        : "transparent",
      borderRadius: 2,
      "&:hover": {
        transform: isActive ? "scale(1.05)" : "none",
        color: !isActive ? "#0FB282" : undefined,
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
    const isActive = location.pathname === path;
    return {
      backgroundColor: isActive
        ? "linear-gradient(to right, #10B582, #0D9588)"
        : "transparent",
      color: isActive ? "#0D9588" : "#000",
      fontWeight: isActive ? 600 : "normal",
      "&:hover": {
        backgroundColor: isActive
          ? "linear-gradient(to right, #10B582, #0D9588)"
          : "#f0f0f0",
        color: isActive ? "#0D9588" : "#10B582",
      },
    };
  };

  /* ------------------ Dynamic menu config ------------------ */
  const getMenuConfig = () => {
    const menu = [];

    // ---------------------------
    // Unauthenticated users
    // ---------------------------
    if (!userType && !verified) {
      menu.push(
        { name: "Home", path: "/", key: "home" },
        { name: "Login", path: "/login", key: "login" },
        {
          name: "Register",
          path: "/register",
          key: "register",
          isSpecial: true,
        },
      );
    }

    // ---------------------------
    // Citizen
    // ---------------------------
    if (userType === "Citizen" && verified) {
      menu.push(
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

    // ---------------------------
    // Officer
    // ---------------------------
    if (userType === "Officer" && verified) {
      menu.push(
        { name: "Home", path: "/officer/home", key: "officer-home" },
        { name: "Reports", path: "/officer/reports", key: "officer-reports" },
        {
          name: "DSC Management",
          key: "dsc-mgmt",
          subItems: [{ name: "Register DSC", path: "/officer/registerdsc" }],
        },
      );

      if (officerAuthorities?.canManageBankFiles) {
        menu.push({
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

      const updations = [];
      if (officerAuthorities?.canCorrigendum) {
        updations.push({
          name: "Data Updation",
          path: "/officer/issuecorrigendum",
        });
      }
      if (officerAuthorities?.canWithhold) {
        updations.push({
          name: "Withheld Application",
          path: "/officer/withheld",
        });
      }
      if (officerAuthorities?.canValidateAadhaar) {
        updations.push({
          name: "Validate Aadhaar",
          path: "/officer/validateaadhaar",
        });
      }
      if (updations.length) {
        menu.push({
          name: "Applications Updations",
          key: "updations",
          subItems: updations,
        });
      }

      menu.push({
        name: "View Applications",
        key: "view-apps",
        subItems: [
          { name: "Aadhaar Validations", path: "/officer/aadhaarvalidations" },
          { name: "Search Application", path: "/officer/searchapplication" },
        ],
      });
    }

    // ---------------------------
    // Viewer
    // ---------------------------
    if (userType === "Viewer" && verified) {
      menu.push(
        { name: "Home", path: "/viewer/home", key: "viewer-home" },
        {
          name: "Aadhaar Validations",
          path: "/viewer/aadhaarvalidations",
          key: "viewer-aadhaar",
        },
      );
    }

    // ---------------------------
    // Admin
    // ---------------------------
    if (userType === "Admin" && verified) {
      menu.push(
        { name: "Dashboard", path: "/admin/home", key: "admin-home" },
        { name: "Reports", path: "/admin/reports", key: "admin-reports" },
        {
          name: "Add",
          key: "admin-add",
          subItems: [
            { name: "Admin", path: "/admin/addadmin" },
            { name: "Designation", path: "/admin/addDesignations" },
            { name: "Offices", path: "/admin/addOffices" },
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

    // ---------------------------
    // Designer
    // ---------------------------
    if (userType === "Designer" && verified) {
      menu.push(
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

    return menu;
  };

  const menuConfig = getMenuConfig();

  const mobileMenuItems = React.useMemo(() => {
    if (!userType || !verified) return menuConfig;
    return [
      ...menuConfig,
      { name: "Feedback", path: "/feedback", key: "feedback" },
      {
        name: "Profile",
        key: "profile",
        subItems: [
          { name: "Settings", path: "/settings" },
          { name: "Logout", action: handleLogout },
        ],
      },
    ];
  }, [menuConfig, userType, verified]);

  /* ------------------ Desktop render helper using Popper ------------------ */
  const renderDesktopItem = (item, idx) => {
    const isDropdown = !!item.subItems;

    if (!isDropdown) {
      return (
        <Button
          key={idx}
          component={Link}
          to={item.path}
          sx={getNavItemStyle(item)}
          onClick={() => handleNavigate(item.path)}
        >
          {item.name}
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

  /* ------------------ Mobile render helper ------------------ */
  const renderMobileItem = (item, idx) => {
    const isDropdown = !!item.subItems;
    const isOpen = openSubmenu === item.key;

    if (!isDropdown) {
      return (
        <MenuItem
          key={idx}
          onClick={() => handleNavigate(item.path)}
          sx={getMenuItemStyle(item.path)}
        >
          {item.name}
        </MenuItem>
      );
    }

    return (
      <React.Fragment key={idx}>
        <MenuItem
          onClick={() => setOpenSubmenu(isOpen ? null : item.key)}
          sx={{
            fontWeight: 600,
            justifyContent: "space-between",
            "&:hover": { backgroundColor: "#f0f0f0", color: "#10B582" },
          }}
        >
          {item.name} <Box>{isOpen ? "−" : "→"}</Box>
        </MenuItem>

        {isOpen &&
          item.subItems.map((sub, i) => (
            <MenuItem
              key={i}
              sx={{ pl: 4, ...getMenuItemStyle(sub.path) }}
              onClick={() => {
                if (sub.action) sub.action();
                else handleNavigate(sub.path);
              }}
            >
              {sub.name}
            </MenuItem>
          ))}
      </React.Fragment>
    );
  };

  /* ------------------ JSX ------------------ */
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
          {/* Main nav items */}
          {menuConfig.map(renderDesktopItem)}

          {/* Feedback button */}
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

          {/* User info + TokenTimer + Profile dropdown */}
          {userType && verified && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: 2 }}>
              <Typography sx={{ color: "#333", fontWeight: "bold" }}>
                {username}
              </Typography>
              <TokenTimer />

              {/* Profile dropdown */}
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
                    onError={(e) => {
                      e.currentTarget.src = "/assets/images/profile.jpg";
                    }}
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
                    <MenuList>
                      <MenuItem
                        sx={getMenuItemStyle("/settings")}
                        onClick={() => handleNavigate("/settings")}
                      >
                        Settings
                      </MenuItem>
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
