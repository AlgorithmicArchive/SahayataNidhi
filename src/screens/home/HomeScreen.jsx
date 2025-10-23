import { Box, Typography } from "@mui/material";
import React, { useEffect, useRef } from "react";
import { Col, Container, Row } from "react-bootstrap";
import CustomCard from "../../components/CustomCard";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  GirlSharp,
  FavoriteBorderOutlined,
  AccountBalanceSharp,
} from "@mui/icons-material";

gsap.registerPlugin(ScrollTrigger);

export default function HomeScreen() {
  const navigate = useNavigate();
  const section1Ref = useRef(null); // Ensure ref is initialized as null
  const card1Ref = useRef(null);
  const card2Ref = useRef(null);
  const card3Ref = useRef(null);

  useEffect(() => {
    // Check if refs are attached to DOM elements before animating
    const section1 = section1Ref.current;
    const cards = [card1Ref.current, card2Ref.current, card3Ref.current].filter(
      (ref) => ref !== null,
    );

    if (section1) {
      gsap.fromTo(
        section1,
        { opacity: 1 },
        {
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: section1,
            start: "bottom 90%",
            scrub: true,
            toggleActions: "restart none none none",
          },
        },
      );
    }

    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { x: -200, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 1,
          delay: 0.2,
          stagger: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card1Ref.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play reverse play reverse",
          },
        },
      );
    }

    // Cleanup ScrollTriggers on unmount
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <Box sx={{ width: "100%", overflowX: "hidden" }}>
      {/* Section 1 */}
      <Box
        ref={section1Ref}
        sx={{
          minHeight: { xs: "100vh", sm: "80vh", md: "70vh" },
          width: "100%",
          display: "flex",
          alignItems: "center",
          py: { xs: 4, sm: 6, md: 8 },
          background:
            "linear-gradient(to bottom right, #F4F9FF 0%, #F9F3EC 100%)",
        }}
      >
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
                    flexDirection: "column",
                    wordBreak: "break-word",
                    maxWidth: { xs: "100%", md: "500px" },
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: {
                        xs: "clamp(2.5rem, 6vw, 4.5rem)",
                        sm: "clamp(3rem, 7vw, 5.5rem)",
                        md: "72px",
                      },
                      color: "#F67015",
                      m: 0,
                      lineHeight: 1,
                    }}
                  >
                    Facilitating
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: {
                        xs: "clamp(2.5rem, 6vw, 4.5rem)",
                        sm: "clamp(3rem, 7vw, 5.5rem)",
                        md: "72px",
                      },
                      color: "#235BDE",
                      m: 0,
                      lineHeight: 1,
                    }}
                  >
                    Financial
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: {
                        xs: "clamp(2.5rem, 6vw, 4.5rem)",
                        sm: "clamp(3rem, 7vw, 5.5rem)",
                        md: "72px",
                      },
                      color: "#0FB282",
                      m: 0,
                      lineHeight: 1,
                    }}
                  >
                    Assistance
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 600,
                      fontSize: {
                        xs: "clamp(1.5rem, 5vw, 2rem)",
                        sm: "clamp(1.75rem, 5vw, 2.5rem)",
                        md: "2.5rem",
                      },
                      m: 1,
                      lineHeight: 1.5,
                    }}
                  >
                    for Every Citizen
                  </Typography>
                </Box>

                <Typography
                  variant="subtitle1"
                  sx={{
                    backgroundColor: "#fff",
                    borderRadius: 3,
                    p: 3,
                    color: "#1e1e1eff",
                    maxWidth: { xs: "100%", md: "800px" },
                    wordBreak: "break-word",
                    fontSize: {
                      xs: "clamp(0.9rem, 3vw, 1rem)",
                      sm: "clamp(1rem, 2.5vw, 1.1rem)",
                      md: "clamp(1.1rem, 2vw, 1.2rem)",
                    },
                    boxShadow: 3,
                  }}
                >
                  Submit your application for welfare schemes through a
                  transparent and structured process. Each form is carefully
                  evaluated and processed across designated phases before
                  approval and sanction.
                </Typography>

                <Box
                  component="button"
                  sx={{
                    border: "none",
                    background:
                      "linear-gradient(to bottom, #2562E9 0%, #1F43B5 100%)",
                    padding: { xs: "0.5rem 1rem", sm: "0.75rem 1.5rem" },
                    width: { xs: "100%", sm: "50%", md: "30%" },
                    color: "#FDF6F0",
                    fontWeight: "bold",
                    borderRadius: 3,
                    padding: 2,
                    fontSize: {
                      xs: "clamp(0.9rem, 3vw, 1rem)",
                      sm: "clamp(1rem, 2.5vw, 1.1rem)",
                    },
                    "&:hover": {
                      backgroundColor: "primary.dark",
                    },
                  }}
                  onClick={() => navigate("/login")}
                >
                  Get Started
                </Box>
              </Box>
            </Col>
            <Col xs={12} md={6}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: { xs: "center", md: "end" },
                  mt: { xs: 4, sm: 0 },
                }}
              >
                <Box
                  component="img"
                  src="/assets/images/socialwelfare.png"
                  sx={{
                    width: {
                      xs: "min(80vw, 200px)",
                      sm: "min(60vw, 300px)",
                      md: "min(50vw, 500px)",
                    },
                    maxWidth: "100%",
                    borderRadius: 5,
                    objectFit: "contain",
                  }}
                />
              </Box>
            </Col>
          </Row>
        </Container>
      </Box>
      {/* Section 2 */}
      <Box
        sx={{
          minHeight: { xs: "auto", sm: "80vh", md: "90vh" },
          width: "100%",
          background:
            "linear-gradient(to bottom right, #F0F7FE 0%, #FDF7F0 100%)",
          py: { xs: 4, sm: 6, md: 8 },
        }}
      >
        <Container>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 4, sm: 6, md: 8 },
              px: { xs: 2, sm: 3 },
            }}
          >
            <Row>
              <Col xs={12}>
                <Typography
                  sx={{
                    textAlign: "center",
                    fontSize: { xs: "clamp(3rem, 5vw, 3rem)" },
                    lineHeight: 1.4,
                    fontWeight: "bold",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      background:
                        "linear-gradient(to bottom right, #2561E8, #1F43B4)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mr: 1,
                    }}
                  >
                    Services
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      background:
                        "linear-gradient(to bottom right, #E4630A, #F9A825)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Provided
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    textAlign: "center",
                    color: "text.secondary",
                    wordBreak: "break-word",
                    px: { xs: 0, sm: 3, md: 5 },
                    fontSize: {
                      xs: "clamp(0.8rem, 2.5vw, 0.9rem)",
                      sm: "clamp(0.9rem, 2vw, 1rem)",
                      md: "clamp(1rem, 1.5vw, 1.1rem)",
                    },
                    mt: 2,
                  }}
                >
                  Government-backed financial assistance services for
                  economically and socially vulnerable citizens.
                </Typography>
              </Col>
            </Row>
            <Row className="g-4">
              <Col xs={12} sm={6} md={4} style={{ display: "flex" }}>
                <CustomCard
                  ref={card1Ref}
                  heading="Ladli Beti"
                  description="Aimed at promoting the education and well-being of the girl child, this scheme provides financial support to families for the upbringing and education of daughters. Eligible beneficiaries receive structured monetary assistance at different stages of the child's development to reduce gender disparity and encourage empowerment."
                  gradient="linear-gradient(to bottom right, #F44336, #E91E63)"
                  icon={<GirlSharp fontSize="large" />}
                />
              </Col>
              <Col xs={12} sm={6} md={4} style={{ display: "flex" }}>
                <CustomCard
                  ref={card2Ref}
                  heading="Marriage Assistance"
                  description="This scheme extends financial assistance to economically disadvantaged women at the time of their marriage. It is intended to support families facing financial constraints, ensuring dignity and reducing the economic burden associated with marriage expenses."
                  gradient="linear-gradient(to bottom right, #4CAF50, #81C784)"
                  icon={<FavoriteBorderOutlined fontSize="large" />}
                />
              </Col>
              <Col xs={12} sm={6} md={4} style={{ display: "flex" }}>
                <CustomCard
                  ref={card3Ref}
                  heading="JK-ISSS Pension"
                  description="This comprehensive pension program offers financial security to senior citizens, persons with disabilities, women in distress, and transgender individuals. Monthly pension support ensures dignity, inclusion, and sustenance for those in need, contributing to social justice and welfare."
                  gradient="linear-gradient(to bottom right, #2561E8, #1F43B4)"
                  icon={<AccountBalanceSharp fontSize="large" />}
                  showApplicationFlow={true}
                />
              </Col>
            </Row>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
