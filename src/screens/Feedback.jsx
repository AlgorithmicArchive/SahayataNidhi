import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  InputLabel,
  FormControl,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import axiosInstance from "../axiosConfig";

export default function Feedback() {
  const [formData, setFormData] = useState({
    Title: "", // Changed to match backend expectation
    Description: "", // Changed to match backend expectation
    files: [],
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      files: [...prev.files, ...newFiles],
    }));
    e.target.value = ""; // Reset input to allow re-selecting the same file
  };

  const handleRemoveFile = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formDataToSend = new FormData();
    formDataToSend.append("Title", formData.Title); // Capitalized
    formDataToSend.append("Description", formData.Description); // Capitalized
    formData.files.forEach((file, index) => {
      formDataToSend.append(`files`, file); // Match backend expectation
    });

    try {
      const response = await axiosInstance.post(
        "/Profile/CreateFeedback",
        formDataToSend,
      );
      setSnackbar({
        open: true,
        message: response.data.message || "Feedback submitted successfully!",
        severity: "success",
      });
      setFormData({
        Title: "",
        Description: "",
        files: [],
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to submit feedback",
        severity: "error",
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Submit Portal Feedback
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Title"
          name="Title" // Capitalized
          type="text"
          value={formData.Title}
          onChange={handleInputChange}
          required
          margin="normal"
          variant="outlined"
        />
        <TextField
          fullWidth
          label="Description"
          name="Description" // Capitalized
          value={formData.Description}
          onChange={handleInputChange}
          required
          margin="normal"
          variant="outlined"
          multiline
          rows={4}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel shrink htmlFor="files">
            Files
          </InputLabel>
          <input
            type="file"
            id="files"
            name="files"
            onChange={handleFileChange}
            multiple
            style={{ marginTop: "16px", padding: "10px" }}
          />
        </FormControl>
        {formData.files.length > 0 && (
          <Paper elevation={1} sx={{ mt: 2, p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Files:
            </Typography>
            <List dense>
              {formData.files.map((file, index) => (
                <ListItem
                  key={index}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <DeleteIcon sx={{ color: "red" }} />
                    </IconButton>
                  }
                >
                  <ListItemText primary={file.name} />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          disabled={formData.Title === "" || formData.Description === ""}
        >
          Submit Feedback
        </Button>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
