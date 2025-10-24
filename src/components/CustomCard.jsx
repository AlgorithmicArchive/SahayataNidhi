import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, Typography, Box, Button } from "@mui/material";

const CustomCard = ({
  heading,
  description,
  gradient,
  icon,
  flowchartSrc, // Optional: image path for flowchart
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const cardRef = useRef(null);
  const flowRef = useRef(null);
  const [linePath, setLinePath] = useState("");

  const truncatedDescription =
    description.length > 100 ? description.slice(0, 100) + "..." : description;

  const hasFlowchart = !!flowchartSrc;

  // Recalculate connector line on mount, resize, and when content changes
  useEffect(() => {
    const updateLine = () => {
      if (!hasFlowchart || !cardRef.current || !flowRef.current) {
        setLinePath("");
        return;
      }

      const cardRect = cardRef.current.getBoundingClientRect();
      const flowRect = flowRef.current.getBoundingClientRect();
      const containerRect =
        cardRef.current.parentElement?.getBoundingClientRect();

      if (!containerRect) return;

      const startX = cardRect.left + cardRect.width / 2 - containerRect.left;
      const startY = cardRect.bottom - containerRect.top;
      const endX = flowRect.left + flowRect.width / 2 - containerRect.left;
      const endY = flowRect.top - containerRect.top - 12;

      const cpOffset = 50;
      const path = `M ${startX},${startY}
                    C ${startX},${startY + cpOffset}
                      ${endX},${endY - cpOffset}
                      ${endX},${endY}`;

      setLinePath(path);
    };

    updateLine();
    const handleResize = () => updateLine();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [hasFlowchart, showFullDescription]);

  return (
    <Box sx={{ position: "relative", maxWidth: 400, mx: "auto" }}>
      {/* CARD */}
      <Box ref={cardRef}>
        <Card
          sx={{
            background:
              gradient || "linear-gradient(to bottom right, #2561E8, #1F43B4)",
            color: "#FFFFFF",
            borderRadius: 2,
            boxShadow: 6,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 3,
            pt: 4,
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            "&:hover": {
              transform: "scale(1.05)",
              boxShadow: 12,
            },
          }}
        >
          {icon && (
            <Box
              sx={{
                mb: 2,
                fontSize: { xs: 40, lg: 60 },
                width: { xs: 30, lg: 40 },
                height: { xs: 30, lg: 40 },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 3,
              }}
            >
              {icon}
            </Box>
          )}
          <CardContent sx={{ p: 0, textAlign: "center", width: "100%" }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                fontSize: { xs: "1.25rem", sm: "1.5rem", lg: "1.75rem" },
                lineHeight: 1.3,
                mb: 1,
              }}
            >
              {heading}
            </Typography>

            <Box
              sx={{
                backgroundColor: "rgba(255,255,255,0.15)",
                borderRadius: 2,
                p: 2,
                mb: 3,
                maxHeight: showFullDescription ? "none" : "100px",
                overflow: "hidden",
                transition: "max-height 0.3s ease",
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: "0.875rem", sm: "1rem", lg: "1rem" },
                  lineHeight: 1.5,
                  textAlign: "left",
                }}
              >
                {showFullDescription ? description : truncatedDescription}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              {description.length > 100 && (
                <Button
                  variant="text"
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  sx={{
                    color: "white",
                    textTransform: "none",
                    fontWeight: "bold",
                  }}
                >
                  {showFullDescription ? "Read Less" : "Read More"}
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* APPLICATION FLOW (Only if flowchartSrc is provided) */}
      {hasFlowchart && (
        <>
          {/* SVG Curved Connector Line */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 1,
              overflow: "visible",
            }}
          >
            <path
              d={linePath}
              stroke="#2561E8"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              opacity={0.8}
            />
          </svg>

          {/* Flowchart Section */}
          <Box
            ref={flowRef}
            sx={{
              mt: 7,
              textAlign: "center",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "#2561E8",
                mb: 2,
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}
            >
              Application Flow
            </Typography>

            <Box
              sx={{
                p: 2,
                backgroundColor: "#111",
                borderRadius: 2,
                display: "inline-block",
                boxShadow: 3,
                maxWidth: "100%",
              }}
            >
              <Box
                component="img"
                src={flowchartSrc}
                alt={`${heading} - Application Flow`}
                sx={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: 2,
                }}
              />
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};

export default CustomCard;
