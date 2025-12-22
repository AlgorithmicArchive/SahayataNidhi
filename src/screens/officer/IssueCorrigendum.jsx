import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
  MenuItem,
  Select,
  IconButton,
  FormControl,
  InputLabel,
  FormHelperText,
  Grid,
  FormLabel,
} from "@mui/material";
import { styled } from "@mui/system";
import { Delete as DeleteIcon, Label } from "@mui/icons-material";
import ServiceSelectionForm from "../../components/ServiceSelectionForm";
import { fetchServiceList } from "../../assets/fetch";
import axiosInstance from "../../axiosConfig";
import {
  runValidations,
  TransformationFunctionsList,
} from "../../assets/formvalidations";
import { useLocation } from "react-router-dom";
import { MaterialReactTable } from "material-react-table";
import BasicModal from "../../components/BasicModal";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

const StyledContainer = styled(Container)({
  background: "linear-gradient(135deg, #ffffff 0%, #f0f4f8 100%)",
  padding: "32px",
  borderRadius: "16px",
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.15)",
  maxWidth: "800px",
  marginTop: "40px",
});

const StyledButton = styled(Button)({
  background: "linear-gradient(45deg, #1976d2 30%, #2196f3 90%)",
  color: "#fff",
  fontWeight: "600",
  padding: "12px 24px",
  borderRadius: "8px",
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 4px 15px rgba(25, 118, 210, 0.4)",
  },
});

const StyledFormControl = styled(FormControl)({
  minWidth: "200px",
  "& .MuiInputBase-root": {
    borderRadius: "8px",
    backgroundColor: "#fff",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
  },
});

const FileNameTypography = styled(Typography)({
  cursor: "pointer",
  color: "#1976d2",
  "&:hover": {
    textDecoration: "underline",
  },
});

const MaterialTable = ({ columns, data, viewType }) => {
  return (
    <MaterialReactTable
      columns={columns}
      data={data}
      enableColumnActions={false}
      enableColumnFilters={false}
      enablePagination={false}
      enableSorting={false}
      muiTablePaperProps={{
        sx: {
          borderRadius: "12px",
          background: "#ffffff",
          border: "1px solid #b3cde0",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
        },
      }}
      muiTableContainerProps={{
        sx: { maxHeight: "600px", background: "#ffffff" },
      }}
      muiTableHeadCellProps={{
        sx: {
          background: "#e6f0fa",
          color: "#1f2937",
          fontWeight: 600,
          fontSize: { xs: 12, md: 14 },
          borderBottom: "2px solid #b3cde0",
          borderRight: "1px solid #b3cde0",
          "&:last-child": { borderRight: "none" },
        },
      }}
      muiTableBodyRowProps={{
        sx: {
          "&:hover": {
            background: "#f8fafc",
            transition: "background-color 0.2s ease",
          },
        },
      }}
      muiTableBodyCellProps={{
        sx: {
          color: "#1f2937",
          background: "#ffffff",
          fontSize: { xs: 12, md: 14 },
          borderRight: "1px solid #b3cde0",
          borderBottom: "1px solid #b3cde0",
          "&:last-child": { borderRight: "none" },
        },
      }}
      muiTableFooterRowProps={{
        sx: { borderTop: "2px solid #b3cde0" },
      }}
      muiTablePaginationProps={{
        rowsPerPageOptions: [10, 25, 50],
        showFirstButton: true,
        showLastButton: true,
        sx: {
          color: "#1f2937",
          background: "#ffffff",
          borderTop: "1px solid #b3cde0",
          fontSize: { xs: 12, md: 14 },
        },
      }}
      renderEmptyRowsFallback={() => (
        <Box
          sx={{
            textAlign: "center",
            py: 4,
            color: "rgb(107, 114, 128)",
            fontSize: { xs: 14, md: 16 },
          }}
        >
          No {viewType?.toLowerCase() || ""} history available.
        </Box>
      )}
    />
  );
};

