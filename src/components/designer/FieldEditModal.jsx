import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormControl,
  InputLabel,
  Box,
} from "@mui/material";
import {
  validationFunctionsList,
  transformationFunctionsList,
} from "../../assets/formvalidations";
import axiosnInstance from "../../axiosConfig";
import { toast } from "react-toastify";

// Async function to fetch districts (unchanged)
const fetchDistricts = async () => {
  try {
    const response = await axiosnInstance.get("/Base/GetDistricts");
    const data = await response.data;
    if (data.status) {
      return data.districts;
    }
    return [];
  } catch (error) {
    console.error("Error fetching districts:", error);
    return [];
  }
};

// Utility function to collect selectable fields
const getSelectableFields = (sections = [], actionForm = []) => {
  const selectableFields = [];
  const processFields = (fields, parentLabel = "", parentFieldName = "") => {
    fields.forEach((field) => {
      // Exclude fields related to "Can Withhold"
      if (
        field.name?.toLowerCase().includes("withhold") ||
        field.label?.toLowerCase().includes("withhold")
      ) {
        return;
      }
      selectableFields.push({
        id: field.name,
        label: parentLabel ? `${parentLabel} > ${field.label}` : field.label,
        options: field.options || [],
        isAdditional: !!parentFieldName,
        type: field.type,
        parentFieldName: parentFieldName || undefined,
      });
      if (field.additionalFields) {
        Object.values(field.additionalFields).forEach(
          (additionalFieldArray) => {
            processFields(
              additionalFieldArray,
              parentLabel ? `${parentLabel} > ${field.label}` : field.label,
              field.name,
            );
          },
        );
      }
    });
  };
  if (sections?.length > 0) {
    sections.forEach((section) => processFields(section.fields || []));
  }
  if (actionForm?.length > 0) {
    processFields(actionForm);
  }
  return selectableFields.filter((field) => !field.id.includes("District"));
};

