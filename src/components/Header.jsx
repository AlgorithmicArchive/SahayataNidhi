import React, { useEffect, useState } from "react";
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

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
          backgroundColor: "#FFF3CD",
          borderBottom: "2px solid #333333",
          overflow: "hidden",
        }}
      >
        <Container>
          <Typography
            sx={{
              py: 1,
              px: { xs: 2, md: 6 },
              color: "#856404",
              fontSize: { xs: "0.9rem", md: "1rem" },
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
            <a href="mailto:anil.abrol@nic.in">anil.abrol@nic.in</a>.
          </Typography>
        </Container>
      </Box>

      {/* Top Row */}
      <Box sx={{ borderBottom: "2px solid #333333" }}>
        <Container>
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              color: "#333333",
              py: 1,
              px: { xs: 2, md: 6 },
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              alignItems: "center",
              gap: 3,
            }}
            translate="no"
            className="notranslate"
          >
            <Typography>जम्मू और कश्मीर सरकार</Typography>
            <Typography>GOVERNMENT OF JAMMU AND KASHMIR</Typography>
            <Typography>حکومت جموں و کشمیر</Typography>

            <Box
              sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 3 }}
            >
              <Select displayEmpty size="small" sx={{ minWidth: 60 }}>
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
      <Box sx={{ borderBottom: "2px solid #333333" }}>
        <Container>
          <Box
            sx={{
              backgroundColor: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1,
              px: { xs: 2, md: 6 },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 2, md: 0 },
            }}
            translate="no"
            className="notranslate"
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: { xs: "center", md: "flex-start" },
                alignItems: "center",
                gap: 2,
                flexDirection: { xs: "column", md: "row" },
              }}
            >
              <Box
                component="img"
                src="/assets/images/emblem.png"
                alt="Gov Emblem"
                sx={{ width: { xs: "15vw", md: "5vw" }, maxWidth: "80px" }}
              />
              <Typography
                variant="h6"
                sx={{
                  textAlign: "center",
                  fontWeight: "bold",
                  color: "text.primary",
                  fontSize: { xs: "1rem", md: "1.25rem" },
                }}
              >
                समाज कल्याण विभाग
                <br />
                DEPARTMENT OF SOCIAL WELFARE
                <br />
                محکمہ سوشیل ویلفیئر
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: { xs: "center", md: "flex-end" },
                alignItems: "center",
              }}
            >
              <Box
                component="img"
                src="/assets/images/swach-bharat.png"
                alt="Swachh Bharat"
                sx={{ height: { xs: "80px", md: "100px" } }}
              />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Navbar Row */}
      <Box>
        <MyNavbar />
      </Box>
    </Box>
  );
};

export default Header;
