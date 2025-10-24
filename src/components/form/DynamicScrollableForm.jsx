import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, Controller, get, useWatch, set } from "react-hook-form";
import {
  runValidations,
  TransformationFunctionsList,
} from "../../assets/formvalidations";
import {
  Box,
  Checkbox,
  FormControlLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
  Typography,
  Divider,
  IconButton,
  Alert,
  FormLabel,
  FormGroup,
  CircularProgress,
  Grid2 as Grid,
  Autocomplete,
} from "@mui/material";
import { Col, Row } from "react-bootstrap";
import { fetchFormDetails, GetServiceContent } from "../../assets/fetch";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../../axiosConfig";
import PersonIcon from "@mui/icons-material/Person";
import HomeIcon from "@mui/icons-material/Home";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import MessageModal from "../MessageModal";
import LoadingSpinner from "../LoadingSpinner";
import { toast, ToastContainer } from "react-toastify";
import OtpModal from "../OtpModal";
import { CheckCircle, Delete, FileDownload } from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { format, parse } from "date-fns";

const sectionIconMap = {
  Location: <LocationOnIcon sx={{ fontSize: 36, color: "#14B8A6" }} />, // Teal
  "Applicant Details": <PersonIcon sx={{ fontSize: 36, color: "#EC4899" }} />, // Pink
  "Present Address Details": (
    <HomeIcon sx={{ fontSize: 36, color: "#8B5CF6" }} />
  ), // Indigo
  "Permanent Address Details": (
    <HomeIcon sx={{ fontSize: 36, color: "#8B5CF6" }} />
  ), // Indigo
  "Bank Details": (
    <AccountBalanceIcon sx={{ fontSize: 36, color: "#F59E0B" }} />
  ), // Amber
  Documents: <InsertDriveFileIcon sx={{ fontSize: 36, color: "#10B981" }} />, // Green
};

// Helper function to collect currently rendered fields
const collectRenderedFields = (formSections, formData) => {
  const renderedFields = new Set();

  formSections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === "enclosure") {
        if (
          !field.isDependentEnclosure ||
          (field.isDependentEnclosure &&
            field.dependentValues.includes(formData[field.dependentField]))
        ) {
          renderedFields.add(`${field.name}_select`);
          renderedFields.add(`${field.name}_file`);
        }
      } else {
        renderedFields.add(field.name);
      }

      if (field.additionalFields) {
        const selectedValue = formData[field.name] || "";
        const additionalFields = field.additionalFields[selectedValue] || [];
        additionalFields.forEach((af) => {
          const nestedFieldName = af.name || `${field.name}_${af.id}`;
          renderedFields.add(nestedFieldName);
          if (af.type === "enclosure") {
            renderedFields.add(`${nestedFieldName}_select`);
            renderedFields.add(`${nestedFieldName}_file`);
          }
          if (af.additionalFields) {
            const nestedSelectedValue = formData[nestedFieldName] || "";
            const nestedAdditionalFields =
              af.additionalFields[nestedSelectedValue] || [];
            nestedAdditionalFields.forEach((nestedAf) => {
              const nestedNestedFieldName =
                nestedAf.name || `${nestedFieldName}_${nestedAf.id}`;
              renderedFields.add(nestedNestedFieldName);
              if (nestedAf.type === "enclosure") {
                renderedFields.add(`${nestedNestedFieldName}_select`);
                renderedFields.add(`${nestedNestedFieldName}_file`);
              }
            });
          }
        });
      }
    });
  });

  return Array.from(renderedFields);
};

// Helper function to flatten the nested formDetails structure
const flattenFormDetails = (nestedDetails) => {
  const flat = {};
  function recurse(fields) {
    fields.forEach((field) => {
      if (field.hasOwnProperty("Enclosure")) {
        flat[field.name] = {
          selected: field.Enclosure || "",
          file: field.File || "",
        };
      } else {
        if ("value" in field) flat[field.name] = field.value;
        if ("File" in field && field.File) flat[field.name] = field.File;
      }

      if (field.additionalFields) {
        const branches = Array.isArray(field.additionalFields)
          ? field.additionalFields
          : Object.values(field.additionalFields).flat();

        recurse(
          branches.map((af) => ({
            ...af,
            name: af.name || `${field.name}_${af.id}`,
          })),
        );
      }
    });
  }

  Object.values(nestedDetails).forEach((fields) => recurse(fields));
  return flat;
};

// Helper function to sanitize form sections
const sanitizeFormSections = (sections) => {
  return sections.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      if (field.options) {
        const seenValues = new Set();
        const uniqueOptions = field.options.filter((option) => {
          if (seenValues.has(option.value)) {
            console.warn(
              `Duplicate option value found: ${option.value} in field ${field.name}`,
            );
            return false;
          }
          seenValues.add(option.value);
          return true;
        });
        return { ...field, options: uniqueOptions };
      }
      if (field.additionalFields) {
        const sanitizedAdditionalFields = {};
        Object.entries(field.additionalFields).forEach(([key, fields]) => {
          sanitizedAdditionalFields[key] = fields.map((af) => {
            if (af.options) {
              const seenValues = new Set();
              const uniqueOptions = af.options.filter((option) => {
                if (seenValues.has(option.value)) {
                  console.warn(
                    `Duplicate option value found: ${option.value} in additional field ${af.name}`,
                  );
                  return false;
                }
                seenValues.add(option.value);
                return true;
              });
              return { ...af, options: uniqueOptions };
            }
            return af;
          });
        });
        return { ...field, additionalFields: sanitizedAdditionalFields };
      }
      return field;
    }),
  }));
};

