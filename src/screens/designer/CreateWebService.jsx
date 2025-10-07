import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Switch,
  Chip,
} from "@mui/material";
import { Container, Row, Col } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../axiosConfig";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

const MappingNode = ({
  node,
  path = [],
  onUpdate,
  onAddChild,
  onRemove,
  formFields,
  level = 0,
}) => {
  const [key, setKey] = useState(node.key || "");
  const [value, setValue] = useState(node.value || "");
  const [isObject, setIsObject] = useState(!!node.children);
  const [children, setChildren] = useState(node.children || {});

  const handleKeyChange = (e) => {
    const newKey = e.target.value;
    setKey(newKey);
    onUpdate(path, {
      key: newKey,
      value: isObject ? undefined : value,
      children: isObject ? children : undefined,
    });
  };

  const handleValueChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    onUpdate(path, { key, value: newValue, children: undefined });
  };

  const handleToggle = (e) => {
    const newIsObject = e.target.checked;
    setIsObject(newIsObject);
    setValue("");
    setChildren({});
    onUpdate(path, {
      key,
      value: undefined,
      children: newIsObject ? {} : undefined,
    });
  };

  const handleAddChild = () => {
    const newChildKey = `child_${Object.keys(children).length + Date.now()}`;
    const newChild = {
      key: `key_${Object.keys(children).length + 1}`,
      value: "",
      children: undefined,
    };
    setChildren((prev) => ({ ...prev, [newChildKey]: newChild }));
    onAddChild(path, newChildKey);
  };

  const handleChildUpdate = (childPath, childNode) => {
    const childKey = childPath[childPath.length - 1];
    setChildren((prev) => {
      const newChildren = { ...prev };
      newChildren[childKey] = {
        key: childNode.key,
        value: childNode.value,
        children: childNode.children,
      };
      return newChildren;
    });
    onUpdate(path, {
      key,
      value: isObject ? undefined : value,
      children: { ...children, [childKey]: childNode },
    });
  };

  const handleRemoveChild = (childKey) => {
    console.log("Removing child:", childKey, "from path:", path);
    const newChildren = { ...children };
    delete newChildren[childKey];
    setChildren(newChildren);
    onUpdate(path, {
      key,
      value: isObject ? undefined : value,
      children: newChildren,
    });
  };

  return (
    <Box
      sx={{
        ml: level * 2,
        mb: 2,
        p: 1,
        borderLeft: level > 0 ? "1px solid grey.300" : "none",
      }}
    >
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          label="Key"
          value={key}
          onChange={handleKeyChange}
          variant="outlined"
          placeholder="e.g., District"
          sx={{ flex: 1 }}
        />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2">Value</Typography>
          <Switch checked={isObject} onChange={handleToggle} />
          <Typography variant="body2">Object</Typography>
        </Box>
        {isObject ? (
          <Tooltip title="Add Child Key">
            <IconButton onClick={handleAddChild} sx={{ color: "primary.main" }}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        ) : (
          <FormControl sx={{ flex: 1 }} variant="outlined">
            <InputLabel id={`field-select-${path.join("-")}`}>
              Form Field
            </InputLabel>
            <Select
              labelId={`field-select-${path.join("-")}`}
              value={value}
              label="Form Field"
              onChange={handleValueChange}
            >
              <MenuItem value="">
                <em>Select a field</em>
              </MenuItem>
              {formFields.map((field) => (
                <MenuItem key={field.id} value={field.label}>
                  {field.path} ({field.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Tooltip title="Remove Mapping">
          <IconButton
            onClick={() => {
              console.log("Triggering remove for path:", path);
              onRemove(path);
            }}
            sx={{ color: "error.main" }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {isObject &&
        Object.entries(children).map(([childKey, childNode]) => (
          <MappingNode
            key={childKey}
            node={childNode}
            path={[...path, childKey]}
            onUpdate={handleChildUpdate}
            onAddChild={onAddChild}
            onRemove={() => handleRemoveChild(childKey)}
            formFields={formFields}
            level={level + 1}
          />
        ))}
    </Box>
  );
};

// Utility function to convert API field mappings to internal format
const convertFromApiFormat = (apiMappings) => {
  const result = {};
  const convertNode = (obj, parentKey) => {
    const nodeKey = `${parentKey}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    if (typeof obj === "string") {
      return { key: parentKey, value: obj, children: undefined };
    } else if (typeof obj === "object" && obj !== null) {
      const children = {};
      Object.entries(obj).forEach(([key, value]) => {
        children[
          `child_${key}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 8)}`
        ] = convertNode(value, key);
      });
      return { key: parentKey, value: undefined, children };
    }
    return { key: parentKey, value: "", children: undefined };
  };

  Object.entries(apiMappings).forEach(([key, value]) => {
    result[
      `key_${key}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    ] = convertNode(value, key);
  });
  return result;
};

export default function CreateWebService() {
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [formFields, setFormFields] = useState([]);
  const [webServiceConfig, setWebServiceConfig] = useState({
    webServiceId: "", // Added webServiceId
    webServiceName: "",
    apiEndPoint: "",
    onAction: [],
    fieldMappings: {},
  });

  // Fetch services on mount
  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await axiosInstance.get("/Base/GetServices");
        if (response.data.status && response.data.services) {
          setServices(response.data.services);
        } else {
          toast.error("Failed to fetch services: No services found");
        }
      } catch (err) {
        console.error("Fetch services error:", err);
        toast.error("Error fetching services");
      }
    }
    fetchServices();
  }, []);

  // Fetch existing configuration and form fields when service changes
  useEffect(() => {
    if (!selectedServiceId) {
      setFormFields([]);
      setWebServiceConfig({ apiEndPoint: "", onAction: [], fieldMappings: {} });
      return;
    }

    async function fetchWebServiceConfig() {
      try {
        // Fetch existing web service configuration
        const configResponse = await axiosInstance.get(
          `/Designer/GetWebService?serviceId=${selectedServiceId}`,
        );
        if (configResponse.data.status && configResponse.data.config) {
          const config = configResponse.data.config;
          setWebServiceConfig({
            webServiceId: config.id || "", // Store WebServiceId
            webServiceName: config.webServiceName,
            apiEndPoint: config.apiEndPoint || "",
            onAction: config.onAction ? JSON.parse(config.onAction) : [],
            fieldMappings: config.fieldMappings
              ? convertFromApiFormat(JSON.parse(config.fieldMappings))
              : {},
          });
        } else {
          // No existing configuration, reset to defaults
          setWebServiceConfig({
            webServiceId: "",
            webServiceName: "",
            apiEndPoint: "",
            onAction: [],
            fieldMappings: {},
          });
          toast.info("No existing configuration found for this service");
        }
      } catch (err) {
        console.error("Fetch web service config error:", err);
        toast.error("Error fetching web service configuration");
        setWebServiceConfig({
          webServiceId: "",
          webServiceName: "",
          apiEndPoint: "",
          onAction: [],
          fieldMappings: {},
        });
      }

      // Fetch form fields
      try {
        const service = services.find((s) => s.serviceId === selectedServiceId);
        if (!service) {
          toast.error("Selected service not found");
          return;
        }
        if (!service.formElement) {
          toast.warn("No form configuration found for this service");
          setFormFields([]);
          return;
        }
        console.log(
          "Parsing formElement for service:",
          service.serviceId,
          service.formElement,
        );
        const formConfig = JSON.parse(service.formElement);
        console.log("Parsed formConfig:", formConfig);
        const sections = Array.isArray(formConfig)
          ? formConfig
          : formConfig.sections;
        if (!sections || !Array.isArray(sections)) {
          throw new Error(
            "Invalid form configuration: sections missing or not an array",
          );
        }
        const fields = extractFields(sections);
        if (fields.length === 0) {
          toast.warn("No fields found in form configuration");
        }
        setFormFields(fields);
      } catch (err) {
        console.error("Form fields parsing error:", err.message, err.stack);
        toast.error(`Error parsing service form fields: ${err.message}`);
        setFormFields([]);
      }
    }

    fetchWebServiceConfig();
  }, [selectedServiceId, services]);

  // Extract fields, including nested additionalFields
  const extractFields = (sections, parentPath = "") => {
    const fields = [];
    const fieldNames = new Set(); // Track field names for uniqueness

    if (!Array.isArray(sections)) {
      console.error("Sections is not an array:", sections);
      return fields;
    }

    sections.forEach((section, sectionIndex) => {
      if (!section?.fields || !Array.isArray(section.fields)) {
        console.warn(
          `Section ${section?.id || sectionIndex} has no valid fields:`,
          section,
        );
        return;
      }

      const sectionName = section.section || `Section_${sectionIndex}`; // Fallback section name

      section.fields.forEach((field, fieldIndex) => {
        if (!field?.name || !field?.id) {
          console.warn(
            `Invalid field at ${sectionName}[${fieldIndex}]:`,
            field,
          );
          return;
        }

        const fieldPath = parentPath
          ? `${parentPath} > ${field.name}`
          : `${sectionName} > ${field.name}`;

        // Check for duplicate field names
        if (fieldNames.has(field.name)) {
          console.warn(
            `Duplicate field name "${field.name}" at path: ${fieldPath}`,
          );
        } else {
          fieldNames.add(field.name);
        }

        fields.push({
          id: field.id,
          label: field.name, // Use 'label' for consistency with MappingNode
          type: field.type || "unknown",
          path: fieldPath,
        });

        if (
          field.additionalFields &&
          typeof field.additionalFields === "object"
        ) {
          Object.values(field.additionalFields).forEach(
            (nestedFieldsArray, arrayIndex) => {
              if (!Array.isArray(nestedFieldsArray)) {
                console.warn(
                  `Nested fields not an array at ${fieldPath}[${arrayIndex}]:`,
                  nestedFieldsArray,
                );
                return;
              }

              nestedFieldsArray.forEach((nestedField) => {
                if (!nestedField?.name || !nestedField?.id) {
                  console.warn(
                    `Invalid nested field at ${fieldPath}:`,
                    nestedField,
                  );
                  return;
                }

                const nestedPath = `${fieldPath} > ${nestedField.name}`;

                // Check for duplicate field names
                if (fieldNames.has(nestedField.name)) {
                  console.warn(
                    `Duplicate field name "${nestedField.name}" at path: ${nestedPath}`,
                  );
                } else {
                  fieldNames.add(nestedField.name);
                }

                fields.push({
                  id: nestedField.id,
                  label: nestedField.name, // Use 'label' for consistency
                  type: nestedField.type || "unknown",
                  path: nestedPath,
                });

                if (
                  nestedField.additionalFields &&
                  typeof nestedField.additionalFields === "object"
                ) {
                  // Recursive call with nested fields as a synthetic section
                  fields.push(
                    ...extractFields(
                      [
                        {
                          section: sectionName, // Preserve section context
                          fields: Object.values(
                            nestedField.additionalFields,
                          ).flat(),
                        },
                      ],
                      nestedPath,
                    ),
                  );
                }
              });
            },
          );
        }
      });
    });

    return fields;
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setWebServiceConfig((prev) => ({
      ...prev,
      [name]: name === "onAction" ? value : value, // Handle array for onAction
    }));
  };

  // Add a root mapping node
  const addRootMapping = () => {
    const newKey = `key_${
      Object.keys(webServiceConfig.fieldMappings).length + Date.now()
    }`;
    setWebServiceConfig((prev) => ({
      ...prev,
      fieldMappings: {
        ...prev.fieldMappings,
        [newKey]: {
          key: `key_${Object.keys(prev.fieldMappings).length + 1}`,
          value: "",
          children: undefined,
        },
      },
    }));
  };

  // Update a mapping node
  const updateMapping = (path, node) => {
    setWebServiceConfig((prev) => {
      const newMappings = JSON.parse(JSON.stringify(prev.fieldMappings));
      let current = newMappings;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]].children;
      }
      if (path.length > 0) {
        current[path[path.length - 1]] = node;
      }
      return { ...prev, fieldMappings: newMappings };
    });
  };

  // Add a child node
  const addChild = (path, childKey) => {
    console.log("Adding child at path:", path, "with key:", childKey);
    setWebServiceConfig((prev) => {
      const newMappings = JSON.parse(JSON.stringify(prev.fieldMappings));
      let current = newMappings;
      for (const key of path) {
        current = current[key].children;
      }
      current[childKey] = {
        key: `key_${Object.keys(current).length + 1}`,
        value: "",
        children: undefined,
      };
      return { ...prev, fieldMappings: newMappings };
    });
  };

  // Remove a mapping node
  const removeMapping = (path) => {
    console.log("Removing node at path:", path);
    setWebServiceConfig((prev) => {
      const newMappings = JSON.parse(JSON.stringify(prev.fieldMappings));
      let current = newMappings;
      if (path.length === 1) {
        delete newMappings[path[0]];
        toast.info(`Removed root mapping: ${path.join(".")}`);
      } else {
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]].children || {};
        }
        delete current[path[path.length - 1]];
        toast.info(`Removed mapping: ${path.join(".")}`);
      }
      return { ...prev, fieldMappings: newMappings };
    });
  };

  // Validate mappings
  const validateMappings = (mappings) => {
    const fieldNames = new Set();
    const validateNode = (node, nodePath) => {
      if (!node.key.trim()) {
        toast.error(`Empty key at path: ${nodePath.join(".")}`);
        return false;
      }
      if (node.value) {
        if (!formFields.some((f) => f.label === node.value)) {
          toast.error(`Invalid field name at path: ${nodePath.join(".")}`);
          return false;
        }
        if (fieldNames.has(node.value)) {
          toast.error(`Duplicate field name at path: ${nodePath.join(".")}`);
          return false;
        }
        fieldNames.add(node.value);
      }
      if (node.children) {
        for (const [childKey, childNode] of Object.entries(node.children)) {
          if (!validateNode(childNode, [...nodePath, childKey])) {
            return false;
          }
        }
      }
      return true;
    };
    for (const [key, node] of Object.entries(mappings)) {
      if (!validateNode(node, [key])) {
        return false;
      }
    }
    return fieldNames.size > 0;
  };

  // Convert mappings to API format
  const convertToApiFormat = (mappings) => {
    const result = {};
    const convertNode = (node, target) => {
      if (node.value) {
        target[node.key] = node.value;
      } else if (node.children) {
        target[node.key] = {};
        for (const childNode of Object.values(node.children)) {
          convertNode(childNode, target[node.key]);
        }
      }
    };
    for (const node of Object.values(mappings)) {
      convertNode(node, result);
    }
    return result;
  };

  // Save configuration
  const handleSave = async () => {
    if (!selectedServiceId) {
      toast.error("Please select a service");
      return;
    }
    if (!webServiceConfig.apiEndPoint.trim()) {
      toast.error("API endpoint is required");
      return;
    }
    if (webServiceConfig.onAction.length === 0) {
      toast.error("Please select at least one action");
      return;
    }
    if (Object.keys(webServiceConfig.fieldMappings).length === 0) {
      toast.error("At least one field mapping is required");
      return;
    }
    if (!validateMappings(webServiceConfig.fieldMappings)) {
      return;
    }

    const payload = {
      webServiceId: webServiceConfig.webServiceId, // Include webServiceId
      serviceId: selectedServiceId,
      webServiceName: webServiceConfig.webServiceName,
      apiEndPoint: webServiceConfig.apiEndPoint,
      onAction: JSON.stringify(webServiceConfig.onAction), // Stringify for consistency
      fieldMappings: JSON.stringify(
        convertToApiFormat(webServiceConfig.fieldMappings),
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const formdata = new FormData();
    Object.keys(payload).forEach((key) => {
      formdata.append(key, payload[key]);
    });

    try {
      const response = await axiosInstance.post(
        "/Designer/SaveWebService",
        formdata,
      );
      if (response.data.status) {
        toast.success("Web service configuration saved successfully!");
        setWebServiceConfig({
          webServiceId: "", // Update with returned webServiceId
          webServiceName: "",
          apiEndPoint: "",
          onAction: [],
          fieldMappings: {},
        });
        setSelectedServiceId("");
      } else {
        toast.error(response.data.message || "Failed to save configuration");
      }
    } catch (err) {
      console.error("Save configuration error:", err);
      toast.error(err.response?.data?.message || "Error saving configuration");
    }
  };

  const actionOptions = [
    "Submission",
    "Rejection",
    "Sanction",
    "Correction",
    "Corrigendum",
    "Amendment",
    "Withheld",
  ];

  return (
    <Container fluid sx={{ bgcolor: "grey.100", minHeight: "100vh", py: 4 }}>
      <Paper
        elevation={3}
        sx={{
          maxWidth: 1200,
          mx: "auto",
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "white",
        }}
      >
        <Box sx={{ p: 4, bgcolor: "primary.main", color: "white" }}>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            Web Service Configuration
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.8 }}>
            Configure API integration for service actions
          </Typography>
        </Box>
        <Box sx={{ p: 4 }}>
          <Row>
            <Col xs={12}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  bgcolor: "white",
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {/* Service Selection */}
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="service-select-label">
                      Select Service
                    </InputLabel>
                    <Select
                      labelId="service-select-label"
                      value={selectedServiceId}
                      label="Select Service"
                      onChange={(e) => setSelectedServiceId(e.target.value)}
                      sx={{
                        bgcolor: "white",
                        borderRadius: 1,
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "grey.300",
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em>Select a service</em>
                      </MenuItem>
                      {services.map((service) => (
                        <MenuItem
                          key={service.serviceId}
                          value={service.serviceId}
                        >
                          {service.serviceName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Web Service Name */}
                  <TextField
                    fullWidth
                    label="Web Service Name"
                    name="webServiceName"
                    value={webServiceConfig.webServiceName}
                    onChange={handleInputChange}
                    variant="outlined"
                    placeholder="Web Service Name"
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "grey.300" },
                        "&:hover fieldset": { borderColor: "primary.main" },
                      },
                    }}
                  />

                  {/* API Endpoint */}
                  <TextField
                    fullWidth
                    label="API Endpoint"
                    name="apiEndPoint"
                    value={webServiceConfig.apiEndPoint}
                    onChange={handleInputChange}
                    variant="outlined"
                    placeholder="https://api.example.com/endpoint"
                    sx={{
                      bgcolor: "white",
                      borderRadius: 1,
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "grey.300" },
                        "&:hover fieldset": { borderColor: "primary.main" },
                      },
                    }}
                  />

                  {/* Action Selection */}
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="action-select-label">Actions</InputLabel>
                    <Select
                      labelId="action-select-label"
                      name="onAction"
                      multiple
                      value={webServiceConfig.onAction}
                      onChange={handleInputChange}
                      label="Actions"
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                      sx={{
                        bgcolor: "white",
                        borderRadius: 1,
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "grey.300",
                        },
                      }}
                    >
                      {actionOptions.map((action) => (
                        <MenuItem key={action} value={action}>
                          {action}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Field Mappings */}
                  <Box>
                    <Typography
                      variant="h6"
                      sx={{ mb: 2, fontWeight: "bold", color: "grey.800" }}
                    >
                      Field Mappings
                    </Typography>
                    {Object.keys(webServiceConfig.fieldMappings).length ===
                      0 && (
                      <Typography sx={{ color: "grey.600", mb: 2 }}>
                        No field mappings added. Click "Add Mapping" to start.
                      </Typography>
                    )}
                    {Object.entries(webServiceConfig.fieldMappings).map(
                      ([key, node]) => (
                        <MappingNode
                          key={key}
                          node={node}
                          path={[key]}
                          onUpdate={updateMapping}
                          onAddChild={addChild}
                          onRemove={removeMapping}
                          formFields={formFields}
                        />
                      ),
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={addRootMapping}
                      startIcon={<AddIcon />}
                      disabled={!selectedServiceId || formFields.length === 0}
                      sx={{
                        borderColor: "primary.main",
                        color: "primary.main",
                        textTransform: "none",
                        "&:hover": {
                          bgcolor: "primary.light",
                          borderColor: "primary.dark",
                        },
                      }}
                    >
                      Add Mapping
                    </Button>
                  </Box>

                  {/* Save Button */}
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    sx={{
                      py: 1.5,
                      borderRadius: 1,
                      textTransform: "none",
                      fontWeight: "bold",
                      bgcolor: "success.main",
                      "&:hover": {
                        bgcolor: "success.dark",
                        transform: "translateY(-2px)",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                  >
                    Save Configuration
                  </Button>
                </Box>
              </Paper>
            </Col>
          </Row>
        </Box>
      </Paper>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="colored"
      />
    </Container>
  );
}
