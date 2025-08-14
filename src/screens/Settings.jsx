import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Box,
  Divider,
  Typography,
  Avatar,
  CircularProgress,
  Tooltip,
  TextField,
  FormControl,
  Button,
  FormHelperText,
} from "@mui/material";
import { Container, Row, Col } from "react-bootstrap";
import axiosInstance from "../axiosConfig";
import CustomButton from "../components/CustomButton";
import { UserContext } from "../UserContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export default function Settings() {
  const { setProfile, userType } = useContext(UserContext);
  const [userDetails, setUserDetails] = useState({
    name: "",
    username: "",
    email: "",
    mobileNumber: "",
    profile: "",
    ageProof: "",
  });
  const [used, setUsed] = useState([]);
  const [unused, setUnused] = useState([]);
  const [save, setSave] = useState(false);
  const [profile, setLocalProfile] = useState({ file: "", url: "" });
  const [ageProof, setAgeProof] = useState({ file: null }); // NEW: For ProofOfAge file
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const profileRef = useRef(null);
  const ageProofRef = useRef(null); // NEW: Ref for ProofOfAge input

  // Handle input changes for user details
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserDetails((prev) => ({ ...prev, [name]: value }));
    setSave(true);
  };

  // Handle profile image change
  const handleProfileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setLocalProfile({ file, url: imageUrl });
      setSave(true);
      toast.info("Profile image selected. Click Save to update.", {
        position: "top-center",
        autoClose: 2000,
        theme: "colored",
      });
    }
  };

  // Handle proof of age file change
  const handleAgeProofChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Please select a PDF file for Proof of Age.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        return;
      }
      if (file.size < 100 * 1024 || file.size > 200 * 1024) {
        toast.error("File size must be between 100KB and 200KB.", {
          position: "top-center",
          autoClose: 3000,
          theme: "colored",
        });
        return;
      }
      setAgeProof({ file });
      setSave(true);
      toast.info("Proof of Age selected. Click Save to update.", {
        position: "top-center",
        autoClose: 2000,
        theme: "colored",
      });
    }
  };

  // Save profile image, proof of age, and user details
  const handleSaveProfile = async () => {
    setButtonLoading(true);
    try {
      const formdata = new FormData();
      formdata.append("name", userDetails.name);
      formdata.append("username", userDetails.username);
      formdata.append("email", userDetails.email);
      formdata.append("mobileNumber", userDetails.mobileNumber);
      if (profile.file) {
        formdata.append("profile", profile.file);
      }
      if (ageProof.file) {
        formdata.append("ageProof", ageProof.file);
      }

      const response = await axiosInstance.post(
        "/Profile/UpdateUserDetails",
        formdata,
      );
      if (response.data.isValid) {
        setProfile(response.data.profile);
        setLocalProfile({ file: "", url: response.data.profile });
        setAgeProof({ file: null }); // Clear ProofOfAge
        setUserDetails({
          name: response.data.name,
          username: response.data.username,
          email: response.data.email,
          mobileNumber: response.data.mobileNumber,
          profile: response.data.profile,
          ageProof: response.data.ageProof || "",
        });
        setSave(false);
        toast.success("User details updated successfully!", {
          position: "top-center",
          autoClose: 2000,
          theme: "colored",
        });
      } else {
        throw new Error(
          response.data.errorMessage || "Failed to update user details.",
        );
      }
    } catch (error) {
      console.error("Error saving user details:", error);
      toast.error("Failed to update user details. Please try again.", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setButtonLoading(false);
    }
  };

  // Generate new backup codes
  const handleNewCodes = async () => {
    setButtonLoading(true);
    try {
      const response = await axiosInstance.get("/Profile/GenerateBackupCodes");
      if (response.data.status) {
        toast.success("New backup codes generated successfully!", {
          position: "top-center",
          autoClose: 2000,
          theme: "colored",
        });
        await GetUserDetails();
      } else {
        throw new Error(
          response.data.errorMessage || "Failed to generate codes",
        );
      }
    } catch (error) {
      console.error("Error generating backup codes:", error);
      toast.error("Failed to generate backup codes. Please try again.", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setButtonLoading(false);
    }
  };

  // Fetch user details
  async function GetUserDetails() {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/Profile/GetUserDetails");
      if (response.data) {
        setUserDetails({
          name: response.data.name || "",
          username: response.data.username || "",
          email: response.data.email || "",
          mobileNumber: response.data.mobileNumber || "",
          profile: response.data.profile || "",
          ageProof: response.data.ageProof || "",
        });
        setLocalProfile({ file: "", url: response.data.profile || "" });
        setAgeProof({ file: null }); // Initialize ProofOfAge
        const backupCodes = JSON.parse(
          response.data.backupCodes || '{"used":[],"unused":[]}',
        );
        setUsed(backupCodes.used || []);
        setUnused(backupCodes.unused || []);
      } else {
        throw new Error("No user details returned.");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Failed to load settings. Please try again.", {
        position: "top-center",
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    GetUserDetails();
  }, []);

  const buttonStyles = {
    backgroundColor: "#1E88E5",
    color: "#FFFFFF",
    fontWeight: 600,
    textTransform: "none",
    py: 1,
    px: 3,
    borderRadius: 8,
    "&:hover": {
      backgroundColor: "#1565C0",
      transform: "scale(1.03)",
      transition: "all 0.2s ease",
    },
    "&:disabled": {
      backgroundColor: "#B0BEC5",
      color: "#78909C",
    },
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)",
        }}
      >
        <CircularProgress color="primary" aria-label="Loading settings" />
      </Box>
    );
  }

  return (
    <Container
      style={{
        maxWidth: 800,
        padding: 0,
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: "100%",
          bgcolor: "#FFFFFF",
          borderRadius: 4,
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
          p: { xs: 3, md: 5 },
          transition: "transform 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-8px)",
          },
        }}
        role="main"
        aria-labelledby="settings-title"
      >
        <Typography
          variant="h4"
          id="settings-title"
          sx={{
            fontFamily: "'Playfair Display', serif",
            color: "#0D47A1",
            textAlign: "center",
            mb: 4,
            fontWeight: 700,
          }}
        >
          Settings
        </Typography>

        {/* User Details Section */}
        <Box
          sx={{
            mb: 4,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: "'Playfair Display', serif",
              color: "#0D47A1",
              fontWeight: 700,
              mb: 2,
            }}
          >
            User Details
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            }}
          >
            <TextField
              label="Name"
              name="name"
              value={userDetails.name}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
              aria-label="User name"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#90CAF9" },
                  "&:hover fieldset": { borderColor: "#42A5F5" },
                  "&.Mui-focused fieldset": { borderColor: "#1E88E5" },
                },
              }}
            />
            <TextField
              label="Username"
              name="username"
              value={userDetails.username}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
              aria-label="Username"
              InputProps={{ readOnly: true }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#90CAF9" },
                  "&:hover fieldset": { borderColor: "#42A5F5" },
                  "&.Mui-focused fieldset": { borderColor: "#1E88E5" },
                },
              }}
            />
            <TextField
              label="Email"
              name="email"
              value={userDetails.email}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
              aria-label="Email address"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#90CAF9" },
                  "&:hover fieldset": { borderColor: "#42A5F5" },
                  "&.Mui-focused fieldset": { borderColor: "#1E88E5" },
                },
              }}
            />
            <TextField
              label="Mobile Number"
              name="mobileNumber"
              value={userDetails.mobileNumber}
              onChange={handleInputChange}
              fullWidth
              variant="outlined"
              aria-label="Mobile number"
              sx={{
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#90CAF9" },
                  "&:hover fieldset": { borderColor: "#42A5F5" },
                  "&.Mui-focused fieldset": { borderColor: "#1E88E5" },
                },
              }}
            />
            <FormControl fullWidth margin="normal">
              <Button
                variant="contained"
                component="label"
                sx={buttonStyles}
                aria-label="Upload proof of age"
              >
                <Typography>Upload Proof of Age</Typography>
                <input
                  type="file"
                  hidden
                  accept=".pdf"
                  ref={ageProofRef}
                  onChange={handleAgeProofChange}
                />
              </Button>
              <Typography sx={{ fontSize: "0.85rem", color: "#6B7280" }}>
                Accepted File Types: .pdf Size: 100kb-200kb
              </Typography>
              {userDetails.ageProof && (
                <Typography
                  sx={{ fontSize: "0.85rem", color: "#6B7280", mt: 1 }}
                >
                  Current file: {userDetails.ageProof}
                </Typography>
              )}
            </FormControl>
          </Box>
        </Box>

        {/* Profile Image Section */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            mb: 4,
          }}
        >
          <Tooltip title="Profile Picture" arrow>
            <Avatar
              src={profile.url}
              alt={`${userDetails?.name || "User"}'s profile picture`}
              sx={{
                width: { xs: 120, md: 150 },
                height: { xs: 120, md: 150 },
                bgcolor: "#ECEFF1",
                border: "3px solid",
                borderColor: "#42A5F5",
                transition: "transform 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            />
          </Tooltip>
          <input
            type="file"
            ref={profileRef}
            hidden
            onChange={handleProfileChange}
            accept="image/*"
            aria-label="Upload profile image"
          />
          {!save ? (
            <CustomButton
              text="Change Image"
              onClick={() => profileRef.current.click()}
              sx={buttonStyles}
              aria-label="Change profile image"
            />
          ) : (
            <CustomButton
              text="Save"
              onClick={handleSaveProfile}
              sx={buttonStyles}
              disabled={buttonLoading}
              startIcon={
                buttonLoading && <CircularProgress size={20} color="inherit" />
              }
              aria-label="Save user details"
            />
          )}
        </Box>

        <Divider
          sx={{
            my: 4,
            borderColor: "#90CAF9",
            borderWidth: "1px",
          }}
        />

        {/* Backup Codes Section */}
        {userType !== "Citizen" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontFamily: "'Playfair Display', serif",
                color: "#0D47A1",
                fontWeight: 700,
              }}
            >
              Backup Codes
            </Typography>
            {unused.length === 0 && used.length === 0 ? (
              <Typography sx={{ color: "#546E7A", textAlign: "center", py: 2 }}>
                No backup codes available. Generate new codes to continue.
              </Typography>
            ) : (
              <Row className="g-3 justify-content-center">
                {unused.map((code, index) => (
                  <Col key={`unused-${index}`} xs={6} md={3}>
                    <Tooltip title="Unused backup code" arrow>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "#4CAF50",
                          color: "#FFFFFF",
                          borderRadius: 2,
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: { xs: 14, md: 16 },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          transition: "transform 0.2s ease",
                          "&:hover": {
                            transform: "scale(1.02)",
                          },
                        }}
                        aria-label={`Unused backup code ${code}`}
                      >
                        <CheckCircleIcon fontSize="small" />
                        {code}
                      </Box>
                    </Tooltip>
                  </Col>
                ))}
                {used.map((code, index) => (
                  <Col key={`used-${index}`} xs={6} md={3}>
                    <Tooltip title="Used backup code" arrow>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: "#B0BEC5",
                          color: "#FFFFFF",
                          borderRadius: 2,
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: { xs: 14, md: 16 },
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          opacity: 0.7,
                        }}
                        aria-label={`Used backup code ${code}`}
                      >
                        <CancelIcon fontSize="small" />
                        {code}
                      </Box>
                    </Tooltip>
                  </Col>
                ))}
              </Row>
            )}
            <Tooltip title="Generate new backup codes" arrow>
              <CustomButton
                text="Generate New"
                onClick={handleNewCodes}
                sx={buttonStyles}
                disabled={buttonLoading}
                startIcon={
                  buttonLoading && (
                    <CircularProgress size={20} color="inherit" />
                  )
                }
                aria-label="Generate new backup codes"
              />
            </Tooltip>
          </Box>
        )}
      </Box>
      <ToastContainer />
    </Container>
  );
}
