import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Container,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
} from "@mui/material";
import GoogleTranslateWidget from "./GoogleTranslateWidget";
import MyNavbar from "./Navbar";
import {
  decreaseFont,
  getCurrentScale,
  increaseFont,
  resetFont,
  setFontScale,
} from "../assets/FontScaler";
import { UserContext } from "../UserContext";

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { userType } = useContext(UserContext)

  const [fontSizeValue, setFontSizeValue] = useState("normal");

  useEffect(() => {
    const currentScale = getCurrentScale();
    if (currentScale === 1) setFontSizeValue("normal");
    else if (currentScale > 1) setFontSizeValue("large");
    else setFontSizeValue("small");
  }, []);

  const handleFontChange = (event) => {
    const value = event.target.value;
    setFontSizeValue(value);

    switch (value) {
      case "small":
        setFontScale(0.9);
        break;
      case "normal":
        setFontScale(1);
        break;
      case "large":
        setFontScale(1.2);
        break;
      default:
        setFontScale(1);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Banner with Marquee Effect */}
      <Box
        sx={{
          backgroundColor: "#0C7F6D",
          borderBottom: "2px solid #333333",
          overflow: "hidden",
        }}
      >
        <Container>
          <Typography
            sx={{
              color: "#fff",
              fontSize: { xs: "0.9rem", md: "0.8rem" },
              fontWeight: "500",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
              whiteSpace: "nowrap",
              display: "inline-block",
              animation: "marquee 20s linear infinite",
              "@keyframes marquee": {
                "0%": { transform: "translateX(100%)" },
                "100%": { transform: "translateX(-100%)" },
              },
            }}
            translate="no"
            className="notranslate"
          >
            This is a demo portal for testing only. Data entered here will not
            be transferred to the working portal. Send suggestion / feedback to{" "}
            <a
              href="mailto:anil.abrol@nic.in"
              style={{ color: "#fef3c7", fontWeight: "bold" }}
            >
              anil.abrol@nic.in
            </a>
            .
          </Typography>
        </Container>
      </Box>

      {/* Top Row */}
      <Box sx={{ borderBottom: "1px solid #ccc", backgroundColor: "#eff6ff" }}>
        <Container maxWidth={false} disableGutters>
          <Box
            sx={{
              display: "flex", // Always flex, no block on xs
              flexWrap: "nowrap", // Prevent wrapping
              justifyContent: "space-between",
              alignItems: "center",
              overflowX: "auto", // allow scroll on very small screens instead of wrapping
              whiteSpace: "nowrap",
              py: 0.5,
              px: { xs: 2, md: 10, lg: 20 },
              color: "#1a237e",
              fontSize: { xs: "0.7rem", md: "0.875rem" },
              gap: { xs: 1, md: 2 },
              "&::-webkit-scrollbar": { display: "none" }, // hide scrollbar for clean look
            }}
            translate="no"
            className="notranslate"
          >
            {/* Left multilingual text */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                gap: { xs: 1, sm: 2 },
              }}
            >
              <Typography
                sx={{
                  color: "#1D4ED8",
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  fontWeight: "bold",
                }}
              >
                जम्मू और कश्मीर सरकार
              </Typography>

              <Box
                sx={{
                  width: "1px",
                  backgroundColor: "black",
                  height: "18px",
                  display: { xs: "none", sm: "block" },
                }}
              />

              <Typography
                sx={{
                  color: "#1E3A8A",
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  fontWeight: "bold",
                }}
              >
                GOVERNMENT OF JAMMU AND KASHMIR
              </Typography>

              <Box
                sx={{
                  width: "1px",
                  backgroundColor: "black",
                  height: "18px",
                  display: { xs: "none", sm: "block" },
                }}
              />

              <Typography
                sx={{
                  color: "#1D4ED8",
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  fontWeight: "bold",
                }}
              >
                حکومت جموں و کشمیر
              </Typography>
            </Box>

            {/* Right-side controls */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                gap: { xs: 1, sm: 2 },
              }}
            >
              <Select
                displayEmpty
                size="small"
                sx={{
                  width: "auto",
                  minWidth: "unset",
                  border: "1px solid #1D4ED8",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  "& .MuiSelect-select": {
                    pl: 1,
                    pr: "8px !important",
                    py: 0.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "&:hover": { borderColor: "#1E40AF" },
                  "& .MuiSvgIcon-root": { display: "none" },
                }}
                MenuProps={{
                  PaperProps: { sx: { borderRadius: "8px" } },
                }}
              >
                <MenuItem onClick={decreaseFont}>A-</MenuItem>
                <MenuItem onClick={resetFont}>A</MenuItem>
                <MenuItem onClick={increaseFont}>A+</MenuItem>
              </Select>

              <GoogleTranslateWidget />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Middle Row */}
      {(userType == null || userType == "Citizen") && <Box sx={{ borderBottom: "1px solid #ccc", backgroundColor: "#F7FBFF" }}>
        <Container maxWidth={false} disableGutters>
          <Box
            sx={{
              display: "flex",
              flexWrap: "nowrap", // prevent wrapping
              justifyContent: "space-between",
              alignItems: "center",
              overflowX: "auto", // scroll on very small screens
              whiteSpace: "nowrap",
              py: 0.5,
              px: { xs: 2, md: 10, lg: 20 },
              color: "#1a237e",
              fontSize: { xs: "0.7rem", md: "0.875rem" },
              gap: { xs: 1, md: 2 },
              "&::-webkit-scrollbar": { display: "none" }, // hide scrollbar
            }}
            translate="no"
            className="notranslate"
          >
            {/* Left: Emblem + Text */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexDirection: "row", // always row
                textAlign: "left", // always left
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: { xs: "40px", sm: "50px", md: "4vw" },
                  height: { xs: "40px", sm: "50px", md: "4vw" },
                  backgroundColor: "rgba(255, 255, 255, 0.2)", // translucent background
                  backdropFilter: "blur(6px)", // optional glassy effect
                  borderRadius: 2, // rounded corners
                  padding: 1,
                  border: "1px solid rgba(0,0,0,0.1)", // subtle border
                  flexShrink: 0,
                }}
              >
                <Box
                  component="img"
                  src="/assets/images/emblem.png"
                  alt="Gov Emblem"
                  sx={{
                    width: "70%", // scale inside shaded box
                    height: "70%",
                    objectFit: "contain",
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5, // spacing between lines
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#E4630A",
                    fontSize: { xs: "0.65rem", sm: "0.75rem", md: "0.75rem" },
                    lineHeight: 1.3,
                    paddingLeft: 1,
                    borderLeft: "3px solid #E4630A",
                  }}
                >
                  समाज कल्याण विभाग
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#1E3267",
                    fontSize: { xs: "0.65rem", sm: "0.75rem", md: "0.75rem" },
                    lineHeight: 1.3,
                    paddingLeft: 1,
                    borderLeft: "3px solid #1E3267",
                  }}
                >
                  DEPARTMENT OF SOCIAL WELFARE
                </Typography>

                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    color: "#0E766D",
                    fontSize: { xs: "0.65rem", sm: "0.75rem", md: "0.75rem" },
                    lineHeight: 1.3,
                    paddingLeft: 1,
                    borderLeft: "3px solid #0E766D",
                  }}
                >
                  محکمہ سوشیل ویلفیئر
                </Typography>
              </Box>
            </Box>

            {/* Right: Swachh Bharat Logo */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                flexShrink: 0, // prevent shrinking
                ml: 2,
              }}
            >
              <Box
                component="img"
                src="/assets/images/swach-bharat.png"
                alt="Swachh Bharat"
                sx={{
                  height: { xs: "50px", sm: "60px", md: "100px" }, // responsive heights
                }}
              />
            </Box>
          </Box>
        </Container>
      </Box>}

      {/* Navbar Row */}
      <Box
        sx={{
          borderBottom: "3px solid",
          borderImage: "linear-gradient(to right, #43CDB1, #E19A4D) 1",
        }}
      >
        <Container maxWidth={false} disableGutters>
          <Box
            sx={{
              display: "flex", // Always flex, no block on xs
              flexWrap: "nowrap", // Prevent wrapping
              justifyContent: "space-between",
              alignItems: "center",
              overflowX: "auto", // allow scroll on very small screens instead of wrapping
              whiteSpace: "nowrap",
              py: 0.5,
              px: { xs: 2, md: 10, lg: 20 },
              color: "#1a237e",
              fontSize: { xs: "0.7rem", md: "0.875rem" },
              gap: { xs: 1, md: 2 },
              "&::-webkit-scrollbar": { display: "none" }, // hide scrollbar for clean look
            }}
            translate="no"
            className="notranslate"
          >
            <MyNavbar />
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Header;
