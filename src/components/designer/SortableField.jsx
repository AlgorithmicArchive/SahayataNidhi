import React from "react";
import {
  Box,
  TextField,
  Typography,
  Select,
  MenuItem,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import { Col } from "react-bootstrap";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";

const SortableField = ({
  field,
  sectionId,
  onEditField,
  onAdditonalModal,
  onFieldChange,
  onRemoveField,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const renderFieldInput = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "file":
      case "date":
        return (
          <TextField
            fullWidth
            type={field.type}
            size="small"
            placeholder={field.label}
            value={field.value || ""}
            onChange={(e) => onFieldChange && onFieldChange(sectionId, field.id, e.target.value)}
            inputProps={
              field.type === "file" && field.accept !== ""
                ? { accept: field.accept }
                : {}
            }
            sx={{
              bgcolor: "white",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "grey.300" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "& .MuiInputBase-input": { color: "grey.800" },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "grey.500",
                opacity: 1,
              },
            }}
          />
        );
      case "select":
        return (
          <Select
            fullWidth
            size="small"
            value={
              field.value ||
              (field.options.length > 0 ? field.options[0].value : "")
            }
            onChange={(e) => onFieldChange && onFieldChange(sectionId, field.id, e.target.value)}
            sx={{
              bgcolor: "white",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "grey.300" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "& .MuiSelect-select": { color: "grey.800" },
              },
            }}
          >
            {field.options.map((option, index) => (
              <MenuItem key={index} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        );
      case "enclosure":
        return (
          <>
            <Select
              fullWidth
              size="small"
              value={
                field.value ||
                (field.options.length > 0 ? field.options[0].value : "")
              }
              onChange={(e) =>
                onFieldChange && onFieldChange(sectionId, field.id, e.target.value)
              }
              sx={{
                bgcolor: "white",
                borderRadius: 1,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "grey.300" },
                  "&:hover fieldset": { borderColor: "primary.main" },
                  "& .MuiSelect-select": { color: "grey.800" },
                },
              }}
            >
              {field.options.map((option, index) => (
                <MenuItem key={index} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <TextField
              fullWidth
              type="file"
              size="small"
              placeholder={field.label}
              value={field.value || ""}
              onChange={(e) =>
                onFieldChange && onFieldChange(sectionId, field.id, e.target.value)
              }
              sx={{
                mt: 2,
                bgcolor: "white",
                borderRadius: 1,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "grey.300" },
                  "&:hover fieldset": { borderColor: "primary.main" },
                  "& .MuiInputBase-input": { color: "grey.800" },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "grey.500",
                  opacity: 1,
                },
              }}
            />
          </>
        );
      default:
        return (
          <TextField
            fullWidth
            size="small"
            placeholder={field.label}
            value={field.value || ""}
            onChange={(e) => onFieldChange && onFieldChange(sectionId, field.id, e.target.value)}
            sx={{
              bgcolor: "white",
              borderRadius: 1,
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "grey.300" },
                "&:hover fieldset": { borderColor: "primary.main" },
                "& .MuiInputBase-input": { color: "grey.800" },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "grey.500",
                opacity: 1,
              },
            }}
          />
        );
    }
  };

  return (
    <Col ref={setNodeRef} xs={12} lg={field.span}>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 1,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.200",
          "&:hover": {
            borderColor: "primary.main",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          },
          transition: "all 0.2s ease-in-out",
          transform: CSS.Transform.toString(transform),
          transition,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Tooltip title="Drag to reorder">
            <IconButton
              {...attributes}
              {...listeners}
              sx={{ mr: 1, cursor: "grab" }}
            >
              <DragIndicatorIcon sx={{ color: "grey.600" }} />
            </IconButton>
          </Tooltip>
          <Typography
            variant="body2"
            sx={{ flexGrow: 1, fontWeight: "bold", color: "grey.800" }}
          >
            {field.label} ({field.type})
          </Typography>
          {(field.editable ?? true) && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Edit Field">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditField && onEditField({ ...field, sectionId });
                  }}
                  sx={{
                    color: "primary.main",
                    "&:hover": { bgcolor: "primary.light" },
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove Field">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    // FIXED: Always pass only field.id, not sectionId
                    onRemoveField && onRemoveField(field.id);
                  }}
                  sx={{
                    color: "error.main",
                    "&:hover": { bgcolor: "error.light" },
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              {(field.type === "select" || field.type === "enclosure") && (
                <Tooltip title="Additional Settings">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdditonalModal && onAdditonalModal({ ...field, sectionId });
                    }}
                    sx={{
                      color: "secondary.main",
                      "&:hover": { bgcolor: "secondary.light" },
                    }}
                  >
                    <AddCircleOutlineIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>
        {renderFieldInput()}
      </Paper>
    </Col>
  );
};

export default SortableField;