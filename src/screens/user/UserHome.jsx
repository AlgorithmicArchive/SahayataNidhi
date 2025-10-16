import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Button,
  CircularProgress,
  Divider,
  Grid2,
  Tooltip,
  IconButton,
  Input,
} from "@mui/material";
import { Edit, Upload, Visibility, VisibilityOff } from "@mui/icons-material";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../axiosConfig";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";

const MainContainer = styled(Box)`
  min-height: 100vh;
  background: linear-gradient(to bottom right, #f4f9ff 0%, #f9f3ec 100%);
  display: flex;
  justify-content: center;
  padding: 3rem 1rem; /* Reduced padding for smaller screens */
  box-sizing: border-box;

  @media (max-width: 600px) {
    padding: 1.5rem 0.5rem;
  }
`;

const ProfileCard = styled(Box)`
  background: #ffffff;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%; /* Use percentage for responsiveness */
  height: max-content;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 600px) {
    padding: 1.5rem;
    border-radius: 12px;
  }
`;

const StyledAvatar = styled(Avatar)`
  width: 100px; /* Slightly smaller for mobile */
  height: 100px;
  border: 3px solid #235bde;
  box-shadow: 0 4px 12px rgba(35, 91, 222, 0.3);
  transition: transform 0.3s ease;
  margin: 0 auto;
  &:hover {
    transform: scale(1.1);
  }

  @media (max-width: 600px) {
    width: 80px;
    height: 80px;
  }
`;

const UploadButton = styled(IconButton)`
  background: linear-gradient(to bottom, #2562e9 0%, #1f43b5 100%);
  color: #ffffff;
  position: absolute;
  bottom: -8px;
  right: -8px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  &:hover {
    background: linear-gradient(to bottom, #1f43b5 0%, #1565c0 100%);
    transform: scale(1.1);
  }

  @media (max-width: 600px) {
    bottom: -4px;
    right: -4px;
    padding: 6px; /* Smaller touch target */
  }
`;

const StatContainer = styled(Box)`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin: 1.5rem 0;

  @media (max-width: 600px) {
    flex-direction: column; /* Stack vertically on small screens */
    gap: 0.75rem;
  }
`;

const StatBox = styled(Box)`
  flex: 1;
  background: #f4f9ff;
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e0e7ff;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 600px) {
    padding: 0.75rem;
  }
`;