const FieldEditModal = ({
  selectedField,
  sections = [],
  actionForm = [],
  onClose,
  updateField,
}) => {
  const [dependentOn, setDependentOn] = useState(
    selectedField?.dependentOn || "",
  );
  const [formData, setFormData] = useState({
    id: selectedField?.id || `field-${Date.now()}`,
    type: selectedField?.type || "text",
    label: selectedField?.label || "New Field",
    name: selectedField?.name || `NewField_${Date.now()}`,
    minLength: selectedField?.minLength ?? 5,
    maxLength: selectedField?.maxLength ?? 50,
    options: Array.isArray(selectedField?.options) ? selectedField.options : [],
    span: selectedField?.span ?? 12,
    validationFunctions: Array.isArray(selectedField?.validationFunctions)
      ? selectedField.validationFunctions
      : [],
    transformationFunctions: Array.isArray(
      selectedField?.transformationFunctions,
    )
      ? selectedField.transformationFunctions
      : [],
    accept: selectedField?.accept || "",
    editable: selectedField?.editable ?? true,
    value: selectedField?.value ?? undefined,
    optionsType:
      selectedField?.optionsType ||
      (selectedField?.type === "select" ? "independent" : ""),
    dependentOn: selectedField?.dependentOn || "",
    dependentOptions: selectedField?.dependentOptions || {},
    isDependentEnclosure: selectedField?.isDependentEnclosure || false,
    dependentField: selectedField?.dependentField || "",
    dependentValues: selectedField?.dependentValues || [],
    checkboxLayout: selectedField?.checkboxLayout || "vertical",
    isConsentCheckbox: selectedField?.isConsentCheckbox ?? false,
    declaration: selectedField?.declaration || "",
    required: selectedField?.required ?? false,
    isCheckboxDependent: selectedField?.isCheckboxDependent ?? false,
    checkboxDependentOn: selectedField?.checkboxDependentOn || "",
    checkboxDependentValue: selectedField?.checkboxDependentValue || "",
  });

  const [optionInputText, setOptionInputText] = useState(
    formData.options.map((opt) => opt.label).join(";"),
  );
  const initialIsDependentMaxLength =
    typeof selectedField?.maxLength === "object" &&
    selectedField?.maxLength?.dependentOn;
  const [isDependentMaxLength, setIsDependentMaxLength] = useState(
    initialIsDependentMaxLength,
  );

  const [dependentOptionInputs, setDependentOptionInputs] = useState({});

  const isWorkflowContext = sections.length === 0 && actionForm.length > 0;
  const selectableFields = getSelectableFields(sections, actionForm);
  const filteredSelectableFields = selectableFields.filter(
    (field) => field.id !== selectedField?.name,
  );

  // Simplified useEffect to handle declaration only
  useEffect(() => {
    if (!formData.isConsentCheckbox && formData.type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        declaration: "",
      }));
    }
  }, [formData.isConsentCheckbox, formData.type]);

  const handleDistrictCheckboxChange = async (e) => {
    const checked = e.target.checked;
    if (checked) {
      const districts = await fetchDistricts();
      const districtOptions = districts.map((d) => ({
        value: d.districtId,
        label: d.districtName,
      }));
      setFormData((prev) => ({
        ...prev,
        options: [
          { value: "Please Select", label: "Please Select" },
          ...districtOptions,
        ],
        optionsType: "independent",
      }));
      setOptionInputText(districtOptions.map((opt) => opt.label).join(";"));
    } else {
      setFormData((prev) => ({ ...prev, options: [], optionsType: "" }));
      setOptionInputText("");
    }
  };

  const validateField = (fieldData) => {
    if (
      fieldData.label?.toLowerCase().includes("withhold") ||
      fieldData.name?.toLowerCase().includes("withhold")
    ) {
      toast.error("Field label or name cannot include 'withhold'.");
      return false;
    }
    return true;
  };

  const saveChanges = () => {
    if (!validateField(formData)) {
      return;
    }

    console.log("Saving FormData:", {
      ...formData,
      isConsentCheckbox: formData.isConsentCheckbox,
      options: formData.options,
      declaration: formData.declaration,
      isCheckboxDependent: formData.isCheckboxDependent,
      checkboxDependentOn: formData.checkboxDependentOn,
      checkboxDependentValue: formData.checkboxDependentValue,
    });

    const finalFormData = {
      ...formData,
      options: formData.isConsentCheckbox ? [] : formData.options,
      optionsType: formData.isConsentCheckbox ? "" : formData.optionsType,
      dependentOn: formData.isConsentCheckbox ? "" : formData.dependentOn,
      dependentOptions: formData.isConsentCheckbox
        ? {}
        : formData.dependentOptions,
      declaration: formData.isConsentCheckbox ? formData.declaration : "",
      isCheckboxDependent:
        formData.type === "checkbox" ? formData.isCheckboxDependent : false,
      checkboxDependentOn:
        formData.type === "checkbox" && formData.isCheckboxDependent
          ? formData.checkboxDependentOn
          : "",
      checkboxDependentValue:
        formData.type === "checkbox" && formData.isCheckboxDependent
          ? formData.checkboxDependentValue
          : "",
    };

    updateField(finalFormData);
    onClose();
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      aria-labelledby="form-dialog-title"
      PaperProps={{ style: { width: "90%", maxWidth: 600 } }}
    >
      <DialogTitle id="form-dialog-title">Edit Field Properties</DialogTitle>
      <DialogContent>
        {filteredSelectableFields.length === 0 &&
          (formData.type === "select" || formData.type === "checkbox") && (
            <Typography color="error" sx={{ marginBottom: 2 }}>
              No fields available for dependency. Please ensure the form
              contains other fields.
            </Typography>
          )}
        <TextField
          fullWidth
          label="Field Label"
          value={formData.label}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, label: e.target.value }))
          }
          margin="dense"
        />
        <TextField
          fullWidth
          label="Field Name"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          margin="dense"
        />
        <TextField
          fullWidth
          label="Minimum Length"
          type="number"
          value={formData.minLength}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              minLength: parseInt(e.target.value, 10) || 0,
            }))
          }
          margin="dense"
        />
        <Box sx={{ marginTop: 2 }}>
          <Typography variant="body2">Maximum Length</Typography>
          {!isWorkflowContext && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDependentMaxLength}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsDependentMaxLength(checked);
                    setFormData((prev) => ({
                      ...prev,
                      maxLength: checked ? { dependentOn: "" } : 50,
                    }));
                  }}
                />
              }
              label="Dependent Maximum Length"
            />
          )}
          {isDependentMaxLength && !isWorkflowContext ? (
            <>
              <FormControl fullWidth margin="dense">
                <InputLabel id="maxLength-dependent-on-label">
                  Dependent Field
                </InputLabel>
                <Select
                  labelId="maxLength-dependent-on-label"
                  value={formData.maxLength.dependentOn || ""}
                  label="Dependent Field"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maxLength: {
                        ...prev.maxLength,
                        dependentOn: e.target.value,
                      },
                    }))
                  }
                >
                  <MenuItem value="">
                    <em>Select a field</em>
                  </MenuItem>
                  {filteredSelectableFields.map((field) => (
                    <MenuItem key={field.id} value={field.id}>
                      {field.label} ({field.type})
                      {field.isAdditional && " [Additional]"}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {formData.maxLength.dependentOn && (
                <>
                  {(() => {
                    const dependentFieldId = formData.maxLength.dependentOn;
                    const selectedField = selectableFields.find(
                      (field) => field.id === dependentFieldId,
                    );
                    if (selectedField?.options?.length > 0) {
                      return selectedField.options.map((option) => (
                        <TextField
                          key={option.value}
                          fullWidth
                          label={`Maximum Length for ${option.label}`}
                          type="number"
                          value={formData.maxLength?.[option.value] || ""}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value, 10) || 0;
                            setFormData((prev) => ({
                              ...prev,
                              maxLength: {
                                ...prev.maxLength,
                                [option.value]: newValue,
                              },
                            }));
                          }}
                          margin="dense"
                        />
                      ));
                    }
                    return (
                      <TextField
                        fullWidth
                        label="Maximum Length Condition"
                        value={formData.maxLength?.condition || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            maxLength: {
                              ...prev.maxLength,
                              condition: e.target.value,
                            },
                          }))
                        }
                        margin="dense"
                        placeholder="e.g., 'Not empty' for text fields"
                      />
                    );
                  })()}
                </>
              )}
            </>
          ) : (
            <TextField
              fullWidth
              label="Maximum Length"
              type="number"
              value={formData.maxLength}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxLength: parseInt(e.target.value, 10) || 50,
                }))
              }
              margin="dense"
            />
          )}
        </Box>
        <TextField
          fullWidth
          label="Span (Grid)"
          type="number"
          value={formData.span}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              span: parseInt(e.target.value, 10) || 12,
            }))
          }
          margin="dense"
        />
        <Typography variant="body2" sx={{ marginTop: 1 }}>
          Field Type
        </Typography>
        <FormControl fullWidth margin="dense">
          <InputLabel id="field-type-label">Field Type</InputLabel>
          <Select
            labelId="field-type-label"
            value={formData.type}
            label="Field Type"
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value,
                options:
                  e.target.value === "select"
                    ? [{ value: "Please Select", label: "Please Select" }]
                    : [],
                optionsType: e.target.value === "select" ? "independent" : "",
                isConsentCheckbox:
                  e.target.value === "checkbox"
                    ? prev.isConsentCheckbox
                    : false,
                declaration:
                  e.target.value === "checkbox" && prev.isConsentCheckbox
                    ? prev.declaration
                    : "",
                accept:
                  e.target.value === "file" ||
                  (e.target.value === "select" && prev.isDependentEnclosure)
                    ? prev.accept
                    : "",
                isCheckboxDependent:
                  e.target.value === "checkbox"
                    ? prev.isCheckboxDependent
                    : false,
                checkboxDependentOn:
                  e.target.value === "checkbox" ? prev.checkboxDependentOn : "",
                checkboxDependentValue:
                  e.target.value === "checkbox"
                    ? prev.checkboxDependentValue
                    : "",
              }))
            }
          >
            <MenuItem value="text">Text</MenuItem>
            <MenuItem value="email">Email</MenuItem>
            <MenuItem value="select">Select</MenuItem>
            <MenuItem value="checkbox">Checkbox</MenuItem>
            <MenuItem value="file">File</MenuItem>
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="enclosure">Enclosure</MenuItem>
          </Select>
        </FormControl>

        {/* Checkbox-specific configuration */}
        {formData.type === "checkbox" && (
          <>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isConsentCheckbox}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      isConsentCheckbox: checked,
                      options: checked ? [] : prev.options,
                      optionsType: checked ? "" : prev.optionsType,
                      dependentOn: checked ? "" : prev.dependentOn,
                      dependentOptions: checked ? {} : prev.dependentOptions,
                      declaration: checked ? prev.declaration : "",
                    }));
                    if (checked) {
                      setOptionInputText("");
                      setDependentOn("");
                    }
                  }}
                />
              }
              label="Single Consent Checkbox (True/False)"
            />

            {/* Checkbox Dependency Configuration */}
            {!isWorkflowContext && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isCheckboxDependent}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        isCheckboxDependent: checked,
                        checkboxDependentOn: checked
                          ? prev.checkboxDependentOn
                          : "",
                        checkboxDependentValue: checked
                          ? prev.checkboxDependentValue
                          : "",
                      }));
                    }}
                  />
                }
                label="Make Checkbox Dependent on Another Field"
              />
            )}

            {/* Checkbox Dependency Fields */}
            {formData.isCheckboxDependent && !isWorkflowContext && (
              <>
                <FormControl fullWidth margin="dense">
                  <InputLabel id="checkbox-dependent-on-label">
                    Dependent On Field
                  </InputLabel>
                  <Select
                    labelId="checkbox-dependent-on-label"
                    value={formData.checkboxDependentOn}
                    label="Dependent On Field"
                    onChange={(e) => {
                      const newDependentOn = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        checkboxDependentOn: newDependentOn,
                        checkboxDependentValue: "", // Reset dependent value when field changes
                      }));
                    }}
                  >
                    <MenuItem value="">
                      <em>Select a field</em>
                    </MenuItem>
                    {filteredSelectableFields
                      .filter((field) => field.type === "select") // Only show select fields
                      .map((field) => (
                        <MenuItem key={field.id} value={field.id}>
                          {field.label} ({field.type})
                          {field.isAdditional && " [Additional]"}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                {formData.checkboxDependentOn && (
                  <FormControl fullWidth margin="dense">
                    <InputLabel id="checkbox-dependent-value-label">
                      Show When Selected Value Is
                    </InputLabel>
                    <Select
                      labelId="checkbox-dependent-value-label"
                      value={formData.checkboxDependentValue}
                      label="Show When Selected Value Is"
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          checkboxDependentValue: e.target.value,
                        }))
                      }
                    >
                      <MenuItem value="">
                        <em>Select a value</em>
                      </MenuItem>
                      {(() => {
                        const selectedField = selectableFields.find(
                          (field) => field.id === formData.checkboxDependentOn,
                        );
                        return (
                          selectedField?.options?.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          )) || []
                        );
                      })()}
                    </Select>
                  </FormControl>
                )}
              </>
            )}

            {formData.isConsentCheckbox && (
              <TextField
                fullWidth
                label="Declaration Text"
                value={formData.declaration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    declaration: e.target.value,
                  }))
                }
                margin="dense"
                multiline
                rows={4}
                placeholder="Enter the declaration or consent text, e.g., 'I agree to the terms and conditions.'"
                helperText="Optional: Enter a declaration statement to display with the consent checkbox."
              />
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.required}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      required: e.target.checked,
                    }))
                  }
                />
              }
              label="Required Field"
            />

            <FormControlLabel
              control={<Checkbox onChange={handleDistrictCheckboxChange} />}
              label="Is District"
            />
          </>
        )}

        {/* Select-specific configuration */}
        {formData.type === "select" && (
          <>
            <FormControl fullWidth margin="dense">
              <InputLabel id="options-type-label">Options Type</InputLabel>
              <Select
                labelId="options-type-label"
                value={formData.optionsType || ""}
                label="Options Type"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    optionsType: e.target.value,
                    dependentOn:
                      e.target.value === "dependent" ? dependentOn : "",
                    dependentOptions:
                      e.target.value === "dependent" ? {} : undefined,
                    options:
                      e.target.value === "independent" ? [] : prev.options,
                  }))
                }
              >
                <MenuItem value="">Please Select</MenuItem>
                <MenuItem value="independent">Independent</MenuItem>
                {sections && <MenuItem value="dependent">Dependent</MenuItem>}
              </Select>
            </FormControl>
            {formData.optionsType === "independent" && (
              <TextField
                fullWidth
                label="Options (semicolon-separated)"
                value={optionInputText}
                onChange={(e) => setOptionInputText(e.target.value)}
                onBlur={() => {
                  const newOptions = optionInputText
                    .split(";")
                    .map((optStr) => {
                      const cleaned = optStr.trim();
                      if (cleaned.toLowerCase().includes("withhold")) {
                        toast.error("Options cannot include 'withhold'.");
                        return null;
                      }
                      return cleaned
                        ? { value: cleaned, label: cleaned }
                        : null;
                    })
                    .filter((opt) => opt !== null);
                  setFormData((prev) => ({ ...prev, options: newOptions }));
                }}
                margin="dense"
                placeholder="Type options separated by semicolons, e.g., Option 1;Option 2 with space;Option 3"
                helperText="Use semicolons (;) to separate options. Spaces are preserved in option labels and values."
              />
            )}
            {formData.optionsType === "dependent" && !isWorkflowContext && (
              <>
                <FormControl fullWidth margin="dense">
                  <InputLabel id="dependent-on-label">Dependent On</InputLabel>
                  <Select
                    labelId="dependent-on-label"
                    value={dependentOn || ""}
                    label="Dependent On"
                    onChange={(e) => {
                      const newDependentOn = e.target.value;
                      setDependentOn(newDependentOn);
                      setFormData((prev) => ({
                        ...prev,
                        dependentOn: newDependentOn,
                        dependentOptions: newDependentOn
                          ? {}
                          : prev.dependentOptions,
                      }));
                    }}
                  >
                    <MenuItem value="">
                      <em>Select a field</em>
                    </MenuItem>
                    {filteredSelectableFields
                      .filter(
                        (field, index, self) =>
                          index === self.findIndex((f) => f.id === field.id),
                      )
                      .map((field) => (
                        <MenuItem key={field.id} value={field.id}>
                          {field.label} ({field.type})
                          {field.isAdditional && " [Additional]"}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                {dependentOn && (
                  <>
                    {(() => {
                      const selectedField = selectableFields.find(
                        (field) => field.id === dependentOn,
                      );
                      if (selectedField?.options?.length > 0) {
                        return selectedField.options.map((option) => (
                          <TextField
                            key={option.value}
                            fullWidth
                            label={`Options for ${option.label} (semicolon-separated)`}
                            value={
                              dependentOptionInputs[option.value] ??
                              (formData.dependentOptions?.[option.value]
                                ? formData.dependentOptions[option.value]
                                    .map((opt) => opt.label)
                                    .join(";")
                                : "")
                            }
                            onChange={(e) => {
                              const input = e.target.value;
                              setDependentOptionInputs((prev) => ({
                                ...prev,
                                [option.value]: input,
                              }));

                              const newOptions = input
                                .split(";")
                                .map((optStr) => {
                                  const cleaned = optStr.trim();
                                  if (
                                    cleaned.toLowerCase().includes("withhold")
                                  ) {
                                    toast.error(
                                      "Options cannot include 'withhold'.",
                                    );
                                    return null;
                                  }
                                  return cleaned
                                    ? { value: cleaned, label: cleaned }
                                    : null;
                                })
                                .filter(Boolean);

                              setFormData((prev) => ({
                                ...prev,
                                dependentOptions: {
                                  ...prev.dependentOptions,
                                  [option.value]: newOptions,
                                },
                              }));
                            }}
                            margin="dense"
                            placeholder="Type options separated by semicolons..."
                            helperText="Use semicolons (;) to separate options. Spaces are preserved..."
                          />
                        ));
                      }
                      return (
                        <TextField
                          fullWidth
                          label={`Dependent Options for ${
                            selectedField?.label || "Selected Field"
                          } (semicolon-separated)`}
                          value={
                            formData.dependentOptions?.["default"]
                              ? formData.dependentOptions["default"]
                                  .map((opt) => opt.label)
                                  .join(";")
                              : ""
                          }
                          onChange={(e) => {
                            const newOptions = e.target.value
                              .split(";")
                              .map((optStr) => {
                                const cleaned = optStr.trim();
                                if (
                                  cleaned.toLowerCase().includes("withhold")
                                ) {
                                  toast.error(
                                    "Options cannot include 'withhold'.",
                                  );
                                  return null;
                                }
                                return cleaned
                                  ? { value: cleaned, label: cleaned }
                                  : null;
                              })
                              .filter((opt) => opt !== null);
                            setFormData((prev) => ({
                              ...prev,
                              dependentOptions: {
                                ...prev.dependentOptions,
                                default: newOptions,
                              },
                            }));
                          }}
                          margin="dense"
                          placeholder="Type options separated by semicolons, e.g., Sub-option 1;Sub-option 2 with space;Sub-option 3"
                          helperText="Use semicolons (;) to separate options. Spaces are preserved in option labels and values."
                        />
                      );
                    })()}
                  </>
                )}
              </>
            )}
            <FormControlLabel
              control={<Checkbox onChange={handleDistrictCheckboxChange} />}
              label="Is District"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.required}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      required: e.target.checked,
                    }))
                  }
                />
              }
              label="Required Field"
            />
            {formData.type === "select" && formData.isDependentEnclosure && (
              <TextField
                fullWidth
                label="File Type Allowed"
                value={formData.accept}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, accept: e.target.value }))
                }
                margin="dense"
                placeholder="e.g., image/*, .pdf"
                helperText="Specify accepted file types, e.g., image/*, .pdf, .doc"
              />
            )}
          </>
        )}

        {formData.type === "enclosure" && (
          <>
            {!isWorkflowContext && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isDependentEnclosure || false}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isDependentEnclosure: e.target.checked,
                        dependentField: e.target.checked ? "" : null,
                        dependentValues: e.target.checked ? [] : null,
                      }))
                    }
                  />
                }
                label="Is Dependent on Another Field?"
              />
            )}
            {formData.isDependentEnclosure && !isWorkflowContext && (
              <>
                <FormControl fullWidth margin="dense">
                  <InputLabel id="dependent-field-label">
                    Dependent Field
                  </InputLabel>
                  <Select
                    labelId="dependent-field-label"
                    value={formData.dependentField || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        dependentField: e.target.value,
                        dependentValues: [],
                      }))
                    }
                  >
                    <MenuItem value="">
                      <em>Select a field</em>
                    </MenuItem>
                    {filteredSelectableFields.map((field) => (
                      <MenuItem key={field.id} value={field.id}>
                        {field.label} ({field.type})
                        {field.isAdditional && " [Additional]"}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {formData.dependentField && (
                  <FormControl fullWidth margin="dense">
                    <InputLabel id="dependent-values-label">
                      Dependent Values (Select Multiple)
                    </InputLabel>
                    {(() => {
                      const selectedField = selectableFields.find(
                        (field) => field.id === formData.dependentField,
                      );
                      if (selectedField?.options?.length > 0) {
                        return (
                          <Select
                            labelId="dependent-values-label"
                            multiple
                            value={formData.dependentValues || []}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                dependentValues: e.target.value,
                              }))
                            }
                            renderValue={(selected) =>
                              selected
                                .map(
                                  (val) =>
                                    selectedField.options.find(
                                      (opt) => opt.value === val,
                                    )?.label,
                                )
                                .filter((label) => label)
                                .join(";")
                            }
                          >
                            {selectedField.options.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        );
                      }
                      return (
                        <TextField
                          fullWidth
                          label="Condition for Dependent Field"
                          value={formData.dependentValues?.[0] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              dependentValues: [e.target.value],
                            }))
                          }
                          margin="dense"
                          placeholder="e.g., 'Not empty' for text fields"
                        />
                      );
                    })()}
                  </FormControl>
                )}
              </>
            )}
            <TextField
              fullWidth
              label="Default Options (semicolon-separated)"
              value={optionInputText}
              onChange={(e) => setOptionInputText(e.target.value)}
              onBlur={() => {
                const newOptions = optionInputText
                  .split(";")
                  .map((optStr) => {
                    const cleaned = optStr.trim();
                    if (cleaned.toLowerCase().includes("withhold")) {
                      toast.error("Options cannot include 'withhold'.");
                      return null;
                    }
                    return cleaned ? { value: cleaned, label: cleaned } : null;
                  })
                  .filter((opt) => opt !== null);
                setFormData((prev) => ({ ...prev, options: newOptions }));
              }}
              margin="dense"
              placeholder="Type options separated by semicolons, e.g., Option 1;Option 2 with space;Option 3"
              helperText="Use semicolons (;) to separate options. Spaces are preserved in option labels and values."
            />
            <TextField
              fullWidth
              label="File Type Allowed"
              value={formData.accept}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, accept: e.target.value }))
              }
              margin="dense"
              placeholder="e.g., image/*, .pdf"
              helperText="Specify accepted file types, e.g., image/*, .pdf, .doc"
            />
          </>
        )}
        {formData.type === "file" && (
          <TextField
            fullWidth
            label="File Type Allowed"
            value={formData.accept}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, accept: e.target.value }))
            }
            margin="dense"
            placeholder="e.g., image/*, .pdf"
            helperText="Specify accepted file types, e.g., image/*, .pdf, .doc"
          />
        )}
        <Typography variant="body2" sx={{ marginTop: 2 }}>
          Validation Functions
        </Typography>
        {validationFunctionsList.map((func) => (
          <FormControlLabel
            key={func.id}
            control={
              <Checkbox
                checked={formData.validationFunctions.includes(func.id)}
                onChange={(e) => {
                  let updatedValidations = [...formData.validationFunctions];
                  if (e.target.checked) {
                    updatedValidations.push(func.id);
                  } else {
                    updatedValidations = updatedValidations.filter(
                      (id) => id !== func.id,
                    );
                  }
                  setFormData((prev) => ({
                    ...prev,
                    validationFunctions: updatedValidations,
                  }));
                }}
              />
            }
            label={func.label}
          />
        ))}
        <Typography variant="body2" sx={{ marginTop: 2 }}>
          Transformation Functions
        </Typography>
        {transformationFunctionsList.map((func) => (
          <FormControlLabel
            key={func.id}
            control={
              <Checkbox
                checked={formData.transformationFunctions.includes(func.id)}
                onChange={(e) => {
                  let updatedTransformations = [
                    ...formData.transformationFunctions,
                  ];
                  if (e.target.checked) {
                    updatedTransformations.push(func.id);
                  } else {
                    updatedTransformations = updatedTransformations.filter(
                      (id) => id !== func.id,
                    );
                  }
                  setFormData((prev) => ({
                    ...prev,
                    transformationFunctions: updatedTransformations,
                  }));
                }}
              />
            }
            label={func.label}
          />
        ))}
        <Button
          fullWidth
          variant="contained"
          onClick={saveChanges}
          sx={{ marginTop: 2 }}
        >
          Save Changes
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default FieldEditModal;
