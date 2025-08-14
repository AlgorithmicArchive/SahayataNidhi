import React, { useState, useEffect, useRef } from "react";
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
import { CheckCircle } from "@mui/icons-material";

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
    formState: { errors, dirtyFields },
  } = useForm({
    mode: "onChange",
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
  const applicantImageFile = watch("ApplicantImage");
  const [applicantImagePreview, setApplicantImagePreview] = useState(
    "/assets/images/profile.jpg",
  );
  const [aadhaarValid, setAadhaarValid] = useState(false);
  const [otpModal, setOtpModal] = useState(false);

  const [DependableFields, setDependableFields] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const hasRunRef = useRef(false);
  const watchedDependableValues = useWatch({ control, name: DependableFields });
  const isBackspacePressed = useRef(false);

  // Effect to manage non-rendered fields
  useEffect(() => {
    if (!formSections.length) return;

    const formData = getValues();
    const renderedFields = collectRenderedFields(formSections, formData);
    const allPossibleFields = new Set();

    // Collect all possible fields to identify non-rendered ones
    formSections.forEach((section) => {
      section.fields.forEach((field) => {
        allPossibleFields.add(field.name);
        if (field.type === "enclosure") {
          allPossibleFields.add(`${field.name}_select`);
          allPossibleFields.add(`${field.name}_file`);
        }
        if (field.additionalFields) {
          Object.values(field.additionalFields)
            .flat()
            .forEach((af) => {
              const nestedFieldName = af.name || `${field.name}_${af.id}`;
              allPossibleFields.add(nestedFieldName);
              if (af.type === "enclosure") {
                allPossibleFields.add(`${nestedFieldName}_select`);
                allPossibleFields.add(`${nestedFieldName}_file`);
              }
              if (af.additionalFields) {
                Object.values(af.additionalFields)
                  .flat()
                  .forEach((nestedAf) => {
                    const nestedNestedFieldName =
                      nestedAf.name || `${nestedFieldName}_${nestedAf.id}`;
                    allPossibleFields.add(nestedNestedFieldName);
                    if (nestedAf.type === "enclosure") {
                      allPossibleFields.add(`${nestedNestedFieldName}_select`);
                      allPossibleFields.add(`${nestedNestedFieldName}_file`);
                    }
                  });
              }
            });
        }
      });
    });

    // Clear non-rendered fields
    Array.from(allPossibleFields).forEach((fieldName) => {
      if (!renderedFields.includes(fieldName)) {
        setValue(fieldName, null, { shouldValidate: false });
        unregister(fieldName, { keepValue: false });
      }
    });
  }, [
    formSections,
    watch,
    getValues,
    setValue,
    unregister,
    JSON.stringify(watchedDependableValues),
  ]);

  // Watch for changes in dependent fields and update dependent selects and dependent enclosures accordingly
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
          const options = field.dependentOptions[parentValue] || [];
          const currentValue = getValues(field.name);

          if (options.length > 0) {
            // If current value is not in options, reset to first available
            setValue(field.name, options[1]?.value || "", {
              shouldValidate: true,
            });
          } else if (currentValue) {
            // If no options and value is set, clear it
            setValue(field.name, "", { shouldValidate: true });
          }
        }

        // Handle additionalFields recursively if needed
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
            setValue(selectFieldName, "", { shouldValidate: true });
            setValue(fileFieldName, null, { shouldValidate: true });
            return;
          } else if (
            initialData[field.name] &&
            (getValues(selectFieldName) == null ||
              getValues(fileFieldName) == null)
          ) {
            setValue(selectFieldName, initialData[field.name].selected || "", {
              shouldValidate: true,
            });
            setValue(fileFieldName, initialData[field.name].file || null, {
              shouldValidate: true,
            });
          }
        }
      });
    });
  }, [
    formSections,
    getValues,
    setValue,
    JSON.stringify(watchedDependableValues),
  ]);

  function isDocumentInData(fieldName, flatDetails) {
    return Object.keys(flatDetails).includes(fieldName);
  }

  // Only includes fields if their name is in returnFields (and their additionalFields)
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
      // setDependableFields(dependableFields);
      return !DependableFields.includes(fieldName);
    }
    return false;
  };

  const setDefaultFile = async (path) => {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const fileName = path.split("/").pop();
      const file = new File([blob], fileName, { type: blob.type });
      setValue("ApplicantImage", file, { shouldValidate: true });
      setApplicantImagePreview(URL.createObjectURL(file));
    } catch (error) {
      console.error("Error setting default file:", error);
      setApplicantImagePreview("/assets/images/profile.jpg"); // Fallback to default
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
      // Fetch the image from the URL and convert it to a File object
      setDefaultFile(initialData.ApplicantImage);
    } else {
      const flatDetails = flattenFormDetails(data);
      setDefaultFile(flatDetails.ApplicantImage);
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
            setFormSections(sanitizeFormSections(config));
          } catch (err) {
            console.error("Error parsing formElements:", err);
            setFormSections([]);
          }
        }
        if ((mode === "incomplete" || mode === "edit") && referenceNumber) {
          const { formDetails, additionalDetails } = await fetchFormDetails(
            referenceNumber,
          );

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
                acc[`${key}_select`] = flatDetails[key].selected;
                acc[`${key}_file`] = flatDetails[key].file;
                // Set OtherDocument from Other enclosure's selected value
                if (key === "Other") {
                  acc["OtherDocument"] = flatDetails[key].selected || "";
                }
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
          setAdditionalDetails(additionalDetails);
        } else if (data !== null && data !== undefined) {
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
                // Set OtherDocument from Other enclosure's selected value
                if (key === "Other") {
                  acc["OtherDocument"] = flatDetails[key].selected || "";
                }
              }
              return acc;
            }, {}),
          };
          setInitialData(flatDetails);
          // setAreas(data);
          reset(resetData);
        }

        if (data != null) {
          Object.keys(data).forEach((key, sectionIndex) => {
            data[key].map((item, index) => {
              if (item.name.toLowerCase().includes("district")) {
                handleAreaChange(sectionIndex, { name: item.name }, item.value);
              }
              setValue(item.name, item.value);
              if (item.additionalFields) {
                let fieldsArray = [];

                if (Array.isArray(item.additionalFields)) {
                  // Case 1: single array of objects
                  fieldsArray = item.additionalFields;
                } else if (
                  typeof item.additionalFields === "object" &&
                  !Array.isArray(item.additionalFields)
                ) {
                  // Case 2: object whose values are arrays of objects
                  Object.values(item.additionalFields).forEach((arr) => {
                    if (Array.isArray(arr)) {
                      fieldsArray.push(...arr);
                    }
                  });
                }

                // Deduplicate based on name + value
                const uniqueFields = [];
                const seen = new Set();

                fieldsArray.forEach((field) => {
                  const key = `${field.name}::${field.value}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    uniqueFields.push(field);
                  }
                });

                // Process fields
                uniqueFields.forEach((field) => {
                  if (
                    field.name.toLowerCase().includes("district") ||
                    field.name.toLowerCase().includes("muncipality") // Keep original spelling
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
        // Find the corresponding section in initialData
        const sectionData = initialData[sectionName] || [];
        // Find the field in initialData by name
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
        // Set the field value if it exists
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
      // Map section.section to initialData keys (e.g., "Present Address Details")
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

  // Watch dependent field values and log changes
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

        // Handle additionalFields recursively if needed
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
      // Clear all fields in Permanent Address section
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

    // Find address type fields dynamically
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

    // Copy address type
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

    // Get additional fields for the selected address type
    const presentAdditionalFields =
      presentTypeField.additionalFields?.[presentAddressType] || [];
    const permanentAdditionalFields =
      permanentTypeField.additionalFields?.[permanentAddressType] || [];

    // Clear permanent additional fields
    permanentAdditionalFields.forEach((field) => {
      setValue(field.name, "", { shouldValidate: false });
    });

    // Map and copy fields dynamically
    for (const presentField of [
      ...presentSection.fields.filter((f) => f.name !== presentTypeField.name), // Non-type fields
      ...presentAdditionalFields, // Additional fields for address type
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

      // Trigger area change for relevant fields (e.g., District, Municipality, etc.)
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

    // Validate all fields
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

  const collectNestedFields = (field, formData) => {
    const fields = [];
    if (field.type === "enclosure") {
      fields.push(`${field.name}_select`, `${field.name}_file`);
    } else if (field.type === "select" && field.additionalFields) {
      const sel = formData[field.name] || "";
      const extra = field.additionalFields[sel] || [];
      fields.push(field.name);
      extra.forEach((af) => {
        const nestedFieldName = af.name || `${field.name}_${af.id}`;
        fields.push(nestedFieldName);
        // Recursively collect nested fields of nested fields
        if (af.type === "select" && af.additionalFields) {
          const nestedSel = formData[nestedFieldName] || "";
          const nestedExtra = af.additionalFields[nestedSel] || [];
          nestedExtra.forEach((nestedAf) => {
            const nestedNestedFieldName =
              nestedAf.name || `${nestedFieldName}_${nestedAf.id}`;
            fields.push(nestedNestedFieldName);
          });
        }
      });
    } else {
      fields.push(field.name);
    }
    return fields;
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

      // Mask first 8 digits with 'X'
      const maskedAadhaar = aadhaarNumber.replace(/\d/g, (digit, index) => {
        return index < 8 ? "X" : digit;
      });

      // Update form value with masked Aadhaar
      setValue("AadharNumber", maskedAadhaar);

      // Store the secure Aadhaar token in state
      setAadhaarNumber(result.aadhaarToken);

      toast.success("Aadhaar Number Validated.");
    }
  };

  const handleAreaChange = async (sectionIndex, field, value) => {
    try {
      // 🧠 Determine AddressType based on field name
      let addressTypeKey = "";
      if (field.name.startsWith("Present")) {
        addressTypeKey = "PresentAddressType";
      } else if (field.name.startsWith("Permanent")) {
        addressTypeKey = "PermanentAddressType";
      }

      const AddressType = getValues(addressTypeKey); // 'Urban' or 'Rural'

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

      // Normalize to arrays
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

      // Loop through each child/table pair
      for (let i = 0; i < childFieldNames.length; i++) {
        const childFieldName = childFieldNames[i];
        const tableName = tableNames[i];

        try {
          const response = await axiosInstance.get(
            `/Base/GetAreaList?table=${tableName}&parentId=${value}`,
          );
          const areaList = response.data?.data || [];

          // Deduplicate options based on value
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

          // Check if current value is in newOptions, reset to "Please Select" if not
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
              // Check top-level fields
              if (f.name === childFieldName) {
                updated = true;
                return { ...f, options: newOptions };
              }

              // Check nested fields in additionalFields for Urban and Rural
              if (
                f.additionalFields &&
                typeof f.additionalFields === "object"
              ) {
                // Handle Urban fields
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

                // Handle Rural fields
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

  const onSubmit = async (data, operationType) => {
    if (!aadhaarValid && operationType != "save") {
      alert("Aadhaar Number is not validated.");
      return;
    }
    const groupedFormData = {};
    setLoading(true);

    let returnFieldsArray = [];
    if (additionalDetails != null && additionalDetails !== "") {
      const returnFields = additionalDetails?.returnFields || "";
      returnFieldsArray = JSON.parse(returnFields);
    }

    const processField = (field, formData, initialData) => {
      if (field.type === "enclosure" && field.isDependentEnclosure) {
        const parentValue =
          formData[field.dependentField] || initialData[field.dependentField];
        if (!parentValue || !field.dependentValues.includes(parentValue)) {
          return null;
        }
      }

      const sectionFormData = {};
      // Use formData if available, otherwise fall back to initialData
      const fieldValue =
        field.name === "AadharNumber"
          ? aadhaarNumber
          : formData[field.name] !== undefined
          ? formData[field.name]
          : initialData[field.name] || "";

      sectionFormData["label"] = field.label;
      sectionFormData["name"] = field.name;

      if (field.type === "enclosure") {
        const selectFieldName = `${field.name}_select`;
        const fileFieldName = `${field.name}_file`;
        sectionFormData["Enclosure"] =
          formData[selectFieldName] !== undefined
            ? formData[selectFieldName]
            : initialData[field.name]?.selected || "";
        sectionFormData["File"] =
          formData[fileFieldName] !== undefined
            ? formData[fileFieldName]
            : initialData[field.name]?.file || null;
      } else if (field.name === "ApplicantImage") {
        sectionFormData["File"] = fieldValue;
      } else {
        sectionFormData["value"] = fieldValue;
      }

      if (
        field.type === "enclosure" &&
        field.name === "Other" &&
        formData["OtherDocument"] &&
        formData[`${field.name}_file`]
      ) {
        sectionFormData["Enclosure"] = formData["OtherDocument"];
      }

      if (field.additionalFields) {
        const selectedValue = fieldValue || "";
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

    formSections.forEach((section) => {
      groupedFormData[section.section] = [];
      section.fields.forEach((field) => {
        const sectionData = processField(field, data, initialData || {});
        if (sectionData !== null) {
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
          toast.success("Form Details Saved as Draft.");
        }
      } else {
        console.error("Submission failed:", result);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setLoading(false);
    }
  };

  const renderField = (field, sectionIndex) => {
    const commonStyles = {
      "& .MuiOutlinedInput-root": {
        backgroundColor: "#FFFFFF",
        borderRadius: "12px",
        transition: "all 0.3s ease",
        "& fieldset": {
          borderColor: "#A5B4FC", // Indigo-200
        },
        "&:hover fieldset": {
          borderColor: "#6366F1", // Indigo-500
        },
        "&.Mui-focused fieldset": {
          borderColor: "#6366F1", // Indigo-500
          boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)",
        },
        "&.Mui-error fieldset": {
          borderColor: "#F43F5E", // Rose-500
        },
        "&.Mui-disabled": {
          backgroundColor: "#EDE9FE", // Indigo-50
        },
      },
      "& .MuiInputLabel-root": {
        color: "#6B7280", // Gray-500
        fontWeight: "500",
        fontSize: "0.9rem",
        "&.Mui-focused": {
          color: "#6366F1", // Indigo-500
        },
        "&.Mui-error": {
          color: "#F43F5E", // Rose-500
        },
      },
      "& .MuiInputBase-input": {
        fontSize: "1rem",
        color: "#1F2937", // Gray-900
        padding: "14px 16px",
      },
      "& .MuiFormHelperText-root": {
        color: "#F43F5E", // Rose-500
        fontSize: "0.85rem",
      },
      marginBottom: "1.5rem",
    };

    const buttonStyles = {
      background: "linear-gradient(to right, #10B981, #059669)", // Green-500 to Green-600
      color: "#FFFFFF",
      fontWeight: "600",
      textTransform: "none",
      borderRadius: "10px",
      padding: "10px 20px",
      "&:hover": {
        background: "linear-gradient(to right, #059669, #047857)", // Green-600 to Green-700
      },
      "&.Mui-disabled": {
        background: "#D1D5DB", // Gray-300
        color: "#9CA3AF", // Gray-400
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
            <span style={{ color: "#F43F5E", fontSize: "1rem" }}> *</span> // Rose-500
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
              validate: async (value) =>
                await runValidations(
                  field,
                  value,
                  getValues(),
                  referenceNumber,
                ),
            }}
            render={({ field: { onChange, value, ref } }) => (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <TextField
                  type={field.type}
                  id={`field-${field.id}`}
                  label={getLabelWithAsteriskJSX(field)}
                  value={value || ""}
                  onKeyDown={(e) => {
                    isBackspacePressed.current = e.key === "Backspace";
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    const fieldName = field.name;
                    let transformedVal = val;

                    // Aadhaar-specific logic
                    if (fieldName === "AadharNumber") {
                      setAadhaarValid(false);
                      const lastChar = val.toString().charAt(val.length - 1);

                      let updatedAadhaar;

                      if (isBackspacePressed.current) {
                        updatedAadhaar = aadhaarNumber.slice(0, -1); // remove last
                      } else {
                        updatedAadhaar = aadhaarNumber + lastChar; // add
                      }

                      setAadhaarNumber(updatedAadhaar);
                      transformedVal = updatedAadhaar;
                      val = updatedAadhaar;
                    }

                    // Generic transformation logic (for any field)
                    if (field.transformationFunctions?.length > 0) {
                      field.transformationFunctions.forEach((fnName) => {
                        const transformFn = TransformationFunctionsList[fnName];
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
                  onBlur={() => {
                    // if (field.name === "IfscCode") {
                    //   handleChekcBankIfsc(field.name);
                    // }
                  }}
                  inputRef={ref}
                  disabled={isFieldDisabled(field.name)}
                  error={Boolean(errors[field.name])}
                  helperText={errors[field.name]?.message || ""}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                    style: { fontSize: "1rem", color: "#000000" },
                  }}
                  inputProps={{
                    maxLength: field.maxLength,
                  }}
                  sx={commonStyles}
                />
                {field.name == "AadharNumber" && aadhaarValid ? (
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
                {field.name == "AadharNumber" &&
                  value.length != 0 &&
                  !aadhaarValid &&
                  !Boolean(errors[field.name]) && (
                    <Button
                      sx={[
                        {
                          background:
                            "linear-gradient(to right, #10B981, #059669)", // Green-500 to Green-600
                          color: "#FFFFFF",
                          fontWeight: "bold",
                          paddingRight: 2,
                          paddingLeft: 2,
                          borderRadius: 5,
                        },
                      ]}
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
                // For required checkbox fields
                if (field.required) {
                  if (field.isConsentCheckbox) {
                    // Consent checkboxes don’t require validation unless specified
                    return true;
                  } else if (Array.isArray(value)) {
                    if (!value || value.length === 0) {
                      return "At least one option must be selected";
                    }
                  } else if (!value) {
                    return "This field is required";
                  }
                }

                // Run additional validations
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
                  <Box>
                    {field.declaration && (
                      <Typography
                        variant="body2"
                        sx={{
                          marginBottom: "0.5rem",
                          color: "#555",
                        }}
                      >
                        {field.declaration}
                      </Typography>
                    )}
                    <FormControlLabel
                      control={
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
                          inputRef={ref}
                          disabled={isFieldDisabled(field.name)}
                        />
                      }
                      label={
                        <span>
                          {field.label}
                          {field.required && (
                            <span style={{ color: "red" }}> *</span>
                          )}
                        </span>
                      }
                    />
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
                            }}
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
                >
                  {getLabelWithAsteriskJSX(field)}
                  <input
                    type="file"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files[0];
                      onChange(file);
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
            defaultValue={field.options[0]?.value || ""}
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
                  <TextField
                    select
                    fullWidth
                    variant="outlined"
                    label={getLabelWithAsteriskJSX(field)}
                    value={value || ""}
                    id={`field-${field.id}`}
                    onChange={(e) => {
                      onChange(e);
                      const newValue = e.target.value;
                      handleAreaChange(sectionIndex, field, newValue);
                      // Unregister additional fields that do not belong to the current value
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
                    error={Boolean(errors[field.name])}
                    helperText={errors[field.name]?.message || ""}
                    InputLabelProps={{
                      shrink: true,
                      style: { fontSize: "1.2rem", color: "#000000" },
                    }}
                    inputRef={ref}
                    sx={commonStyles}
                    disabled={isFieldDisabled(field.name)}
                  >
                    {options.map((option, index) => (
                      <MenuItem
                        key={`${option.value}-${index}`}
                        value={option.value}
                        sx={{
                          color: "#1F2937", // Gray-900
                          "&:hover": { backgroundColor: "#DBEAFE" }, // Blue-100
                          "&.Mui-selected": {
                            backgroundColor: "#6366F1", // Indigo-500
                            color: "#FFFFFF",
                          },
                        }}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
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

        const selectValue =
          getValues(selectFieldName) ||
          initialData?.[field.name]?.selected ||
          "";
        const options = field.options || [];

        if (
          selectValue &&
          !options.some(
            (opt) => opt.value.toString() === selectValue.toString(),
          )
        ) {
          options.push({ value: selectValue, label: selectValue });
        }

        const additionalFields =
          field.additionalFields && field.additionalFields[selectValue];

        return (
          <>
            <Controller
              name={selectFieldName}
              control={control}
              defaultValue={selectValue}
              rules={{
                validate: async (value) =>
                  field.required && !value ? "Please select an option" : true, // Only validate that a selection is made if required
              }}
              render={({ field: { onChange, value, ref } }) => {
                return (
                  <>
                    <TextField
                      select
                      fullWidth
                      variant="outlined"
                      label={getLabelWithAsteriskJSX(field)}
                      value={value || ""}
                      id={`field-${field.id}`}
                      onChange={(e) => {
                        onChange(e);
                        handleAreaChange(sectionIndex, field, e.target.value);
                        // Clear file if select value changes
                        setValue(fileFieldName, null, { shouldValidate: true });
                      }}
                      error={Boolean(errors[selectFieldName])}
                      helperText={errors[selectFieldName]?.message || ""}
                      InputLabelProps={{
                        shrink: true,
                        style: { fontSize: "1.2rem", color: "#000000" },
                      }}
                      inputRef={ref}
                      sx={commonStyles}
                      disabled={isFieldDisabled(field.name)}
                    >
                      {options.map((option, index) => (
                        <MenuItem
                          key={`${option.value}-${index}`}
                          value={option.value}
                          sx={{
                            color: "#1F2937", // Gray-900
                            "&:hover": { backgroundColor: "#DBEAFE" }, // Blue-100
                            "&.Mui-selected": {
                              backgroundColor: "#6366F1", // Indigo-500
                              color: "#FFFFFF",
                            },
                          }}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>

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
            <Controller
              name={fileFieldName}
              control={control}
              defaultValue={initialData?.[field.name]?.file || null}
              rules={{
                validate: async (value) => {
                  // Run validations specifically for the file
                  const selectValue = getValues(selectFieldName);
                  if (field.required && !value && selectValue) {
                    return "Please upload a file";
                  }
                  return await runValidations(field, value, getValues());
                },
              }}
              render={({ field: { onChange, value } }) => (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-start",
                    alignItems: "flex-start",
                    width: "100%",
                    marginBottom: "0.5rem",
                  }}
                >
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
                          color: "#6366F1", // Indigo-500
                          textDecoration: "underline",
                          fontSize: "0.9rem",
                          "&:hover": { color: "#4F46E5" }, // Indigo-600
                        }}
                        onClick={() => {
                          const fileURL =
                            typeof value === "string"
                              ? value
                              : URL.createObjectURL(value);
                          window.open(fileURL, "_blank");
                        }}
                      >
                        {typeof value === "string"
                          ? "View file"
                          : value?.name || "View file"}
                      </FormHelperText>
                      <IconButton
                        size="small"
                        disabled={isFieldDisabled(field.name)}
                        onClick={() => onChange(null)}
                        sx={{
                          color: "#F43F5E", // Rose-500
                          "&:hover": { color: "#E11D48" }, // Rose-600
                          p: 0.5,
                        }}
                        aria-label="Remove file"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}

                  <Button
                    variant="contained"
                    component="label"
                    sx={{
                      ...buttonStyles,
                      width: "100%",
                      borderRadius: "12px",
                    }}
                    disabled={
                      isFieldDisabled(field.name) || !getValues(selectFieldName)
                    }
                  >
                    Upload
                    <input
                      type="file"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files[0];
                        onChange(file);
                      }}
                      accept={field.accept || ".pdf"}
                    />
                  </Button>

                  <Box>
                    <FormHelperText sx={{ color: "#F43F5E" }}>
                      {errors[fileFieldName]?.message || ""}
                    </FormHelperText>
                    <Typography sx={{ fontSize: "0.85rem", color: "#6B7280" }}>
                      Accepted File Types: {field.accept || ".pdf"} Size:
                      100kb-200kb
                    </Typography>
                  </Box>
                </div>
              )}
            />
          </>
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
        maxWidth: "900px",
        margin: "2rem auto",
        background: "linear-gradient(to bottom, #E0F2FE, #BAE6FD)", // Sky-100 to Sky-200
        borderRadius: "16px",
        padding: { xs: "1.5rem", md: "3rem" },
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        minHeight: "100vh",
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          width: "8px",
          backgroundColor: "#E0F2FE", // Sky-100
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#38BDF8", // Sky-400
          borderRadius: "4px",
        },
      }}
    >
      <form onSubmit={handleSubmit((data) => onSubmit(data, "submit"))}>
        {formSections.length > 0 ? (
          <>
            {formSections.map((section, index) => (
              <Box
                key={section.id}
                sx={{
                  marginBottom: "3rem",
                  padding: "2rem",
                  borderRadius: "12px",
                  background: "linear-gradient(to bottom, #FFFFFF, #F0FDFA)", // White to Teal-50
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: "0 4px 15px rgba(20, 184, 166, 0.3)", // Teal-500 shadow
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    marginBottom: "1.5rem",
                  }}
                >
                  {sectionIconMap[section.section] || (
                    <HelpOutlineIcon sx={{ fontSize: 36, color: "#14B8A6" }} /> // Teal-500
                  )}
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: "600",
                      color: "#1F2937", // Gray-900
                      fontSize: "1.5rem",
                    }}
                  >
                    {section.section}
                  </Typography>
                </Box>
                <Divider
                  sx={{ marginBottom: "1.5rem", borderColor: "#A5B4FC" }} // Indigo-200
                />
                {section.section === "Applicant Details" && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "1.5rem",
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
                        border: "3px solid #A5B4FC", // Indigo-200
                      }}
                    />
                  </Box>
                )}
                {section.section === "Documents" && (
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      textAlign: "center",
                      color: "#4B5563", // Gray-600
                      marginBottom: "1rem",
                    }}
                  >
                    Accepted File Type: .pdf, Size: 100Kb-200Kb
                  </Typography>
                )}
                <Row
                  style={{
                    dispaly: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {section.fields.map((field) => {
                    const element = renderField(field, index);
                    if (element != null) {
                      return (
                        <Col xs={12} lg={field.span} key={field.id}>
                          {element}
                        </Col>
                      );
                    }
                    return null;
                  })}
                </Row>
              </Box>
            ))}
            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                background: "linear-gradient(to top, #E0F2FE, #BAE6FD)", // Sky-100 to Sky-200
                padding: "1.5rem",
                borderTop: "1px solid #A5B4FC", // Indigo-200
                boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.1)",
                display: "flex",
                justifyContent: "center",
                gap: 3,
                zIndex: 1000,
              }}
            >
              {mode != "edit" && (
                <Button
                  sx={{
                    background: "linear-gradient(to right, #F59E0B, #D97706)", // Amber-500 to Amber-600
                    color: "#FFFFFF",
                    fontSize: { xs: "0.9rem", md: "1rem" },
                    fontWeight: "600",
                    padding: "0.75rem 2.5rem",
                    borderRadius: "10px",
                    textTransform: "none",
                    "&:hover": {
                      background: "linear-gradient(to right, #D97706, #B45309)", // Amber-600 to Amber-700
                    },
                    "&.Mui-disabled": {
                      background: "#D1D5DB", // Gray-300
                      color: "#9CA3AF", // Gray-400
                    },
                  }}
                  disabled={buttonLoading || loading}
                  onClick={(data) => onSubmit(data, "save")}
                >
                  Save as Draft{buttonLoading ? "..." : ""}
                </Button>
              )}
              <Button
                sx={{
                  background: "linear-gradient(to right, #10B981, #059669)", // Green-500 to Green-600
                  color: "#FFFFFF",
                  fontSize: { xs: "0.9rem", md: "1rem" },
                  fontWeight: "600",
                  padding: "0.75rem 2.5rem",
                  borderRadius: "10px",
                  textTransform: "none",
                  "&:hover": {
                    background: "linear-gradient(to right, #059669, #047857)", // Green-600 to Green-700
                  },
                  "&.Mui-disabled": {
                    background: "#D1D5DB", // Gray-300
                    color: "#9CA3AF", // Gray-400
                  },
                }}
                disabled={buttonLoading || loading}
                onClick={handleSubmit((data) => onSubmit(data, "submit"))}
              >
                Submit{buttonLoading ? "..." : ""}
              </Button>
            </Box>
          </>
        ) : (
          !loading && (
            <Typography
              sx={{ textAlign: "center", color: "#4B5563", fontSize: "1.2rem" }}
            >
              No form configuration available.
            </Typography>
          )
        )}
      </form>

      <MessageModal
        open={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        title="Error"
        message="Some fields are not filled or are incorrectly filed. Please correctly fill all fields."
        type="error" // can be: "error", "success", "warning", "info"
      />

      {otpModal && (
        <OtpModal
          open={otpModal}
          onClose={() => {
            setOtpModal(false);
          }}
          onSubmit={handleOtpSubmit}
        />
      )}

      <ToastContainer />
    </Box>
  );
};

export default DynamicScrollableForm;
