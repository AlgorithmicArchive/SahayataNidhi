import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
} from "@mui/material";

const CustomCard = ({ heading, description, gradient, icon }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const truncatedDescription =
    description.length > 100 ? description.slice(0, 100) + "..." : description;

  return (
    <Box sx={{ position: "relative", maxWidth: 400, mx: "auto" }}>
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
          {description.length > 100 && (
            <Button
              variant="text"
              onClick={() => setShowFullDescription(!showFullDescription)}
              sx={{
                color: "white",
                textTransform: "none",
                fontWeight: "bold",
                mb: 2,
              }}
            >
              {showFullDescription ? "Read Less" : "Read More"}
            </Button>
          )}
          {/* <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
            <Button
              variant="contained"
              sx={{
                backgroundColor: "white",
                color: "#2561E8",
                fontWeight: "bold",
                borderRadius: 1,
                px: 3,
                py: 1,
                textTransform: "none",
              }}
            >
              Apply Now
            </Button>
            <Button
              variant="outlined"
              sx={{
                borderColor: "white",
                color: "white",
                fontWeight: "bold",
                borderRadius: 1,
                px: 3,
                py: 1,
                textTransform: "none",
              }}
            >
              Learn More
            </Button>
          </Box> */}
        </CardContent>
      </Card>
    </Box>
  );
};

export default CustomCard;
