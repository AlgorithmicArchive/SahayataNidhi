import { Box, Typography } from "@mui/material";
import React, { useEffect, useRef } from "react";
import { Col, Container, Row } from "react-bootstrap";
import CustomCard from "../../components/CustomCard";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function HomeScreen() {
  const navigate = useNavigate();
  const section1Ref = useRef();
  const card1Ref = useRef();
  const card2Ref = useRef();
  const card3Ref = useRef();

  useEffect(() => {
    gsap.fromTo(
      section1Ref.current,
      { opacity: 1 },
      {
        opacity: 0,
        duration: 1,
        scrollTrigger: {
          trigger: section1Ref.current,
          start: "bottom 90%",
          scrub: true,
          toggleActions: "restart none none none",
        },
      },
    );

    gsap.fromTo(
      [card1Ref.current, card2Ref.current, card3Ref.current],
      {
        x: -200,
        opacity: 0,
      },
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
                <Typography
                  sx={{
                    fontWeight: "bold",
                    wordBreak: "break-word",
                    maxWidth: { xs: "100%", md: "500px" },
                    fontSize: {
                      xs: "clamp(2rem, 8vw, 2.5rem)",
                      sm: "clamp(2.5rem, 7vw, 3rem)",
                      md: "clamp(3rem, 6vw, 3.75rem)",
                    },
                    lineHeight: 1.2,
                  }}
                >
                  Facilitating Financial Assistance for Every Citizen
                </Typography>

                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "text.secondary",
                    maxWidth: { xs: "100%", md: "500px" },
                    wordBreak: "break-word",
                    fontSize: {
                      xs: "clamp(0.9rem, 3vw, 1rem)",
                      sm: "clamp(1rem, 2.5vw, 1.1rem)",
                      md: "clamp(1.1rem, 2vw, 1.2rem)",
                    },
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
                    backgroundColor: "primary.main",
                    padding: { xs: "0.5rem 1rem", sm: "0.75rem 1.5rem" },
                    width: { xs: "100%", sm: "50%", md: "40%" },
                    color: "#FDF6F0",
                    fontWeight: "bold",
                    borderRadius: 1,
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
          backgroundColor: "background.default",
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
                    fontSize: {
                      xs: "clamp(1.5rem, 6vw, 2rem)",
                      sm: "clamp(2rem, 8vw, 3rem)",
                      md: "clamp(3rem, 10vw, 6rem)",
                    },
                    lineHeight: 1.4,
                    fontWeight: "bold",
                  }}
                >
                  Services Provided
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
                  Our platform offers a wide array of government-backed
                  financial assistance services designed to support economically
                  and socially vulnerable citizens. From scheme-specific
                  applications to transparent processing and sanctioning, each
                  service is aimed at promoting inclusive development and
                  ensuring timely support reaches those who need it most.
                </Typography>
              </Col>
            </Row>
            <Row className="g-4">
              <Col xs={12} sm={6} md={4}>
                <div ref={card1Ref}>
                  <CustomCard
                    heading={"Ladli Beti"}
                    discription={
                      "Aimed at promoting the education and well-being of the girl child, this scheme provides financial support to families for the upbringing and education of daughters. Eligible beneficiaries receive structured monetary assistance at different stages of the child's development to reduce gender disparity and encourage empowerment."
                    }
                  />
                </div>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <div ref={card2Ref}>
                  <CustomCard
                    heading={"Marriage Assistance"}
                    discription={
                      "This scheme extends financial assistance to economically disadvantaged women at the time of their marriage. It is intended to support families facing financial constraints, ensuring dignity and reducing the economic burden associated with marriage expenses."
                    }
                  />
                </div>
              </Col>
              <Col xs={12} sm={6} md={4}>
                <div ref={card3Ref}>
                  <CustomCard
                    heading={"JK-ISSS Pension"}
                    discription={
                      "This comprehensive pension program offers financial security to senior citizens, persons with disabilities, women in distress, and transgender individuals. Monthly pension support ensures dignity, inclusion, and sustenance for those in need, contributing to social justice and welfare."
                    }
                  />
                </div>
              </Col>
            </Row>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
