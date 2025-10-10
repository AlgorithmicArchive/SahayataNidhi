import React from "react";
import { Button, CircularProgress } from "@mui/material";

export default function CustomButton({
  text = "Click Me",
  onClick = null,
  bgColor = "primary.main", // use theme shorthand
  color = "background.paper", // use theme shorthand
  type = "button",
  disabled = false,
  width = null,
  isLoading = false,
}) {
  return (
    <Button
      variant="contained"
      onClick={onClick || undefined}
      type={type}
      disabled={disabled || isLoading}
      sx={{
        backgroundColor: bgColor,
        color: color,
        fontWeight: "normal",
        width: width,
        margin: "0 auto",
        textTransform: "none",
        fontSize: 14,
        borderRadius: 5,
        marginTop: 2,

        // Use theme-friendly styles for disabled
        "&:disabled": {
          backgroundColor: "divider",
          color: "text.secondary",
        },

        // Optional: hover state styling
        "&:hover": {
          backgroundColor: "primary.dark", // fallback if defined
        },
      }}
    >
      {isLoading ? <CircularProgress size={24} color="inherit" /> : text}
    </Button>
  );
}