const DynamicScrollableForm = ({ mode = "new", data }) => {
  const {
    control,
    handleSubmit,
    trigger,
    watch,
    getValues,
    setValue,
    reset,
    unregister,
    clearErrors,
    formState: { errors, dirtyFields },
  } = useForm({
    mode: "onBlur",
    reValidateMode: "onBlur", // ← ADD THIS LINE
    shouldUnregister: false,
    defaultValues: {},
  });

  const [formSections, setFormSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [initialData, setInitialData] = useState(null);
  const [additionalDetails, setAdditionalDetails] = useState(null);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [applicantImagePreview, setApplicantImagePreview] = useState(
    "/assets/images/profile.jpg",
  );
  const [aadhaarValid, setAadhaarValid] = useState(false);
  const [otpModal, setOtpModal] = useState(false);
  const [emailAlertModalOpen, setEmailAlertModalOpen] = useState(false);
  const [ifscPrefix, setIfscPrefix] = useState("");
  const [isBranchNameReadonly, setIsBranchNameReadonly] = useState(true); // New state for BranchName readonly

  const [DependableFields, setDependableFields] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const hasRunRef = useRef(false);
  const watchedDependableValues = useWatch({ control, name: DependableFields });
  const isBackspacePressed = useRef(false);
  const formRef = useRef(null);
  const applicantImageFile = watch("ApplicantImage");

  // Effect to manage non-rendered fields
  useEffect(() => {
    if (!formSections.length) return;

    formSections.forEach((section) => {
      section.fields.forEach((field) => {
        // Handle dependent selects
        if (
          field.type === "select" &&
          field.dependentOn &&
          field.dependentOptions
        ) {
          const parentValue = watch(field.dependentOn);
          const options =
            field.dependentOptions[parentValue] || field.options || [];
          const currentValue = getValues(field.name);

          if (
            options.length > 0 &&
            currentValue &&
            currentValue !== "Please Select"
          ) {
            const isValueValid = options.some(
              (opt) => opt.value.toString() === currentValue.toString(),
            );
            if (!isValueValid) {
              setValue(field.name, "Please Select", { shouldValidate: true });
            }
          } else if (
            options.length === 0 &&
            currentValue &&
            currentValue !== "Please Select"
          ) {
            setValue(field.name, "Please Select", { shouldValidate: true });
          }
        }

        // Handle additionalFields
        if (field.additionalFields) {
          const selectedValue = watch(field.name);
          const additionalFields = field.additionalFields[selectedValue] || [];
          additionalFields.forEach((af) => {
            if (af.type === "select" && af.dependentOn && af.dependentOptions) {
              const parentValue = watch(af.dependentOn);
              const options =
                af.dependentOptions[parentValue] || af.options || [];
              const currentValue = getValues(af.name);
              if (
                options.length > 0 &&
                currentValue &&
                currentValue !== "Please Select"
              ) {
                const isValueValid = options.some(
                  (opt) => opt.value.toString() === currentValue.toString(),
                );
                if (!isValueValid) {
                  setValue(af.name, "Please Select", { shouldValidate: true });
                }
              } else if (
                options.length === 0 &&
                currentValue &&
                currentValue !== "Please Select"
              ) {
                setValue(af.name, "Please Select", { shouldValidate: true });
              }
            }
          });
        }

        // Handle dependent enclosures
        if (
          field.type === "enclosure" &&
          field.isDependentEnclosure &&
          field.dependentField &&
          field.dependentValues?.length > 0
        ) {
          const watchedValue = getValues(field.dependentField);
          const shouldShow = field.dependentValues.includes(watchedValue);
          const selectFieldName = `${field.name}_select`;
          const fileFieldName = `${field.name}_file`;

          if (!shouldShow) {
            setValue(selectFieldName, "", { shouldValidate: false });
            setValue(fileFieldName, null, { shouldValidate: false });
            clearErrors([selectFieldName, fileFieldName]);
          } else if (
            shouldShow &&
            initialData?.[field.name] &&
            (getValues(selectFieldName) === "" ||
              getValues(fileFieldName) == null)
          ) {
            // Restore values from initialData when the field reappears
            setValue(selectFieldName, initialData[field.name].selected || "", {
              shouldValidate: !isFieldDisabled(field.name),
            });
            if (initialData[field.name].file) {
              setDefaultFile(
                fileFieldName,
                initialData[field.name].file,
                false,
              );
            } else {
              setValue(fileFieldName, null, {
                shouldValidate: !isFieldDisabled(field.name),
              });
            }
            // Clear any existing errors for this field
            clearErrors([selectFieldName, fileFieldName]);
          }
        }
      });
    });
  }, [
    formSections,
    getValues,
    setValue,
    initialData,
    watch,
    clearErrors,
    JSON.stringify(watchedDependableValues),
  ]);

  function isDocumentInData(fieldName, flatDetails) {
    return Object.keys(flatDetails).includes(fieldName);
  }

  const getDependableFields = (formSections, returnFields, flatDetails) => {
    const dependencies = [];
    formSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (
          returnFields.includes(field.name) ||
          returnFields.includes(field.dependentOn)
        ) {
          dependencies.push(field.name);
          if (field.additionalFields) {
            const additionalFields = Array.isArray(field.additionalFields)
              ? field.additionalFields
              : Object.values(field.additionalFields).flat();
            additionalFields.forEach((af) => {
              dependencies.push(af.name);
              if (af.additionalFields) {
                const nestedFields = Array.isArray(af.additionalFields)
                  ? af.additionalFields
                  : Object.values(af.additionalFields).flat();
                nestedFields.forEach((nestedAf) => {
                  dependencies.push(nestedAf.name);
                });
              }
            });
          }
        } else if (field.type === "enclosure" && field.isDependentEnclosure) {
          if (!isDocumentInData(field.name, flatDetails)) {
            dependencies.push(field.name);
          }
        }
      });
    });
    return dependencies;
  };

  const isFieldDisabled = (fieldName, fieldType = null) => {
    if (
      mode === "edit" &&
      additionalDetails &&
      additionalDetails.returnFields
    ) {
      return !DependableFields.includes(fieldName);
    }
    return false;
  };

  const setDefaultFile = async (fieldName, path, setPreview = null) => {
    try {
      if (!path || typeof path !== "string") {
        console.warn(`No valid URL provided for ${fieldName}`);
        if (setPreview) setApplicantImagePreview("/assets/images/profile.jpg"); // Fallback for images
        return;
      }
      const response = await fetch(`/Base/DisplayFile?fileName=${path}`);
      if (!response.ok)
        throw new Error(`Failed to fetch file for ${fieldName}`);
      const blob = await response.blob();
      const fileName = path.split("/").pop() || `${fieldName}_file`;
      const file = new File([blob], fileName, { type: blob.type });
      setValue(fieldName, file, { shouldValidate: true });
      if (setPreview) {
        setApplicantImagePreview(`/Base/DisplayFile?fileName=${path}`);
      }
    } catch (error) {
      console.error(`Error setting default file for ${fieldName}:`, error);
      if (setPreview) setApplicantImagePreview("/assets/images/profile.jpg"); // Fallback for images
    }
  };

  const setAreas = (formDetails) => {
    Object.keys(formDetails).forEach((key, sectionIndex) => {
      const section = formDetails[key];
      section.forEach((item) => {
        if (
          /district|tehsil|muncipality|ward|block|halqapanchayat|village/i.test(
            item.name,
          )
        ) {
          handleAreaChange(sectionIndex, item, item.value);
        }
      });
    });
  };

  useEffect(() => {
    if (applicantImageFile && applicantImageFile instanceof File) {
      const objectUrl = URL.createObjectURL(applicantImageFile);
      setValue("ApplicantImage", applicantImageFile, { shouldValidate: true });
      setApplicantImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (
      mode === "edit" &&
      initialData?.ApplicantImage &&
      typeof initialData.ApplicantImage === "string"
    ) {
      setDefaultFile("ApplicantImage", initialData.ApplicantImage, true);
    } else if (data != null) {
      const flatDetails = flattenFormDetails(data);
      setDefaultFile("ApplicantImage", flatDetails.ApplicantImage, true);
    }
  }, [applicantImageFile, initialData, mode, data, setValue]);

  useEffect(() => {
    async function loadForm() {
      try {
        const { ServiceId, referenceNumber } = location.state || {};
        let config;
        setSelectedServiceId(ServiceId);
        if (referenceNumber) {
          setReferenceNumber(referenceNumber);
        }

        const result = await GetServiceContent(ServiceId);
        if (result && result.status) {
          try {
            config = JSON.parse(result.formElement);
            let updatedConfig = sanitizeFormSections(config);

            const bankOptions = await fetchBanks();
            updatedConfig = updatedConfig.map((section) => {
              if (section.section === "Bank Details") {
                return {
                  ...section,
                  fields: section.fields.map((field) => {
                    if (field.name === "BankName") {
                      return { ...field, options: bankOptions };
                    }
                    if (
                      field.name === "BranchName" ||
                      field.name === "IfscCode"
                    ) {
                      return {
                        ...field,
                        options: [
                          { label: "Please Select", value: "Please Select" },
                        ],
                      };
                    }
                    return field;
                  }),
                };
              }
              return section;
            });

            setFormSections(updatedConfig);

            if (mode === "edit" || mode === "incomplete") {
              const documentsSection = updatedConfig.find(
                (section) => section.section === "Documents",
              );
              let otherDocuments = [];

              if (mode === "edit" && referenceNumber) {
                const { formDetails } = await fetchFormDetails(referenceNumber);
                otherDocuments =
                  formDetails?.Documents?.filter(
                    (doc) => doc.label === "Other Document",
                  ) || [];
              } else if (mode === "incomplete" && data?.Documents) {
                otherDocuments = data.Documents.filter(
                  (doc) => doc.label === "Other Document",
                );
              }

              if (documentsSection && otherDocuments.length > 0) {
                const newFields = otherDocuments.map((doc, idx) => {
                  const newId = doc.name || `field-${Date.now()}-${idx}`;
                  return {
                    id: newId,
                    type: "enclosure",
                    label: doc.label || "Other Document",
                    name: doc.name || `CustomDocument_${newId}`,
                    minLength: 5,
                    maxLength: 50,
                    options: [],
                    span: 6,
                    validationFunctions: ["notEmpty", "validateFile"],
                    transformationFunctions: [],
                    additionalFields: {},
                    accept: ".pdf",
                    editable: true,
                    dependentOptions: {},
                    isDependentEnclosure: false,
                    dependentValues: [],
                    isConsentCheckbox: false,
                    checkboxLayout: "vertical",
                    declaration: "",
                    defaultValue: {
                      selected: doc.Enclosure || "",
                      file: doc.File || null,
                    },
                  };
                });
                documentsSection.fields = [
                  ...documentsSection.fields,
                  ...newFields,
                ];
              }
              setFormSections(updatedConfig);
            } else {
              setFormSections(updatedConfig);
            }
          } catch (err) {
            console.error("Error parsing formElements:", err);
            setFormSections([]);
          }
        }

        if ((mode === "incomplete" || mode === "edit") && referenceNumber) {
          const { formDetails, additionalDetails } = await fetchFormDetails(
            referenceNumber,
          );

          setAdditionalDetails(additionalDetails);

          const flatDetails = flattenFormDetails(formDetails);
          setInitialData(flatDetails);

          const resetData = {
            ...flatDetails,
            ...Object.keys(flatDetails).reduce((acc, key) => {
              if (
                flatDetails[key] &&
                typeof flatDetails[key] === "object" &&
                "selected" in flatDetails[key]
              ) {
                acc[`${key}_select`] = flatDetails[key].selected || "";
                acc[`${key}_file`] = flatDetails[key].file || null;
                setDefaultFile(`${key}_file`, flatDetails[key].file, false);
              }
              return acc;
            }, {}),
          };

          const returnFields = JSON.parse(
            additionalDetails?.returnFields || "[]",
          );
          const dependableFields = getDependableFields(
            config,
            returnFields,
            flatDetails,
          );
          setAreas(formDetails);
          setDependableFields(dependableFields);

          reset(resetData);

          if (mode === "edit" || mode === "incomplete") {
            const value = getValues("AadharNumber");
            if (value && value.length > 0) {
              setAadhaarValid(true);
            }
          }
        } else if (
          mode === "incomplete" &&
          data !== null &&
          data !== undefined
        ) {
          const flatDetails = flattenFormDetails(data);

          const resetData = {
            ...flatDetails,
            ...Object.keys(flatDetails).reduce((acc, key) => {
              if (
                flatDetails[key] &&
                typeof flatDetails[key] === "object" &&
                "selected" in flatDetails[key]
              ) {
                acc[`${key}_select`] = flatDetails[key].selected;
                acc[`${key}_file`] = flatDetails[key].file;
                setDefaultFile(`${key}_file`, flatDetails[key].file, false);
              }
              return acc;
            }, {}),
          };

          setInitialData(flatDetails);
          reset(resetData);

          formSections.forEach((section) => {
            section.fields.forEach((field) => {
              if (field.type === "enclosure") {
                const fileFieldName = `${field.name}_file`;
                const selectFieldName = `${field.name}_select`;
                const fileUrl = flatDetails[field.name]?.file;
                const selectedValue = flatDetails[field.name]?.selected;
                if (fileUrl && typeof fileUrl === "string") {
                  if (
                    field.isDependentEnclosure &&
                    field.dependentField &&
                    field.dependentValues?.length > 0
                  ) {
                    const parentValue = flatDetails[field.dependentField];
                    if (!field.dependentValues.includes(parentValue)) {
                      return;
                    }
                  }
                  setDefaultFile(fileFieldName, fileUrl);
                }
                if (selectedValue) {
                  setValue(selectFieldName, selectedValue, {
                    shouldValidate: true,
                  });
                }
              }
            });
          });
        }

        if (data != null) {
          Object.keys(data).forEach((key, sectionIndex) => {
            data[key].map((item) => {
              if (item.name.toLowerCase().includes("district")) {
                handleAreaChange(sectionIndex, { name: item.name }, item.value);
              }
              setValue(item.name, item.value);

              if (item.additionalFields) {
                let fieldsArray = [];

                if (Array.isArray(item.additionalFields)) {
                  fieldsArray = item.additionalFields;
                } else if (
                  typeof item.additionalFields === "object" &&
                  !Array.isArray(item.additionalFields)
                ) {
                  Object.values(item.additionalFields).forEach((arr) => {
                    if (Array.isArray(arr)) {
                      fieldsArray.push(...arr);
                    }
                  });
                }

                const uniqueFields = [];
                const seen = new Set();

                fieldsArray.forEach((field) => {
                  const key = `${field.name}::${field.value}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    uniqueFields.push(field);
                  }
                });

                uniqueFields.forEach((field) => {
                  if (
                    field.name.toLowerCase().includes("district") ||
                    field.name.toLowerCase().includes("muncipality")
                  ) {
                    handleAreaChange(
                      sectionIndex,
                      { name: field.name },
                      field.value,
                    );
                  }
                  setValue(field.name, field.value);
                });
              }
            });
          });
        }
      } catch (error) {
        console.error("Error fetching service content:", error);
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [location.state, mode, reset, data, setValue]);

  useEffect(() => {
    if (!formSections.length || !initialData) return;

    if (hasRunRef.current) return;
    hasRunRef.current = true;

    function recurseAndSet(fields, sectionIndex, sectionName) {
      fields.forEach((field) => {
        const name = field.name;
        const sectionData = initialData[sectionName] || [];
        const fieldData = sectionData.find((f) => f.name === name);
        const value = fieldData ? fieldData.value : undefined;

        if (
          (name.toLowerCase().includes("district") ||
            name.toLowerCase().includes("muncipality") ||
            name.toLowerCase().includes("municipality")) &&
          value !== undefined
        ) {
          handleAreaChange(sectionIndex, { ...field, name }, value);
        }

        if (name.toLowerCase().includes("applicantimage") && value) {
          setApplicantImagePreview(value);
          setDefaultFile(value);
        }

        if (field.type === "enclosure" && value) {
          setValue(`${name}_select`, value.selected || "", {
            shouldValidate: true,
          });
          setValue(`${name}_file`, value.file || null, {
            shouldValidate: true,
          });
        }
        if (value !== undefined) {
          setValue(name, value, { shouldValidate: true });
        }

        if (field.additionalFields) {
          const branches = Array.isArray(field.additionalFields)
            ? field.additionalFields
            : Object.values(field.additionalFields).flat();

          recurseAndSet(
            branches.map((af) => ({
              ...af,
              name: af.name || `${name}_${af.id}`,
            })),
            sectionIndex,
            sectionName,
          );
        }
      });
    }

    formSections.forEach((section, idx) => {
      const sectionName = section.section;
      recurseAndSet(section.fields, idx, sectionName);
    });
  }, [
    formSections,
    initialData,
    setValue,
    handleAreaChange,
    setApplicantImagePreview,
    setDefaultFile,
  ]);

  const enclosureDependentFields = formSections
    .flatMap((section) => section.fields)
    .filter((field) => field.type === "enclosure" && field.isDependentEnclosure)
    .map((field) => ({
      fieldName: field.name,
      dependentField: field.dependentField,
    }));

  useEffect(() => {
    if (!formSections.length) return;

    formSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (
          field.type === "select" &&
          field.dependentOn &&
          field.dependentOptions
        ) {
          const parentValue = watch(field.dependentOn);
          const options = field.dependentOptions[parentValue] || [];
          const currentValue = getValues(field.name);

          if (options.length > 0) {
            setValue(field.name, options[1]?.value || "", {
              shouldValidate: true,
            });
          } else if (currentValue) {
            setValue(field.name, "", { shouldValidate: true });
          }
        }

        if (field.additionalFields) {
          const selectedValue = watch(field.name);
          const additionalFields = field.additionalFields[selectedValue] || [];

          additionalFields.forEach((af) => {
            if (af.type === "select" && af.dependentOn && af.dependentOptions) {
              const parentValue = watch(af.dependentOn);
              const options = af.dependentOptions[parentValue] || [];
              const currentValue = getValues(af.name);

              if (options.length > 0) {
                setValue(af.name, options[1]?.value || "", {
                  shouldValidate: true,
                });
              } else if (currentValue) {
                setValue(af.name, "", { shouldValidate: true });
              }
            }
          });
        }

        if (
          field.type === "enclosure" &&
          field.isDependentEnclosure &&
          field.dependentField &&
          field.dependentValues?.length > 0
        ) {
          const watchedValue = getValues(field.dependentField);
          const shouldShow = field.dependentValues.includes(watchedValue);
          const selectFieldName = `${field.name}_select`;
          const fileFieldName = `${field.name}_file`;

          if (!shouldShow) {
            setValue(selectFieldName, "", { shouldValidate: true });
            setValue(fileFieldName, null, { shouldValidate: true });
            return;
          }
        }
      });
    });
  }, [
    watch,
    ...enclosureDependentFields.map(({ dependentField }) =>
      watch(dependentField),
    ),
  ]);

  const handleCopyAddress = async (checked) => {
    if (!checked) {
      const permanentSection = formSections.find(
        (sec) => sec.section === "Permanent Address Details",
      );
      if (!permanentSection) {
        console.warn("Permanent Address section not found");
        return;
      }
      permanentSection.fields.forEach((field) => {
        setValue(field.name, field.type === "select" ? "Please Select" : "", {
          shouldValidate: false,
        });
      });
      return;
    }

    const presentSection = formSections.find(
      (sec) => sec.section === "Present Address Details",
    );
    const permanentSection = formSections.find(
      (sec) => sec.section === "Permanent Address Details",
    );

    if (!presentSection || !permanentSection) {
      console.warn("Present or Permanent Address section not found");
      return;
    }

    const permanentSectionIndex = formSections.findIndex(
      (sec) => sec.section === "Permanent Address Details",
    );

    const presentTypeField = presentSection.fields.find((field) =>
      field.name.toLowerCase().includes("addresstype"),
    );
    const permanentTypeField = permanentSection.fields.find((field) =>
      field.name.toLowerCase().includes("addresstype"),
    );

    if (!presentTypeField || !permanentTypeField) {
      console.warn("Address type fields not found in sections");
      return;
    }

    const presentAddressType = getValues(presentTypeField.name);
    let permanentAddressType = getValues(permanentTypeField.name);

    if (
      permanentAddressType === "Please Select" ||
      !presentTypeField.options.some(
        (opt) => opt.value === permanentAddressType,
      )
    ) {
      permanentAddressType = presentAddressType;
      setValue(permanentTypeField.name, presentAddressType, {
        shouldValidate: true,
      });
    }

    const presentAdditionalFields =
      presentTypeField.additionalFields?.[presentAddressType] || [];
    const permanentAdditionalFields =
      permanentTypeField.additionalFields?.[permanentAddressType] || [];

    permanentAdditionalFields.forEach((field) => {
      setValue(field.name, "", { shouldValidate: false });
    });

    for (const presentField of [
      ...presentSection.fields.filter((f) => f.name !== presentTypeField.name),
      ...presentAdditionalFields,
    ]) {
      const fieldValue = getValues(presentField.name);
      const permanentFieldName = presentField.name.replace(
        "Present",
        "Permanent",
      );
      const permanentField = [
        ...permanentSection.fields,
        ...permanentAdditionalFields,
      ].find((f) => f.name.toLowerCase() === permanentFieldName.toLowerCase());

      if (!permanentField) {
        console.warn(
          `Permanent field not found for ${presentField.name}. Expected: ${permanentFieldName}`,
        );
        continue;
      }

      setValue(permanentField.name, fieldValue, { shouldValidate: true });

      if (
        /district|tehsil|muncipality|ward|block|halqapanchayat|village/i.test(
          presentField.name,
        )
      ) {
        await handleAreaChange(
          permanentSectionIndex,
          permanentField,
          fieldValue,
        );
      }
    }

    const validateFields = async () => {
      await trigger(permanentTypeField.name);
      for (const field of [
        ...permanentSection.fields,
        ...permanentAdditionalFields,
      ]) {
        try {
          await trigger(field.name);
        } catch (error) {
          console.warn(`Validation failed for ${field.name}: ${error.message}`);
        }
      }
    };

    await validateFields();
  };

  const handleAaddhaarNumber = async () => {
    const sendOTP = await fetch(
      "/Home/SendAadhaarOTP?aadhaarNumber=" + aadhaarNumber,
    );
    const result = await sendOTP.json();
    if (result.status) {
      setOtpModal(true);
    }
  };

  const handleOtpSubmit = async (otp) => {
    const formdata = new FormData();
    formdata.append("aadhaarNumber", aadhaarNumber);
    formdata.append("otp", otp);
    const response = await fetch("/Home/ValidateAadhaarOTP", {
      method: "POST",
      body: formdata,
    });

    const result = await response.json();

    if (result.status) {
      setOtpModal(false);
      setAadhaarValid(true);

      const maskedAadhaar = aadhaarNumber.replace(/\d/g, (digit, index) => {
        return index < 8 ? "X" : digit;
      });

      setValue("AadharNumber", maskedAadhaar);
      setAadhaarNumber(result.aadhaarToken);
      toast.success("Aadhaar Number Validated.");
    }
  };

  const handleAreaChange = async (sectionIndex, field, value) => {
    try {
      let addressTypeKey = "";
      if (field.name.startsWith("Present")) {
        addressTypeKey = "PresentAddressType";
      } else if (field.name.startsWith("Permanent")) {
        addressTypeKey = "PermanentAddressType";
      }

      const AddressType = getValues(addressTypeKey);

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

      const match = fieldNames.find((f) => f.name === field.name);

      if (!match) {
        console.warn(`Field "${field.name}" not found in fieldNames.`);
        return;
      }

      let childFieldNames =
        typeof match.childname === "object"
          ? match.childname[AddressType]
          : match.childname;
      if (!Array.isArray(childFieldNames)) {
        childFieldNames = [childFieldNames];
      }

      let tableNames =
        typeof match.respectiveTable === "object"
          ? match.respectiveTable[AddressType]
          : match.respectiveTable;
      if (!Array.isArray(tableNames)) {
        tableNames = [tableNames];
      }

      if (!childFieldNames.length || !tableNames.length) {
        console.warn(`Invalid mapping for ${field.name} (${AddressType})`);
        return;
      }

      for (let i = 0; i < childFieldNames.length; i++) {
        const childFieldName = childFieldNames[i];
        const tableName = tableNames[i];

        try {
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

          const currentValue = getValues(childFieldName);
          const isValueValid = newOptions.some(
            (option) => option.value.toString() === currentValue?.toString(),
          );
          if (currentValue && !isValueValid) {
            setValue(childFieldName, "Please Select", { shouldValidate: true });
          }

          setFormSections((prevSections) => {
            const newSections = [...prevSections];
            const section = newSections[sectionIndex];
            let updated = false;

            section.fields = section.fields.map((f) => {
              if (f.name === childFieldName) {
                updated = true;
                return { ...f, options: newOptions };
              }

              if (
                f.additionalFields &&
                typeof f.additionalFields === "object"
              ) {
                if (Array.isArray(f.additionalFields.Urban)) {
                  f.additionalFields.Urban = f.additionalFields.Urban.map(
                    (af) => {
                      if (af.name === childFieldName) {
                        updated = true;
                        return { ...af, options: newOptions };
                      }
                      return af;
                    },
                  );
                }

                if (Array.isArray(f.additionalFields.Rural)) {
                  f.additionalFields.Rural = f.additionalFields.Rural.map(
                    (af) => {
                      if (af.name === childFieldName) {
                        updated = true;
                        return { ...af, options: newOptions };
                      }
                      return af;
                    },
                  );
                }
              }

              return f;
            });

            if (!updated) {
              console.warn(
                `Child field "${childFieldName}" not found in section.`,
              );
            }

            return newSections;
          });
        } catch (err) {
          console.error(
            `Error fetching options for ${childFieldName} (${tableName}):`,
            err,
          );
        }
      }
    } catch (error) {
      console.error("Error in handleAreaChange:", error);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await axiosInstance.get("/Base/GetBanks");
      if (response.data.status) {
        const banks = response.data.data.map((bank) => ({
          value: bank.id.toString(),
          label: bank.bankName,
        }));
        return [{ label: "Please Select", value: "Please Select" }, ...banks];
      } else {
        throw new Error("Failed to fetch banks");
      }
    } catch (error) {
      console.error("Error fetching banks:", error);
      toast.error("Failed to load bank options. Please try again.");
      return [{ label: "Please Select", value: "Please Select" }];
    }
  };

  const handleBankChange = async (value) => {
    try {
      const response = await axiosInstance.get(
        `/Base/GetBankCode?bankId=${value}`,
      );
      const bankCode = response.data?.bankCode || "";
      setIfscPrefix(bankCode);
      setValue("IfscCode", bankCode, { shouldValidate: true });
    } catch (error) {}
  };

  const processField = (field, formData, initialData) => {
    if (field.type === "enclosure" && field.isDependentEnclosure) {
      const parentValue =
        formData[field.dependentField] || initialData[field.dependentField];
      if (!parentValue || !field.dependentValues.includes(parentValue)) {
        return null;
      }
    }
    const sectionFormData = { label: field.label, name: field.name };
    if (field.type === "enclosure") {
      const selectFieldName = `${field.name}_select`;
      const fileFieldName = `${field.name}_file`;
      if (field.name === "Other") {
        const documents =
          formData[fileFieldName] || initialData[field.name]?.documents || [];
        sectionFormData["Documents"] = Array.isArray(documents)
          ? documents.map((doc) => ({
              type: doc.type || "",
              file: doc.file || null,
            }))
          : [];
      } else {
        sectionFormData["Enclosure"] =
          formData[selectFieldName] !== undefined
            ? formData[selectFieldName]
            : initialData[field.name]?.selected || "";
        sectionFormData["File"] =
          formData[fileFieldName] !== undefined
            ? formData[fileFieldName]
            : initialData[field.name]?.file || null;
      }
    } else if (field.name === "ApplicantImage") {
      sectionFormData["File"] =
        formData[field.name] !== undefined
          ? formData[field.name]
          : initialData[field.name] || null;
    } else {
      sectionFormData["value"] =
        formData[field.name] !== undefined
          ? formData[field.name]
          : initialData[field.name] || "";
    }
    if (field.additionalFields) {
      const selectedValue =
        sectionFormData["value"] || sectionFormData["Enclosure"] || "";
      const additionalFields = field.additionalFields[selectedValue];
      if (additionalFields) {
        sectionFormData.additionalFields = additionalFields
          .map((additionalField) => {
            const nestedFieldName =
              additionalField.name || `${field.name}_${additionalField.id}`;
            return processField(
              { ...additionalField, name: nestedFieldName },
              formData,
              initialData,
            );
          })
          .filter((nestedField) => nestedField !== null);
      }
    }
    return sectionFormData;
  };

  const handleEmailAlertSubmit = () => {
    setEmailAlertModalOpen(false);
    const data = getValues();
    onSubmit(data, "submit");
  };

  const handleEmailAlertCancel = () => {
    setEmailAlertModalOpen(false);
  };
  const aadhaarExists = watch("AadharNumber") !== undefined;

  const onSubmit = async (data, operationType) => {
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    data = getValues();

    if (aadhaarExists && !aadhaarValid && operationType !== "save") {
      alert("Aadhaar Number is not validated.");
      return;
    }

    let emailFieldValue = "";
    formSections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.type === "email") {
          emailFieldValue = getValues(field.name) || "";
        }
      });
    });

    if (
      operationType === "submit" &&
      !emailFieldValue &&
      !emailAlertModalOpen
    ) {
      setEmailAlertModalOpen(true);
      return;
    }

    setLoading(true);
    const groupedFormData = {};
    let returnFieldsArray = [];
    if (additionalDetails != null && additionalDetails !== "") {
      const returnFields = additionalDetails?.returnFields || "";
      returnFieldsArray = JSON.parse(returnFields);
    }

    formSections.forEach((section) => {
      groupedFormData[section.section] = [];
      section.fields.forEach((field) => {
        const sectionData = processField(field, data, initialData || {});
        if (sectionData !== null) {
          if (field.name === "AadharNumber") {
            sectionData.value = operationType === "submit" ? aadhaarNumber : "";
          }
          groupedFormData[section.section].push(sectionData);
        }
      });
    });

    const formdata = new FormData();
    formdata.append("serviceId", selectedServiceId);
    formdata.append("formDetails", JSON.stringify(groupedFormData));

    for (const section in groupedFormData) {
      groupedFormData[section].forEach((field) => {
        if (field.hasOwnProperty("File") && field.File instanceof File) {
          formdata.append(field.name, field.File);
        } else if (
          field.hasOwnProperty("Documents") &&
          Array.isArray(field.Documents)
        ) {
          field.Documents.forEach((doc, index) => {
            if (doc.file instanceof File) {
              formdata.append(`${field.name}_${index}`, doc.file);
            }
          });
        }
        if (field.additionalFields) {
          field.additionalFields.forEach((nestedField) => {
            if (
              nestedField.hasOwnProperty("File") &&
              nestedField.File instanceof File
            ) {
              formdata.append(nestedField.name, nestedField.File);
            }
          });
        }
      });
    }

    formdata.append(
      "status",
      operationType === "submit" ? "Initiated" : "Incomplete",
    );
    formdata.append("referenceNumber", referenceNumber);

    let url = "/User/InsertFormDetails";
    if (additionalDetails != null && additionalDetails !== "") {
      formdata.append("returnFields", JSON.stringify(returnFieldsArray));
      url = "/User/UpdateApplicationDetails";
    }

    try {
      const response = await axiosInstance.post(url, formdata);
      const result = response.data;
      setLoading(false);
      if (result.status) {
        if (result.type === "Submit") {
          navigate("/user/acknowledge", {
            state: { applicationId: result.referenceNumber },
          });
        } else if (result.type === "Edit") {
          setReferenceNumber(result.referenceNumber);
          navigate("/user/initiated");
        } else {
          setReferenceNumber(result.referenceNumber);
          toast.success(
            `Form details have been saved as a draft. ${
              aadhaarExists &&
              "If you don’t submit the form, you will need to re-verify your Aadhaar number when you edit it later"
            }.`,
          );
          if (formRef.current) {
            formRef.current.scrollIntoView({
              behavior: "smooth",
              block: "end",
            });
          }
        }
      } else {
        console.error("Submission failed:", result);
        toast.error("Failed to save form details.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setLoading(false);
      toast.error("An error occurred while saving the form.");
    }

    window.scrollTo(scrollX, scrollY);
  };

  const addDynamicEnclosure = (sectionId) => {
    const newId = `field-${Date.now()}`;
    const newField = {
      id: newId,
      type: "enclosure",
      label: "Other Document",
      name: `CustomDocument_${newId}`,
      minLength: 5,
      maxLength: 50,
      options: [],
      span: 6,
      validationFunctions: ["notEmpty", "validateFile"],
      transformationFunctions: [],
      additionalFields: {},
      accept: ".pdf",
      editable: true,
      dependentOptions: {},
      isDependentEnclosure: false,
      dependentValues: [],
      isConsentCheckbox: false,
      checkboxLayout: "vertical",
      declaration: "",
    };

    setFormSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? { ...section, fields: [...section.fields, newField] }
          : section,
      ),
    );
  };

  const removeDynamicEnclosure = (sectionId, fieldId) => {
    setFormSections((prevSections) =>
      prevSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.filter((field) => field.id !== fieldId),
            }
          : section,
      ),
    );
  };

  const renderField = (field, sectionIndex) => {
    const commonStyles = {
      "& .MuiOutlinedInput-root": {
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        transition: "all 0.3s ease",
        "& fieldset": {
          borderColor: "#A5B4FC",
        },
        "&:hover fieldset": {
          borderColor: "#6366F1",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#6366F1",
          boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)",
        },
        "&.Mui-error fieldset": {
          borderColor: "#F43F5E",
        },
        "&.Mui-disabled": {
          backgroundColor: "#EDE9FE",
        },
      },
      "& .MuiInputLabel-root": {
        color: "#6B7280",
        fontWeight: "500",
        fontSize: "0.9rem",
        "&.Mui-focused": {
          color: "#6366F1",
        },
        "&.Mui-error": {
          color: "#F43F5E",
        },
      },
      "& .MuiInputBase-input": {
        fontSize: "1rem",
        color: "#1F2937",
        padding: "14px 16px",
      },
      "& .MuiFormHelperText-root": {
        color: "#F43F5E",
        fontSize: "0.85rem",
      },
      marginBottom: "1.5rem",
    };

    const buttonStyles = {
      background: "linear-gradient(to right, #10B981, #059669)",
      color: "#FFFFFF",
      fontWeight: "600",
      textTransform: "none",
      borderRadius: "10px",
      padding: "10px 20px",
      "&:hover": {
        background: "linear-gradient(to right, #059669, #047857)",
      },
      "&.Mui-disabled": {
        background: "#D1D5DB",
        color: "#9CA3AF",
      },
      marginBottom: "0.5rem",
    };

    const formatDisplayDate = (dateValue) => {
      if (!dateValue) return "";
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return "";
      }
    };

    const getLabelWithAsteriskJSX = (field) => {
      const isRequired = field.validationFunctions?.includes("notEmpty");
      return (
        <>
          {field.label}
          {isRequired && (
            <span style={{ color: "#F43F5E", fontSize: "1rem" }}> *</span>
          )}
        </>
      );
    };

    switch (field.type) {
      case "text":
      case "email":
      case "date":
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue=""
            rules={{
              validate: async (value) => {
                if (
                  field.name === "AadharNumber" &&
                  (mode === "edit" || mode === "incomplete" || aadhaarValid)
                ) {
                  return true;
                }
                const validationResult = await runValidations(
                  field,
                  value,
                  getValues(),
                  referenceNumber,
                  setValue,
                );
                if (
                  field.name === "IfscCode" &&
                  typeof validationResult === "object" &&
                  validationResult.removeReadonly
                ) {
                  setIsBranchNameReadonly(false);
                } else if (
                  field.name === "IfscCode" &&
                  validationResult === true
                ) {
                  setIsBranchNameReadonly(true);
                }
                return validationResult;
              },
            }}
            render={({ field: { onChange, value, ref } }) => (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {field.type === "date" ? (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label={getLabelWithAsteriskJSX(field)}
                      value={
                        value ? parse(value, "dd/MM/yyyy", new Date()) : null
                      }
                      onChange={(newValue) => {
                        const formatted =
                          newValue instanceof Date && !isNaN(newValue.getTime())
                            ? format(newValue, "dd/MM/yyyy")
                            : "";
                        onChange(formatted);
                        trigger(field.name);
                      }}
                      format="dd/MM/yyyy"
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          margin: "normal",
                          error: Boolean(errors[field.name]),
                          helperText: errors[field.name]?.message || "",
                          inputRef: ref,
                          disabled: isFieldDisabled(field.name),
                          InputLabelProps: {
                            shrink: true,
                            style: { fontSize: "1rem", color: "#000000" },
                          },
                          placeholder: "dd MMM yyyy",
                          sx: commonStyles,
                          onBlur: () => trigger(field.name), // ← BLUR TRIGGER
                        },
                      }}
                    />
                  </LocalizationProvider>
                ) : (
                  <Box sx={{ width: "100%" }}>
                    <TextField
                      type={field.type}
                      id={`${field.id}`}
                      label={getLabelWithAsteriskJSX(field)}
                      value={value || ""}
                      onKeyDown={(e) => {
                        isBackspacePressed.current = e.key === "Backspace";
                      }}
                      placeholder={
                        field.name === "OtherDocument" ? "File1, File2,..." : ""
                      }
                      onChange={(e) => {
                        let val = e.target.value;
                        const fieldName = field.name;
                        let transformedVal = val;

                        if (fieldName === "IfscCode" && ifscPrefix) {
                          if (!val.startsWith(ifscPrefix)) {
                            val = ifscPrefix + val.slice(ifscPrefix.length);
                          }
                          if (val.length > 11) {
                            val = val.slice(0, 11);
                          }
                          transformedVal = val;
                        }

                        if (fieldName === "AadharNumber") {
                          setAadhaarValid(false);
                          const lastChar = val
                            .toString()
                            .charAt(val.length - 1);
                          let updatedAadhaar;
                          if (isBackspacePressed.current) {
                            updatedAadhaar = aadhaarNumber.slice(0, -1);
                          } else {
                            updatedAadhaar = aadhaarNumber + lastChar;
                          }
                          setAadhaarNumber(updatedAadhaar);
                          transformedVal = updatedAadhaar;
                          val = updatedAadhaar;
                        }

                        if (field.transformationFunctions?.length > 0) {
                          field.transformationFunctions.forEach((fnName) => {
                            const transformFn =
                              TransformationFunctionsList[fnName];
                            if (transformFn) {
                              transformedVal = transformFn(
                                transformedVal,
                                val,
                                getValues(),
                                setValue,
                              );
                            }
                          });
                        }

                        onChange(transformedVal);
                      }}
                      onBlur={() => trigger(field.name)} // ← BLUR TRIGGER
                      inputRef={ref}
                      disabled={isFieldDisabled(field.name)}
                      error={Boolean(errors[field.name])}
                      helperText={
                        typeof errors[field.name]?.message === "string"
                          ? errors[field.name]?.message
                          : errors[field.name]?.message?.message || ""
                      }
                      fullWidth
                      margin="normal"
                      InputLabelProps={{
                        shrink: true,
                        style: { fontSize: "1rem", color: "#000000" },
                      }}
                      inputProps={{
                        maxLength: (() => {
                          if (
                            typeof field.maxLength === "object" &&
                            field.maxLength.dependentOn
                          ) {
                            const dependentValue =
                              getValues()[field.maxLength.dependentOn];
                            return field.maxLength[dependentValue] ?? undefined;
                          }
                          return field.maxLength;
                        })(),
                        readOnly:
                          field.name === "BranchName" && isBranchNameReadonly,
                      }}
                      sx={commonStyles}
                    />
                    {field.name == "AadharNumber" && (
                      <Typography
                        variant="subtitle1"
                        sx={{ fontSize: 12, mt: 0.5, display: "block" }}
                      >
                        Dummy Addhaar Number:123456789012 Dummy OTP: 1234567{" "}
                      </Typography>
                    )}
                  </Box>
                )}

                {field.name === "AadharNumber" && aadhaarValid ? (
                  <Typography
                    variant="subtitle2"
                    color="success"
                    fontWeight="bold"
                    sx={{ display: "flex" }}
                  >
                    Verified <CheckCircle />
                  </Typography>
                ) : (
                  ""
                )}
                {field.name === "AadharNumber" &&
                  value.length !== 0 &&
                  !aadhaarValid &&
                  !Boolean(errors[field.name]) && (
                    <Button
                      sx={{
                        background:
                          "linear-gradient(to right, #10B981, #059669)",
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        paddingRight: 2,
                        paddingLeft: 2,
                        borderRadius: 5,
                      }}
                      onClick={handleAaddhaarNumber}
                    >
                      Validate
                    </Button>
                  )}
              </Box>
            )}
          />
        );

      case "checkbox":
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={
              field.isConsentCheckbox
                ? false
                : field.options?.length > 0
                ? []
                : ""
            }
            rules={{
              validate: async (value) => {
                if (field.required) {
                  if (field.isConsentCheckbox) {
                    return true;
                  } else if (Array.isArray(value)) {
                    if (!value || value.length === 0) {
                      return "At least one option must be selected";
                    }
                  } else if (!value) {
                    return "This field is required";
                  }
                }
                return await runValidations(
                  field,
                  value,
                  getValues(),
                  referenceNumber,
                );
              },
            }}
            render={({ field: { onChange, value, ref } }) => (
              <FormControl
                component="fieldset"
                fullWidth
                margin="normal"
                error={Boolean(errors[field.name])}
                disabled={isFieldDisabled(field.name)}
              >
                {field.isConsentCheckbox ? (
                  <Box display="flex" alignItems="flex-start">
                    <Checkbox
                      checked={!!value}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        onChange(checked);
                        if (
                          field.transformationFunctions?.includes(
                            "handleCopyAddress",
                          )
                        ) {
                          handleCopyAddress(checked, sectionIndex);
                        }
                      }}
                      onBlur={() => trigger(field.name)} // ← BLUR TRIGGER
                      inputRef={ref}
                      disabled={isFieldDisabled(field.name)}
                      sx={{ paddingTop: 0, paddingBottom: 0 }}
                    />
                    {field.declaration && (
                      <Typography
                        variant="body2"
                        sx={{
                          marginLeft: "0.5rem",
                          color: "#555",
                        }}
                      >
                        {field.declaration}
                        {field.required && (
                          <span style={{ color: "red" }}> *</span>
                        )}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <FormGroup
                    row={field.checkboxLayout === "horizontal"}
                    sx={commonStyles}
                  >
                    {field.options?.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        control={
                          <Checkbox
                            checked={
                              Array.isArray(value)
                                ? value.includes(option.value)
                                : value === option.value
                            }
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (Array.isArray(value)) {
                                const newValue = checked
                                  ? [...value, option.value]
                                  : value.filter((val) => val !== option.value);
                                onChange(newValue);
                              } else {
                                onChange(checked ? option.value : "");
                              }
                              trigger(field.name); // ← VALIDATE ON CHANGE
                            }}
                            onBlur={() => trigger(field.name)} // ← BLUR TRIGGER
                            inputRef={ref}
                            disabled={isFieldDisabled(field.name)}
                          />
                        }
                        label={
                          <span>
                            {option.label}
                            {field.required && (
                              <span style={{ color: "red" }}> *</span>
                            )}
                          </span>
                        }
                      />
                    ))}
                  </FormGroup>
                )}
                {errors[field.name] && (
                  <FormHelperText>{errors[field.name]?.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />
        );

      case "file":
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={null}
            rules={{
              validate: async (value) => await runValidations(field, value),
            }}
            render={({ field: { onChange, ref } }) => (
              <FormControl
                fullWidth
                margin="normal"
                error={Boolean(errors[field.name])}
                sx={commonStyles}
              >
                <Button
                  variant="contained"
                  component="label"
                  disabled={isFieldDisabled(field.name)}
                  sx={buttonStyles}
                  onBlur={() => trigger(field.name)} // ← BLUR TRIGGER
                >
                  {getLabelWithAsteriskJSX(field)}
                  <input
                    type="file"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files[0];
                      onChange(file);
                      trigger(field.name); // ← VALIDATE ON CHANGE
                    }}
                    ref={ref}
                    accept={field.accept}
                  />
                </Button>
                <Typography sx={{ fontSize: "0.85rem", color: "#6B7280" }}>
                  Accepted File Types: {field.accept} Size: 20kb-50kb
                </Typography>
                <FormHelperText sx={{ color: "#F43F5E" }}>
                  {errors[field.name]?.message || ""}
                </FormHelperText>
              </FormControl>
            )}
          />
        );

      case "select":
        return (
          <Controller
            name={field.name}
            control={control}
            defaultValue={field.options[0]?.value || "Please Select"}
            rules={{
              validate: async (value) =>
                await runValidations(field, value, getValues()),
            }}
            render={({ field: { onChange, value, ref } }) => {
              let options = [];
              if (field.dependentOn && field.dependentOn != "") {
                const parentValue = watch(field.dependentOn);
                options =
                  field.dependentOptions && field.dependentOptions[parentValue]
                    ? field.dependentOptions[parentValue]
                    : field.options || [];
              } else {
                options = field.options || [];
              }
              if (
                value &&
                !options.some(
                  (opt) => opt.value.toString() === value.toString(),
                )
              ) {
                options = [...options, { value, label: value.toString() }];
              }

              return (
                <>
                  <FormControl fullWidth>
                    <Autocomplete
                      fullWidth
                      options={options}
                      value={options.find((opt) => opt.value === value) || null}
                      getOptionLabel={(option) => option.label || ""}
                      onChange={(event, newOption) => {
                        const newValue = newOption?.value || "";
                        onChange({ target: { value: newValue } });
                        trigger(field.name); // ← VALIDATE ON CHANGE

                        if (
                          /district|muncipality|block|halqapanchayat/i.test(
                            field.name,
                          )
                        ) {
                          handleAreaChange(sectionIndex, field, newValue);
                        }
                        if (field.name === "BankName") {
                          handleBankChange(newValue);
                        }

                        if (field.additionalFields) {
                          Object.entries(field.additionalFields).forEach(
                            ([key, additionalFields]) => {
                              if (key !== newValue) {
                                additionalFields.forEach((additionalField) => {
                                  const nestedFieldName =
                                    additionalField.name ||
                                    `${field.name}_${additionalField.id}`;
                                  unregister(nestedFieldName, {
                                    keepValue: false,
                                  });
                                });
                              }
                            },
                          );
                        }
                      }}
                      onBlur={() => trigger(field.name)} // ← BLUR TRIGGER
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          label={getLabelWithAsteriskJSX(field)}
                          error={Boolean(errors[field.name])}
                          helperText={errors[field.name]?.message || ""}
                          InputLabelProps={{
                            shrink: true,
                            style: { fontSize: "1.2rem", color: "#000000" },
                          }}
                          inputRef={ref}
                          sx={commonStyles}
                          disabled={isFieldDisabled(field.name)}
                        />
                      )}
                      disableClearable
                    />
                  </FormControl>

                  {field.additionalFields &&
                    field.additionalFields[value] &&
                    field.additionalFields[value].map((additionalField) => {
                      const nestedFieldName =
                        additionalField.name ||
                        `${field.name}_${additionalField.id}`;
                      return (
                        <Col
                          xs={12}
                          lg={additionalField.span}
                          key={additionalField.id}
                        >
                          {renderField(
                            {
                              ...additionalField,
                              name: nestedFieldName,
                            },
                            sectionIndex,
                          )}
                        </Col>
                      );
                    })}
                </>
              );
            }}
          />
        );

      case "enclosure":
        const isDependent = field.isDependentEnclosure;
        const parentValue = isDependent ? watch(field.dependentField) : null;
        if (
          isDependent &&
          (!parentValue || !field.dependentValues.includes(parentValue))
        ) {
          return null;
        }

        const selectFieldName = `${field.name}_select`;
        const fileFieldName = `${field.name}_file`;
        const isDynamic = !field.options || field.options.length === 0;
        const isDisabled = isFieldDisabled(field.name);

        return (
          <Box sx={{ width: "100%", mb: 2, position: "relative" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="subtitle1">{field.label}</Typography>
              {isDynamic && field.id.includes("field-") && (
                <IconButton
                  size="small"
                  onClick={() => {
                    removeDynamicEnclosure(`section-${sectionIndex}`, field.id);
                    unregister(selectFieldName);
                    unregister(fileFieldName);
                  }}
                  sx={{
                    color: "#F43F5E",
                    "&:hover": { color: "#E11D48" },
                    p: 0.5,
                  }}
                  disabled={isDisabled}
                  title="Remove Document"
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>

            {isDynamic ? (
              <Controller
                name={selectFieldName}
                control={control}
                defaultValue={initialData?.[field.name]?.selected || ""}
                rules={{ required: "Enclosure name is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Enclosure Name"
                    fullWidth
                    margin="normal"
                    error={Boolean(errors[selectFieldName])}
                    helperText={errors[selectFieldName]?.message}
                    sx={commonStyles}
                    disabled={isDisabled}
                    onBlur={() => trigger(selectFieldName)} // ← BLUR TRIGGER
                  />
                )}
              />
            ) : (
              <Controller
                name={selectFieldName}
                control={control}
                defaultValue={initialData?.[field.name]?.selected || ""}
                rules={{
                  validate: async (value) =>
                    field.required && !value ? "Please select an option" : true,
                }}
                render={({ field: { onChange, value } }) => (
                  <TextField
                    select
                    label={getLabelWithAsteriskJSX(field)}
                    value={value || ""}
                    onChange={(e) => {
                      onChange(e.target.value);
                      setValue(fileFieldName, null, { shouldValidate: true });
                      trigger(selectFieldName); // ← VALIDATE ON CHANGE
                    }}
                    onBlur={() => trigger(selectFieldName)} // ← BLUR TRIGGER
                    disabled={isDisabled}
                    error={Boolean(errors[selectFieldName])}
                    helperText={errors[selectFieldName]?.message || ""}
                    fullWidth
                    margin="normal"
                    SelectProps={{ native: true }}
                    sx={{ mb: 2, ...commonStyles }}
                  >
                    {field.options.map((option) => (
                      <option
                        key={option.id || option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </TextField>
                )}
              />
            )}

            <Controller
              name={fileFieldName}
              control={control}
              defaultValue={initialData?.[field.name]?.file || null}
              rules={{
                validate: async (value) => {
                  const selectValue = getValues(selectFieldName);
                  if (field.required && !value && selectValue) {
                    return "Please upload a file";
                  }
                  if (value instanceof File) {
                    if (value.size > 200000) {
                      return "File must be under 200KB";
                    }
                    const extension = `.${value.name
                      .split(".")
                      .pop()
                      .toLowerCase()}`;
                    if (!field.accept.split(",").includes(extension)) {
                      return `Invalid file type. Accepted types: ${field.accept}`;
                    }
                  }
                  return await runValidations(
                    field,
                    value,
                    getValues(),
                    referenceNumber,
                  );
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Box>
                  {value && (
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      sx={{ mb: 1 }}
                    >
                      <FormHelperText
                        sx={{
                          cursor: "pointer",
                          color: "#6366F1",
                          textDecoration: "underline",
                          fontSize: "0.9rem",
                          "&:hover": { color: "#4F46E5" },
                        }}
                        onClick={() => {
                          const fileURL =
                            value instanceof File
                              ? URL.createObjectURL(value)
                              : value;
                          window.open(fileURL, "_blank");
                        }}
                      >
                        {value instanceof File ? value.name : "View file"}
                      </FormHelperText>
                      <IconButton
                        size="small"
                        onClick={() => onChange(null)}
                        sx={{
                          color: "#F43F5E",
                          "&:hover": { color: "#E11D48" },
                          p: 0.5,
                        }}
                        disabled={isDisabled}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    component="label"
                    sx={{
                      width: "100%",
                      borderRadius: "12px",
                      ...buttonStyles,
                    }}
                    disabled={isDisabled || !getValues(selectFieldName)}
                    onBlur={() => trigger(fileFieldName)} // ← BLUR TRIGGER
                  >
                    Upload File
                    <input
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files[0];
                        onChange(file);
                        trigger(fileFieldName); // ← VALIDATE ON CHANGE
                      }}
                      accept={field.accept || ".pdf"}
                    />
                  </Button>
                  <FormHelperText sx={{ color: "#F43F5E" }}>
                    {errors[fileFieldName]?.message || ""}
                  </FormHelperText>
                  <Typography sx={{ fontSize: "0.85rem", color: "#6B7280" }}>
                    Accepted File Types: {field.accept || ".pdf"} Size:
                    100kb-200kb
                  </Typography>
                </Box>
              )}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading)
    return (
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          bgcolor: "#f8f9fa",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );

  return (
    <Box
      sx={{
        maxWidth: "90%",
        margin: "2rem auto",
        background:
          "linear-gradient(to bottom right, #f4f9ff 0%, #f9f3ec 100%)",
        borderRadius: "16px",
        padding: { xs: "1.5rem", md: "3rem" },
        minHeight: "100vh",
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          width: "8px",
          backgroundColor: "#E0F2FE",
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#38BDF8",
          borderRadius: "4px",
        },
      }}
    >
      <Grid container spacing={3} alignItems="stretch">
        <Grid size={{ xs: 12 }}>
          <form
            onSubmit={handleSubmit((data) => onSubmit(data, "submit"))}
            autoComplete="off"
          >
            <Grid container spacing={3} alignItems="stretch">
              {formSections.map((section, index) => {
                const isFullRow =
                  section.section === "Applicant Details" ||
                  section.section === "Declearation" ||
                  selectedServiceId != 1;

                return (
                  <Grid
                    size={{ xs: 12, md: isFullRow ? 12 : 6 }}
                    key={section.id}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        padding: "2rem",
                        borderRadius: "12px",
                        background:
                          "linear-gradient(to bottom, #FFFFFF, #F0FDFA)",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          boxShadow: "0 4px 15px rgba(20, 184, 166, 0.3)",
                        },
                      }}
                    >
                      {/* Section Header */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mb: "1.5rem",
                        }}
                      >
                        {sectionIconMap[section.section] || (
                          <HelpOutlineIcon
                            sx={{ fontSize: 36, color: "#14B8A6" }}
                          />
                        )}
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "600",
                            color: "#1F2937",
                            fontSize: "1.5rem",
                          }}
                        >
                          {section.section}
                        </Typography>
                      </Box>

                      <Divider sx={{ mb: "1.5rem", borderColor: "#A5B4FC" }} />

                      {/* Applicant Image */}
                      {section.section === "Applicant Details" && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            mb: "1.5rem",
                          }}
                        >
                          <Box
                            component="img"
                            src={applicantImagePreview}
                            alt="Applicant Image"
                            sx={{
                              width: 180,
                              height: 180,
                              borderRadius: "50%",
                              objectFit: "cover",
                              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                              border: "3px solid #A5B4FC",
                            }}
                          />
                        </Box>
                      )}

                      {/* File Type Info */}
                      {section.section === "Documents" && (
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            textAlign: "center",
                            color: "#4B5563",
                            mb: "1rem",
                          }}
                        >
                          Accepted File Type: .pdf, Size: 100Kb-200Kb
                        </Typography>
                      )}

                      {/* Fields */}
                      <Grid container spacing={2}>
                        {section.fields.map((field) => {
                          const element = renderField(field, index);
                          if (element != null) {
                            return (
                              <Grid
                                size={{ xs: 12, lg: field.span }}
                                key={field.id}
                              >
                                {element}
                              </Grid>
                            );
                          }
                          return null;
                        })}
                      </Grid>

                      {/* Add Document button ONLY for Documents section */}
                      {section.section === "Documents" && mode != "edit" && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "flex-start",
                            mt: 2,
                          }}
                        >
                          <Button
                            variant="outlined"
                            onClick={() => addDynamicEnclosure(section.id)}
                          >
                            Add Document
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                );
              })}

              {/* Sticky Footer inside the form */}
              <Grid size={{ xs: 12, lg: 12 }}>
                <Box
                  sx={{
                    position: "sticky",
                    bottom: 0,
                    backgroundColor: "#FFF",
                    padding: "1.5rem",
                    borderTop: "1px solid #A5B4FC",
                    boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)",
                    display: "flex",
                    justifyContent: "center",
                    gap: 3,
                    zIndex: 1000,
                  }}
                >
                  {mode !== "edit" && (
                    <Button
                      sx={{
                        background:
                          "linear-gradient(to bottom right, #E4630A, #F9A825)",
                        color: "#FFFFFF",
                        fontSize: { xs: "0.9rem", md: "1rem" },
                        fontWeight: "600",
                        padding: "0.75rem 2.5rem",
                        borderRadius: "10px",
                        textTransform: "none",
                        "&:hover": {
                          background:
                            "linear-gradient(to bottom right, #E4630A, #F9A825)",
                        },
                        "&.Mui-disabled": {
                          background: "#D1D5DB",
                          color: "#9CA3AF",
                        },
                      }}
                      disabled={buttonLoading || loading}
                      onClick={(data) => onSubmit(data, "save")}
                    >
                      Save as Draft{buttonLoading ? "..." : ""}
                    </Button>
                  )}
                  <Button
                    type="submit" // ✅ use form submit here
                    sx={{
                      background:
                        "linear-gradient(to bottom right, #4CAF50, #81C784)",
                      color: "#FFFFFF",
                      fontSize: { xs: "0.9rem", md: "1rem" },
                      fontWeight: "600",
                      padding: "0.75rem 2.5rem",
                      borderRadius: "10px",
                      textTransform: "none",
                      "&:hover": {
                        background:
                          "linear-gradient(to bottom right, #4CAF50, #81C784)",
                      },
                      "&.Mui-disabled": {
                        background: "#D1D5DB",
                        color: "#9CA3AF",
                      },
                    }}
                    disabled={buttonLoading || loading}
                  >
                    Submit{buttonLoading ? "..." : ""}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Grid>
      </Grid>

      <MessageModal
        open={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        title="Error"
        message="Some fields are not filled or are incorrectly filed. Please correctly fill all fields."
        type="error" // can be: "error", "success", "warning", "info"
      />

      <MessageModal
        open={emailAlertModalOpen}
        title="Email Required"
        message="Documents like Acknowledgement and Sanction Letters are sent via email. Please provide an email address to proceed."
        primaryButton={{
          text: "Submit",
          action: handleEmailAlertSubmit,
        }}
        secondaryButton={{
          text: "Cancel",
          action: handleEmailAlertCancel,
        }}
        onClose={handleEmailAlertCancel}
      />

      {otpModal && (
        <OtpModal
          open={otpModal}
          onClose={() => {
            setOtpModal(false);
          }}
          onSubmit={handleOtpSubmit}
          registeredAt="Mobile Number"
        />
      )}

      <ToastContainer />
    </Box>
  );
};

export default DynamicScrollableForm;
