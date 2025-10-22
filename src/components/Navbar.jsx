import React, { useContext, useState, useEffect, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Box,
} from "@mui/material";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../UserContext";
import TokenTimer from "./TokenTimer";
import axiosInstance from "../axiosConfig";
import MenuIcon from "@mui/icons-material/Menu";

const MyNavbar = () => {
  const [expanded, setExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
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

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 992);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    await axiosInstance.get("/Home/LogOut");
    setToken(null);
    setUserType(null);
    setUsername(null);
    setProfile(null);
    setVerified(false);
    sessionStorage.clear();
    setExpanded(false);
    navigate("/login");
  };

  const handleNavigate = (path) => {
    navigate(path);
    setExpanded(false);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setExpanded(true);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setExpanded(false);
  };

  const handleMouseEnter = (itemName) => {
    if (!isSmallScreen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setHoveredItem(itemName);
    }
  };

  const handleMouseLeave = () => {
    if (!isSmallScreen) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setHoveredItem(null);
      }, 200);
    }
  };

  const getNavItemStyle = (itemName, path = null, activePaths = []) => {
    const isActive = path
      ? location.pathname === path
      : activePaths.some((p) => location.pathname === p);
    const isHovered = hoveredItem === itemName;

    return {
      color: isActive ? "#ffffff" : "#000000",
      fontWeight: isActive ? 600 : "normal",
      padding: "5px 15px",
      transition: "all 0.3s ease",
      background: isActive
        ? "linear-gradient(to right, #10B582, #0D9588)"
        : "transparent",
      "&:hover": {
        transform: isActive ? "scale(1.05)" : "none",
        color: !isActive ? "#10B582" : undefined,
      },
    };
  };

  const getMenuItemStyle = (path) => {
    const isActive = location.pathname === path;
    return {
      backgroundColor: isActive
        ? "linear-gradient(to right, #10B582, #0D9588)"
        : "transparent",
      color: isActive ? "#ffffff" : "#000000",
      fontWeight: isActive ? 600 : "normal",
      "&:hover": {
        backgroundColor: isActive
          ? "linear-gradient(to right, #10B582, #0D9588)"
          : "#f0f0f0",
        color: isActive ? "#ffffff" : "#10B582",
      },
    };
  };

  // Dynamic menu items based on userType and officerAuthorities
  const getMobileMenuItems = () => {
    const menuItems = [];

    if (!userType && !verified) {
      menuItems.push(
        { name: "Home", path: "/" },
        { name: "Login", path: "/login" },
        { name: "Register", path: "/register" },
      );
    }

    if (userType === "Citizen" && verified) {
      menuItems.push(
        { name: "Home", path: "/user/home" },
        { name: "Apply for Service", path: "/user/services" },
        {
          name: "Application Status",
          subItems: [
            { name: "Initiated Applications", path: "/user/initiated" },
            { name: "Incomplete Applications", path: "/user/incomplete" },
          ],
        },
      );
    }

    if (userType === "Officer" && verified) {
      menuItems.push(
        { name: "Home", path: "/officer/home" },
        { name: "Reports", path: "/officer/reports" },
        {
          name: "DSC Management",
          subItems: [{ name: "Register DSC", path: "/officer/registerdsc" }],
        },
      );
      if (officerAuthorities?.canManageBankFiles) {
        menuItems.push({
          name: "Bank Files",
          subItems: [
            { name: "Create Bank File", path: "/officer/bankFile" },
            {
              name: "Update Bank Response File",
              path: "/officer/responseFile",
            },
          ],
        });
      }
      if (
        officerAuthorities?.canCorrigendum ||
        officerAuthorities.canWithhold ||
        officerAuthorities.canValidateAadhaar
      ) {
        menuItems.push({
          name: "Applications Updations",
          subItems: [
            officerAuthorities?.canCorrigendum && {
              name: "Data Updation",
              path: "/officer/issuecorrigendum",
            },
            officerAuthorities.canWithhold && {
              name: "Withheld Application",
              path: "/officer/withheld",
            },
            officerAuthorities.canValidateAadhaar && {
              name: "Validate Aadhaar",
              path: "/officer/validateaadhaar",
            },
          ].filter(Boolean),
        });
      }
      menuItems.push({
        name: "View Applications",
        subItems: [
          { name: "Aadhaar Validations", path: "/officer/aadhaarvalidations" },
          { name: "Search Application", path: "/officer/searchapplication" },
        ],
      });
    }

    if (userType === "Viewer" && verified) {
      menuItems.push(
        { name: "Home", path: "/viewer/home" },
        { name: "Aadhaar Validations", path: "/viewer/aadhaarvalidations" },
      );
    }

    if (userType === "Admin" && verified) {
      menuItems.push(
        { name: "Dashboard", path: "/admin/home" },
        { name: "Reports", path: "/admin/reports" },
        {
          name: "Add",
          subItems: [
            { name: "Admin", path: "/admin/addadmin" },
            { name: "Designation", path: "/admin/addDesignations" },
            { name: "Designation", path: "/admin/addDesignations" },
            designation === "System Admin" && {
              name: "Department",
              path: "/admin/addDepartment",
            },
          ].filter(Boolean),
        },
        { name: "Validate Officers", path: "/admin/validateofficer" },
        { name: "View Feedbacks", path: "/admin/viewFeedbacks" },
      );
    }

    if (userType === "Designer" && verified) {
      menuItems.push(
        { name: "Dashboard", path: "/designer/dashboard" },
        { name: "Dynamic Form", path: "/designer/dynamicform" },
        {
          name: "Create/Update",
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

    if (userType && verified) {
      menuItems.push(
        { name: "Feedback", path: "/feedback" },
        {
          name: "Profile",
          subItems: [
            { name: "Settings", path: "/settings" },
            { name: "Logout", action: handleLogout },
          ],
        },
      );
    }

    return menuItems;
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "#ffffff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
          <img
            src="/assets/images/logo.png"
            alt="Website Logo"
            style={{
              height: "50px",
              width: "50px",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
          <Box sx={{ ml: 2 }}>
            <Typography
              variant="h6"
              sx={{ color: "#333333", fontWeight: "bold" }}
            >
              ISSS Pension
            </Typography>
            <Typography variant="body2" sx={{ color: "#666666" }}>
              Social Welfare Department
            </Typography>
          </Box>
        </Box>

        <IconButton
          edge="end"
          color="inherit"
          aria-label="menu"
          onClick={handleMenuOpen}
          sx={{ display: { xs: "block", md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            backgroundColor: "#F3F4F6",
            borderRadius: 5,
            padding: 1,
          }}
        >
          {!userType && !verified && (
            <>
              <Button
                component={Link}
                to="/"
                sx={getNavItemStyle("home", "/")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("home")}
                onMouseLeave={handleMouseLeave}
              >
                Home
              </Button>
              <Button
                component={Link}
                to="/login"
                sx={getNavItemStyle("login", "/login")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("login")}
                onMouseLeave={handleMouseLeave}
              >
                Login
              </Button>
              <Button
                component={Link}
                to="/register"
                sx={{
                  ...getNavItemStyle("register", "/register"),
                  backgroundColor: "#E5620A",
                  color: "#ffffff",
                  "&:hover": {
                    backgroundColor: "#DE6E08",
                  },
                  marginLeft: 2,
                }}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("register")}
                onMouseLeave={handleMouseLeave}
              >
                Register
              </Button>
            </>
          )}

          {userType === "Citizen" && verified && (
            <>
              <Button
                component={Link}
                to="/user/home"
                sx={getNavItemStyle("citizen-home", "/user/home")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("citizen-home")}
                onMouseLeave={handleMouseLeave}
              >
                Home
              </Button>
              <Button
                component={Link}
                to="/user/services"
                sx={getNavItemStyle("apply-service", "/user/services")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("apply-service")}
                onMouseLeave={handleMouseLeave}
              >
                Apply for Service
              </Button>
              <div
                onMouseEnter={() => handleMouseEnter("application-status")}
                onMouseLeave={handleMouseLeave}
              >
                <Button
                  sx={getNavItemStyle("application-status", null, [
                    "/user/initiated",
                    "/user/incomplete",
                  ])}
                  onClick={handleMenuOpen}
                >
                  Application Status
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={
                    Boolean(anchorEl) && hoveredItem === "application-status"
                  }
                  onClose={handleMenuClose}
                >
                  <MenuItem
                    sx={getMenuItemStyle("/user/initiated")}
                    onClick={() => handleNavigate("/user/initiated")}
                  >
                    Initiated Applications
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/user/incomplete")}
                    onClick={() => handleNavigate("/user/incomplete")}
                  >
                    Incomplete Applications
                  </MenuItem>
                </Menu>
              </div>
            </>
          )}

          {userType === "Officer" && verified && (
            <>
              <Button
                component={Link}
                to="/officer/home"
                sx={getNavItemStyle("officer-home", "/officer/home")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("officer-home")}
                onMouseLeave={handleMouseLeave}
              >
                Home
              </Button>
              <Button
                component={Link}
                to="/officer/reports"
                sx={getNavItemStyle("officer-reports", "/officer/reports")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("officer-reports")}
                onMouseLeave={handleMouseLeave}
              >
                Reports
              </Button>
              <div
                onMouseEnter={() => handleMouseEnter("dsc-management")}
                onMouseLeave={handleMouseLeave}
              >
                <Button
                  sx={getNavItemStyle("dsc-management", null, [
                    "/officer/registerdsc",
                  ])}
                  onClick={handleMenuOpen}
                >
                  DSC Management
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && hoveredItem === "dsc-management"}
                  onClose={handleMenuClose}
                >
                  <MenuItem
                    sx={getMenuItemStyle("/officer/registerdsc")}
                    onClick={() => handleNavigate("/officer/registerdsc")}
                  >
                    Register DSC
                  </MenuItem>
                </Menu>
              </div>
              {officerAuthorities && officerAuthorities.canManageBankFiles && (
                <div
                  onMouseEnter={() => handleMouseEnter("bankfiles-management")}
                  onMouseLeave={handleMouseLeave}
                >
                  <Button
                    sx={getNavItemStyle("bankfiles-management", null, [
                      "/officer/bankFile",
                      "/officer/responseFile",
                    ])}
                    onClick={handleMenuOpen}
                  >
                    Bank Files
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={
                      Boolean(anchorEl) &&
                      hoveredItem === "bankfiles-management"
                    }
                    onClose={handleMenuClose}
                  >
                    <MenuItem
                      sx={getMenuItemStyle("/officer/bankFile")}
                      onClick={() => handleNavigate("/officer/bankFile")}
                    >
                      Create Bank File
                    </MenuItem>
                    <MenuItem
                      sx={getMenuItemStyle("/officer/responseFile")}
                      onClick={() => handleNavigate("/officer/responseFile")}
                    >
                      Update Bank Response File
                    </MenuItem>
                  </Menu>
                </div>
              )}
              <div
                onMouseEnter={() => handleMouseEnter("applications")}
                onMouseLeave={handleMouseLeave}
              >
                {(() => {
                  const activePaths = [];
                  if (officerAuthorities?.canCorrigendum)
                    activePaths.push("/officer/issuecorrigendum");
                  if (officerAuthorities.canWithhold)
                    activePaths.push("/officer/withheld");
                  if (officerAuthorities.canValidateAadhaar)
                    activePaths.push("/officer/validateaadhaar");
                  return (
                    <>
                      <Button
                        sx={getNavItemStyle("applications", null, activePaths)}
                        onClick={handleMenuOpen}
                      >
                        Applications Updations
                      </Button>
                      <Menu
                        anchorEl={anchorEl}
                        open={
                          Boolean(anchorEl) && hoveredItem === "applications"
                        }
                        onClose={handleMenuClose}
                      >
                        {officerAuthorities?.canCorrigendum && (
                          <MenuItem
                            sx={getMenuItemStyle("/officer/issuecorrigendum")}
                            component={Link}
                            to="/officer/issuecorrigendum"
                            onClick={() => setExpanded(false)}
                          >
                            Data Updation
                          </MenuItem>
                        )}
                        {officerAuthorities.canWithhold && (
                          <MenuItem
                            sx={getMenuItemStyle("/officer/withheld")}
                            component={Link}
                            to="/officer/withheld"
                            onClick={() => setExpanded(false)}
                          >
                            Withheld Application
                          </MenuItem>
                        )}
                        {officerAuthorities.canValidateAadhaar && (
                          <MenuItem
                            sx={getMenuItemStyle("/officer/validateaadhaar")}
                            component={Link}
                            to="/officer/validateaadhaar"
                            onClick={() => setExpanded(false)}
                          >
                            Validate Aadhaar
                          </MenuItem>
                        )}
                      </Menu>
                    </>
                  );
                })()}
              </div>
              <div
                onMouseEnter={() => handleMouseEnter("view-applications")}
                onMouseLeave={handleMouseLeave}
              >
                <Button
                  sx={getNavItemStyle("view-applications", null, [
                    "/officer/aadhaarvalidations",
                    "/officer/searchapplication",
                  ])}
                  onClick={handleMenuOpen}
                >
                  View Applications
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={
                    Boolean(anchorEl) && hoveredItem === "view-applications"
                  }
                  onClose={handleMenuClose}
                >
                  <MenuItem
                    sx={getMenuItemStyle("/officer/aadhaarvalidations")}
                    component={Link}
                    to="/officer/aadhaarvalidations"
                    onClick={() => setExpanded(false)}
                  >
                    Aadhaar Validations
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/officer/searchapplication")}
                    component={Link}
                    to="/officer/searchapplication"
                    onClick={() => setExpanded(false)}
                  >
                    Search Application
                  </MenuItem>
                </Menu>
              </div>
            </>
          )}

          {userType === "Viewer" && verified && (
            <>
              <Button
                component={Link}
                to="/viewer/home"
                sx={getNavItemStyle("viewer-home", "/viewer/home")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("viewer-home")}
                onMouseLeave={handleMouseLeave}
              >
                Home
              </Button>
              <Button
                component={Link}
                to="/viewer/aadhaarvalidations"
                sx={getNavItemStyle(
                  "viewer-aadhaarvalidations",
                  "/viewer/aadhaarvalidations",
                )}
                onClick={() => setExpanded(false)}
                onMouseEnter={() =>
                  handleMouseEnter("viewer-aadhaarvalidations")
                }
                onMouseLeave={handleMouseLeave}
              >
                Aadhaar Validations
              </Button>
            </>
          )}

          {userType === "Admin" && verified && (
            <>
              <Button
                component={Link}
                to="/admin/home"
                sx={getNavItemStyle("admin-home", "/admin/home")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("admin-home")}
                onMouseLeave={handleMouseLeave}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                to="/admin/reports"
                sx={getNavItemStyle("admin-reports", "/admin/reports")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("admin-reports")}
                onMouseLeave={handleMouseLeave}
              >
                Reports
              </Button>
              <div
                onMouseEnter={() => handleMouseEnter("admin-add")}
                onMouseLeave={handleMouseLeave}
              >
                {(() => {
                  const activePaths = [
                    "/admin/addadmin",
                    "/admin/addDesignations",
                  ];
                  if (designation === "System Admin")
                    activePaths.push("/admin/addDepartment");
                  return (
                    <>
                      <Button
                        sx={getNavItemStyle("add-admin", null, activePaths)}
                        onClick={handleMenuOpen}
                      >
                        Add
                      </Button>
                      <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl) && hoveredItem === "admin-add"}
                        onClose={handleMenuClose}
                      >
                        <MenuItem
                          sx={getMenuItemStyle("/admin/addadmin")}
                          onClick={() => handleNavigate("/admin/addadmin")}
                        >
                          Admin
                        </MenuItem>
                        <MenuItem
                          sx={getMenuItemStyle("/admin/addDesignations")}
                          onClick={() =>
                            handleNavigate("/admin/addDesignations")
                          }
                        >
                          Designation
                        </MenuItem>
                        {designation === "System Admin" && (
                          <MenuItem
                            sx={getMenuItemStyle("/admin/addDepartment")}
                            onClick={() =>
                              handleNavigate("/admin/addDepartment")
                            }
                          >
                            Department
                          </MenuItem>
                        )}
                      </Menu>
                    </>
                  );
                })()}
              </div>
              <Button
                component={Link}
                to="/admin/validateofficer"
                sx={getNavItemStyle(
                  "admin-validateofficer",
                  "/admin/validateofficer",
                )}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("admin-validateofficer")}
                onMouseLeave={handleMouseLeave}
              >
                Validate Officers
              </Button>
              <Button
                component={Link}
                to="/admin/viewFeedbacks"
                sx={getNavItemStyle(
                  "admin-viewFiedbacks",
                  "/admin/viewFeedbacks",
                )}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("admin-viewFiedbacks")}
                onMouseLeave={handleMouseLeave}
              >
                View Feedbacks
              </Button>
            </>
          )}

          {userType === "Designer" && verified && (
            <>
              <Button
                component={Link}
                to="/designer/dashboard"
                sx={getNavItemStyle(
                  "designer-dashboard",
                  "/designer/dashboard",
                )}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("designer-dashboard")}
                onMouseLeave={handleMouseLeave}
              >
                Dashboard
              </Button>
              <Button
                component={Link}
                to="/designer/dynamicform"
                sx={getNavItemStyle("dynamic-form", "/designer/dynamicform")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("dynamic-form")}
                onMouseLeave={handleMouseLeave}
              >
                Dynamic Form
              </Button>
              <div
                onMouseEnter={() => handleMouseEnter("designer-create")}
                onMouseLeave={handleMouseLeave}
              >
                <Button
                  sx={getNavItemStyle("designer-create", null, [
                    "/designer/createservice",
                    "/designer/createworkflow",
                    "/designer/corrections",
                    "/designer/createletterpdf",
                    "/designer/createwebservice",
                    "/designer/emailsettings",
                    "/designer/submissionlimitations",
                  ])}
                  onClick={handleMenuOpen}
                >
                  Create/Update
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && hoveredItem === "designer-create"}
                  onClose={handleMenuClose}
                >
                  <MenuItem
                    sx={getMenuItemStyle("/designer/createservice")}
                    onClick={() => handleNavigate("/designer/createservice")}
                  >
                    Service
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/designer/createworkflow")}
                    onClick={() => handleNavigate("/designer/createworkflow")}
                  >
                    Workflow
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/designer/corrections")}
                    onClick={() => handleNavigate("/designer/corrections")}
                  >
                    Corrections/Corrigendum
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/designer/createletterpdf")}
                    onClick={() => handleNavigate("/designer/createletterpdf")}
                  >
                    Letter Pdf
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/designer/createwebservice")}
                    onClick={() => handleNavigate("/designer/createwebservice")}
                  >
                    Web Service
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/designer/emailsettings")}
                    onClick={() => handleNavigate("/designer/emailsettings")}
                  >
                    Email
                  </MenuItem>
                  <MenuItem
                    sx={getMenuItemStyle("/designer/submissionlimitations")}
                    onClick={() =>
                      handleNavigate("/designer/submissionlimitations")
                    }
                  >
                    Submission Limitations
                  </MenuItem>
                </Menu>
              </div>
            </>
          )}

          {userType && verified && (
            <>
              <Button
                component={Link}
                to="/feedback"
                sx={getNavItemStyle("feedback", "/feedback")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("feedback")}
                onMouseLeave={handleMouseLeave}
              >
                Feedback
              </Button>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography sx={{ color: "#333333", fontWeight: "bold" }}>
                  {username}
                </Typography>
                <TokenTimer />
                <div
                  onMouseEnter={() => handleMouseEnter("profile")}
                  onMouseLeave={handleMouseLeave}
                >
                  <IconButton onClick={handleMenuOpen} sx={{ padding: 0 }}>
                    <img
                      src={
                        `/Base/DisplayFile?fileName=${profile}` ||
                        "/assets/images/profile.jpg"
                      }
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: "30px" }}
                    />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl) && hoveredItem === "profile"}
                    onClose={handleMenuClose}
                  >
                    <MenuItem
                      sx={getMenuItemStyle("/settings")}
                      onClick={() => handleNavigate("/settings")}
                    >
                      Settings
                    </MenuItem>
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </Menu>
                </div>
              </Box>
            </>
          )}
        </Box>

        {/* Mobile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl) && isSmallScreen}
          onClose={handleMenuClose}
          sx={{ display: { xs: "block", md: "none" } }}
        >
          {getMobileMenuItems().map((item, index) =>
            item.subItems ? (
              <div key={index}>
                <MenuItem
                  onClick={handleMenuOpen}
                  sx={{
                    ...getMenuItemStyle(item.path),
                    fontWeight: 600,
                  }}
                >
                  {item.name}
                </MenuItem>
                {expanded &&
                  item.subItems.map((subItem, subIndex) => (
                    <MenuItem
                      key={subIndex}
                      onClick={() => {
                        if (subItem.action) subItem.action();
                        else handleNavigate(subItem.path);
                      }}
                      sx={getMenuItemStyle(subItem.path)}
                    >
                      {subItem.name}
                    </MenuItem>
                  ))}
              </div>
            ) : (
              <MenuItem
                key={index}
                onClick={() => handleNavigate(item.path)}
                sx={getMenuItemStyle(item.path)}
              >
                {item.name}
              </MenuItem>
            ),
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default MyNavbar;