export default function IssueDocumentChange() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [type, setType] = useState("");
  const [canIssue, setCanIssue] = useState(false);
  const [formDetailsFields, setFormDetailsFields] = useState([]);
  const [formDetails, setFormDetails] = useState({});
  const [formElements, setFormElements] = useState([]);
  const [corrigendumFields, setCorrigendumFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [remarks, setRemarks] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const MAX_WORDS = 50;
  const [files, setFiles] = useState([]);
  const [serverFiles, setServerFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({});
  const [touched, setTouched] = useState({
    remarks: false,
    files: false,
    type: false,
  });
  const [nextOfficer, setNextOfficer] = useState("");
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [responseMessage, setResponseMessage] = useState({
    message: "",
    type: "",
  });
  const [openModal, setOpenModal] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [allowedFormFields, setAllowedFormFields] = useState([]);
  const [renderKey, setRenderKey] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successDetails, setSuccessDetails] = useState({
    message: "",
    referenceNumber: "",
    type: "",
  });

  const fileInputRef = useRef(null);
  const location = useLocation();
  const { ReferenceNumber, ServiceId, applicationId, corrigendumType } =
    location.state || {};

  const fieldNames = [
    { name: "District", childname: "Tehsil", respectiveTable: "Tehsil" },
    {
      name: "PresentDistrict",
      childname: {
        Urban: ["PresentTehsil", "PresentMuncipality"],
        Rural: ["PresentTehsil", "PresentBlock"],
      },
      respectiveTable: {
        Urban: ["TehsilAll", "Muncipality"],
        Rural: ["TehsilAll", "Block"],
      },
    },
    {
      name: "PermanentDistrict",
      childname: {
        Urban: ["PermanentTehsil", "PermanentMuncipality"],
        Rural: ["PermanentTehsil", "PermanentBlock"],
      },
      respectiveTable: {
        Urban: ["TehsilAll", "Muncipality"],
        Rural: ["TehsilAll", "Block"],
      },
    },
    {
      name: "PresentMuncipality",
      childname: "PresentWardNo",
      respectiveTable: "Ward",
    },
    {
      name: "PermanentMuncipality",
      childname: "PermanentWardNo",
      respectiveTable: "Ward",
    },
    {
      name: "PresentBlock",
      childname: "PresentHalqaPanchayat",
      respectiveTable: "HalqaPanchayat",
    },
    {
      name: "PermanentBlock",
      childname: "PermanentHalqaPanchayat",
      respectiveTable: "HalqaPanchayat",
    },
    {
      name: "PresentHalqaPanchayat",
      childname: "PresentVillage",
      respectiveTable: "Village",
    },
    {
      name: "PermanentHalqaPanchayat",
      childname: "PermanentVillage",
      respectiveTable: "Village",
    },
  ];

  const resetFormState = useCallback(() => {
    setCanIssue(false);
    setFormDetailsFields([]);
    setFormElements([]);
    setCorrigendumFields([]);
    setSelectedField("");
    setRemarks("");
    setWordCount(0);
    setFiles([]);
    setServerFiles([]);
    setErrors({});
    setFormData({});
    setTouched({ remarks: false, files: false, type: false });
    setNextOfficer("");
    setColumns([]);
    setData([]);
    setResponseMessage({ message: "", type: "" });
  }, []);

  const handleStartNew = useCallback(() => {
    setShowSuccessMessage(false);
    setSuccessDetails({ message: "", referenceNumber: "", type: "" });
    resetFormState();
  }, [resetFormState]);

  const handleAreaChange = useCallback(
    async (corrigendumIndex, changedFieldName, value) => {
      try {
        const match = fieldNames.find((f) => f.name === changedFieldName);
        if (!match) {
          console.warn(`Field "${changedFieldName}" not found in fieldNames.`);
          return;
        }

        const pleaseSelectOption = [
          { label: "Please Select", value: "Please Select" },
        ];

        if (value === "Please Select") {
          let childFieldNames =
            typeof match.childname === "object"
              ? match.childname.Urban || match.childname.Rural || []
              : [match.childname];
          if (!Array.isArray(childFieldNames))
            childFieldNames = [childFieldNames];

          childFieldNames.forEach((childFieldName) => {
            setFormElements((prevSections) => {
              const newSections = JSON.parse(JSON.stringify(prevSections));
              const sectionName = changedFieldName.includes("Present")
                ? "Present Address Details"
                : changedFieldName.includes("Permanent")
                  ? "Permanent Address Details"
                  : "Location";
              const sectionIndex = newSections.findIndex(
                (s) => s.section === sectionName,
              );
              if (sectionIndex === -1) return prevSections;

              newSections[sectionIndex].fields = newSections[
                sectionIndex
              ].fields.map((f) => {
                if (f.name === childFieldName)
                  return { ...f, options: pleaseSelectOption };
                if (f.additionalFields) {
                  const updatedAdditionalFields = {};
                  if (f.additionalFields.Urban) {
                    updatedAdditionalFields.Urban =
                      f.additionalFields.Urban.map((af) =>
                        af.name === childFieldName
                          ? { ...af, options: pleaseSelectOption }
                          : af,
                      );
                  }
                  if (f.additionalFields.Rural) {
                    updatedAdditionalFields.Rural =
                      f.additionalFields.Rural.map((af) =>
                        af.name === childFieldName
                          ? { ...af, options: pleaseSelectOption }
                          : af,
                      );
                  }
                  return {
                    ...f,
                    additionalFields: {
                      ...f.additionalFields,
                      ...updatedAdditionalFields,
                    },
                  };
                }
                return f;
              });
              return newSections;
            });

            setCorrigendumFields((prevFields) => {
              const updatedFields = JSON.parse(JSON.stringify(prevFields));
              const childIndex = updatedFields.findIndex(
                (f) => f.name === childFieldName,
              );
              if (childIndex !== -1) {
                updatedFields[childIndex] = {
                  ...updatedFields[childIndex],
                  options: pleaseSelectOption,
                  newValue: "Please Select",
                };
                handleNewValueChange(childIndex, "Please Select", null, true);
              }
              return updatedFields;
            });

            setCorrigendumFields((prevFields) => {
              const updatedFields = JSON.parse(JSON.stringify(prevFields));
              const currentFieldIndex = updatedFields.findIndex(
                (f, i) => i === corrigendumIndex,
              );
              if (
                currentFieldIndex !== -1 &&
                updatedFields[currentFieldIndex].additionalValues
              ) {
                updatedFields[currentFieldIndex].additionalValues = {
                  ...updatedFields[currentFieldIndex].additionalValues,
                  [childFieldName]: "Please Select",
                };
                handleNewValueChange(
                  currentFieldIndex,
                  "Please Select",
                  childFieldName,
                  true,
                );
              }
              return updatedFields;
            });
          });
          setRenderKey((prev) => prev + 1);
          return;
        }

        const sectionName = changedFieldName.includes("Present")
          ? "Present Address Details"
          : changedFieldName.includes("Permanent")
            ? "Permanent Address Details"
            : "Location";
        const sectionIndex = formElements.findIndex(
          (s) => s.section === sectionName,
        );
        if (sectionIndex === -1) {
          console.warn(`Section "${sectionName}" not found in formElements.`);
          return;
        }

        const addressTypeKey = changedFieldName.includes("Present")
          ? "PresentAddressType"
          : changedFieldName.includes("Permanent")
            ? "PermanentAddressType"
            : null;
        const addressType = addressTypeKey
          ? formData[addressTypeKey] || "Urban"
          : "Urban";

        let childFieldNames =
          typeof match.childname === "object"
            ? match.childname[addressType] || []
            : [match.childname];
        if (!Array.isArray(childFieldNames))
          childFieldNames = [childFieldNames];
        let tableNames =
          typeof match.respectiveTable === "object"
            ? match.respectiveTable[addressType] || []
            : [match.respectiveTable];
        if (!Array.isArray(tableNames)) tableNames = [tableNames];

        if (!childFieldNames.length || !tableNames.length) {
          console.warn(
            `Invalid mapping for ${changedFieldName} (${addressType})`,
          );
          return;
        }

        for (let i = 0; i < childFieldNames.length; i++) {
          const childFieldName = childFieldNames[i];
          const tableName = tableNames[i];

          const response = await axiosInstance.get(
            `/Base/GetAreaList?table=${tableName}&parentId=${value}`,
          );
          const areaList = response.data?.data || [];

          const uniqueOptions = [];
          const seenValues = new Set();
          areaList.forEach((item) => {
            const optionValue = item.id ?? item.value;
            if (!seenValues.has(optionValue)) {
              seenValues.add(optionValue);
              uniqueOptions.push({
                value: optionValue,
                label: item.name ?? item.label,
              });
            }
          });

          const newOptions = [
            { label: "Please Select", value: "Please Select" },
            ...uniqueOptions,
          ];

          setFormElements((prevSections) => {
            const newSections = JSON.parse(JSON.stringify(prevSections));
            newSections[sectionIndex].fields = newSections[
              sectionIndex
            ].fields.map((f) => {
              if (f.name === childFieldName)
                return { ...f, options: newOptions };
              if (f.additionalFields) {
                const updatedAdditionalFields = {};
                if (f.additionalFields.Urban) {
                  updatedAdditionalFields.Urban = f.additionalFields.Urban.map(
                    (af) =>
                      af.name === childFieldName
                        ? { ...af, options: newOptions }
                        : af,
                  );
                }
                if (f.additionalFields.Rural) {
                  updatedAdditionalFields.Rural = f.additionalFields.Rural.map(
                    (af) =>
                      af.name === childFieldName
                        ? { ...af, options: newOptions }
                        : af,
                  );
                }
                return {
                  ...f,
                  additionalFields: {
                    ...f.additionalFields,
                    ...updatedAdditionalFields,
                  },
                };
              }
              return f;
            });
            return newSections;
          });

          setCorrigendumFields((prevFields) => {
            const updatedFields = JSON.parse(JSON.stringify(prevFields));
            const childIndex = updatedFields.findIndex(
              (f) => f.name === childFieldName,
            );
            if (childIndex !== -1) {
              const currentChildValue =
                updatedFields[childIndex].newValue || "";
              const isValueValid = newOptions.some(
                (option) =>
                  option.value.toString() === currentChildValue.toString(),
              );
              updatedFields[childIndex] = {
                ...updatedFields[childIndex],
                options: newOptions,
                newValue: isValueValid ? currentChildValue : "Please Select",
              };
              if (!isValueValid)
                handleNewValueChange(childIndex, "Please Select", null, true);
            }
            return updatedFields;
          });

          setCorrigendumFields((prevFields) => {
            const updatedFields = JSON.parse(JSON.stringify(prevFields));
            const currentFieldIndex = updatedFields.findIndex(
              (f, idx) => idx === corrigendumIndex,
            );
            if (
              currentFieldIndex !== -1 &&
              updatedFields[currentFieldIndex].additionalFields?.[
              updatedFields[currentFieldIndex].newValue
              ]
            ) {
              const addChildIndex = updatedFields[
                currentFieldIndex
              ].additionalFields[
                updatedFields[currentFieldIndex].newValue
              ].findIndex((af) => af.name === childFieldName);
              if (addChildIndex !== -1) {
                updatedFields[currentFieldIndex].additionalFields[
                  updatedFields[currentFieldIndex].newValue
                ][addChildIndex].options = newOptions;
                const currentChildValue =
                  updatedFields[currentFieldIndex].additionalValues[
                  childFieldName
                  ] || "";
                const isValueValid = newOptions.some(
                  (option) =>
                    option.value.toString() === currentChildValue.toString(),
                );
                if (
                  currentChildValue &&
                  currentChildValue !== "Please Select" &&
                  !isValueValid
                ) {
                  updatedFields[currentFieldIndex].additionalValues[
                    childFieldName
                  ] = "Please Select";
                  handleNewValueChange(
                    currentFieldIndex,
                    "Please Select",
                    childFieldName,
                    true,
                  );
                }
              }
            }
            return updatedFields;
          });
        }
        setRenderKey((prev) => prev + 1);
      } catch (error) {
        console.error("Error in handleAreaChange:", error);
        setResponseMessage({
          message: "Failed to fetch area list. Please try again.",
          type: "error",
        });
      }
    },
    [formElements, formData, corrigendumFields],
  );

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        await fetchServiceList(setServices);
      } catch (error) {
        setResponseMessage({
          message: "Failed to load services. Please try again.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (applicationId && ReferenceNumber && ServiceId && corrigendumType) {
      setIsEdit(true);
      setReferenceNumber(ReferenceNumber);
      setServiceId(ServiceId);
      setType(corrigendumType);
      setIsInitialLoad(false);
      handleCheckIfDocumentChange();
    } else {
      setIsInitialLoad(false);
    }
  }, [applicationId, ReferenceNumber, ServiceId, corrigendumType, services]);

  useEffect(() => {
    if (corrigendumFields.length > 0) {
      revalidateAllFields(
        corrigendumFields,
        formData,
        referenceNumber,
        true,
      ).then((newErrors) => {
        setErrors(newErrors);
      });
    }
  }, [corrigendumFields, formData, referenceNumber, revalidateAllFields]);

  function getFieldTypeByName(jsonData, fieldName) {
    function searchFields(fields) {
      for (const field of fields) {
        if (field.name === fieldName) {
          return field.type;
        }
        if (
          field.additionalFields &&
          Object.keys(field.additionalFields).length > 0
        ) {
          for (const key in field.additionalFields) {
            const nestedFields = field.additionalFields[key];
            const result = searchFields(nestedFields);
            if (result) return result;
          }
        }
      }
      return null;
    }

    for (const section of jsonData) {
      const result = searchFields(section.fields);
      if (result) return result;
    }

    return null;
  }

  const normalizeDetails = useCallback(
    (formDetails, parsedFormElements = null) => {
      if (!formDetails || typeof formDetails !== "object") return [];

      const sourceElements = parsedFormElements || formElements;
      const allFields = [];

      const shouldIncludeField = (config) =>
        config && config.editable !== false;

      const pushField = (item, sectionName, config) => {
        const field = {
          label: item.label || item.name,
          name: item.name,
          section: sectionName,
        };

        if (config.type === "enclosure") {
          field.oldValue = item.File?.file || item.File || ""; // Use filename directly
          field.value = item.File?.file || item.File || null;
        } else {
          field.oldValue = item.value?.toString() || "";
          field.value = item.value?.toString() || "";
        }

        allFields.push(field);
      };

      Object.entries(formDetails).forEach(([sectionName, section]) => {
        if (!Array.isArray(section)) return;

        section.forEach((item) => {
          const fieldType = getFieldTypeByName(sourceElements, item.name);
          const fieldConfig = findFieldConfig(
            item.name,
            fieldType || "text",
            formElements,
          );

          if (!shouldIncludeField(fieldConfig)) return;

          pushField(item, sectionName, fieldConfig);

          if (Array.isArray(item.additionalFields)) {
            item.additionalFields.forEach((addField) => {
              const addFieldConfig = findFieldConfig(
                addField.name,
                addField.type || "text",
                formElements,
              );

              if (!shouldIncludeField(addFieldConfig)) return;

              const additionalField = {
                label: addField.label || addField.name,
                name: addField.name,
                section: sectionName,
              };

              if (addFieldConfig.type === "enclosure") {
                additionalField.oldValue =
                  addField.File?.file || addField.File || "";
                additionalField.value =
                  addField.File?.file || addField.File || null;
              } else {
                additionalField.oldValue = addField.value?.toString() || "";
                additionalField.value = addField.value?.toString() || "";
              }

              allFields.push(additionalField);
            });
          }
        });
      });

      return allFields;
    },
    [findFieldConfig, formElements],
  );

  const findFieldConfig = useCallback(
    (fieldName, fieldType = "text", parsedFormElements = null) => {
      parsedFormElements = parsedFormElements || formElements;
      for (const section of parsedFormElements) {
        for (const field of section.fields) {
          if (field.name === fieldName) {
            return {
              ...field,
              type: field.type || fieldType,
              validationFunctions: field.validationFunctions || [],
              transformationFunctions: field.transformationFunctions || [],
              additionalFields: field.additionalFields || {},
              conditionalAdditionalFields:
                field.conditionalAdditionalFields || {},
              options: field.options || [
                { label: "Please Select", value: "Please Select" },
              ],
              accept: field.accept || ".pdf",
              allowSameAsOldValue: field.allowSameAsOldValue || false,
            };
          }
          for (const key in field.additionalFields) {
            const additional = field.additionalFields[key];
            const found = additional.find((f) => f.name === fieldName);
            if (found) {
              return {
                ...found,
                type: found.type || fieldType,
                validationFunctions: found.validationFunctions || [],
                transformationFunctions: found.transformationFunctions || [],
                additionalFields: found.additionalFields || {},
                conditionalAdditionalFields:
                  found.conditionalAdditionalFields || {},
                options: found.options || [
                  { label: "Please Select", value: "Please Select" },
                ],
                accept: found.accept || ".pdf",
                allowSameAsOldValue: found.allowSameAsOldValue || false,
              };
            }
          }
          // Search conditionalAdditionalFields
          for (const key in field.conditionalAdditionalFields) {
            const conditional = field.conditionalAdditionalFields[key];
            const found = conditional.find((f) => f.name === fieldName);
            if (found) {
              return {
                ...found,
                type: found.type || fieldType,
                validationFunctions: found.validationFunctions || [],
                transformationFunctions: found.transformationFunctions || [],
                additionalFields: found.additionalFields || {},
                conditionalAdditionalFields:
                  found.conditionalAdditionalFields || {},
                options: found.options || [
                  { label: "Please Select", value: "Please Select" },
                ],
                accept: found.accept || ".pdf",
                allowSameAsOldValue: found.allowSameAsOldValue || false,
              };
            }
          }
        }
      }
      return {
        label: fieldName,
        name: fieldName,
        type: fieldType,
        editable: true,
        validationFunctions: [],
        transformationFunctions: [],
        additionalFields: {},
        conditionalAdditionalFields: {},
        options: [{ label: "Please Select", value: "Please Select" }],
        accept: fieldType === "enclosure" ? ".pdf" : undefined,
        allowSameAsOldValue: fieldName === "percentageOfDisability",
      };
    },
    [formElements],
  );

  const applyTransformations = useCallback((value, transformationFunctions) => {
    let transformedValue = value || "";
    for (const transformFn of transformationFunctions || []) {
      if (TransformationFunctionsList[transformFn]) {
        transformedValue =
          TransformationFunctionsList[transformFn](transformedValue);
      }
    }
    return transformedValue;
  }, []);

  const validateUdidNumber = useCallback(
    async (udidNumber, referenceNumber) => {
      try {
        const response = await axiosInstance.get(
          "/Officer/GetIfSameUdidNumber",
          {
            params: { referenceNumber, udidNumber },
          },
        );
        const data = response.data;
        if (data.status) {
          return null; // UDID matches, no error
        } else {
          return (
            data.message ||
            "UDID Number doesn't match the existing one in the record."
          ); // UDID doesn't match, return error message
        }
      } catch (error) {
        console.error("Error validating UDID number:", error);
        return (
          error.response?.data?.message ||
          "Error validating UDID number. Please try again."
        ); // Error case, return error message
      }
    },
    [],
  );

  const validateField = useCallback(
    async (field, value, formData, referenceNumber) => {
      const fieldConfig = findFieldConfig(field.name);

      // List of fields to skip "same as old value" validation
      const skipSameValueCheckFields = [
        "UdidCardNumber",
        "KindOfDisability", // Add or remove fields here as needed
        "PercentageOfDisability",
      ];

      if (fieldConfig.type === "enclosure") {
        // Check if new value is the same as old file (avoid redundant uploads)
        if (
          value &&
          field.oldValue?.file &&
          value.name === field.oldValue.file
        ) {
          return {
            transformedValue: value,
            error: "New file cannot be the same as the old file",
          };
        }
        // Validate file type and size
        if (value) {
          if (!(value instanceof File)) {
            return {
              transformedValue: value,
              error: "Invalid file format",
            };
          }
          const validTypes = fieldConfig.accept
            ? fieldConfig.accept.split(",").map((t) => t.trim())
            : [".pdf"];
          const fileExtension = value.name
            ? `.${value.name.split(".").pop().toLowerCase()}`
            : "";
          if (!validTypes.includes(fileExtension)) {
            return {
              transformedValue: value,
              error: `File must be one of: ${validTypes.join(", ")}`,
            };
          }
          // Validate file size (e.g., max 5MB)
          if (value.size > 5 * 1024 * 1024) {
            return {
              transformedValue: value,
              error: "File size exceeds 5MB",
            };
          }
        }
        return {
          transformedValue: value,
          error: null,
        };
      }

      // Skip "same as old value" check for specified fields or if allowSameAsOldValue is true
      if (
        !skipSameValueCheckFields.includes(field.name) &&
        !fieldConfig.allowSameAsOldValue &&
        value === field.oldValue
      ) {
        return {
          transformedValue: value,
          error: "New value cannot be the same as old value",
        };
      }

      // Run standard validations
      const validationResult = await runValidations(
        {
          ...fieldConfig,
          validationFunctions: fieldConfig.validationFunctions || [],
        },
        value,
        formData,
        referenceNumber,
      );
      if (validationResult !== true) {
        return {
          transformedValue: value,
          error: validationResult,
        };
      }

      // Apply UDID Number validation for UdidCardNumber
      if (field.name === "UdidCardNumber" && value) {
        const udidValidationResult = await validateUdidNumber(
          value,
          referenceNumber,
        );
        if (udidValidationResult !== null) {
          return {
            transformedValue: value,
            error: udidValidationResult, // Return error message if UDID doesn't match
          };
        }
      }

      return {
        transformedValue: value,
        error: null,
      };
    },
    [findFieldConfig, validateUdidNumber],
  );

  const validateRemarks = useCallback((value) => {
    if (!value.trim()) return "Remarks are required";
    const words = value
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    if (words.length > MAX_WORDS)
      return `Remarks exceed the maximum of ${MAX_WORDS} words`;
    return null;
  }, []);

  const validateFiles = useCallback((files, serverFiles) => {
    return files.length > 0 || serverFiles.length > 0
      ? null
      : "At least one verification document is required";
  }, []);

  const validateType = useCallback((value) => {
    return ["Corrigendum", "Correction"].includes(value)
      ? null
      : "Please select a valid type (Corrigendum, Correction, or Data Updation)";
  }, []);

  const revalidateAllFields = useCallback(
    async (
      updatedFields,
      formData,
      referenceNumber,
      validateRemarksAndFiles = false,
    ) => {
      const newErrors = {};
      for (const field of updatedFields) {
        if (field.newValue) {
          const { error } = await validateField(
            field,
            field.newValue,
            formData,
            referenceNumber,
          );
          newErrors[field.name] = error; // Use field.name instead of index

          for (const additionalFieldName in field.additionalValues) {
            const additionalFieldConfig = (
              field.additionalFields[field.newValue] || []
            ).find((f) => f.name === additionalFieldName);
            if (additionalFieldConfig) {
              const validationResult = await runValidations(
                {
                  ...additionalFieldConfig,
                  validationFunctions:
                    additionalFieldConfig.validationFunctions || [],
                },
                field.additionalValues[additionalFieldName],
                formData,
                referenceNumber,
              );
              newErrors[`${field.name}-${additionalFieldName}`] =
                validationResult === true ? null : validationResult;
            }
          }
        }
      }
      if (validateRemarksAndFiles) {
        newErrors.remarks = validateRemarks(remarks);
        newErrors.files = validateFiles(files, serverFiles);
        newErrors.type = validateType(type);
      }
      return newErrors;
    },
    [
      validateField,
      validateRemarks,
      validateFiles,
      validateType,
      remarks,
      files,
      serverFiles,
      type,
    ],
  );

  const handleCheckIfDocumentChange = useCallback(async () => {
    if (!type) {
      setErrors((prev) => ({
        ...prev,
        type: "Please select a type (Corrigendum, Correction, or Data Updation)",
      }));
      return;
    }

    if (!applicationId && (!referenceNumber || !serviceId)) {
      setResponseMessage({
        message: "Please provide both reference number and service.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    setResponseMessage({ message: "", type: "" });

    try {
      const params = applicationId
        ? {
          referenceNumber: ReferenceNumber,
          serviceId: ServiceId,
          applicationId,
          type,
        }
        : { referenceNumber, serviceId, type };

      const response = await axiosInstance.get(
        "/Officer/GetApplicationForCorrigendum",
        { params },
      );
      const result = response.data;

      if (result.status) {
        if (!result.formDetails || !result.formElements) {
          setResponseMessage({
            message: `No editable fields available for this ${type.toLowerCase()}.`,
            type: "error",
          });
          setCanIssue(false);
          setLoading(false);
          return;
        }

        // Parse formElements
        let parsedFormElements = [];
        if (typeof result.formElements === "string") {
          try {
            parsedFormElements = JSON.parse(result.formElements);
          } catch (error) {
            console.error("Error parsing formElements:", error);
            setResponseMessage({
              message: "Invalid form elements data from server.",
              type: "error",
            });
            setCanIssue(false);
            setLoading(false);
            return;
          }
        } else if (Array.isArray(result.formElements)) {
          parsedFormElements = result.formElements;
        } else {
          setResponseMessage({
            message: "Unexpected form elements format from server.",
            type: "error",
          });
          setCanIssue(false);
          setLoading(false);
          return;
        }
        setFormElements(parsedFormElements);
        setFormDetailsFields(
          normalizeDetails(result.formDetails, parsedFormElements),
        );
        setFormDetails(result.formDetails || {});
        setCanIssue(result.isCurrentOfficer || result.corrigendumType === type);
        setNextOfficer(result.nextOfficer);

        // Allowed fields mapping
        const mappedAllowedFields = result.allowedForDetails.map((item) => {
          if (item.isGroup) {
            return {
              label: item.label,
              name: item.name || item.label,
              isGroup: true,
              fields: item.fields,
              value: `group|${item.label}`,
            };
          } else {
            return {
              label: item.label,
              name: item.name,
              type: item.type || "text", // Ensure type is included
              isGroup: false,
              value: `${item.label}|${item.name}`,
            };
          }
        });
        setAllowedFormFields(mappedAllowedFields);

        // Editing scenario
        if (isEdit) {
          setColumns(result.columns || []);
          setData(result.data || []);
          setServerFiles(result.files || []);
          setType(result.corrigendumType);
          const words = result.remarks
            ? result.remarks
              .trim()
              .split(/\s+/)
              .filter((word) => word.length > 0)
            : [];
          setWordCount(words.length);
          setRemarks(result.remarks || "");
        }

        // In handleCheckIfDocumentChange, update corrigendumFields initialization
        let newCorrigendumFields = [];
        let newErrors = {};
        if (applicationId && result.corrigendumFields) {
          let corrigendumFieldsData =
            typeof result.corrigendumFields === "string"
              ? JSON.parse(result.corrigendumFields)
              : result.corrigendumFields;

          let index = 0;
          for (const [name, fieldData] of Object.entries(
            corrigendumFieldsData,
          )) {
            if (name === "Files") continue;

            const isGroup =
              typeof fieldData === "object" && !fieldData.new_value;
            if (isGroup) {
              for (const [subName, subFieldData] of Object.entries(fieldData)) {
                const fieldConfig = findFieldConfig(
                  subName,
                  subFieldData.type || "text",
                  parsedFormElements,
                );
                const formDetail = normalizeDetails(result.formDetails).find(
                  (item) => item.name === subName,
                );
                if (!formDetail) continue;

                let oldValue = formDetail.oldValue || "";
                if (fieldConfig.type === "enclosure") {
                  oldValue = formDetail.oldValue || ""; // Use filename string
                }

                const newField = {
                  label: formDetail.label,
                  name: subName,
                  oldValue,
                  newValue:
                    subFieldData.new_value ||
                    (fieldConfig.type === "enclosure" ? null : ""),
                  additionalValues: subFieldData.additional_values || {},
                  type: fieldConfig.type,
                  options: fieldConfig.options || [
                    { label: "Please Select", value: "Please Select" },
                  ],
                  validationFunctions: fieldConfig.validationFunctions || [],
                  transformationFunctions:
                    fieldConfig.transformationFunctions || [],
                  additionalFields: fieldConfig.additionalFields || {},
                  conditionalAdditionalFields:
                    fieldConfig.conditionalAdditionalFields || {},
                  accept: fieldConfig.accept || ".pdf",
                };

                // Add conditional fields if newValue triggers them
                if (
                  subFieldData.new_value &&
                  fieldConfig.conditionalAdditionalFields?.[
                  subFieldData.new_value
                  ]
                ) {
                  const conditionalFields =
                    fieldConfig.conditionalAdditionalFields[
                    subFieldData.new_value
                    ];
                  for (const condField of conditionalFields) {
                    const condFormDetail = normalizeDetails(
                      result.formDetails,
                    ).find((item) => item.name === condField.name);
                    const condOldValue = condFormDetail
                      ? condFormDetail.oldValue || ""
                      : "";
                    newCorrigendumFields.push({
                      label: condField.label || condField.name,
                      name: condField.name,
                      oldValue: condOldValue,
                      newValue:
                        subFieldData.additional_values[condField.name] ||
                        (condField.type === "enclosure" ? null : ""),
                      additionalValues: {},
                      type: condField.type || "text",
                      options: condField.options || [
                        { label: "Please Select", value: "Please Select" },
                      ],
                      validationFunctions: condField.validationFunctions || [],
                      transformationFunctions:
                        condField.transformationFunctions || [],
                      additionalFields: condField.additionalFields || {},
                      conditionalAdditionalFields:
                        condField.conditionalAdditionalFields || {},
                      accept: condField.accept || ".pdf",
                    });
                  }
                }

                newCorrigendumFields.push(newField);

                const { error } = await validateField(
                  newField,
                  newField.newValue,
                  formData,
                  result.application.ReferenceNumber,
                );
                newErrors[index] = error;
                index++;
              }
            } else {
              const fieldConfig = findFieldConfig(
                name,
                fieldData.type || "text",
                parsedFormElements,
              );
              const formDetail = normalizeDetails(result.formDetails).find(
                (item) => item.name === name,
              );
              if (!formDetail) continue;

              let oldValue = formDetail.oldValue || "";
              if (fieldConfig.type === "enclosure") {
                oldValue = formDetail.oldValue || "";
              }

              const newField = {
                label: formDetail.label,
                name,
                oldValue,
                newValue:
                  fieldData.new_value ||
                  (fieldConfig.type === "enclosure" ? null : ""),
                additionalValues: fieldData.additional_values || {},
                type: fieldConfig.type,
                options: fieldConfig.options || [
                  { label: "Please Select", value: "Please Select" },
                ],
                validationFunctions: fieldConfig.validationFunctions || [],
                transformationFunctions:
                  fieldConfig.transformationFunctions || [],
                additionalFields: fieldConfig.additionalFields || {},
                conditionalAdditionalFields:
                  fieldConfig.conditionalAdditionalFields || {},
                accept: fieldConfig.accept || ".pdf",
              };

              // Add conditional fields if newValue triggers them
              if (
                fieldData.new_value &&
                fieldConfig.conditionalAdditionalFields?.[fieldData.new_value]
              ) {
                const conditionalFields =
                  fieldConfig.conditionalAdditionalFields[fieldData.new_value];
                for (const condField of conditionalFields) {
                  const condFormDetail = normalizeDetails(
                    result.formDetails,
                  ).find((item) => item.name === condField.name);
                  const condOldValue = condFormDetail
                    ? condFormDetail.oldValue || ""
                    : "";
                  newCorrigendumFields.push({
                    label: condField.label || condField.name,
                    name: condField.name,
                    oldValue: condOldValue,
                    newValue:
                      fieldData.additional_values[condField.name] ||
                      (condField.type === "enclosure" ? null : ""),
                    additionalValues: {},
                    type: condField.type || "text",
                    options: condField.options || [
                      { label: "Please Select", value: "Please Select" },
                    ],
                    validationFunctions: condField.validationFunctions || [],
                    transformationFunctions:
                      condField.transformationFunctions || [],
                    additionalFields: condField.additionalFields || {},
                    conditionalAdditionalFields:
                      condField.conditionalAdditionalFields || {},
                    accept: condField.accept || ".pdf",
                  });
                }
              }

              newCorrigendumFields.push(newField);

              const { error } = await validateField(
                newField,
                newField.newValue,
                formData,
                result.application.ReferenceNumber,
              );
              newErrors[index] = error;
              index++;
            }
          }
        }

        setCorrigendumFields(newCorrigendumFields);
        setErrors(newErrors);

        // Initialize formData
        const newFormData = {};
        console.log("Form Details:", result.formDetails);
        normalizeDetails(result.formDetails).forEach((item) => {
          newFormData[item.name] = item.value || (item.File ? item.File : "");
        });
        setFormData(newFormData);

        setResponseMessage({
          message: `Application found. You can issue a ${type.toLowerCase()}.`,
          type: "success",
        });
      } else {
        setResponseMessage({
          message:
            result.message || `No application found for the provided details.`,
          type: "error",
        });
      }
    } catch (error) {
      console.error(`Error in handleCheckIf${type}:`, error);
      setResponseMessage({
        message:
          error.response?.data?.message ||
          `Error checking application for ${type.toLowerCase()}. Please try again.`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    type,
    applicationId,
    referenceNumber,
    serviceId,
    ReferenceNumber,
    ServiceId,
    normalizeDetails,
    findFieldConfig,
    isEdit,
    formData,
    validateField,
  ]);

  const handleAddCorrigendumField = useCallback(() => {
    if (!selectedField) {
      setErrors((prev) => ({
        ...prev,
        selectedField: "Please select a field to add.",
      }));
      return;
    }
    const selectedOption = allowedFormFields.find(
      (f) => f.value === selectedField,
    );
    if (!selectedOption) {
      setErrors((prev) => ({
        ...prev,
        selectedField: "Invalid field selected.",
      }));
      return;
    }

    const newFields = [];

    const addFieldToCorrigendum = (field) => {
      if (corrigendumFields.some((f) => f.name === field.name)) return;
      const formDetail = formDetailsFields.find((d) => d.name === field.name);
      if (!formDetail) return;
      const fieldConfig = findFieldConfig(field.name, field.type || "text");
      if (!fieldConfig) return;

      let oldValue = formDetail.oldValue || "";
      if (fieldConfig.type === "enclosure") {
        oldValue = formDetail.oldValue || { file: null, label: field.name };
      }

      newFields.push({
        label: formDetail.label,
        name: field.name,
        oldValue,
        newValue: fieldConfig.type === "enclosure" ? null : "",
        additionalValues: {},
        type: fieldConfig.type,
        options: fieldConfig.options || [
          { label: "Please Select", value: "Please Select" },
        ],
        maxLength: fieldConfig.maxLength || null,
        validationFunctions: fieldConfig.validationFunctions || [],
        transformationFunctions: fieldConfig.transformationFunctions || [],
        additionalFields: fieldConfig.additionalFields || {},
        accept: fieldConfig.accept || ".pdf",
      });
    };

    if (selectedOption.isGroup) {
      selectedOption.fields.forEach(addFieldToCorrigendum);
    } else {
      addFieldToCorrigendum(selectedOption);
    }

    if (newFields.length > 0) {
      setCorrigendumFields((prev) => [...prev, ...newFields]);
      revalidateAllFields(
        [...corrigendumFields, ...newFields],
        formData,
        referenceNumber,
      ).then((newErrors) => setErrors(newErrors));
    }

    setSelectedField("");
    setErrors((prev) => ({ ...prev, selectedField: null }));
  }, [
    selectedField,
    allowedFormFields,
    corrigendumFields,
    formDetailsFields,
    findFieldConfig,
    formData,
    referenceNumber,
    revalidateAllFields,
  ]);

  const findNestedFieldValue = (formDetails, fieldName) => {
    if (formDetails && typeof formDetails === "object") {
      for (const [sectionName, section] of Object.entries(formDetails)) {
        if (!Array.isArray(section)) {
          continue;
        }

        for (const field of section) {
          if (field.name === fieldName) {
            const val = field.value ?? field.File ?? "";
            return val;
          }

          if (field.additionalFields) {
            const searchAdditional = (fields, depth = 1) => {
              for (const sub of fields) {
                if (sub.name === fieldName) {
                  const val = sub.value ?? sub.File ?? "";
                  return val;
                }

                if (sub.additionalFields) {
                  const nested = searchAdditional(
                    sub.additionalFields,
                    depth + 1,
                  );
                  if (nested) return nested;
                }
              }
              return null;
            };

            const nestedValue = searchAdditional(field.additionalFields);
            if (nestedValue) return nestedValue;
          }
        }
      }
    }

    return "";
  };

  const handleNewValueChange = useCallback(
    (index, value, additionalFieldName = null, skipStateUpdate = false) => {
      const field = corrigendumFields[index];
      if (!field) {
        console.error(`Field at index ${index} not found in corrigendumFields`);
        return;
      }
      console.log(`Handling change for field ${field.name}`, { value, additionalFieldName });

      let transformedValue;
      const changedFieldName = additionalFieldName || field.name;
      const changedField = additionalFieldName
        ? (field.additionalFields[field.newValue] || []).find(
          (f) => f.name === additionalFieldName,
        )
        : field;

      if (!changedField) {
        console.warn(
          `Field ${additionalFieldName || field.name
          } not found in corrigendumFields`,
        );
        return;
      }

      if (additionalFieldName) {
        const additionalFieldConfig = (
          field.additionalFields[field.newValue] || []
        ).find((f) => f.name === additionalFieldName);
        if (!additionalFieldConfig) {
          console.warn(
            `Additional field config not found for ${additionalFieldName}`,
          );
          return;
        }
        transformedValue = applyTransformations(
          value,
          additionalFieldConfig.transformationFunctions,
        );
        if (additionalFieldConfig.type === "select") {
          const validOptions = additionalFieldConfig.options || [];
          if (
            value !== "" &&
            value !== "Please Select" &&
            !validOptions.some(
              (opt) => opt.value.toString() === value.toString(),
            )
          ) {
            console.warn(`Invalid value ${value} for ${additionalFieldName}`);
            return;
          }
        }
        if (!skipStateUpdate) {
          const tempUpdated = [...corrigendumFields];
          tempUpdated[index].additionalValues = {
            ...tempUpdated[index].additionalValues,
            [additionalFieldName]: transformedValue,
          };
          setCorrigendumFields(tempUpdated);

          // Validate the additional field immediately
          runValidations(
            {
              ...additionalFieldConfig,
              validationFunctions:
                additionalFieldConfig.validationFunctions || [],
            },
            transformedValue,
            formData,
            referenceNumber,
          ).then((validationResult) => {
            setErrors((prev) => ({
              ...prev,
              [`${field.name}-${additionalFieldName}`]:
                validationResult === true ? null : validationResult,
            }));
          });
        }
      } else {
        transformedValue = applyTransformations(
          value,
          field.transformationFunctions,
        );
        if (field.type === "select") {
          const validOptions = field.options || [];
          if (
            value !== "" &&
            value !== "Please Select" &&
            !validOptions.some(
              (opt) => opt.value.toString() === value.toString(),
            )
          ) {
            console.warn(`Invalid value ${value} for ${field.name}`);
            return;
          }
        }
        if (!skipStateUpdate) {
          const tempUpdated = [...corrigendumFields];
          tempUpdated[index].newValue = transformedValue;

          // Handle conditional additional fields
          const conditionalFields =
            field.additionalFields?.[transformedValue] ||
            field.conditionalAdditionalFields?.[transformedValue] ||
            [];

          const existingConditionalFieldNames = corrigendumFields.map(
            (f) => f.name,
          );
          const fieldsToAdd = [];
          const fieldsToRemove = [];

          // Identify fields to remove
          corrigendumFields.forEach((f, i) => {
            if (
              i !== index &&
              (field.additionalFields || field.conditionalAdditionalFields) &&
              (Object.values(field.additionalFields || {})
                .flat()
                .some((cf) => cf.name === f.name) ||
                Object.values(field.conditionalAdditionalFields || {})
                  .flat()
                  .some((cf) => cf.name === f.name)) &&
              !conditionalFields.some((cf) => cf.name === f.name)
            ) {
              fieldsToRemove.push(i);
            }
          });

          // Add new conditional fields
          conditionalFields.forEach((condField) => {
            if (!existingConditionalFieldNames.includes(condField.name)) {
              const oldValue = findNestedFieldValue(
                formDetails,
                condField.name,
              );
              const newField = {
                label: condField.label || condField.name,
                name: condField.name,
                oldValue,
                newValue: condField.type === "enclosure" ? null : "",
                additionalValues: {},
                type: condField.type || "text",
                options: condField.options || [
                  { label: "Please Select", value: "Please Select" },
                ],
                validationFunctions: condField.validationFunctions || [],
                transformationFunctions:
                  condField.transformationFunctions || [],
                additionalFields: condField.additionalFields || {},
                conditionalAdditionalFields:
                  condField.conditionalAdditionalFields || {},
                accept: condField.accept || ".pdf",
              };
              fieldsToAdd.push(newField);

              // Validate the new field immediately
              validateField(
                newField,
                newField.newValue,
                formData,
                referenceNumber,
              ).then(({ error }) => {
                setErrors((prev) => ({
                  ...prev,
                  [newField.name]: error,
                }));
              });
            }
          });

          // Update corrigendumFields
          let newCorrigendumFields = tempUpdated.filter(
            (_, i) => !fieldsToRemove.includes(i),
          );
          newCorrigendumFields = [...newCorrigendumFields, ...fieldsToAdd];
          setCorrigendumFields(newCorrigendumFields);

          // Validate the changed field
          validateField(
            field,
            transformedValue,
            formData,
            referenceNumber,
          ).then(({ error }) => {
            setErrors((prev) => ({
              ...prev,
              [field.name]: error,
            }));
          });

          // Revalidate all fields
          revalidateAllFields(
            newCorrigendumFields,
            { ...formData, [changedFieldName]: transformedValue },
            referenceNumber,
            true,
          ).then((newErrors) => {
            setErrors(newErrors);
          });
        }
      }

      setFormData((prev) => ({
        ...prev,
        [changedFieldName]: transformedValue,
      }));

      if (
        changedField &&
        changedField.type === "select" &&
        /district|tehsil|muncipality|ward|block|halqapanchayat|village/i.test(
          changedFieldName,
        )
      ) {
        handleAreaChange(index, changedFieldName, transformedValue);
      }
    },
    [
      corrigendumFields,
      applyTransformations,
      handleAreaChange,
      formDetails,
      revalidateAllFields,
      formData,
      referenceNumber,
    ],
  );

  const handleNewValueBlur = useCallback(
    async (index, value, additionalFieldName = null) => {
      const updated = [...corrigendumFields];
      const field = updated[index];
      if (!field) {
        console.error(`Field at index ${index} not found in corrigendumFields`);
        return;
      }

      let error;
      if (additionalFieldName) {
        const additionalFieldConfig = (
          field.additionalFields[field.newValue] || []
        ).find((f) => f.name === additionalFieldName);
        if (!additionalFieldConfig) {
          console.warn(
            `Additional field config not found for ${additionalFieldName}`,
          );
          return;
        }
        const validationResult = await runValidations(
          {
            ...additionalFieldConfig,
            validationFunctions:
              additionalFieldConfig.validationFunctions || [],
          },
          field.additionalValues[additionalFieldName],
          formData,
          referenceNumber,
        );
        error = validationResult === true ? null : validationResult;
        setErrors((prev) => ({
          ...prev,
          [`${field.name}-${additionalFieldName}`]: error,
        }));
      } else {
        const result = await validateField(
          field,
          field.newValue,
          formData,
          referenceNumber,
        );
        error = result.error;
        setErrors((prev) => ({ ...prev, [field.name]: error }));
      }

      const newErrors = await revalidateAllFields(
        updated,
        formData,
        referenceNumber,
        true,
      );
      setErrors(newErrors);
    },
    [
      corrigendumFields,
      formData,
      referenceNumber,
      validateField,
      revalidateAllFields,
    ],
  );

  const handleDeleteField = useCallback(
    (index) => {
      const updatedFields = corrigendumFields.filter((_, i) => i !== index);
      setCorrigendumFields(updatedFields);
      setRenderKey((prev) => prev + 1);
      revalidateAllFields(updatedFields, formData, referenceNumber, true).then(
        (newErrors) => {
          setErrors(newErrors);
        },
      );
    },
    [corrigendumFields, formData, referenceNumber, revalidateAllFields],
  );

  const handleFileChange = useCallback(
    (event) => {
      const selectedFiles = Array.from(event.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
      setTouched((prev) => ({ ...prev, files: true }));
      const error = validateFiles([...files, ...selectedFiles], serverFiles);
      setErrors((prev) => ({ ...prev, files: error }));
      event.target.value = "";
    },
    [files, serverFiles, validateFiles],
  );

  const handleRemoveFile = useCallback(
    (index) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setTouched((prev) => ({ ...prev, files: true }));
      const error = validateFiles(
        files.filter((_, i) => i !== index),
        serverFiles,
      );
      setErrors((prev) => ({ ...prev, files: error }));
    },
    [files, serverFiles, validateFiles],
  );

  const handleRemoveServerFile = useCallback(
    (index) => {
      setServerFiles((prev) => prev.filter((_, i) => i !== index));
      setTouched((prev) => ({ ...prev, files: true }));
      const error = validateFiles(
        files,
        serverFiles.filter((_, i) => i !== index),
      );
      setErrors((prev) => ({ ...prev, files: error }));
    },
    [files, serverFiles, validateFiles],
  );

  const handleAddFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemarksChange = useCallback((e) => {
    const value = e.target.value;
    const words = value
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    if (words.length <= MAX_WORDS) {
      setRemarks(value);
      setWordCount(words.length);
    }
  }, []);

  const handleRemarksBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, remarks: true }));
    const error = validateRemarks(remarks);
    setErrors((prev) => ({ ...prev, remarks: error }));
  }, [remarks, validateRemarks]);

  const handleTypeChange = useCallback(
    (e) => {
      const newType = e.target.value;
      if (!isEdit && !isInitialLoad && type !== newType) {
        resetFormState();
        setType(newType);
      } else {
        setType(newType);
      }
    },
    [isEdit, isInitialLoad, type, resetFormState],
  );

  const handleTypeBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, type: true }));
    const error = validateType(type);
    setErrors((prev) => ({ ...prev, type: error }));
  }, [type, validateType]);

  const handleServiceChange = useCallback(
    (newServiceId) => {
      if (!isEdit && !isInitialLoad && serviceId !== newServiceId) {
        resetFormState();
        setServiceId(newServiceId);
      } else {
        setServiceId(newServiceId);
      }
    },
    [isEdit, isInitialLoad, serviceId, resetFormState],
  );

  const handleReferenceNumberChange = useCallback(
    (e) => {
      const newReferenceNumber = e.target.value;
      if (!isEdit && !isInitialLoad && referenceNumber !== newReferenceNumber) {
        resetFormState();
        setReferenceNumber(newReferenceNumber);
      } else {
        setReferenceNumber(newReferenceNumber);
      }
    },
    [isEdit, isInitialLoad, referenceNumber, resetFormState],
  );

  const handleViewFile = useCallback((file, isServerFile = false) => {
    let url;
    if (isServerFile) {
      url = `/Uploads/${file}`;
      setSelectedFileName(file);
    } else {
      url = URL.createObjectURL(file);
      setSelectedFileName(file.name);
    }
    setOpenModal(true);
    return () => {
      if (!isServerFile && url) URL.revokeObjectURL(url);
    };
  }, []);

  const handleCloseModal = useCallback(() => {
    setOpenModal(false);
    setSelectedFileName("");
  }, []);

  const generateCorrigendumObject = useCallback(() => {
    return corrigendumFields.reduce((acc, field) => {
      acc[field.name] = {
        old_value:
          field.type === "enclosure" ? field.oldValue || "" : field.oldValue,
        new_value:
          field.type === "enclosure"
            ? field.newValue
              ? field.newValue.name
              : null
            : field.newValue,
        additional_values: field.additionalValues || {},
      };
      return acc;
    }, {});
  }, [corrigendumFields]);

  const handleSubmitDocumentChange = useCallback(async () => {
    if (!type) {
      setErrors((prev) => ({
        ...prev,
        type: "Please select a type (Corrigendum, Correction, or Data Updation)",
      }));
      return;
    }

    if (corrigendumFields.length === 0) {
      setErrors((prev) => ({
        ...prev,
        corrigendumFields: `Please add at least one field to submit the ${type.toLowerCase()}.`,
      }));
      return;
    }

    setTouched((prev) => ({ ...prev, remarks: true, files: true, type: true }));

    const newErrors = await revalidateAllFields(
      corrigendumFields,
      formData,
      referenceNumber,
      true,
    );
    setErrors(newErrors);

    const hasEmptyNewValue = corrigendumFields.some((field) => !field.newValue);

    const hasValidationErrors = Object.values(newErrors).some(
      (error) => error !== null && error !== undefined,
    );

    if (hasEmptyNewValue) {
      setErrors((prev) => ({
        ...prev,
        corrigendumFields: `Please fill in all new values before submitting the ${type.toLowerCase()}.`,
      }));
      return;
    }
    if (hasValidationErrors) {
      setErrors((prev) => ({
        ...prev,
        corrigendumFields: `Please correct all validation errors before submitting the ${type.toLowerCase()}.`,
      }));
      return;
    }

    setLoading(true);
    setResponseMessage({ message: "", type: "" });
    try {
      const corrigendumObject = generateCorrigendumObject();
      try {
        JSON.parse(JSON.stringify(corrigendumObject));
      } catch (error) {
        console.error(
          "Error validating corrigendumObject:",
          error,
          "Object:",
          corrigendumObject,
        );
        setResponseMessage({
          message: `Invalid ${type.toLowerCase()} fields format.`,
          type: "error",
        });
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("referenceNumber", referenceNumber);
      formDataToSend.append("remarks", remarks);
      formDataToSend.append("serviceId", serviceId);
      formDataToSend.append("type", type);
      formDataToSend.append(
        "corrigendumFields",
        JSON.stringify(corrigendumObject),
      );
      if (applicationId) formDataToSend.append("applicationId", applicationId);
      files.forEach((file, index) =>
        formDataToSend.append(`verificationDocuments[${index}]`, file),
      );
      if (isEdit)
        serverFiles.forEach((fileName, index) =>
          formDataToSend.append(`serverFiles[${index}]`, fileName),
        );

      const response = await axiosInstance.post(
        "/Officer/SubmitDocumentChange",
        formDataToSend,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (response.data.status) {
        setSuccessDetails({
          message: response.data.message || `${type} submitted successfully!`,
          referenceNumber: referenceNumber,
          type: type,
        });
        setShowSuccessMessage(true);

        setTimeout(() => {
          resetFormState();
          setReferenceNumber("");
          setServiceId("");
          setType("");
          setIsEdit(false);
          setFormDetailsFields([]);
          setFormElements([]);
          setAllowedFormFields([]);
        }, 100);
      } else {
        setResponseMessage({
          message:
            response.data.message || `Failed to submit ${type.toLowerCase()}.`,
          type: "error",
        });
      }
    } catch (error) {
      console.error(
        "Error submitting document change:",
        error,
        "Response:",
        error.response?.data,
      );
      setResponseMessage({
        message:
          error.response?.data?.message ||
          `Error submitting ${type.toLowerCase()}. Please try again.`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [
    type,
    corrigendumFields,
    formData,
    referenceNumber,
    remarks,
    serviceId,
    applicationId,
    files,
    serverFiles,
    isEdit,
    generateCorrigendumObject,
    resetFormState,
  ]);

  if (loading) {
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f0f4f8",
        }}
      >
        <CircularProgress size={60} sx={{ color: "#1976d2" }} />
      </Box>
    );
  }

  if (showSuccessMessage) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(to bottom, #75aecfff 0%, #417ac5ff 100%)",
          padding: "40px",
        }}
      >
        <StyledContainer>
          <Box
            sx={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Box
              sx={{
                backgroundColor: "#d4edda",
                border: "1px solid #c3e6cb",
                borderRadius: "8px",
                padding: "20px",
                width: "100%",
                maxWidth: "500px",
              }}
            >
              <Typography
                variant="h5"
                sx={{ color: "#155724", fontWeight: "600", mb: 2 }}
              >
                ✅ Success!
              </Typography>
              <Typography variant="body1" sx={{ color: "#155724", mb: 2 }}>
                {successDetails.message}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#155724", fontStyle: "italic" }}
              >
                Reference Number: {successDetails.referenceNumber}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#155724", fontStyle: "italic" }}
              >
                Type: {successDetails.type}
              </Typography>
            </Box>
            <StyledButton
              onClick={handleStartNew}
              sx={{ mt: 2, minWidth: "200px" }}
            >
              Submit Another {successDetails.type || "Document Change"}
            </StyledButton>
          </Box>
        </StyledContainer>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "linear-gradient(to bottom, #75aecfff 0%, #417ac5ff 100%)",
        padding: "40px",
      }}
    >
      <StyledContainer>
        <Typography
          variant="h4"
          sx={{
            textAlign: "center",
            fontWeight: "700",
            color: "#1976d2",
            mb: 4,
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          {isEdit
            ? `Edit ${type}`
            : `Issue ${type || "Corrigendum/Correction/Date Updation"}`}
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <ServiceSelectionForm
            services={services}
            value={serviceId}
            onServiceSelect={handleServiceChange}
            disabled={isEdit}
          />
          <StyledFormControl sx={{ width: "100%", maxWidth: "400px" }}>
            <InputLabel>Type</InputLabel>
            <Select
              name="type"
              value={type}
              onChange={handleTypeChange}
              onBlur={handleTypeBlur}
              label="Type"
              disabled={isEdit}
              error={!!errors.type}
            >
              <MenuItem value="" disabled>
                Select Type
              </MenuItem>
              <MenuItem value="Corrigendum">Corrigendum</MenuItem>
              <MenuItem value="Correction">Correction</MenuItem>
            </Select>
            {errors.type && (
              <FormHelperText error>{errors.type}</FormHelperText>
            )}
          </StyledFormControl>

          <TextField
            name="referenceNumber"
            label="Reference Number"
            value={referenceNumber}
            onChange={handleReferenceNumberChange}
            sx={{
              width: "100%",
              maxWidth: "400px",
              "& .MuiInputBase-root": {
                borderRadius: "8px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              },
            }}
            disabled={isEdit}
          />

          <StyledButton
            onClick={handleCheckIfDocumentChange}
            disabled={loading || isEdit || !type}
          >
            Check Application
          </StyledButton>

          {responseMessage.message && (
            <Typography
              sx={{ mt: 2 }}
              color={
                responseMessage.type === "error" ? "error" : "success.main"
              }
            >
              {responseMessage.message}
            </Typography>
          )}
        </Box>

        {isEdit && (
          <Box>
            <MaterialTable
              columns={columns}
              data={data}
              viewType={`${type} History`}
            />
          </Box>
        )}

        {canIssue && (
          <Box key={renderKey} sx={{ mt: 6 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: "600", color: "#333", mb: 3 }}
              >
                {type} (Form Details)
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: "400", color: "#333", mb: 3 }}
              >
                Reference Number: {referenceNumber}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
              <StyledFormControl>
                <InputLabel>Select a field to change</InputLabel>
                <Select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  label="Select a field to change"
                  error={!!errors.selectedField}
                >
                  <MenuItem value="" disabled>
                    Select a field
                  </MenuItem>
                  {allowedFormFields
                    .filter(
                      (item) =>
                        !corrigendumFields.some((f) => f.name === item.name),
                    )
                    .map((item) => (
                      <MenuItem key={item.value} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                </Select>
                {errors.selectedField && (
                  <FormHelperText error>{errors.selectedField}</FormHelperText>
                )}
              </StyledFormControl>
              <StyledButton
                variant="outlined"
                onClick={handleAddCorrigendumField}
              >
                Add Field
              </StyledButton>
            </Box>
            {formDetailsFields.length === 0 && (
              <Typography color="error" sx={{ mt: 2 }}>
                No editable fields available for this application.
              </Typography>
            )}
            {errors.corrigendumFields && (
              <Typography color="error" sx={{ mt: 2, mb: 2 }}>
                {errors.corrigendumFields}
              </Typography>
            )}

            {corrigendumFields.map((field, index) => (
              <Box
                key={`${field.name}-${index}`} // Unique key using name + index
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  mb: 3,
                  backgroundColor: "#f9f9f9",
                  padding: "16px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  border: "1px solid #e0e0e0",
                }}
              >
                {/* Parent Field Row */}
                <Grid container spacing={2} alignItems="center">
                  {/* Field Name (Label) */}
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Field"
                      value={field.label}
                      InputProps={{ readOnly: true }}
                      fullWidth
                      variant="outlined"
                      sx={{ backgroundColor: "#fff" }}
                    />
                  </Grid>

                  {/* Old Value */}
                  <Grid item xs={12} md={4}>
                    {field.type === "enclosure" ? (
                      <FormControl fullWidth>
                        <FormLabel sx={{ fontWeight: 500, color: "#555", mb: 1 }}>
                          {field.label} (Old)
                        </FormLabel>
                        {field.oldValue ? (
                          <Button
                            variant="outlined"
                            onClick={() => handleViewFile(field.oldValue, true)}
                            startIcon={<PictureAsPdfIcon />}
                            fullWidth
                            sx={{
                              textTransform: "none",
                              borderColor: "#1976D2",
                              color: "#1976D2",
                              "&:hover": {
                                backgroundColor: "#E3F2FD",
                                borderColor: "#1565C0",
                              },
                            }}
                          >
                            View Current Document
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No document
                          </Typography>
                        )}
                      </FormControl>
                    ) : (
                      <TextField
                        label={`${field.label} (Old)`}
                        value={field.oldValue || "N/A"}
                        InputProps={{ readOnly: true }}
                        fullWidth
                        variant="outlined"
                        sx={{ backgroundColor: "#fff" }}
                      />
                    )}
                  </Grid>

                  {/* New Value */}
                  <Grid item xs={12} md={4}>
                    {field.type === "select" ? (
                      <FormControl fullWidth error={!!errors[field.name]}>
                        <InputLabel>{field.label} (New)</InputLabel>
                        <Select
                          value={field.newValue || ""}
                          onChange={(e) => handleNewValueChange(index, e.target.value)}
                          onBlur={() => handleNewValueBlur(index, field.newValue)}
                        >
                          {field.options.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors[field.name] && (
                          <FormHelperText>{errors[field.name]}</FormHelperText>
                        )}
                      </FormControl>
                    ) : field.type === "date" ? (
                      <TextField
                        label={`${field.label} (New)`}
                        type="date"
                        value={field.newValue || ""}
                        onChange={(e) => handleNewValueChange(index, e.target.value)}
                        onBlur={() => handleNewValueBlur(index, field.newValue)}
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors[field.name]}
                        helperText={errors[field.name]}
                      />
                    ) : field.type === "enclosure" ? (
                      <TextField
                        label={`${field.label} (New)`}
                        type="file"
                        onChange={(e) =>
                          handleNewValueChange(index, e.target.files[0])
                        }
                        onBlur={() => handleNewValueBlur(index, field.newValue)}
                        fullWidth
                        InputProps={{ accept: field.accept || ".pdf" }}
                        error={!!errors[field.name]}
                        helperText={errors[field.name] || "Upload new document"}
                      />
                    ) : (
                      <TextField
                        label={`${field.label} (New)`}
                        value={field.newValue || ""}
                        onChange={(e) => handleNewValueChange(index, e.target.value)}
                        onBlur={() => handleNewValueBlur(index, field.newValue)}
                        fullWidth
                        inputProps={{ maxLength: field.maxLength }}
                        error={!!errors[field.name]}
                        helperText={errors[field.name]}
                      />
                    )}
                  </Grid>

                  {/* Delete Button */}
                  <Grid item xs={12} md={1} sx={{ display: "flex", justifyContent: "center" }}>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteField(index)}
                      sx={{
                        bgcolor: "#ffebee",
                        "&:hover": { bgcolor: "#ffcdd2" },
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>

                {/* Render Additional / Conditional Fields */}
                {field.additionalFields[field.newValue]?.map((addField) => (
                  <Grid container spacing={2} sx={{ mt: 2 }} key={addField.name}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Field"
                        value={addField.label || addField.name}
                        InputProps={{ readOnly: true }}
                        fullWidth
                        variant="outlined"
                        sx={{ backgroundColor: "#fff" }}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        label={`${addField.label || addField.name} (Old)`}
                        value={
                          findNestedFieldValue(formDetails, addField.name) || "N/A"
                        }
                        InputProps={{ readOnly: true }}
                        fullWidth
                        variant="outlined"
                        sx={{ backgroundColor: "#fff" }}
                      />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      {addField.type === "select" ? (
                        <FormControl fullWidth error={!!errors[`${field.name}-${addField.name}`]}>
                          <InputLabel>{addField.label} (New)</InputLabel>
                          <Select
                            value={field.additionalValues[addField.name] || ""}
                            onChange={(e) =>
                              handleNewValueChange(index, e.target.value, addField.name)
                            }
                            onBlur={() =>
                              handleNewValueBlur(index, field.additionalValues[addField.name], addField.name)
                            }
                          >
                            {addField.options.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors[`${field.name}-${addField.name}`] && (
                            <FormHelperText>{errors[`${field.name}-${addField.name}`]}</FormHelperText>
                          )}
                        </FormControl>
                      ) : addField.type === "date" ? (
                        <TextField
                          label={`${addField.label} (New)`}
                          type="date"
                          value={field.additionalValues[addField.name] || ""}
                          onChange={(e) =>
                            handleNewValueChange(index, e.target.value, addField.name)
                          }
                          onBlur={() =>
                            handleNewValueBlur(index, field.additionalValues[addField.name], addField.name)
                          }
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          error={!!errors[`${field.name}-${addField.name}`]}
                          helperText={errors[`${field.name}-${addField.name}`]}
                        />
                      ) : addField.type === "enclosure" ? (
                        <TextField
                          label={`${addField.label} (New)`}
                          type="file"
                          onChange={(e) =>
                            handleNewValueChange(index, e.target.files[0], addField.name)
                          }
                          fullWidth
                          InputProps={{ accept: addField.accept || ".pdf" }}
                          error={!!errors[`${field.name}-${addField.name}`]}
                          helperText={errors[`${field.name}-${addField.name}`] || "Upload new document"}
                        />
                      ) : (
                        <TextField
                          label={`${addField.label} (New)`}
                          value={field.additionalValues[addField.name] || ""}
                          onChange={(e) =>
                            handleNewValueChange(index, e.target.value, addField.name)
                          }
                          onBlur={() =>
                            handleNewValueBlur(index, field.additionalValues[addField.name], addField.name)
                          }
                          fullWidth
                          error={!!errors[`${field.name}-${addField.name}`]}
                          helperText={errors[`${field.name}-${addField.name}`]}
                        />
                      )}
                    </Grid>
                  </Grid>
                ))}
              </Box>
            ))}
            <Box sx={{ position: "relative", mt: 2 }}>
              <TextField
                name="remarks"
                label="Remarks"
                value={remarks}
                onChange={handleRemarksChange}
                onBlur={handleRemarksBlur}
                multiline
                rows={4}
                sx={{
                  width: "100%",
                  "& .MuiInputBase-root": {
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  },
                }}
                error={!!errors.remarks}
                helperText={errors.remarks || ""}
              />
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  bottom: errors.remarks ? 24 : 8,
                  right: 8,
                  color:
                    wordCount > MAX_WORDS ? "error.main" : "text.secondary",
                }}
              >
                {wordCount}/{MAX_WORDS} words
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: "#333" }}>
                Supporting Documents
              </Typography>
              <StyledButton
                variant="outlined"
                onClick={handleAddFileClick}
                sx={{ mb: 2 }}
              >
                Upload Bank Passbook (First Page)
              </StyledButton>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
                ref={fileInputRef}
              />
              {errors.files && (
                <FormHelperText error sx={{ mt: 1, mb: 1 }}>
                  {errors.files}
                </FormHelperText>
              )}
              {(files.length > 0 || serverFiles.length > 0) && (
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    flexDirection: "row",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  {serverFiles.map((fileName, index) => (
                    <Box
                      key={`server-${index}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        width: "max-content",
                        backgroundColor: "#f0f0f0",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <FileNameTypography
                        variant="caption"
                        sx={{ pr: 2 }}
                        onClick={() => handleViewFile(fileName, true)}
                      >
                        {fileName} (Server)
                      </FileNameTypography>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveServerFile(index)}
                        sx={{
                          "&:hover": {
                            backgroundColor: "rgba(211, 47, 47, 0.1)",
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  {files.map((file, index) => (
                    <Box
                      key={`local-${index}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        width: "max-content",
                        backgroundColor: "#f9f9f9",
                        padding: "8px 12px",
                        border: "1px solid #000",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      <FileNameTypography
                        variant="caption"
                        sx={{ pr: 2 }}
                        onClick={() => handleViewFile(file, false)}
                      >
                        {file.name}
                      </FileNameTypography>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveFile(index)}
                        sx={{
                          "&:hover": {
                            backgroundColor: "rgba(211, 47, 47, 0.1)",
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            <BasicModal
              open={openModal}
              Title="Document Preview"
              handleClose={handleCloseModal}
              pdf={selectedFileName}
            />
            {corrigendumFields.length > 0 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <StyledButton
                  onClick={handleSubmitDocumentChange}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    `Forward ${type} to ${nextOfficer}`
                  )}
                </StyledButton>
              </Box>
            )}
          </Box>
        )}
      </StyledContainer>
    </Box>
  );
}
