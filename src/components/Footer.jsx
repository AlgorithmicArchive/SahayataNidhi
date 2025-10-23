import { Box, Grid, Typography, Link, Divider } from "@mui/material";
import { Container } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import EmailIcon from "@mui/icons-material/Email";
import SupportIcon from "@mui/icons-material/Support";
import PhoneIcon from "@mui/icons-material/Phone";
import ListIcon from "@mui/icons-material/List";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <Box
      component="footer"
      sx={{
        background:
          "linear-gradient(135deg, #1F2937 0%, #1E3A8A 50%, #1F2937 100%)",
        color: "white",
        position: "relative",
        overflow: "hidden",
        py: 8,
      }}
    >
      {/* Background Pattern */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          backgroundImage: `radial-gradient(circle at 2px 2px, #3B82F6 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 10 }}>
        <Grid container spacing={4}>
          {/* Logo and Branding */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
              <Box sx={{ position: "relative", mr: 2 }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: "blue.500",
                    borderRadius: "50%",
                    filter: "blur(4px)",
                    opacity: 0.5,
                    transition: "opacity 0.3s",
                    "&:hover": { opacity: 0.75 },
                  }}
                />
                <Box
                  sx={{
                    position: "relative",
                    width: 64,
                    height: 64,
                    bgcolor:
                      "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid",
                    borderColor: "blue.400",
                    boxShadow: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "white" }}
                  >
                    ISSS
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "bold", color: "white" }}
                >
                  ISSS Pension
                </Typography>
                <Typography variant="body2" sx={{ color: "blue.200" }}>
                  Social Welfare Portal
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                bgcolor:
                  "linear-gradient(to right, rgba(30, 64, 175, 0.3), transparent)",
                p: 3,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "blue.700",
                backdropFilter: "blur(4px)",
              }}
            >
              <Typography
                variant="body1"
                sx={{ color: "blue.100", mb: 1, fontWeight: "medium" }}
              >
                Department of Social Welfare
                <br />
                Government of Jammu and Kashmir
              </Typography>
              <Typography variant="body2" sx={{ color: "blue.300" }}>
                @2025 Social Welfare Department
              </Typography>
            </Box>
          </Grid>

          {/* Quick Links */}
          <Grid item xs={12} md={3}>
            <Box
              sx={{
                bgcolor:
                  "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.1))",
                p: 3,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "orange.400",
                backdropFilter: "blur(4px)",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "orange.300",
                  mb: 3,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ListIcon sx={{ mr: 1 }} />
                Quick Links
              </Typography>
              <Box
                component="ul"
                sx={{
                  listStyle: "none",
                  p: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                {[
                  // { label: "About", href: "#about" },
                  // { label: "Support", href: "#support" },
                  {
                    label: "Register",
                    href: "/register",
                    onClick: () => navigate("/register"),
                  },
                ].map((link) => (
                  <Box component="li" key={link.label}>
                    <Link
                      href={link.href}
                      onClick={(e) => {
                        if (link.onClick) {
                          e.preventDefault();
                          link.onClick();
                        }
                      }}
                      sx={{
                        color: "gray.300",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        fontWeight: "medium",
                        display: "flex",
                        alignItems: "center",
                        "&:hover": { color: "orange.300" },
                        transition: "color 0.3s",
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          bgcolor: "orange.500",
                          borderRadius: "50%",
                          mr: 1,
                          transition: "background-color 0.3s",
                          "&:hover": { bgcolor: "orange.300" },
                        }}
                      />
                      {link.label}
                    </Link>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>

          {/* Contact Info */}
          <Grid item xs={12} md={3}>
            <Box
              sx={{
                bgcolor:
                  "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(29, 78, 216, 0.1))",
                p: 3,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "blue.400",
                backdropFilter: "blur(4px)",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "blue.300",
                  mb: 3,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <EmailIcon sx={{ mr: 1 }} />
                Contact
              </Typography>
              <Box
                component="ul"
                sx={{
                  listStyle: "none",
                  p: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Box
                  component="li"
                  sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
                >
                  <EmailIcon sx={{ color: "blue.400", mt: 0.5 }} />
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "gray.300", fontWeight: "medium" }}
                    >
                      Email:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "blue.200" }}>
                      info@jksocialwelfare.gov.in
                    </Typography>
                  </Box>
                </Box>
                <Box
                  component="li"
                  sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
                >
                  <SupportIcon sx={{ color: "blue.400", mt: 0.5 }} />
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "gray.300", fontWeight: "medium" }}
                    >
                      Support:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "blue.200" }}>
                      anil.akrsp@nic.in
                    </Typography>
                  </Box>
                </Box>
                <Box
                  component="li"
                  sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
                >
                  <PhoneIcon sx={{ color: "blue.400", mt: 0.5 }} />
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "gray.300", fontWeight: "medium" }}
                    >
                      Helpline:
                    </Typography>
                    <Typography variant="body2" sx={{ color: "blue.200" }}>
                      1800-XXX-XXXX
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Bottom Bar */}
        <Divider sx={{ borderColor: "blue.700", opacity: 0.3, mt: 6, mb: 4 }} />
        <Box
          sx={{
            bgcolor:
              "linear-gradient(to right, rgba(31, 41, 55, 0.5), rgba(30, 64, 175, 0.3))",
            borderRadius: 2,
            p: 3,
            backdropFilter: "blur(4px)",
            border: "1px solid",
            borderColor: "gray.700",
            opacity: 0.3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: "gray.300", fontWeight: "medium" }}
            >
              © 2025 Department of Social Welfare, J&K. All rights reserved.
            </Typography>
            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[
                { label: "Privacy Policy", href: "#privacy" },
                { label: "Terms of Service", href: "#terms" },
                { label: "Accessibility", href: "#accessibility" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  sx={{
                    color: "gray.400",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    fontWeight: "medium",
                    "&:hover": {
                      color: "blue.300",
                      textDecoration: "underline",
                      textDecorationColor: "blue.300",
                      textDecorationThickness: 2,
                    },
                    transition: "all 0.3s",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
