import React, { useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Container,
  Button,
  Card,
  CardContent,
  CardMedia,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Col, Row } from "react-bootstrap";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Block,
  ErrorOutline,
  Schedule,
  ContactSupportOutlined,
} from "@mui/icons-material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

gsap.registerPlugin(ScrollTrigger);

export default function NotValidated() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const card1Ref = useRef(null);
  const card2Ref = useRef(null);
  const card3Ref = useRef(null);
  const heroRef = useRef(null);

  useEffect(() => {
    // Hero animation
    if (heroRef.current) {
      gsap.fromTo(
        heroRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power2.out",
        },
      );
    }

    // Cards animation
    const cards = [card1Ref.current, card2Ref.current, card3Ref.current].filter(
      (ref) => ref !== null,
    );
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { x: 0, opacity: 0, scale: 0.9 },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: "back.out(1.7)",
          delay: 0.5,
        },
      );
    }

    // Scroll animations
    if (sectionRef.current) {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 1 },
        {
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            toggleActions: "restart none none none",
          },
        },
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const handleContactSupport = () => {
    toast.info("Contact support at: support@socialwelfare.gov.in", {
      position: "top-right",
      autoClose: 5000,
    });
  };

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>
      <ToastContainer position="top-right" autoClose={3000} />

      {/* Hero Section */}
      <Box
        ref={heroRef}
        sx={{
          minHeight: { xs: "100vh", sm: "80vh", md: "70vh" },
          width: "100%",
          display: "flex",
          alignItems: "center",
          py: { xs: 4, sm: 6, md: 8 },
          background:
            "linear-gradient(to bottom right, #F4F9FF 0%, #F9F3EC 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F67015' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: "60px 60px",
            },
          }}
        />

        <Container>
          <Row style={{ width: "100%", alignItems: "center" }}>
            <Col xs={12} md={6}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: { xs: 3, sm: 4, md: 5 },
                  px: { xs: 2, sm: 3 },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 3,
                  }}
                >
                  <ErrorOutline
                    sx={{
                      fontSize: { xs: 40, md: 60 },
                      color: "#F67015",
                    }}
                  />
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: {
                          xs: "clamp(1.5rem, 4vw, 2rem)",
                          sm: "clamp(1.75rem, 3.5vw, 2.5rem)",
                          md: "2.5rem",
                        },
                        color: "#235BDE",
                        lineHeight: 1.2,
                        mb: 1,
                      }}
                    >
                      Account Verification
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: {
                          xs: "clamp(1rem, 3vw, 1.2rem)",
                          sm: "clamp(1.1rem, 2.5vw, 1.3rem)",
                          md: "1.3rem",
                        },
                        color: "#666",
                        lineHeight: 1.4,
                      }}
                    >
                      Pending Approval
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    backgroundColor: "#fff",
                    borderRadius: 3,
                    p: 4,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    maxWidth: { xs: "100%", md: "500px" },
                    wordBreak: "break-word",
                    fontSize: {
                      xs: "clamp(0.9rem, 3vw, 1rem)",
                      sm: "clamp(1rem, 2.5vw, 1.1rem)",
                      md: "clamp(1.1rem, 2vw, 1.2rem)",
                    },
                  }}
                >
                  <Typography sx={{ lineHeight: 1.6, color: "#1e1e1e" }}>
                    <strong>Status:</strong> Your account has been successfully
                    registered but is <strong>awaiting validation</strong> by
                    the designated officer. This is a standard security measure
                    to ensure the integrity of our platform.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate("/contact")}
                    sx={{
                      flex: 1,
                      background: "linear-gradient(135deg, #F67015, #E4630A)",
                      borderRadius: 3,
                      py: 1.5,
                      px: 4,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      textTransform: "none",
                      boxShadow: "0 4px 16px rgba(246, 112, 21, 0.3)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #E4630A, #F67015)",
                        transform: "translateY(-2px)",
                        boxShadow: "0 6px 20px rgba(246, 112, 21, 0.4)",
                      },
                    }}
                  >
                    Track Status
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleContactSupport}
                    sx={{
                      flex: 1,
                      border: "2px solid #235BDE",
                      borderRadius: 3,
                      py: 1.5,
                      px: 4,
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: "#235BDE",
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "#235BDE",
                        color: "white",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    Contact Support
                  </Button>
                </Box>
              </Box>
            </Col>
            <Col xs={12} md={6}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: { xs: 4, sm: 0 },
                }}
              >
                <Card
                  sx={{
                    width: { xs: "100%", md: "90%" },
                    maxWidth: 400,
                    borderRadius: 4,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.1)",
                    border: "none",
                    overflow: "visible",
                    position: "relative",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: -8,
                      left: -8,
                      right: -8,
                      height: 8,
                      background:
                        "linear-gradient(90deg, #F67015, #235BDE, #0FB282)",
                      borderRadius: "8px 8px 0 0",
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="300"
                    image="/assets/images/pending-validation.png" // Add this image
                    alt="Pending Validation"
                    sx={{
                      borderRadius: "12px 12px 0 0",
                      objectFit: "cover",
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                          "linear-gradient(45deg, rgba(246,112,21,0.7), rgba(35,91,222,0.5))",
                        borderRadius: "12px 12px 0 0",
                      },
                    }}
                  />
                  <CardContent
                    sx={{
                      p: 4,
                      textAlign: "center",
                      background:
                        "linear-gradient(180deg, #fff 0%, #f8f9fa 100%)",
                      borderRadius: "0 0 12px 12px",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 2,
                      }}
                    >
                      <Block
                        sx={{
                          fontSize: 60,
                          color: "#F67015",
                          opacity: 0.8,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: "#235BDE",
                        mb: 1,
                        fontSize: { xs: "1.5rem", md: "1.75rem" },
                      }}
                    >
                      Verification Required
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#666",
                        lineHeight: 1.6,
                        mb: 3,
                      }}
                    >
                      Your account is under review by our officer team. This
                      process typically takes 24-48 hours.
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 1,
                        mb: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      <Schedule sx={{ color: "#0FB282" }} />
                      <Typography variant="body2" sx={{ color: "#0FB282" }}>
                        Processing Time: 24-48 Hours
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Col>
          </Row>
        </Container>
      </Box>

      {/* Why This Happens Section */}
      <Box
        ref={sectionRef}
        sx={{
          minHeight: { xs: "auto", sm: "80vh" },
          width: "100%",
          background:
            "linear-gradient(to bottom right, #F0F7FE 0%, #FDF7F0 100%)",
          py: { xs: 6, sm: 8, md: 10 },
        }}
      >
        <Container>
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              sx={{
                fontSize: { xs: "clamp(2rem, 4vw, 2.5rem)" },
                fontWeight: "bold",
                lineHeight: 1.3,
                mb: 2,
              }}
            >
              <Box
                component="span"
                sx={{
                  background: "linear-gradient(to right, #F67015, #235BDE)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Why This Step?
              </Box>
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                maxWidth: 800,
                mx: "auto",
                fontSize: {
                  xs: "clamp(0.9rem, 2.5vw, 1rem)",
                  sm: "clamp(1rem, 2vw, 1.1rem)",
                },
                lineHeight: 1.6,
              }}
            >
              This verification ensures that only authorized individuals access
              our welfare services, maintaining the integrity and security of
              the financial assistance programs.
            </Typography>
          </Box>

          <Row className="g-4" ref={sectionRef}>
            <Col xs={12} md={4} style={{ display: "flex" }}>
              <Card
                ref={card1Ref}
                sx={{
                  width: "100%",
                  borderRadius: 3,
                  boxShadow: "0 8px 24px rgba(246,112,21,0.1)",
                  border: "1px solid rgba(246,112,21,0.2)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 16px 32px rgba(246,112,21,0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      background: "linear-gradient(135deg, #F67015, #E4630A)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <ContactSupportOutlined
                      sx={{ fontSize: 40, color: "white" }}
                    />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#F67015",
                      mb: 2,
                      fontSize: { xs: "1.1rem", md: "1.25rem" },
                    }}
                  >
                    Security Verification
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "#666", lineHeight: 1.6 }}
                  >
                    Ensures only legitimate users access sensitive welfare
                    services and financial assistance programs.
                  </Typography>
                </CardContent>
              </Card>
            </Col>

            <Col xs={12} md={4} style={{ display: "flex" }}>
              <Card
                ref={card2Ref}
                sx={{
                  width: "100%",
                  borderRadius: 3,
                  boxShadow: "0 8px 24px rgba(35,91,222,0.1)",
                  border: "1px solid rgba(35,91,222,0.2)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 16px 32px rgba(35,91,222,0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      background: "linear-gradient(135deg, #235BDE, #1F43B5)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Schedule sx={{ fontSize: 40, color: "white" }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#235BDE",
                      mb: 2,
                      fontSize: { xs: "1.1rem", md: "1.25rem" },
                    }}
                  >
                    Quick Processing
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "#666", lineHeight: 1.6 }}
                  >
                    Officer validation typically completes within 24-48 hours,
                    ensuring swift access to required services.
                  </Typography>
                </CardContent>
              </Card>
            </Col>

            <Col xs={12} md={4} style={{ display: "flex" }}>
              <Card
                ref={card3Ref}
                sx={{
                  width: "100%",
                  borderRadius: 3,
                  boxShadow: "0 8px 24px rgba(15,178,130,0.1)",
                  border: "1px solid rgba(15,178,130,0.2)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: "0 16px 32px rgba(15,178,130,0.2)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      background: "linear-gradient(135deg, #0FB282, #4CAF50)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mx: "auto",
                      mb: 3,
                    }}
                  >
                    <Block sx={{ fontSize: 40, color: "white" }} />
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: "#0FB282",
                      mb: 2,
                      fontSize: { xs: "1.1rem", md: "1.25rem" },
                    }}
                  >
                    Access Control
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "#666", lineHeight: 1.6 }}
                  >
                    Prevents unauthorized access and maintains the integrity of
                    our welfare assistance distribution system.
                  </Typography>
                </CardContent>
              </Card>
            </Col>
          </Row>

          <Box sx={{ textAlign: "center", mt: 8 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: "#235BDE",
                mb: 2,
                fontSize: { xs: "1.5rem", md: "1.75rem" },
              }}
            >
              What Happens Next?
            </Typography>
            <Typography
              sx={{
                color: "text.secondary",
                maxWidth: 600,
                mx: "auto",
                lineHeight: 1.6,
                fontSize: {
                  xs: "clamp(0.9rem, 2.5vw, 1rem)",
                  sm: "clamp(1rem, 2vw, 1.1rem)",
                },
              }}
            >
              Once your account is validated by the officer, you'll receive a
              confirmation email and SMS. You can then log in and access all
              available welfare services immediately.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer CTA */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #235BDE, #1F43B5)",
          color: "white",
          py: { xs: 4, md: 6 },
          textAlign: "center",
        }}
      >
        <Container>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontSize: { xs: "2rem", md: "2.5rem" },
            }}
          >
            Ready When You Are
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: "1rem", md: "1.1rem" },
              mb: 4,
              opacity: 0.9,
              maxWidth: 600,
              mx: "auto",
            }}
          >
            Your verification is our priority. Check back soon or contact
            support if you need assistance with the process.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
