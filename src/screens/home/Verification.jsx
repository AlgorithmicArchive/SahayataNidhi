import { Container, Typography, Button, Box } from "@mui/material";
import React, { useContext, useState } from "react";
import CustomInputField from "../../components/form/CustomInputField";
import { useForm } from "react-hook-form";
import CustomButton from "../../components/CustomButton";
import { useNavigate } from "react-router-dom";
import { Validate } from "../../assets/fetch";
import { UserContext } from "../../UserContext";

export default function Verification() {
  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm();

  const { setVerified, userType, username } = useContext(UserContext);
  const navigate = useNavigate();

  const handleOptionSelect = async (option) => {
    setSelectedOption(option);
    // if (option == "otp") {
    //   await fetch(`/Home/SendLoginOtp?username=${username}`);
    // }
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await Validate(formData);

      if (response.status) {
        setVerified(true);
        const url =
          response.userType === "Admin"
            ? "/admin/home"
            : response.userType === "Officer"
            ? "/officer/home"
            : response.userType === "Designer"
            ? "/designer/dashboard"
            : response.userType == "Viewer"
            ? "/viewer/home"
            : "/user/home";
        navigate(url);
      } else {
        console.error("Verification failed:", response.message);
        setErrorMessage(response.message || "Verification failed.");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setErrorMessage("An error occurred during verification.");
    }
  };

  return (
    <Box
      sx={{
        width: "100vw",
        height: "60vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 3,
        px: 2,
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: "bold", color: "text.primary" }}
      >
        Verification
      </Typography>

      {!selectedOption && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="contained"
            onClick={() => handleOptionSelect("otp")}
            sx={{
              backgroundColor: "primary.main",
              color: "background.paper",
              borderRadius: 3,
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "primary.dark",
              },
            }}
          >
            Use OTP Verification
          </Button>
          {userType != "Citizen" && (
            <Button
              variant="contained"
              onClick={() => handleOptionSelect("backup")}
              sx={{
                backgroundColor: "background.paper",
                color: "primary.main",
                borderRadius: 3,
                fontWeight: "bold",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "background.paper",
                },
              }}
            >
              Use Backup Codes
            </Button>
          )}
        </Box>
      )}

      {selectedOption && (
        <Box
          sx={{
            width: "100%",
            maxWidth: 400,
            backgroundColor: "background.paper",
            padding: 5,
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            boxShadow: 3,
          }}
        >
          <CustomInputField
            label={
              selectedOption === "otp"
                ? "Enter OTP sent to your Email and Mobile Number."
                : "Enter your backup code."
            }
            name={selectedOption === "otp" ? "otp" : "backupCode"}
            placeholder={selectedOption === "otp" ? "OTP" : "Backup Code"}
            type="text"
            control={control}
            rules={{
              required:
                selectedOption === "otp"
                  ? "OTP is required."
                  : "Backup Code is required.",
            }}
            errors={errors}
          />

          <CustomButton
            text="Submit"
            onClick={handleSubmit(onSubmit)}
            bgColor="primary.main"
            color="background.paper"
            width="100%"
          />
        </Box>
      )}

      {errorMessage && (
        <Typography color="error" variant="body2" sx={{ mt: 2 }}>
          {errorMessage}
        </Typography>
      )}
    </Box>
  );
}
