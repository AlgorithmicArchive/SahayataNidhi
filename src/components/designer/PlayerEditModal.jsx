import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Modal,
  FormControlLabel,
  Checkbox,
  Typography,
  InputLabel,
  Select,
  FormControl,
  MenuItem,
} from "@mui/material";
import FieldEditModal from "./FieldEditModal";
import SortableField from "./SortableField";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "react-toastify";

// Utility function to sanitize actionForm options
const sanitizeActionForm = (actionForm) => {
  return actionForm.map((field) => {
    if (field.options) {
      return {
        ...field,
        options: field.options.filter(
          (opt) =>
            !opt.label?.toLowerCase().includes("withhold") &&
            !opt.value?.toLowerCase().includes("withhold"),
        ),
        dependentOptions: field.dependentOptions
          ? Object.fromEntries(
              Object.entries(field.dependentOptions).map(([key, opts]) => [
                key,
                opts.filter(
                  (opt) =>
                    !opt.label?.toLowerCase().includes("withhold") &&
                    !opt.value?.toLowerCase().includes("withhold"),
                ),
              ]),
            )
          : field.dependentOptions,
      };
    }
    return field;
  });
};

const PlayerEditModal = ({ player, onClose, onSave, players }) => {
  const [editedPlayer, setEditedPlayer] = useState({
    ...player,
    canHavePool: player.canHavePool || false,
    canManageBankFiles: player.canManageBankFiles || false,
    canWithhold: player.canWithhold || false,
    canValidateAadhaar: player.canValidateAadhaar || false,
    actionForm: sanitizeActionForm(player.actionForm || []),
  });
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [designations, setDesignations] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    async function getDesignations() {
      try {
        const response = await fetch("/Base/GetDesignations");
        const result = await response.json();
        if (result.status && result.designations) {
          setDesignations(result.designations);
        } else {
          console.error("Failed to fetch designations:", result);
        }
      } catch (error) {
        console.error("Error fetching designations:", error);
      }
    }
    getDesignations();
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = editedPlayer.actionForm.findIndex(
      (field) => field.id === active.id,
    );
    const newIndex = editedPlayer.actionForm.findIndex(
      (field) => field.id === over.id,
    );

    const newActionForm = arrayMove(
      editedPlayer.actionForm,
      oldIndex,
      newIndex,
    );
    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: newActionForm,
    }));
    console.log("Reordered actionForm:", newActionForm);
  };

  const handleChange = (field, value) => {
    // Check for exclusive authorities
    if (field === "canCorrigendum" && value) {
      const otherCorrigendum = players.find(
        (p) => p.playerId !== editedPlayer.playerId && p.canCorrigendum,
      );
      if (otherCorrigendum) {
        toast.error(
          `Another player (${otherCorrigendum.designation}) already has Can Corrigendum authority.`,
        );
        return;
      }
    }
    if (field === "canManageBankFiles" && value) {
      const otherBankFiles = players.find(
        (p) => p.playerId !== editedPlayer.playerId && p.canManageBankFiles,
      );
      if (otherBankFiles) {
        toast.error(
          `Another player (${otherBankFiles.designation}) already has Can Manage Bank Files authority.`,
        );
        return;
      }
    }
    if (field === "canWithhold" && value) {
      const otherWithhold = players.find(
        (p) => p.playerId !== editedPlayer.playerId && p.canWithhold,
      );
      if (otherWithhold) {
        toast.error(
          `Another player (${otherWithhold.designation}) already has Can Withhold authority.`,
        );
        return;
      }
    }
    if (field === "canValidateAadhaar" && value) {
      const otherValidateAadhaar = players.find(
        (p) => p.playerId !== editedPlayer.playerId && p.canValidateAadhaar,
      );
      if (otherValidateAadhaar) {
        toast.error(
          `Another player (${otherValidateAadhaar.designation}) already has Can Validate Aadhaar authority.`,
        );
        return;
      }
    }

    setEditedPlayer((prev) => ({
      ...prev,
      [field]: value,
    }));
    console.log(`Updated ${field}:`, value);
  };

  const addActionFormField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "New Field",
      name: `NewField_${Date.now()}`,
      minLength: 5,
      maxLength: 50,
      options: [],
      span: 12,
      validationFunctions: [],
      transformationFunctions: [],
      additionalFields: {},
      accept: "",
    };
    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: prev.actionForm ? [...prev.actionForm, newField] : [newField],
    }));
    console.log("Added new field:", newField);
  };

  const handleEditField = (field) => {
    setSelectedField(field);
    setIsFieldModalOpen(true);
    console.log("Editing field:", field);
  };

  const handleRemoveField = (sectionId, fieldId) => {
    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: prev.actionForm.filter((field) => field.id !== fieldId),
    }));
    console.log(`Removed field with id: ${fieldId}`);
  };

  const updateField = (updatedField) => {
    console.log("Updated Field:", updatedField);
    setEditedPlayer((prev) => {
      const newActionForm = prev.actionForm.map((field) =>
        field.id === updatedField.id ? updatedField : field,
      );
      return { ...prev, actionForm: sanitizeActionForm(newActionForm) };
    });
    setIsFieldModalOpen(false);
    setSelectedField(null);
  };

  const handleSave = () => {
    console.log("Saving editedPlayer:", editedPlayer);
    onSave(editedPlayer);
    onClose();
  };

  return (
    <Modal open onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Edit Player
        </Typography>
        <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
          <InputLabel id="designation-select-label">Designation</InputLabel>
          <Select
            labelId="designation-select-label"
            label="Designation"
            value={editedPlayer.designation || ""}
            onChange={(e) => handleChange("designation", e.target.value)}
          >
            <MenuItem value="">
              <em>Select Designation</em>
            </MenuItem>
            {designations &&
              designations.map((des, index) => (
                <MenuItem key={index} value={des.designation}>
                  {des.designation}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Permissions
        </Typography>
        <Box sx={{ pl: 2, mb: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canSanction}
                onChange={(e) => handleChange("canSanction", e.target.checked)}
              />
            }
            label="Can Sanction"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canReturnToPlayer}
                onChange={(e) =>
                  handleChange("canReturnToPlayer", e.target.checked)
                }
              />
            }
            label="Can Return to Player"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canReturnToCitizen}
                onChange={(e) =>
                  handleChange("canReturnToCitizen", e.target.checked)
                }
              />
            }
            label="Can Return to Citizen"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canForwardToPlayer}
                onChange={(e) =>
                  handleChange("canForwardToPlayer", e.target.checked)
                }
              />
            }
            label="Can Forward to Player"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canReject}
                onChange={(e) => handleChange("canReject", e.target.checked)}
              />
            }
            label="Can Reject"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canPull}
                onChange={(e) => handleChange("canPull", e.target.checked)}
              />
            }
            label="Can Pull"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canHavePool}
                onChange={(e) => handleChange("canHavePool", e.target.checked)}
              />
            }
            label="Can Bulk Applications"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canCorrigendum}
                onChange={(e) =>
                  handleChange("canCorrigendum", e.target.checked)
                }
              />
            }
            label="Can Corrigendum"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canManageBankFiles}
                onChange={(e) =>
                  handleChange("canManageBankFiles", e.target.checked)
                }
              />
            }
            label="Can Manage Bank Files"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canWithhold}
                onChange={(e) => handleChange("canWithhold", e.target.checked)}
              />
            }
            label="Can Withhold"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editedPlayer.canValidateAadhaar}
                onChange={(e) =>
                  handleChange("canValidateAadhaar", e.target.checked)
                }
              />
            }
            label="Can Validate Aadhaar"
          />
        </Box>
        <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
          Action Form
        </Typography>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={editedPlayer.actionForm.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            {editedPlayer.actionForm.length > 0 ? (
              editedPlayer.actionForm.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  sectionId="actionForm"
                  onEditField={handleEditField}
                  onRemoveField={handleRemoveField}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No action form fields added.
              </Typography>
            )}
          </SortableContext>
        </DndContext>
        <Button
          variant="contained"
          onClick={addActionFormField}
          sx={{ mt: 2, backgroundColor: "primary.main" }}
        >
          Add Action Form Field
        </Button>
        <Box
          sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ backgroundColor: "primary.main" }}
          >
            Save
          </Button>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ borderColor: "primary.main", color: "primary.main" }}
          >
            Cancel
          </Button>
        </Box>
        {isFieldModalOpen && selectedField && (
          <FieldEditModal
            selectedField={selectedField}
            sections={[{ fields: editedPlayer.actionForm }]}
            actionForm={editedPlayer.actionForm}
            onClose={() => {
              setIsFieldModalOpen(false);
              setSelectedField(null);
            }}
            updateField={updateField}
          />
        )}
      </Box>
    </Modal>
  );
};

export default PlayerEditModal;
