import React, { useEffect, useRef, useState } from "react";
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
  Divider,
  TextField,
  IconButton,
  Paper,
  Tooltip,
  Chip,
  Autocomplete,
  CircularProgress,
  Alert,
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
import axiosInstance from "../../axiosConfig";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";

const sanitizeActionForm = (actionForm) => {
  return (actionForm || []).map((field) => {
    if (field.options) {
      return {
        ...field,
        options: field.options,
        dependentOptions: field.dependentOptions
          ? Object.fromEntries(
            Object.entries(field.dependentOptions).map(([key, opts]) => [
              key,
              opts,
            ])
          )
          : field.dependentOptions,
      };
    }
    return field;
  });
};

// Draggable Declaration Field Item
const DraggableDeclarationField = ({ field, index, onRemove, onDragStart, onDragOver, onDrop }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', index.toString());
    onDragStart(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    onDragOver(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    onDrop(draggedIndex, index);
  };

  return (
    <Paper
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      sx={{
        p: 1.5,
        mb: 1,
        bgcolor: 'grey.50',
        border: '1px dashed',
        borderColor: 'primary.main',
        cursor: 'move',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        '&:hover': {
          bgcolor: 'grey.100',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DragIndicatorIcon sx={{ color: 'grey.500' }} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {field.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {field.name} ({field.type})
          </Typography>
        </Box>
      </Box>
      <Chip
        label={`{${field.name}}`}
        size="small"
        color="primary"
        variant="outlined"
      />
      <IconButton
        size="small"
        onClick={() => onRemove(index)}
        sx={{ color: 'error.main' }}
      >
        <CloseIcon />
      </IconButton>
    </Paper>
  );
};

// DeclarationField Component with Form Fields API Integration
const DeclarationField = ({
  field,
  onEditField,
  onRemoveField,
  onUpdateDeclarationFields,
  serviceId,
  isFetchingFormFields,
  formFields = [],
  onRefreshFormFields
}) => {
  const [declarationText, setDeclarationText] = useState(field.declaration || "");
  const [selectedFields, setSelectedFields] = useState(field.declarationFields || []);
  const [availableFields, setAvailableFields] = useState([]);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Filter out fields that are already selected
  useEffect(() => {
    const usedFieldIds = new Set(selectedFields.map(f => f.id));
    const filteredFields = formFields
      .filter(f => f && !usedFieldIds.has(f.id))
      .map(f => ({
        id: f.id,
        name: f.name,
        label: f.label || f.name,
        type: f.type || 'text'
      }));

    setAvailableFields(filteredFields);
  }, [formFields, selectedFields]);

  const handleAddField = (selectedField) => {
    if (selectedField) {
      const fieldData = formFields.find(f => f.id === selectedField.id);
      if (fieldData) {
        const newField = {
          id: fieldData.id,
          name: fieldData.name,
          label: fieldData.label || fieldData.name,
          type: fieldData.type || 'text',
          required: false
        };
        const updatedFields = [...selectedFields, newField];
        setSelectedFields(updatedFields);
        updateDeclaration(updatedFields);
      }
    }
  };

  const handleRemoveField = (index) => {
    const updatedFields = selectedFields.filter((_, i) => i !== index);
    setSelectedFields(updatedFields);
    updateDeclaration(updatedFields);
  };

  const handleDragStart = (index) => {
    setDragOverIndex(index);
  };

  const handleDragOver = (index) => {
    setDragOverIndex(index);
  };

  const handleDrop = (draggedIndex, dropIndex) => {
    if (draggedIndex === dropIndex) return;

    const newFields = [...selectedFields];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(dropIndex, 0, draggedItem);

    setSelectedFields(newFields);
    updateDeclaration(newFields);
    setDragOverIndex(null);
  };

  const updateDeclaration = (fields) => {
    let text = declarationText;

    // If no text exists, create a template
    if (!text || text.trim() === '') {
      if (fields.length > 0) {
        text = fields.reduce((acc, field, index) => {
          const separator = index === fields.length - 1 ? '. ' : ', ';
          return acc + `{${field.name}}` + separator;
        }, 'I hereby declare that ');
        text += "All the information provided is true to the best of my knowledge.";
      } else {
        text = "I hereby declare that the information provided is true to the best of my knowledge.";
      }
    }

    setDeclarationText(text);
    onUpdateDeclarationFields(fields, text);
  };

  const handleTextChange = (text) => {
    setDeclarationText(text);
    onUpdateDeclarationFields(selectedFields, text);
  };

  if (!serviceId) {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please select a service first to load form fields for the declaration.
        </Alert>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            📝 Declaration: {field.label || "Untitled Declaration"}
          </Typography>
          <Box>
            <Tooltip title="Edit Declaration Field">
              <IconButton
                size="small"
                onClick={() => onEditField(field)}
                sx={{ color: 'primary.main', mr: 1 }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove Declaration">
              <IconButton
                size="small"
                onClick={() => onRemoveField(field.id)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          📝 Declaration: {field.label || "Untitled Declaration"}
        </Typography>
        <Box>
          <Tooltip title="Refresh Form Fields">
            <IconButton
              size="small"
              onClick={onRefreshFormFields}
              sx={{ color: 'info.main', mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Declaration Field">
            <IconButton
              size="small"
              onClick={() => onEditField(field)}
              sx={{ color: 'primary.main', mr: 1 }}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove Declaration">
            <IconButton
              size="small"
              onClick={() => onRemoveField(field.id)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Field Selection */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Add Form Fields to Declaration
          </Typography>
          {isFetchingFormFields && (
            <CircularProgress size={16} />
          )}
        </Box>

        {isFetchingFormFields ? (
          <Paper sx={{ p: 2, bgcolor: 'info.light', mb: 2 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              Loading form fields from service...
            </Typography>
          </Paper>
        ) : availableFields.length > 0 ? (
          <>
            <Autocomplete
              options={availableFields}
              getOptionLabel={(option) => `${option.label} (${option.name})`}
              onChange={(event, value) => handleAddField(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Select a form field to add to declaration"
                  size="small"
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box>
                    <Typography variant="body2">{option.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Field: {option.name} | Type: {option.type}
                    </Typography>
                  </Box>
                </li>
              )}
              sx={{ mb: 2 }}
            />

            {/* Quick Add Fields */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold' }}>
                Quick Add:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {availableFields.slice(0, 8).map((fieldItem) => (
                  <Chip
                    key={fieldItem.id}
                    label={fieldItem.label}
                    size="small"
                    variant="outlined"
                    onClick={() => handleAddField(fieldItem)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          </>
        ) : (
          <Paper sx={{ p: 2, bgcolor: 'warning.light', mb: 2 }}>
            <Typography variant="body2">
              No form fields available. The selected service may not have form fields configured.
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Selected Fields List */}
      {selectedFields.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Selected Fields (Drag to reorder)
          </Typography>
          {selectedFields.map((fieldItem, index) => (
            <DraggableDeclarationField
              key={`${fieldItem.id}-${index}`}
              field={fieldItem}
              index={index}
              onRemove={handleRemoveField}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
          <Typography variant="body2">
            No fields added to declaration yet. Select fields from the dropdown above.
          </Typography>
        </Paper>
      )}

      {/* Declaration Text Editor */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Declaration Text
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={declarationText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="I hereby declare that {field1}, {field2}..."
          sx={{ mb: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          Tip: Selected fields will appear as {`{fieldName}`} placeholders. Drag fields above to reorder them.
        </Typography>
      </Box>

      {/* Preview */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
          Preview:
        </Typography>
        <Paper sx={{ p: 2, bgcolor: 'white' }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            {selectedFields.length > 0 ?
              selectedFields.reduce((text, fieldItem) => {
                return text.replace(
                  new RegExp(`\\{${fieldItem.name}\\}`, 'g'),
                  `[${fieldItem.label}: ___________]`
                );
              }, declarationText)
              : declarationText
            }
          </Typography>
        </Paper>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {`{fieldName}`} placeholders will be replaced with actual input fields
        </Typography>
      </Box>

      {/* Field Placeholder Helper */}
      {selectedFields.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            Available Placeholders:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {selectedFields.map((fieldItem, index) => (
              <Chip
                key={fieldItem.id}
                label={`{${fieldItem.name}}`}
                size="small"
                sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                onClick={() => {
                  const newText = declarationText + ` {${fieldItem.name}}`;
                  handleTextChange(newText);
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

const PlayerEditModal = ({
  player,
  onClose,
  onSave,
  players,
  serviceId,
  services,
}) => {
  // Unique ID counter for new fields
  const fieldCounter = useRef(0);

  const [editedPlayer, setEditedPlayer] = useState({
    ...player,
    accessLevel: player.accessLevel || "",
    canHavePool: player.canHavePool || false,
    canManageBankFiles: player.canManageBankFiles || false,
    canWithhold: player.canWithhold || false,
    canValidateAadhaar: player.canValidateAadhaar || false,
    canDirectWithheld: player.canDirectWithheld || false,
    actionForm: sanitizeActionForm(player.actionForm || []),
    customPermissions: player.customPermissions || [],
  });

  const [actionFormOptions, setActionFormOptions] = useState(() => {
    const saved = player.actionFormOptions || {};
    const getCustomPermState = () => {
      if (saved.customPermissions) return saved.customPermissions;
      if (!player.customPermissions) return {};
      return player.customPermissions
        .filter((p) => p.enabled)
        .reduce((acc, p) => ({ ...acc, [p.name]: true }), {});
    };
    return {
      canForwardToPlayer: saved.canForwardToPlayer ?? player.canForwardToPlayer,
      canSanction: saved.canSanction ?? player.canSanction,
      canReturnToPlayer: saved.canReturnToPlayer ?? player.canReturnToPlayer,
      canReturnToCitizen: saved.canReturnToCitizen ?? player.canReturnToCitizen,
      canReject: saved.canReject ?? player.canReject,
      canWithhold: saved.canWithhold ?? player.canWithhold,
      canDirectWithheld: saved.canDirectWithheld ?? (player.canDirectWithheld || false),
      customPermissions: getCustomPermState(),
    };
  });

  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [designations, setDesignations] = useState([]);
  const [isLoadingDesignations, setIsLoadingDesignations] = useState(true);

  // State for form fields from API
  const [formFields, setFormFields] = useState([]);
  const [isFetchingFormFields, setIsFetchingFormFields] = useState(false);
  const [hasFetchedFormFields, setHasFetchedFormFields] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
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
          setIsLoadingDesignations(false);
          return;
        }
        const response = await axiosInstance.get(`/Base/GetDesignations`, {
          params: { departmentId: service.departmentId },
        });
        if (response.data.status && response.data.designations) {
          setDesignations(response.data.designations);
        } else {
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

  // Fetch form fields when serviceId changes
  useEffect(() => {
    async function fetchFormFields() {
      if (!serviceId) {
        setFormFields([]);
        setHasFetchedFormFields(false);
        return;
      }

      try {
        setIsFetchingFormFields(true);
        const response = await axiosInstance.get(`/Designer/GetFormElements`, {
          params: { serviceId }
        });

        if (response.data.status && response.data.sections) {
          // Extract all fields from all sections
          const allFields = [];
          response.data.sections.forEach(section => {
            if (section.fields && Array.isArray(section.fields)) {
              section.fields.forEach(field => {
                if (field.name && field.label) {
                  allFields.push({
                    id: field.name, // Use field name as ID for uniqueness
                    name: field.name,
                    label: field.label,
                    type: 'form-field' // Mark as form field
                  });
                }
              });
            }
          });

          setFormFields(allFields);
          setHasFetchedFormFields(true);
          console.log("Fetched form fields:", allFields); // Debug log
        } else {
          toast.warning("No form fields found for this service");
          setFormFields([]);
        }
      } catch (error) {
        console.error("Error fetching form fields:", error);
        toast.error("Failed to load form fields");
        setFormFields([]);
      } finally {
        setIsFetchingFormFields(false);
      }
    }

    fetchFormFields();
  }, [serviceId]);

  const handleRefreshFormFields = async () => {
    if (!serviceId) {
      toast.warning("Please select a service first");
      return;
    }

    try {
      setIsFetchingFormFields(true);
      const response = await axiosInstance.get(`/Designer/GetFormElements`, {
        params: { serviceId }
      });

      if (response.data.status && response.data.sections) {
        const allFields = [];
        response.data.sections.forEach(section => {
          if (section.fields && Array.isArray(section.fields)) {
            section.fields.forEach(field => {
              if (field.name && field.label) {
                allFields.push({
                  id: field.name,
                  name: field.name,
                  label: field.label,
                  type: 'form-field'
                });
              }
            });
          }
        });

        setFormFields(allFields);
        toast.success(`Refreshed ${allFields.length} form fields`);
      }
    } catch (error) {
      console.error("Error refreshing form fields:", error);
      toast.error("Failed to refresh form fields");
    } finally {
      setIsFetchingFormFields(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = editedPlayer.actionForm.findIndex((f) => f.id === active.id);
    const newIndex = editedPlayer.actionForm.findIndex((f) => f.id === over.id);

    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: arrayMove(prev.actionForm, oldIndex, newIndex),
    }));
  };

  const handleChange = (field, value) => {
    // Exclusive checks
    if (field === "canCorrigendum" && value) {
      const other = players.find(
        (p) => p.playerId !== editedPlayer.playerId && p.canCorrigendum
      );
      if (other) {
        toast.error(`Another player (${other.designation}) already has Can Corrigendum authority.`);
        return;
      }
    }
    if (field === "canManageBankFiles" && value) {
      const other = players.find(
        (p) => p.playerId !== editedPlayer.playerId && p.canManageBankFiles
      );
      if (other) {
        toast.error(`Another player (${other.designation}) already has Can Manage Bank Files authority.`);
        return;
      }
    }
    if (field === "canValidateAadhaar" && value) {
      const other = players.find(
        (p) => p.playerId !== editedPlayer.playerId && p.canValidateAadhaar
      );
      if (other) {
        toast.error(`Another player (${other.designation}) already has Can Validate Aadhaar authority.`);
        return;
      }
    }

    if (field.startsWith("custom_")) {
      setEditedPlayer((prev) => ({
        ...prev,
        customPermissions: prev.customPermissions.map((perm) =>
          perm.name === field ? { ...perm, enabled: value } : perm
        ),
      }));
      return;
    }

    if (field === "designation" && value) {
      const selected = designations.find((des) => des.designation === value);
      if (selected) {
        setEditedPlayer((prev) => ({
          ...prev,
          designation: value,
          accessLevel: selected.accessLevel || "",
        }));
        return;
      }
    }

    setEditedPlayer((prev) => ({ ...prev, [field]: value }));
  };

  const handleActionFormOptionChange = (field, value) => {
    if (field.startsWith("custom_")) {
      setActionFormOptions((prev) => ({
        ...prev,
        customPermissions: {
          ...prev.customPermissions,
          [field]: value,
        },
      }));
    } else {
      setActionFormOptions((prev) => ({ ...prev, [field]: value }));
    }
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
      canDirectWithheld: true,
      customPermissions: (prev.customPermissions || []).map((p) => ({
        ...p,
        enabled: true,
      })),
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
      canDirectWithheld: false,
      customPermissions: (prev.customPermissions || []).map((p) => ({
        ...p,
        enabled: false,
      })),
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
      canDirectWithheld: editedPlayer.canDirectWithheld || false,
      customPermissions: (editedPlayer.customPermissions || [])
        .filter((p) => p.enabled)
        .reduce((acc, p) => ({ ...acc, [p.name]: true }), {}),
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
      canDirectWithheld: false,
      customPermissions: {},
    });
  };

  const addActionFormField = () => {
    fieldCounter.current += 1;
    const newField = {
      id: `custom-field-${fieldCounter.current}`,
      type: "text",
      label: "New Field",
      name: `NewField_${fieldCounter.current}`,
      minLength: 5,
      maxLength: 50,
      options: [],
      span: 12,
      validationFunctions: [],
      transformationFunctions: [],
      additionalFields: {},
      accept: "",
      isDeclaration: false,
      declaration: "",
      declarationFields: [],
    };
    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: [...prev.actionForm, newField],
    }));
  };

  const handleEditField = (field) => {
    setSelectedField(field);
    setIsFieldModalOpen(true);
  };

  const handleRemoveField = (fieldId) => {
    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: prev.actionForm.filter((f) => f.id !== fieldId),
    }));
  };

  // Handle updating declaration fields
  const handleUpdateDeclarationFields = (fieldId, declarationFields, declarationText = "") => {
    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: prev.actionForm.map((field) =>
        field.id === fieldId
          ? {
            ...field,
            isDeclaration: true,
            declaration: declarationText || field.declaration,
            declarationFields: declarationFields,
          }
          : field
      ),
    }));
  };

  const updateField = (updatedField) => {
    setEditedPlayer((prev) => ({
      ...prev,
      actionForm: sanitizeActionForm(
        prev.actionForm.map((f) => (f.id === updatedField.id ? updatedField : f))
      ),
    }));
    setIsFieldModalOpen(false);
    setSelectedField(null);
  };

  const generateActionFormOptions = () => {
    const options = [];
    if (actionFormOptions.canForwardToPlayer && editedPlayer.canForwardToPlayer) {
      let label = "Forward to Player";
      if (editedPlayer.nextPlayerId !== null) {
        const next = players.find((p) => p.playerId === editedPlayer.nextPlayerId);
        if (next?.designation) label = `Forward to ${next.designation}`;
      }
      options.push({ value: "Forward", label });
    }
    if (actionFormOptions.canSanction && editedPlayer.canSanction)
      options.push({ value: "Sanction", label: "Sanction" });
    if (actionFormOptions.canReturnToPlayer && editedPlayer.canReturnToPlayer) {
      let label = "Return to Player";
      if (editedPlayer.prevPlayerId !== null) {
        const prev = players.find((p) => p.playerId === editedPlayer.prevPlayerId);
        if (prev?.designation) label = `Return to ${prev.designation}`;
      }
      options.push({ value: "ReturnToPlayer", label });
    }
    if (actionFormOptions.canReturnToCitizen && editedPlayer.canReturnToCitizen)
      options.push({ value: "ReturnToCitizen", label: "Return to Citizen" });
    if (actionFormOptions.canReject && editedPlayer.canReject)
      options.push({ value: "Reject", label: "Reject" });
    if (actionFormOptions.canWithhold && editedPlayer.canWithhold)
      options.push({ value: "Withhold", label: "Withhold" });
    if (actionFormOptions.canDirectWithheld && editedPlayer.canDirectWithheld)
      options.push({ value: "DirectWithheld", label: "Direct Withheld" });

    editedPlayer.customPermissions?.forEach((perm) => {
      if (perm.enabled && actionFormOptions.customPermissions?.[perm.name]) {
        options.push({
          value: perm.name.replace("custom_", ""),
          label: perm.label,
        });
      }
    });

    return options;
  };

  const handleSave = () => {
    const actionOptions = generateActionFormOptions();

    let updatedActionForm = editedPlayer.actionForm.map((field) =>
      field.name === "defaultAction"
        ? { ...field, options: actionOptions, label: "Action" }
        : field
    );

    if (!updatedActionForm.some((f) => f.name === "defaultAction")) {
      updatedActionForm = [
        ...updatedActionForm,
        {
          id: `default-action-${Date.now()}`,
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
          isDeclaration: false,
          declaration: "",
          declarationFields: [],
        },
      ];
    }

    const finalPlayer = {
      ...editedPlayer,
      actionFormOptions,
      actionForm: sanitizeActionForm(updatedActionForm),
    };

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
          width: { xs: "90%", md: 1000 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: "primary.main" }}>
          Edit Player
        </Typography>

        {/* Service Info */}
        {serviceId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Service:</strong> {services.find(s => s.serviceId === serviceId)?.serviceName || "Unknown Service"}
            </Typography>
            {hasFetchedFormFields && (
              <Typography variant="body2">
                <strong>Available Form Fields:</strong> {formFields.length} fields loaded
              </Typography>
            )}
          </Alert>
        )}

        {/* Designation */}
        {isLoadingDesignations ? (
          <Typography>Loading designations...</Typography>
        ) : (
          <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
            <InputLabel>Designation</InputLabel>
            <Select
              label="Designation"
              value={editedPlayer.designation || ""}
              onChange={(e) => handleChange("designation", e.target.value)}
            >
              <MenuItem value=""><em>Select Designation</em></MenuItem>
              {designations.map((des, i) => (
                <MenuItem key={i} value={des.designation}>
                  {des.designation} ({des.accessLevel})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Access Level: {editedPlayer.accessLevel || "Not selected"}
        </Typography>

        {/* Permissions */}
        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Permissions</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={1} sx={{ pl: 2 }}>
          {[
            { key: "canSanction", label: "Can Sanction" },
            { key: "canReturnToPlayer", label: "Can Return to Player" },
            { key: "canReturnToCitizen", label: "Can Return to Citizen" },
            { key: "canForwardToPlayer", label: "Can Forward to Player" },
            { key: "canReject", label: "Can Reject" },
            { key: "canPull", label: "Can Pull" },
            { key: "canHavePool", label: "Can Bulk Applications" },
            { key: "canCorrigendum", label: "Can Corrigendum" },
            { key: "canManageBankFiles", label: "Can Manage Bank Files" },
            { key: "canWithhold", label: "Can Withhold" },
            { key: "canValidateAadhaar", label: "Can Validate Aadhaar" },
            { key: "canDirectWithheld", label: "Can Direct Withheld" },
          ].map((p) => (
            <Grid item xs={6} key={p.key}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!editedPlayer[p.key]}
                    onChange={(e) => handleChange(p.key, e.target.checked)}
                  />
                }
                label={p.label}
              />
            </Grid>
          ))}
          {editedPlayer.customPermissions?.map((perm) => (
            <Grid item xs={6} key={perm.name}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={perm.enabled}
                    onChange={(e) => handleChange(perm.name, e.target.checked)}
                  />
                }
                label={perm.label}
              />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ display: "flex", gap: 2, mt: 2, mb: 3 }}>
          <Button variant="outlined" onClick={selectAllPermissions}>
            Select All
          </Button>
          <Button variant="outlined" onClick={deselectAllPermissions}>
            Deselect All
          </Button>
        </Box>

        {/* Action Form Options */}
        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Action Form Options</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={1} sx={{ pl: 2 }}>
          {[
            { key: "canSanction", label: "Include Sanction", enabled: editedPlayer.canSanction },
            { key: "canReturnToPlayer", label: "Include Return to Player", enabled: editedPlayer.canReturnToPlayer },
            { key: "canReturnToCitizen", label: "Include Return to Citizen", enabled: editedPlayer.canReturnToCitizen },
            { key: "canForwardToPlayer", label: "Include Forward to Player", enabled: editedPlayer.canForwardToPlayer },
            { key: "canReject", label: "Include Reject", enabled: editedPlayer.canReject },
            { key: "canWithhold", label: "Include Withhold", enabled: editedPlayer.canWithhold },
            { key: "canDirectWithheld", label: "Include Direct Withheld", enabled: editedPlayer.canDirectWithheld },
          ].map((opt) => (
            <Grid item xs={6} key={opt.key}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!actionFormOptions[opt.key]}
                    onChange={(e) => handleActionFormOptionChange(opt.key, e.target.checked)}
                    disabled={!opt.enabled}
                  />
                }
                label={opt.label}
              />
            </Grid>
          ))}
          {editedPlayer.customPermissions?.map((perm) => (
            <Grid item xs={6} key={perm.name}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!actionFormOptions.customPermissions?.[perm.name]}
                    onChange={(e) => handleActionFormOptionChange(perm.name, e.target.checked)}
                    disabled={!perm.enabled}
                  />
                }
                label={`Include ${perm.label}`}
              />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ display: "flex", gap: 2, mt: 2, mb: 3 }}>
          <Button variant="outlined" onClick={selectAllActionFormOptions}>
            Select All
          </Button>
          <Button variant="outlined" onClick={deselectAllActionFormOptions}>
            Deselect All
          </Button>
        </Box>

        {/* Action Form Fields */}
        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Action Form Fields</Typography>
        <Divider sx={{ mb: 2 }} />
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={editedPlayer.actionForm.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {editedPlayer.actionForm.length > 0 ? (
              editedPlayer.actionForm.map((field) =>
                field.type === "declaration" ? (
                  <DeclarationField
                    key={field.id}
                    field={field}
                    onEditField={handleEditField}
                    onRemoveField={handleRemoveField}
                    onUpdateDeclarationFields={(declarationFields, declarationText) =>
                      handleUpdateDeclarationFields(field.id, declarationFields, declarationText)
                    }
                    serviceId={serviceId}
                    isFetchingFormFields={isFetchingFormFields}
                    formFields={formFields}
                    onRefreshFormFields={handleRefreshFormFields}
                  />
                ) : (
                  <SortableField
                    key={field.id}
                    id={field.id}
                    field={field}
                    sectionId="actionForm"
                    onEditField={handleEditField}
                    onRemoveField={handleRemoveField}
                  />
                )
              )
            ) : (
              <Typography color="text.secondary">No fields added yet.</Typography>
            )}
          </SortableContext>
        </DndContext>

        <Button variant="contained" onClick={addActionFormField} sx={{ mt: 2 }}>
          Add Field
        </Button>

        {/* Save / Cancel */}
        <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
          <Button variant="outlined" onClick={onClose}>
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
            serviceId={serviceId}
            availableFormFields={formFields} // Pass the already-fetched fields
          />
        )}
      </Box>
    </Modal>
  );
};

export default PlayerEditModal;