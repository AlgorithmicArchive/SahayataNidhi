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
  Grid,
  Tooltip,
  Divider,
  TextField,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
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
import axiosInstance from "../../axiosConfig";

// Utility function to sanitize actionForm options
const sanitizeActionForm = (actionForm) => {
  return actionForm.map((field) => {
    if (field.options) {
      return {
        ...field,
        options: field.options,
        dependentOptions: field.dependentOptions
          ? Object.fromEntries(
              Object.entries(field.dependentOptions).map(([key, opts]) => [
                key,
                opts,
              ]),
            )
          : field.dependentOptions,
      };
    }
    return field;
  });
};

const PlayerEditModal = ({
  player,
  onClose,
  onSave,
  players,
  serviceId,
  services,
}) => {
  const [editedPlayer, setEditedPlayer] = useState({
    ...player,
    accessLevel: player.accessLevel || "",
    canHavePool: player.canHavePool || false,
    canManageBankFiles: player.canManageBankFiles || false,
    canWithhold: player.canWithhold || false,
    canValidateAadhaar: player.canValidateAadhaar || false,
    actionForm: sanitizeActionForm(player.actionForm || []),
    customPermissions: player.customPermissions || [], // Store custom permissions
  });
  const [actionFormOptions, setActionFormOptions] = useState({
    canForwardToPlayer: player.canForwardToPlayer,
    canSanction: player.canSanction,
    canReturnToPlayer: player.canReturnToPlayer,
    canReturnToCitizen: player.canReturnToCitizen,
    canReject: player.canReject,
    canWithhold: player.canWithhold,
    customPermissions: player.customPermissions
      ? Object.fromEntries(
          player.customPermissions.map((perm) => [perm.name, false]),
        )
      : {}, // Initialize custom permissions for action form
  });
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [designations, setDesignations] = useState([]);
  const [isLoadingDesignations, setIsLoadingDesignations] = useState(true);
  const [newPermissionName, setNewPermissionName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    async function getDesignations() {
      if (!serviceId) {
        setIsLoadingDesignations(false);
        return;
      }

      try {
        const service = services.find((s) => s.serviceId === serviceId);
        if (!service || !service.departmentId) {
          console.error("Service or DepartmentId not found");
          setIsLoadingDesignations(false);
          return;
        }

        const response = await axiosInstance.get(`/Base/GetDesignations`, {
          params: { departmentId: service.departmentId },
        });
        if (response.data.status && response.data.designations) {
          setDesignations(response.data.designations);
        } else {
          console.error("Failed to fetch designations:", response.data);
          toast.error("Failed to load designations");
        }
      } catch (error) {
        console.error("Error fetching designations:", error);
        toast.error("Error loading designations");
      } finally {
        setIsLoadingDesignations(false);
      }
    }

    getDesignations();
  }, [serviceId, services]);

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

    // Handle custom permissions
    if (field.startsWith("custom_")) {
      setEditedPlayer((prev) => ({
        ...prev,
        customPermissions: prev.customPermissions.map((perm) =>
          perm.name === field ? { ...perm, enabled: value } : perm,
        ),
      }));
      return;
    }

    // Special handling for designation change to also update accessLevel
    if (field === "designation" && value) {
      const selectedDesignation = designations.find(
        (des) => des.designation === value,
      );
      if (selectedDesignation) {
        setEditedPlayer((prev) => ({
          ...prev,
          designation: value,
          accessLevel: selectedDesignation.accessLevel || "",
        }));
        return;
      }
    }

    setEditedPlayer((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Update actionFormOptions when permissions change
    if (
      [
        "canForwardToPlayer",
        "canSanction",
        "canReturnToPlayer",
        "canReturnToCitizen",
        "canReject",
        "canWithhold",
      ].includes(field)
    ) {
      setActionFormOptions((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
    console.log(`Updated ${field}:`, value);
  };

  const handleActionFormOptionChange = (field, value) => {
    setActionFormOptions((prev) => ({
      ...prev,
      [field]: value,
    }));
    console.log(`Updated actionFormOptions.${field}:`, value);
  };

  const addPermission = () => {
    if (!newPermissionName.trim()) {
      toast.error("Permission name cannot be empty.");
      return;
    }
    const permissionName = newPermissionName.trim();
    const permissionKey = `custom_${permissionName
      .replace(/\s+/g, "_")
      .toLowerCase()}`;
    if (
      editedPlayer.customPermissions?.some(
        (perm) => perm.name === permissionKey,
      )
    ) {
      toast.error("Permission already exists.");
      return;
    }
    const newPermission = {
      name: permissionKey,
      label: permissionName,
      enabled: false,
    };
    setEditedPlayer((prev) => ({
      ...prev,
      customPermissions: [...(prev.customPermissions || []), newPermission],
    }));
    setActionFormOptions((prev) => ({
      ...prev,
      customPermissions: {
        ...prev.customPermissions,
        [permissionKey]: false,
      },
    }));
    setNewPermissionName("");
    toast.success(`Permission "${permissionName}" added successfully.`);
  };

  const removePermission = (permissionName) => {
    setEditedPlayer((prev) => ({
      ...prev,
      customPermissions: prev.customPermissions.filter(
        (perm) => perm.name !== permissionName,
      ),
    }));
    setActionFormOptions((prev) => {
      const { [permissionName]: _, ...rest } = prev.customPermissions || {};
      return {
        ...prev,
        customPermissions: rest,
      };
    });
    toast.success(`Permission removed successfully.`);
  };

  const selectAllPermissions = () => {
    setEditedPlayer((prev) => ({
      ...prev,
      canSanction: true,
      canReturnToPlayer: true,
      canReturnToCitizen: true,
      canForwardToPlayer: true,
      canReject: true,
      canPull: true,
      canHavePool: true,
      canCorrigendum: true,
      canManageBankFiles: true,
      canWithhold: true,
      canValidateAadhaar: true,
      customPermissions: prev.customPermissions?.map((perm) => ({
        ...perm,
        enabled: true,
      })),
    }));
    setActionFormOptions((prev) => ({
      ...prev,
      canSanction: true,
      canReturnToPlayer: true,
      canReturnToCitizen: true,
      canForwardToPlayer: true,
      canReject: true,
      canWithhold: true,
      customPermissions: Object.fromEntries(
        Object.keys(prev.customPermissions || {}).map((key) => [key, true]),
      ),
    }));
  };

  const deselectAllPermissions = () => {
    setEditedPlayer((prev) => ({
      ...prev,
      canSanction: false,
      canReturnToPlayer: false,
      canReturnToCitizen: false,
      canForwardToPlayer: false,
      canReject: false,
      canPull: false,
      canHavePool: false,
      canCorrigendum: false,
      canManageBankFiles: false,
      canWithhold: false,
      canValidateAadhaar: false,
      customPermissions: prev.customPermissions?.map((perm) => ({
        ...perm,
        enabled: false,
      })),
    }));
    setActionFormOptions((prev) => ({
      ...prev,
      canSanction: false,
      canReturnToPlayer: false,
      canReturnToCitizen: false,
      canForwardToPlayer: false,
      canReject: false,
      canWithhold: false,
      customPermissions: Object.fromEntries(
        Object.keys(prev.customPermissions || {}).map((key) => [key, false]),
      ),
    }));
  };

  const selectAllActionFormOptions = () => {
    setActionFormOptions({
      canSanction: editedPlayer.canSanction,
      canReturnToPlayer: editedPlayer.canReturnToPlayer,
      canReturnToCitizen: editedPlayer.canReturnToCitizen,
      canForwardToPlayer: editedPlayer.canForwardToPlayer,
      canReject: editedPlayer.canReject,
      canWithhold: editedPlayer.canWithhold,
      customPermissions: Object.fromEntries(
        (editedPlayer.customPermissions || [])
          .filter((perm) => perm.enabled)
          .map((perm) => [perm.name, true]),
      ),
    });
  };

  const deselectAllActionFormOptions = () => {
    setActionFormOptions({
      canSanction: false,
      canReturnToPlayer: false,
      canReturnToCitizen: false,
      canForwardToPlayer: false,
      canReject: false,
      canWithhold: false,
      customPermissions: Object.fromEntries(
        Object.keys(actionFormOptions.customPermissions || {}).map((key) => [
          key,
          false,
        ]),
      ),
    });
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

  const generateActionFormOptions = () => {
    const actionOptions = [];
    if (
      actionFormOptions.canForwardToPlayer &&
      editedPlayer.canForwardToPlayer
    ) {
      let label = "Forward to Player";
      if (editedPlayer.nextPlayerId !== null) {
        const nextPlayer = players.find(
          (p) => p.playerId === editedPlayer.nextPlayerId,
        );
        if (nextPlayer && nextPlayer.designation) {
          label = `Forward to ${nextPlayer.designation}`;
        }
      }
      actionOptions.push({ value: "Forward", label });
    }
    if (actionFormOptions.canSanction && editedPlayer.canSanction) {
      actionOptions.push({ value: "Sanction", label: "Sanction" });
    }
    if (actionFormOptions.canReturnToPlayer && editedPlayer.canReturnToPlayer) {
      let label = "Return to Player";
      if (editedPlayer.prevPlayerId !== null) {
        const previousPlayer = players.find(
          (p) => p.playerId === editedPlayer.prevPlayerId,
        );
        if (previousPlayer && previousPlayer.designation) {
          label = `Return to ${previousPlayer.designation}`;
        }
      }
      actionOptions.push({ value: "ReturnToPlayer", label });
    }
    if (
      actionFormOptions.canReturnToCitizen &&
      editedPlayer.canReturnToCitizen
    ) {
      actionOptions.push({
        value: "ReturnToCitizen",
        label: "Return to Citizen",
      });
    }
    if (actionFormOptions.canReject && editedPlayer.canReject) {
      actionOptions.push({ value: "Reject", label: "Reject" });
    }
    if (actionFormOptions.canWithhold && editedPlayer.canWithhold) {
      actionOptions.push({ value: "Withhold", label: "Withhold" });
    }
    // Add custom permissions to action form options
    if (actionFormOptions.customPermissions) {
      editedPlayer.customPermissions?.forEach((perm) => {
        if (perm.enabled && actionFormOptions.customPermissions[perm.name]) {
          actionOptions.push({
            value: perm.name.replace("custom_", ""),
            label: perm.label,
          });
        }
      });
    }
    return actionOptions;
  };

  const handleSave = () => {
    const actionOptions = generateActionFormOptions();
    const updatedActionForm = editedPlayer.actionForm.map((field) => {
      if (field.name === "defaultAction") {
        return { ...field, options: actionOptions, label: "Action" };
      }
      return field;
    });
    if (!updatedActionForm.some((field) => field.name === "defaultAction")) {
      updatedActionForm.push({
        id: `default-field-${Date.now()}`,
        type: "select",
        label: "Action",
        name: "defaultAction",
        minLength: 0,
        maxLength: 0,
        options: actionOptions,
        span: 12,
        validationFunctions: [],
        transformationFunctions: [],
        additionalFields: {},
        accept: "",
      });
    }
    const finalPlayer = {
      ...editedPlayer,
      actionFormOptions: actionFormOptions,
      actionForm: sanitizeActionForm(updatedActionForm),
    };
    console.log("Saving editedPlayer:", finalPlayer);
    onSave(finalPlayer);
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
          width: { xs: "90%", md: 700 },
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h5"
          sx={{ mb: 3, fontWeight: 600, color: "primary.main" }}
        >
          Edit Player
        </Typography>

        {isLoadingDesignations ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Loading designations...
          </Typography>
        ) : (
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
            <InputLabel id="designation-select-label">Designation</InputLabel>
            <Select
              labelId="designation-select-label"
              label="Designation"
              value={editedPlayer.designation || ""}
              onChange={(e) => handleChange("designation", e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": { borderColor: "primary.main" },
                  "&.Mui-focused fieldset": { borderColor: "primary.main" },
                },
              }}
            >
              <MenuItem value="">
                <em>Select Designation</em>
              </MenuItem>
              {designations.map((des, index) => (
                <MenuItem key={index} value={des.designation}>
                  {des.designation} ({des.accessLevel})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selected Access Level: {editedPlayer.accessLevel || "Not selected"}
        </Typography>

        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
          Add Custom Permission
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <TextField
            label="New Permission Name"
            value={newPermissionName}
            onChange={(e) => setNewPermissionName(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "primary.main" },
                "&.Mui-focused fieldset": { borderColor: "primary.main" },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={addPermission}
            startIcon={<AddIcon />}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Add
          </Button>
        </Box>

        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
          Permissions
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={1} sx={{ pl: 2, mb: 2 }}>
          {[
            {
              key: "canSanction",
              label: "Can Sanction",
              tooltip: "Allows the player to sanction actions",
            },
            {
              key: "canReturnToPlayer",
              label: "Can Return to Player",
              tooltip: "Allows returning to previous player",
            },
            {
              key: "canReturnToCitizen",
              label: "Can Return to Citizen",
              tooltip: "Allows returning to citizen",
            },
            {
              key: "canForwardToPlayer",
              label: "Can Forward to Player",
              tooltip: "Allows forwarding to next player",
            },
            {
              key: "canReject",
              label: "Can Reject",
              tooltip: "Allows rejecting the action",
            },
            {
              key: "canPull",
              label: "Can Pull",
              tooltip: "Allows pulling actions",
            },
            {
              key: "canHavePool",
              label: "Can Bulk Applications",
              tooltip: "Allows handling bulk applications",
            },
            {
              key: "canCorrigendum",
              label: "Can Corrigendum",
              tooltip: "Allows corrigendum actions",
            },
            {
              key: "canManageBankFiles",
              label: "Can Manage Bank Files",
              tooltip: "Allows managing bank files",
            },
            {
              key: "canWithhold",
              label: "Can Withhold",
              tooltip: "Allows withholding actions",
            },
            {
              key: "canValidateAadhaar",
              label: "Can Validate Aadhaar",
              tooltip: "Allows validating Aadhaar",
            },
          ].map((perm) => (
            <Grid item xs={6} key={perm.key}>
              <Tooltip title={perm.tooltip} arrow>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={editedPlayer[perm.key]}
                      onChange={(e) => handleChange(perm.key, e.target.checked)}
                    />
                  }
                  label={perm.label}
                />
              </Tooltip>
            </Grid>
          ))}
          {editedPlayer.customPermissions?.map((perm) => (
            <Grid item xs={6} key={perm.name}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Tooltip title={`Custom permission: ${perm.label}`} arrow>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={perm.enabled}
                        onChange={(e) =>
                          handleChange(perm.name, e.target.checked)
                        }
                      />
                    }
                    label={perm.label}
                  />
                </Tooltip>
                <IconButton
                  onClick={() => removePermission(perm.name)}
                  sx={{ ml: 1, color: "error.main" }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box
          sx={{ display: "flex", justifyContent: "flex-start", gap: 2, mb: 2 }}
        >
          <Button
            variant="outlined"
            onClick={selectAllPermissions}
            sx={{ borderColor: "primary.main", color: "primary.main" }}
          >
            Select All
          </Button>
          <Button
            variant="outlined"
            onClick={deselectAllPermissions}
            sx={{ borderColor: "primary.main", color: "primary.main" }}
          >
            Deselect All
          </Button>
        </Box>

        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
          Action Form Options
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={1} sx={{ pl: 2, mb: 2 }}>
          {[
            {
              key: "canSanction",
              label: "Include Sanction in Action Form",
              tooltip: "Include Sanction option in action form",
              enabled: editedPlayer.canSanction,
            },
            {
              key: "canReturnToPlayer",
              label: "Include Return to Player in Action Form",
              tooltip: "Include Return to Player option in action form",
              enabled: editedPlayer.canReturnToPlayer,
            },
            {
              key: "canReturnToCitizen",
              label: "Include Return to Citizen in Action Form",
              tooltip: "Include Return to Citizen option in action form",
              enabled: editedPlayer.canReturnToCitizen,
            },
            {
              key: "canForwardToPlayer",
              label: "Include Forward to Player in Action Form",
              tooltip: "Include Forward to Player option in action form",
              enabled: editedPlayer.canForwardToPlayer,
            },
            {
              key: "canReject",
              label: "Include Reject in Action Form",
              tooltip: "Include Reject option in action form",
              enabled: editedPlayer.canReject,
            },
            {
              key: "canWithhold",
              label: "Include Withhold in Action Form",
              tooltip: "Include Withhold option in action form",
              enabled: editedPlayer.canWithhold,
            },
          ].map((opt) => (
            <Grid item xs={6} key={opt.key}>
              <Tooltip title={opt.tooltip} arrow>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={actionFormOptions[opt.key]}
                      onChange={(e) =>
                        handleActionFormOptionChange(opt.key, e.target.checked)
                      }
                      disabled={!opt.enabled}
                    />
                  }
                  label={opt.label}
                />
              </Tooltip>
            </Grid>
          ))}
          {editedPlayer.customPermissions?.map((perm) => (
            <Grid item xs={6} key={perm.name}>
              <Tooltip title={`Include ${perm.label} in action form`} arrow>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        actionFormOptions.customPermissions?.[perm.name] ||
                        false
                      }
                      onChange={(e) =>
                        handleActionFormOptionChange(
                          perm.name,
                          e.target.checked,
                        )
                      }
                      disabled={!perm.enabled}
                    />
                  }
                  label={`Include ${perm.label} in Action Form`}
                />
              </Tooltip>
            </Grid>
          ))}
        </Grid>
        <Box
          sx={{ display: "flex", justifyContent: "flex-start", gap: 2, mb: 2 }}
        >
          <Button
            variant="outlined"
            onClick={selectAllActionFormOptions}
            sx={{ borderColor: "primary.main", color: "primary.main" }}
          >
            Select All
          </Button>
          <Button
            variant="outlined"
            onClick={deselectAllActionFormOptions}
            sx={{ borderColor: "primary.main", color: "primary.main" }}
          >
            Deselect All
          </Button>
        </Box>

        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
          Action Form
        </Typography>
        <Divider sx={{ mb: 2 }} />
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
          sx={{
            mt: 2,
            backgroundColor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          Add Action Form Field
        </Button>
        <Box
          sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
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
