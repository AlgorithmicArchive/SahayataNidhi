import React, { useState, useEffect, useMemo, useContext } from "react";
import {
  Container,
  Typography,
  Box,
  Modal,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import ServerSideTable from "../../components/ServerSideTable";
import MessageModal from "../../components/MessageModal";
import axiosInstance from "../../axiosConfig";
import { UserContext } from "../../UserContext";

export default function ViewFeedbacks() {
  const { userType, officerAuthorities } = useContext(UserContext);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({
    title: "",
    message: "",
    type: "success",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [viewableFiles, setViewableFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileUrls, setFileUrls] = useState({});
  const [refreshTable, setRefreshTable] = useState(false);

  // Check if user has permission to resolve feedbacks
  const canResolveFeedbacks = useMemo(() => {
    return (
      officerAuthorities?.canDirectWithhold ||
      userType === "SeniorOfficer" ||
      userType === "Admin"
    );
  }, [userType, officerAuthorities]);

  // Simulate initial data fetch (for consistency with AddDepartment)
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  }, []);

  // Fetch file URLs when modal opens
  useEffect(() => {
    if (!modalOpen || viewableFiles.length === 0) return;

    const fetchFileUrls = async () => {
      const urls = {};
      for (const fileName of viewableFiles) {
        try {
          const response = await axiosInstance.get(
            `/Base/DisplayFile?fileName=${encodeURIComponent(fileName)}`,
            {
              responseType: "blob",
            },
          );
          const fileType = response.headers["content-type"];
          if (fileType.startsWith("image/") || fileType === "application/pdf") {
            urls[fileName] = URL.createObjectURL(response.data);
          }
        } catch (error) {
          console.error(`Error fetching file ${fileName}:`, error);
          urls[fileName] = null;
        }
      }
      setFileUrls(urls);
    };

    fetchFileUrls();

    // Cleanup object URLs on unmount or modal close
    return () => {
      Object.values(fileUrls).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [modalOpen, viewableFiles]);

  // Action functions for ServerSideTable
  const actionFunctions = {
    ViewFiles: (row) => {
      const feedback = row.original;
      // Filter files to only include images and PDFs
      const files = (feedback.files || []).filter(
        (fileName) => isImage(fileName) || isPdf(fileName),
      );
      setViewableFiles(files);
      setCurrentFileIndex(0);
      setModalOpen(true);
    },
    ResolveFeedback: async (row) => {
      if (!canResolveFeedbacks) {
        setErrorMessage("You do not have permission to resolve feedbacks.");
        setModalMessage({
          title: "Permission Error",
          message: "You do not have permission to resolve feedbacks.",
          type: "error",
        });
        setShowMessageModal(true);
        return;
      }
      const feedback = row.original;
      const formdata = new FormData();
      formdata.append("feedbackId", feedback.id);
      try {
        const response = await axiosInstance.post(
          "/Profile/UpdateFeedbackStatus",
          formdata,
        );
        setModalMessage({
          title: "Resolve Feedback",
          message: response.data.message || "Feedback resolved successfully",
          type: "success",
        });
        setShowMessageModal(true);
        setRefreshTable((prev) => !prev);
      } catch (error) {
        setErrorMessage(
          `Error resolving feedback: ${
            error.response?.data?.error || error.message
          }`,
        );
        setModalMessage({
          title: "Resolve Feedback",
          message: `Error resolving feedback: ${
            error.response?.data?.error || error.message
          }`,
          type: "error",
        });
        setShowMessageModal(true);
      }
    },
  };

  // Table columns
  const columns = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "title", headerName: "Title", flex: 1 },
    { field: "description", headerName: "Description", flex: 2 },
    { field: "createdOn", headerName: "Created On", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    { field: "files", headerName: "Files", flex: 1 },
    { field: "customActions", headerName: "Actions", flex: 1 },
  ];

  const isImage = (fileName) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
  };

  const isPdf = (fileName) => {
    return fileName.toLowerCase().endsWith(".pdf");
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setViewableFiles([]);
    setCurrentFileIndex(0);
    setFileUrls((prev) => {
      Object.values(prev).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      return {};
    });
  };

  const handleNextFile = () => {
    setCurrentFileIndex((prev) => (prev + 1) % viewableFiles.length);
  };

  const handlePrevFile = () => {
    setCurrentFileIndex(
      (prev) => (prev - 1 + viewableFiles.length) % viewableFiles.length,
    );
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "grey.100",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Feedback List
      </Typography>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {errorMessage}
        </Alert>
      )}
      <ServerSideTable
        url="/Profile/GetFeedbacks"
        Title="Feedbacks"
        extraParams={{}}
        canSanction={false}
        canHavePool={false}
        pendingApplications={false}
        actionFunctions={actionFunctions}
        columns={columns}
        refresh={refreshTable}
        onAction={(actionFunction, row) => actionFunctions[actionFunction](row)}
      />
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        aria-labelledby="file-modal"
        sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Box
          sx={{
            position: "relative",
            maxWidth: "90%",
            maxHeight: "90%",
            bgcolor: "white",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            textAlign: "center",
          }}
        >
          <IconButton
            sx={{ position: "absolute", top: 8, right: 8 }}
            onClick={handleCloseModal}
          >
            <CloseIcon />
          </IconButton>
          {viewableFiles.length > 0 ? (
            <>
              {fileUrls[viewableFiles[currentFileIndex]] ? (
                isImage(viewableFiles[currentFileIndex]) ? (
                  <Box
                    component="img"
                    src={fileUrls[viewableFiles[currentFileIndex]]}
                    alt={`Feedback file ${currentFileIndex + 1}`}
                    sx={{
                      maxWidth: "100%",
                      maxHeight: "80vh",
                      borderRadius: 1,
                    }}
                  />
                ) : isPdf(viewableFiles[currentFileIndex]) ? (
                  <Box
                    component="iframe"
                    src={fileUrls[viewableFiles[currentFileIndex]]}
                    title={`Feedback file ${currentFileIndex + 1}`}
                    sx={{
                      width: "100%",
                      height: "80vh",
                      border: "none",
                      borderRadius: 1,
                    }}
                  />
                ) : null
              ) : (
                <Typography>Loading file...</Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <IconButton
                  onClick={handlePrevFile}
                  disabled={viewableFiles.length <= 1}
                >
                  <NavigateBeforeIcon />
                </IconButton>
                <Typography component="span" sx={{ mx: 2 }}>
                  File {currentFileIndex + 1} of {viewableFiles.length}
                </Typography>
                <IconButton
                  onClick={handleNextFile}
                  disabled={viewableFiles.length <= 1}
                >
                  <NavigateNextIcon />
                </IconButton>
              </Box>
            </>
          ) : (
            <Typography>
              No viewable files (images or PDFs) available.
            </Typography>
          )}
        </Box>
      </Modal>
      <MessageModal
        title={modalMessage.title}
        message={modalMessage.message}
        type={modalMessage.type}
        key="feedbackAction"
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
      />
    </Container>
  );
}