const InfoItem = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e7ff;
  &:last-of-type {
    border-bottom: none;
  }

  @media (max-width: 600px) {
    flex-direction: column; /* Stack label and value */
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const ActionButton = styled(Button)`
  background: linear-gradient(to bottom, #2562e9 0%, #1f43b5 100%);
  color: #fdf6f0;
  font-weight: 600;
  text-transform: none;
  border-radius: 10px;
  padding: 0.75rem 2rem;
  margin-top: 1.5rem;
  width: 100%;
  transition: all 0.3s ease;
  &:hover {
    background: linear-gradient(to bottom, #1f43b5 0%, #1565c0 100%);
    box-shadow: 0 4px 12px rgba(35, 91, 222, 0.3);
  }

  @media (max-width: 600px) {
    padding: 0.5rem 1.5rem;
    font-size: 0.875rem; /* Smaller font for mobile */
  }
`;

export default function UserHome() {
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    file: "",
    url: "/assets/images/profile.jpg",
  });
  const [showEmail, setShowEmail] = useState(false);
  const [showMobileNumber, setShowMobileNumber] = useState(false);

  const navigate = useNavigate();

  async function GetUserDetails() {
    try {
      const response = await axiosInstance.get("/User/GetUserDetails");
      setUserDetails(response.data);
      setProfile({
        file: "",
        url: response.data.profile
          ? `/Base/DisplayFile?fileName=${response.data.profile}`
          : "/assets/images/profile.jpg",
      });
    } catch (error) {
      toast.error("Failed to load user details. Please try again.", {
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

  const maskEmail = (email) => {
    if (!email) return "N/A";

    const [localPart, domain] = email.split("@");

    let maskedLocal;
    if (localPart.length > 5) {
      const middleLength = localPart.length - 4; // first 2 + last 2 visible
      maskedLocal =
        localPart.slice(0, 2) + "*".repeat(middleLength) + localPart.slice(-2);
    } else {
      maskedLocal =
        localPart.slice(0, 2) + "*".repeat(Math.max(localPart.length - 2, 1));
    }

    const domainParts = domain.split(".");
    const maskedDomain = domainParts
      .map((part, index) =>
        index === 0 ? part[0] + "*".repeat(Math.max(part.length - 1, 1)) : part,
      )
      .join(".");

    return `${maskedLocal}@${maskedDomain}`;
  };

  const maskMobileNumber = (mobileNumber) => {
    if (!mobileNumber) return "N/A";
    if (mobileNumber.length <= 4) return "*".repeat(mobileNumber.length);

    const middleLength = mobileNumber.length - 4; // first 2 + last 2 visible
    return (
      mobileNumber.slice(0, 2) +
      "*".repeat(middleLength) +
      mobileNumber.slice(-2)
    );
  };

  const toggleEmailVisibility = () => {
    setShowEmail((prev) => !prev);
  };

  const toggleMobileNumberVisibility = () => {
    setShowMobileNumber((prev) => !prev);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "#F9F3EC",
        }}
        aria-live="polite"
      >
        <CircularProgress
          color="inherit"
          size={40}
          sx={{ color: "#235BDE" }}
          aria-label="Loading user profile"
        />
      </Box>
    );
  }

  return (
    <MainContainer>
      <ProfileCard>
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Box sx={{ position: "relative", display: "inline-block" }}>
            <StyledAvatar
              src={profile.url}
              alt={`${userDetails?.name || "User"}'s profile picture`}
            />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#1e1e1eff",
              fontFamily: "'Inter', sans-serif",
              mt: 2,
              fontSize: { xs: "1.5rem", sm: "2rem" } /* Responsive font size */,
            }}
            id="user-profile-title"
          >
            {userDetails?.name || "Unknown User"}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: "#6b7280",
              fontWeight: 500,
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
          >
            {userDetails?.location || "Jammu, Jammu"}
          </Typography>
        </Box>
        <Divider sx={{ my: 2, borderColor: "#E0E7FF" }} />
        <StatContainer>
          <StatBox
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/user/initiated")}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: "#0FB282",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              INITIATED
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#1e1e1eff",
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
              }}
            >
              {userDetails?.initiated ?? "N/A"}
            </Typography>
          </StatBox>
          <StatBox
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/user/incomplete")}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: "#F67015",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              INCOMPLETE
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: "#1e1e1eff",
                fontSize: { xs: "1.25rem", sm: "1.5rem" },
              }}
            >
              {userDetails?.incomplete ?? "N/A"}
            </Typography>
          </StatBox>
        </StatContainer>
        <Divider sx={{ my: 2, borderColor: "#E0E7FF" }} />
        <Box>
          <InfoItem>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: "#6b7280",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              Username
            </Typography>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 500,
                color: "#1e1e1eff",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              {userDetails?.username || "N/A"}
            </Typography>
          </InfoItem>
          <InfoItem>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: "#6b7280",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              Email
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  color: "#1e1e1eff",
                  wordBreak: "break-word",
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                {showEmail
                  ? userDetails?.email || "N/A"
                  : maskEmail(userDetails?.email)}
              </Typography>
              <Tooltip title={showEmail ? "Hide Email" : "Show Email"} arrow>
                <IconButton
                  onClick={toggleEmailVisibility}
                  aria-label={showEmail ? "Hide email" : "Show email"}
                  sx={{ color: "#235BDE", padding: { xs: "4px", sm: "8px" } }}
                >
                  {showEmail ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
            </Box>
          </InfoItem>
          <InfoItem>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                color: "#6b7280",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              Mobile Number
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 500,
                  color: "#1e1e1eff",
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                }}
              >
                {showMobileNumber
                  ? userDetails?.mobileNumber || "N/A"
                  : maskMobileNumber(userDetails?.mobileNumber)}
              </Typography>
              <Tooltip
                title={
                  showMobileNumber ? "Hide Mobile Number" : "Show Mobile Number"
                }
                arrow
              >
                <IconButton
                  onClick={toggleMobileNumberVisibility}
                  aria-label={
                    showMobileNumber
                      ? "Hide mobile number"
                      : "Show mobile number"
                  }
                  sx={{ color: "#235BDE", padding: { xs: "4px", sm: "8px" } }}
                >
                  {showMobileNumber ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </Tooltip>
            </Box>
          </InfoItem>
        </Box>
        <ActionButton
          variant="contained"
          startIcon={<Edit />}
          aria-label="Edit profile"
          onClick={() => navigate("/settings")}
        >
          Edit Profile
        </ActionButton>
      </ProfileCard>
      <ToastContainer
        toastStyle={{
          background: "white",
          color: "#1e1e1eff",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          fontSize: { xs: "0.875rem", sm: "1rem" },
        }}
      />
    </MainContainer>
  );
}
