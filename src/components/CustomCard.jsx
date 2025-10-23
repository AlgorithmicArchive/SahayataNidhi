import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";

const CustomCard = ({
  heading,
  description,
  gradient,
  icon,
  showApplicationFlow = false,
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const truncatedDescription =
    description.length > 100 ? description.slice(0, 100) + "..." : description;

  return (
    <>
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
              {showApplicationFlow && (
                <Button
                  variant="text"
                  onClick={() => setOpenModal(true)}
                  sx={{
                    color: "white",
                    textTransform: "none",
                    fontWeight: "bold",
                  }}
                >
                  Application Flow
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Modal with Flowchart Image */}
      {showApplicationFlow && (
        <Dialog
          open={openModal}
          onClose={() => setOpenModal(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ textAlign: "center", fontWeight: "bold" }}>
            Application Flow for JK-ISSS Pension
          </DialogTitle>
          <DialogContent
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "black",
              p: 3,
            }}
          >
            <Box
              component="img"
              src="/assets/images/JK_ISSS_Flowchart.png"
              alt="Application Flowchart"
              sx={{
                maxWidth: "100%",
                height: "auto",
                borderRadius: 2,
                boxShadow: 3,
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default CustomCard;
