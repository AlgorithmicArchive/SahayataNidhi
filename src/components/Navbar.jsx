import React, { useContext, useState, useEffect, useRef } from "react";
import { Navbar, Nav, NavDropdown, Container } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { UserContext } from "../UserContext";
import TokenTimer from "./TokenTimer";
import axiosInstance from "../axiosConfig";

const MyNavbar = () => {
  const [expanded, setExpanded] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
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

  // Detect screen size to toggle hover behavior
  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 992); // Bootstrap's lg breakpoint
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cleanup timeout on unmount
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

  const getNavItemStyle = (itemName, path = null) => {
    const isActive = path ? location.pathname === path : false;
    const isHovered = hoveredItem === itemName;

    return {
      color: isHovered || isActive ? "#333333" : "#333333",
      fontWeight: isHovered || isActive ? 600 : "normal",
      padding: "5px 15px",
      transition: "all 0.3s ease",
    };
  };

  return (
    <Navbar
      expanded={expanded}
      onToggle={(isExpanded) => setExpanded(isExpanded)}
      expand="lg"
      style={{ backgroundColor: "#ffffffff", zIndex: 1000 }}
    >
      <Container>
        {/* Logo Section */}
        <Navbar.Brand className="me-4">
          <div className="me-5 d-flex align-items-center">
            <img
              src="/assets/images/logo.png"
              alt="Website Logo"
              style={{
                height: "50px",
                width: "50px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
              className="d-inline-block align-top"
            />
            <span className="ms-2 fw-bold" style={{ color: "#333333" }}>
              ISSS Pension
            </span>
          </div>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          {/* Main Navigation */}
          <Nav
            className="ms-5 d-flex align-items-center gap-3"
            style={{ color: "#333333" }}
          >
            {!userType && !verified && (
              <>
                <Nav.Link
                  as={Link}
                  to="/"
                  style={getNavItemStyle("home", "/")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("home")}
                  onMouseLeave={handleMouseLeave}
                >
                  Home
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/login"
                  style={getNavItemStyle("login", "/login")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("login")}
                  onMouseLeave={handleMouseLeave}
                >
                  Login
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/register"
                  style={getNavItemStyle("register", "/register")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("register")}
                  onMouseLeave={handleMouseLeave}
                >
                  Register
                </Nav.Link>
              </>
            )}

            {userType === "Citizen" && verified && (
              <>
                <Nav.Link
                  as={Link}
                  to="/user/home"
                  style={getNavItemStyle("citizen-home", "/user/home")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("citizen-home")}
                  onMouseLeave={handleMouseLeave}
                >
                  Home
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/user/services"
                  style={getNavItemStyle("apply-service", "/user/services")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("apply-service")}
                  onMouseLeave={handleMouseLeave}
                >
                  Apply for Service
                </Nav.Link>
                <div
                  onMouseEnter={() => handleMouseEnter("application-status")}
                  onMouseLeave={handleMouseLeave}
                >
                  <NavDropdown
                    title={
                      <span style={getNavItemStyle("application-status")}>
                        Application Status
                      </span>
                    }
                    id="application-status"
                    show={
                      isSmallScreen
                        ? undefined
                        : hoveredItem === "application-status"
                    }
                  >
                    <div
                      onMouseEnter={() =>
                        handleMouseEnter("application-status")
                      }
                      onMouseLeave={handleMouseLeave}
                    >
                      <NavDropdown.Item
                        onClick={() => handleNavigate("/user/initiated")}
                      >
                        Initiated Applications
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() => handleNavigate("/user/incomplete")}
                      >
                        Incomplete Applications
                      </NavDropdown.Item>
                    </div>
                  </NavDropdown>
                </div>
              </>
            )}

            {userType === "Officer" && verified && (
              <>
                <Nav.Link
                  as={Link}
                  to="/officer/home"
                  style={getNavItemStyle("officer-home", "/officer/home")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("officer-home")}
                  onMouseLeave={handleMouseLeave}
                >
                  Home
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/officer/reports"
                  style={getNavItemStyle("officer-reports", "/officer/reports")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("officer-reports")}
                  onMouseLeave={handleMouseLeave}
                >
                  Reports
                </Nav.Link>
                <div
                  onMouseEnter={() => handleMouseEnter("dsc-management")}
                  onMouseLeave={handleMouseLeave}
                >
                  <NavDropdown
                    title={
                      <span style={getNavItemStyle("dsc-management")}>
                        DSC Management
                      </span>
                    }
                    id="dsc-management"
                    show={
                      isSmallScreen
                        ? undefined
                        : hoveredItem === "dsc-management"
                    }
                  >
                    <div
                      onMouseEnter={() => handleMouseEnter("dsc-management")}
                      onMouseLeave={handleMouseLeave}
                    >
                      <NavDropdown.Item
                        onClick={() => handleNavigate("/officer/registerdsc")}
                      >
                        Register DSC
                      </NavDropdown.Item>
                    </div>
                  </NavDropdown>
                </div>
                {officerAuthorities &&
                  officerAuthorities.canManageBankFiles && (
                    <div
                      onMouseEnter={() =>
                        handleMouseEnter("bankfiles-management")
                      }
                      onMouseLeave={handleMouseLeave}
                    >
                      <NavDropdown
                        title={
                          <span style={getNavItemStyle("bankfiles-management")}>
                            Bank Files
                          </span>
                        }
                        id="bankfiles-management"
                        show={
                          isSmallScreen
                            ? undefined
                            : hoveredItem === "bankfiles-management"
                        }
                      >
                        <div
                          onMouseEnter={() =>
                            handleMouseEnter("bankfiles-management")
                          }
                          onMouseLeave={handleMouseLeave}
                        >
                          <NavDropdown.Item
                            onClick={() => handleNavigate("/officer/bankFile")}
                          >
                            Create Bank File
                          </NavDropdown.Item>
                          <NavDropdown.Item
                            onClick={() =>
                              handleNavigate("/officer/responseFile")
                            }
                          >
                            Update Bank Response File
                          </NavDropdown.Item>
                        </div>
                      </NavDropdown>
                    </div>
                  )}
                <NavDropdown
                  title="Applications Updations"
                  id="applications-dropdown"
                  show={
                    isSmallScreen ? undefined : hoveredItem === "applications"
                  }
                  onMouseEnter={() => handleMouseEnter("applications")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    onMouseEnter={() => handleMouseEnter("applications")}
                    onMouseLeave={handleMouseLeave}
                  >
                    {officerAuthorities?.canCorrigendum && (
                      <NavDropdown.Item
                        as={Link}
                        to="/officer/issuecorrigendum"
                        style={getNavItemStyle(
                          "officer-corrigendum",
                          "/officer/corrigendum",
                        )}
                        onClick={() => setExpanded(false)}
                      >
                        Alteration
                      </NavDropdown.Item>
                    )}
                    {officerAuthorities.canWithhold && (
                      <NavDropdown.Item
                        as={Link}
                        to="/officer/withheld"
                        style={getNavItemStyle(
                          "officer-withheld",
                          "/officer/withheld",
                        )}
                        onClick={() => setExpanded(false)}
                      >
                        Withheld Application
                      </NavDropdown.Item>
                    )}
                    {officerAuthorities.canValidateAadhaar && (
                      <NavDropdown.Item
                        as={Link}
                        to="/officer/validateaadhaar"
                        style={getNavItemStyle(
                          "officer-validateaadhaar",
                          "/officer/validateaadhaar",
                        )}
                        onClick={() => setExpanded(false)}
                      >
                        Validate Aadhaar
                      </NavDropdown.Item>
                    )}
                  </div>
                </NavDropdown>
                <NavDropdown
                  title="View Applications"
                  id="view-applications-dropdown"
                  show={
                    isSmallScreen
                      ? undefined
                      : hoveredItem === "view-applications"
                  }
                  onMouseEnter={() => handleMouseEnter("view-applications")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    onMouseEnter={() => handleMouseEnter("view-applications")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <NavDropdown.Item
                      as={Link}
                      to="/officer/aadhaarvalidations"
                      style={getNavItemStyle(
                        "officer-aadhaarvalidations",
                        "/officer/aadhaarvalidations",
                      )}
                      onClick={() => setExpanded(false)}
                    >
                      Aadhaar Validations
                    </NavDropdown.Item>
                    <NavDropdown.Item
                      as={Link}
                      to="/officer/searchapplication"
                      style={getNavItemStyle(
                        "officer-searchapplication",
                        "/officer/searchapplication",
                      )}
                      onClick={() => setExpanded(false)}
                    >
                      Search Application
                    </NavDropdown.Item>
                  </div>
                </NavDropdown>
              </>
            )}

            {userType === "Viewer" && verified && (
              <>
                <Nav.Link
                  as={Link}
                  to="/viewer/home"
                  style={getNavItemStyle("viewer-home", "/viewer/home")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("viewer-home")}
                  onMouseLeave={handleMouseLeave}
                >
                  Home
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/viewer/aadhaarvalidations"
                  style={getNavItemStyle(
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
                </Nav.Link>
              </>
            )}

            {userType === "Admin" && verified && (
              <>
                <Nav.Link
                  as={Link}
                  to="/admin/home"
                  style={getNavItemStyle("admin-home", "/admin/home")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("admin-home")}
                  onMouseLeave={handleMouseLeave}
                >
                  Dashboard
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/admin/reports"
                  style={getNavItemStyle("admin-reports", "/admin/reports")}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("admin-reports")}
                  onMouseLeave={handleMouseLeave}
                >
                  Reports
                </Nav.Link>
                <div
                  onMouseEnter={() => handleMouseEnter("admin-add")}
                  onMouseLeave={handleMouseLeave}
                >
                  <NavDropdown
                    title={
                      <span style={getNavItemStyle("add-admin")}>Add</span>
                    }
                    id="admin-add"
                    show={
                      isSmallScreen ? undefined : hoveredItem === "admin-add"
                    }
                  >
                    <div
                      onMouseEnter={() => handleMouseEnter("admin-add")}
                      onMouseLeave={handleMouseLeave}
                    >
                      <NavDropdown.Item
                        onClick={() => handleNavigate("/admin/addadmin")}
                      >
                        Admin
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() => handleNavigate("/admin/addDesignations")}
                      >
                        Designation
                      </NavDropdown.Item>
                      {designation == "System Admin" && (
                        <>
                          <NavDropdown.Item
                            onClick={() =>
                              handleNavigate("/admin/addDepartment")
                            }
                          >
                            Department
                          </NavDropdown.Item>
                        </>
                      )}
                    </div>
                  </NavDropdown>
                </div>
                <Nav.Link
                  as={Link}
                  to="/admin/validateofficer"
                  style={getNavItemStyle(
                    "admin-validateofficer",
                    "/admin/validateofficer",
                  )}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("admin-validateofficer")}
                  onMouseLeave={handleMouseLeave}
                >
                  Validate Officers
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/admin/viewFeedbacks"
                  style={getNavItemStyle(
                    "admin-viewFiedbacks",
                    "/admin/viewFeedbacks",
                  )}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("admin-viewFiedbacks")}
                  onMouseLeave={handleMouseLeave}
                >
                  View Feedbacks
                </Nav.Link>
              </>
            )}

            {userType === "Designer" && verified && (
              <>
                <Nav.Link
                  as={Link}
                  to="/designer/dashboard"
                  style={getNavItemStyle(
                    "designer-dashboard",
                    "/designer/dashboard",
                  )}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("designer-dashboard")}
                  onMouseLeave={handleMouseLeave}
                >
                  Dashboard
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/designer/dynamicform"
                  style={getNavItemStyle(
                    "dynamic-form",
                    "/designer/dynamicform",
                  )}
                  onClick={() => setExpanded(false)}
                  onMouseEnter={() => handleMouseEnter("dynamic-form")}
                  onMouseLeave={handleMouseLeave}
                >
                  Dynamic Form
                </Nav.Link>
                <div
                  onMouseEnter={() => handleMouseEnter("designer-create")}
                  onMouseLeave={handleMouseLeave}
                >
                  <NavDropdown
                    title={
                      <span style={getNavItemStyle("designer-create")}>
                        Create/Update
                      </span>
                    }
                    id="designer-create"
                    show={
                      isSmallScreen
                        ? undefined
                        : hoveredItem === "designer-create"
                    }
                  >
                    <div
                      onMouseEnter={() => handleMouseEnter("designer-create")}
                      onMouseLeave={handleMouseLeave}
                    >
                      <NavDropdown.Item
                        onClick={() =>
                          handleNavigate("/designer/createservice")
                        }
                      >
                        Service
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() =>
                          handleNavigate("/designer/createworkflow")
                        }
                      >
                        Workflow
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() => handleNavigate("/designer/corrections")}
                      >
                        Corrections/Corrigendum
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() =>
                          handleNavigate("/designer/createletterpdf")
                        }
                      >
                        Letter Pdf
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() =>
                          handleNavigate("/designer/createwebservice")
                        }
                      >
                        Web Service
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() =>
                          handleNavigate("/designer/emailsettings")
                        }
                      >
                        Email
                      </NavDropdown.Item>
                      <NavDropdown.Item
                        onClick={() =>
                          handleNavigate("/designer/createreports")
                        }
                      >
                        Create Reports
                      </NavDropdown.Item>
                    </div>
                  </NavDropdown>
                </div>
              </>
            )}
          </Nav>

          {userType && verified && (
            <>
              <Nav.Link
                as={Link}
                to="/feedback"
                style={getNavItemStyle("feedback", "/feedback")}
                onClick={() => setExpanded(false)}
                onMouseEnter={() => handleMouseEnter("feedback")}
                onMouseLeave={handleMouseLeave}
              >
                Feedback
              </Nav.Link>
              <Nav className="ms-auto d-flex align-items-center gap-2">
                <span style={{ color: "#333333" }}>{username}</span>
                <TokenTimer />
                <div
                  onMouseEnter={() => handleMouseEnter("profile")}
                  onMouseLeave={handleMouseLeave}
                >
                  <NavDropdown
                    title={
                      <img
                        src={
                          `/Base/DisplayFile?fileName=${profile}` ||
                          "/assets/images/profile.jpg"
                        }
                        alt="Profile"
                        className="rounded-circle"
                        style={{ width: "30px" }}
                      />
                    }
                    id="profile-dropdown"
                    show={isSmallScreen ? undefined : hoveredItem === "profile"}
                  >
                    <div
                      onMouseEnter={() => handleMouseEnter("profile")}
                      onMouseLeave={handleMouseLeave}
                    >
                      <NavDropdown.Item
                        onClick={() => handleNavigate("/settings")}
                      >
                        Settings
                      </NavDropdown.Item>
                      <NavDropdown.Item onClick={handleLogout}>
                        Logout
                      </NavDropdown.Item>
                    </div>
                  </NavDropdown>
                </div>
              </Nav>
            </>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default MyNavbar;
