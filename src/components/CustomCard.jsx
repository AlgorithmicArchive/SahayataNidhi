import React from "react";
import { Card, CardContent, Typography } from "@mui/material";

const CustomCard = ({ heading, discription }) => {
  return (
    <Card
      sx={{
        backgroundColor: "#D2946A",
        color: "#FFFFFF", // white text for contrast
        maxWidth: { xs: 600, lg: 400 },
        margin: "auto",
        borderRadius: 3,
        boxShadow: 3,
        height: { xs: "max-content", lg: 400 },
      }}
    >
      <CardContent>
        <Typography
          variant="h5"
          sx={{
            fontWeight: "bold",
            fontSize: { xs: "16px", lg: "24px" },
            lineHeight: 1.3,
          }}
          translate="no" // Prevent translation
          className="notranslate" // Fallback for compatibility
        >
          {heading}
        </Typography>
        <Typography
          variant="body1"
          sx={{ mt: 1, fontSize: { xs: "8px", lg: "16px" }, lineHeight: 1.5 }}
        >
          {discription}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default CustomCard;
