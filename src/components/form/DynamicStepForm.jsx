import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { runValidations } from "../../assets/formvalidations";
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
  Stepper,
  Step,
  StepLabel,
  StepIcon,
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

const sectionIconMap = {
  Location: <LocationOnIcon sx={{ fontSize: 36 }} />,
  "Applicant Details": <PersonIcon sx={{ fontSize: 36 }} />,
  "Present Address Details": <HomeIcon sx={{ fontSize: 36 }} />,
  "Permanent Address Details": <HomeIcon sx={{ fontSize: 36 }} />,
  "Bank Details": <AccountBalanceIcon sx={{ fontSize: 36 }} />,
  Documents: <InsertDriveFileIcon sx={{ fontSize: 36 }} />,
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
        // flat[`${field.name}_Enclosure`] = field.Enclosure;
        // flat[`${field.name}_File`] = field.File;
      } else {
        if ("value" in field) flat[field.name] = field.value;
        if ("File" in field && field.File) flat[field.name] = field.File;
      }

      if (field.additionalFields) {
        // handle both array‐ and map‐shaped additionalFields
        const branches = Array.isArray(field.additionalFields)
          ? field.additionalFields
          : Object.values(field.additionalFields).flat();

        recurse(
          branches.map((af) => ({
            ...af,
            name: af.name || `${field.name}_${af.id}`,
          }))
        );
      }
    });
  }

  Object.values(nestedDetails).forEach((fields) => recurse(fields));
  return flat;
};

const DynamicStepForm = ({ mode = "new", data }) => {
  const {
    control,
    handleSubmit,
    trigger,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors, dirtyFields },
  } = useForm({
    mode: "onChange",
    shouldUnregister: false, // keep dynamically-rendered fields
    defaultValues: {},
  });

  const [formSections, setFormSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [initialData, setInitialData] = useState(null);
  const [additionalDetails, setAdditionalDetails] = useState(null);
  const [isCopyAddressChecked, setIsCopyAddressChecked] = useState(false);
  const applicantImageFile = watch("ApplicantImage");
  const [applicantImagePreview, setApplicantImagePreview] = useState(
    "/assets/images/profile.jpg"
  );
  const navigate = useNavigate();
  const location = useLocation();

  // Watch BankName and BranchName
  const bankName = watch("BankName");
  const branchName = watch("BranchName");
  const [bankNameBlurred, setBankNameBlured] = useState(false);
  const [branchNameBlurred, setBranchNameBlured] = useState(false);

  const hasRunRef = useRef(false);

  const isFieldDisabled = (fieldName) => {
    if (
      mode === "edit" &&
      additionalDetails &&
      additionalDetails.returnFields
    ) {
      return !additionalDetails.returnFields.includes(fieldName);
    }
    return false;
  };

  // Update image preview when the applicant file changes
  useEffect(() => {
    if (applicantImageFile && applicantImageFile instanceof File) {
      const objectUrl = URL.createObjectURL(applicantImageFile);
      setApplicantImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [applicantImageFile]);

  // Fetch IFSC Code when both BankName and BranchName are present
  useEffect(() => {
    async function fetchIFSCCode() {
      if (
        bankName &&
        branchName &&
        bankName !== "Please Select" &&
        branchName.trim()
      ) {
        try {
          if (bankNameBlurred && branchNameBlurred) {
            const response = await axiosInstance.get("/Base/GetIFSCCode", {
              params: { bankName, branchName },
            });
            const data = await response.data;
            if (data.status && data.result[0]) {
              setValue("IfscCode", data.result[0], { shouldValidate: true });
            } else {
              setValue("IfscCode", "", { shouldValidate: false });
            }
          }
        } catch (error) {
          console.error("Error fetching IFSC code:", error);
          setValue("IfscCode", "", { shouldValidate: false });
        }
      }
    }
    fetchIFSCCode();
  }, [bankName, branchName, bankNameBlurred, branchNameBlurred, setValue]);

  // Load service content and, if mode === "incomplete" or "edit", fetch and flatten existing form details
  useEffect(() => {
    async function loadForm() {
      try {
        const { ServiceId, referenceNumber } = location.state || {};
        setSelectedServiceId(ServiceId);
        if (referenceNumber) {
          setReferenceNumber(referenceNumber);
        }
        const result = await GetServiceContent(ServiceId);
        if (result && result.status) {
          try {
            const config = JSON.parse(result.formElement);
            setFormSections(config);
          } catch (err) {
            console.error("Error parsing formElements:", err);
            setFormSections([]);
          }
        }
        if ((mode === "incomplete" || mode === "edit") && referenceNumber) {
          const { formDetails, additionalDetails } = await fetchFormDetails(
            referenceNumber
          );
          const flatDetails = flattenFormDetails(formDetails);
          setInitialData(flatDetails);
          const resetData = {
            ...flatDetails,
            // Explicitly set enclosure fields
            ...Object.keys(flatDetails).reduce((acc, key) => {
              if (
                flatDetails[key] &&
                typeof flatDetails[key] === "object" &&
                "selected" in flatDetails[key]
              ) {
                acc[`${key}_select`] = flatDetails[key].selected;
                acc[`${key}_file`] = flatDetails[key].file;
              }
              return acc;
            }, {}),
          };
          reset(resetData);
          setAdditionalDetails(additionalDetails);
        } else if (data !== null && data !== undefined) {
          setInitialData(data);
          reset(data);
        }

        if (data != null) {
          Object.keys(data).forEach((key) => {
            data[key].map((item, sectionIndex) => {
              setValue(item.name, item.value);
              if (item.name.toLowerCase().includes("district")) {
                handleDistrictChange(
                  sectionIndex,
                  { name: item.name },
                  item.value
                );
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
  }, [location.state, mode, reset, data, getValues]);

  // Set default file for fields that require it
  const setDefaultFile = async (path) => {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const file = new File([blob], path.split("/").pop(), { type: blob.type });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      setValue("ApplicantImage", dataTransfer.files[0]);
    } catch (error) {
      console.error("Error setting default file:", error);
    }
  };

  // Set dependent defaults and enclosure fields
  useEffect(() => {
    if (!formSections.length || !initialData) return;
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    function recurseAndSet(fields, sectionIndex) {
      fields.forEach((field) => {
        const name = field.name;
        const value = initialData[name];

        // ── 1️⃣ District → populate Tehsils ─────────────────────
        if (name.toLowerCase().includes("district") && value) {
          handleDistrictChange(sectionIndex, { ...field, name }, value);
        }

        // ── 2️⃣ ApplicantImage → preview + default file ────────
        if (name.toLowerCase().includes("applicantimage") && value) {
          setApplicantImagePreview(value);
          setDefaultFile(value);
        }

        // ── 3️⃣ Enclosure → set select + file ──────────────────
        if (field.type === "enclosure" && value) {
          setValue(`${name}_select`, value.selected || "", {
            shouldValidate: true,
          });
          setValue(`${name}_file`, value.file || null, {
            shouldValidate: true,
          });
        }

        // ── 4️⃣ Recurse deeper into additionalFields ────────────
        if (field.additionalFields) {
          const branches = Array.isArray(field.additionalFields)
            ? field.additionalFields
            : Object.values(field.additionalFields).flat();

          recurseAndSet(
            branches.map((af) => ({
              ...af,
              name: af.name || `${name}_${af.id}`,
            })),
            sectionIndex
          );
        }
      });
    }

    formSections.forEach((section, idx) => recurseAndSet(section.fields, idx));
  }, [formSections, initialData, setValue]);

  const handleCopyAddress = (checked, sectionIndex) => {
    if (checked) {
      const presentSection = formSections.find(
        (sec) => sec.section === "Present Address Details"
      );
      const permanentSection = formSections.find(
        (sec) => sec.section === "Permanent Address Details"
      );
      const permanentDistrictField = permanentSection?.fields.find((field) =>
        field.name.includes("District")
      );
      if (presentSection) {
        presentSection.fields.forEach((field) => {
          const presentFieldName = field.name;
          const permanentFieldName = presentFieldName.replace(
            "Present",
            "Permanent"
          );
          const presentValue = getValues(presentFieldName);
          setValue(permanentFieldName, presentValue);
          if (
            permanentFieldName.includes("District") &&
            permanentDistrictField
          ) {
            handleDistrictChange(
              sectionIndex,
              permanentDistrictField,
              presentValue
            );
          }
        });
      }
    }
  };

  const handleNext = async () => {
    // 1️⃣ Build a flat list of every field key in this step
    const stepFields = formSections[currentStep].fields.flatMap((field) => {
      if (field.type === "enclosure") {
        // enclosure contributes two keys
        return [`${field.name}_select`, `${field.name}_file`];
      }
      if (field.type === "select" && field.additionalFields) {
        const sel = getValues(field.name);
        const extra = field.additionalFields[sel] || [];
        const nested = extra.map((af) => af.name || `${field.name}_${af.id}`);
        return [field.name, ...nested];
      }
      return [field.name];
    });

    // 2️⃣ Filter out disabled fields
    const enabledFields = stepFields.filter((name) => !isFieldDisabled(name));

    // 3️⃣ In edit mode, require *all* enabled fields to have been changed
    if (mode === "edit") {
      const allUpdated = enabledFields.every((name) => dirtyFields[name]);
      if (!allUpdated) {
        alert("Please modify all correction fields before proceeding.");
        return;
      }
    }

    // 4️⃣ Run validation on every field (including disabled if you want)
    const valid = await trigger(stepFields);
    if (valid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleDistrictChange = async (sectionIndex, districtField, value) => {
    try {
      const response = await fetch(
        `/Base/GetTeshilForDistrict?districtId=${value}`
      );
      const data = await response.json();
      if (data.status && data.tehsils) {
        const newOptions = [
          { value: "Please Select", label: "Please Select" },
          ...data.tehsils.map((tehsil) => ({
            value: tehsil.tehsilId,
            label: tehsil.tehsilName,
          })),
        ];
        setFormSections((prevSections) => {
          const newSections = [...prevSections];
          const section = newSections[sectionIndex];
          const tehsilFieldName = districtField.name.replace(
            "District",
            "Tehsil"
          );
          section.fields = section.fields.map((field) =>
            field.name === tehsilFieldName
              ? { ...field, options: newOptions }
              : field
          );
          return newSections;
        });
      }
    } catch (error) {
      console.error("Error fetching tehsils:", error);
    }
  };

  const onSubmit = async (data, operationType) => {
    const groupedFormData = {};
    setButtonLoading(true);

    const processField = (field, data) => {
      if (field.type === "enclosure" && field.isDependentEnclosure) {
        const parentValue = data[field.dependentField];
        if (!parentValue || !field.dependentValues.includes(parentValue)) {
          return null;
        }
      }

      const sectionFormData = {};
      const fieldValue = data[field.name] || "";
      sectionFormData["label"] = field.label;
      sectionFormData["name"] = field.name;

      if (field.type === "enclosure") {
        sectionFormData["Enclosure"] = data[`${field.name}_select`] || "";
        sectionFormData["File"] = data[`${field.name}_file`] || "";
      } else if (field.name === "ApplicantImage") {
        sectionFormData["File"] = fieldValue;
      } else {
        sectionFormData["value"] = fieldValue;
      }

      if (field.additionalFields) {
        const selectedValue = data[field.name] || "";
        const additionalFields = field.additionalFields[selectedValue];
        if (additionalFields) {
          sectionFormData.additionalFields = additionalFields
            .map((additionalField) => {
              const nestedFieldName =
                additionalField.name || `${field.name}_${additionalField.id}`;
              return processField(
                { ...additionalField, name: nestedFieldName },
                data
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
        const sectionData = processField(field, data);
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
      operationType === "submit" ? "Initiated" : "Incomplete"
    );
    console.log("Reference Number", referenceNumber);
    formdata.append("referenceNumber", referenceNumber);
    let url = "/User/InsertFormDetails";
    console.log(additionalDetails);
    if (additionalDetails != null && additionalDetails != "") {
      formdata.append("returnFields", additionalDetails["returnFields"] || "");
      url = "/User/UpdateApplicationDetails";
    }

    try {
      const response = await axiosInstance.post(url, formdata);
      const result = response.data;
      setButtonLoading(false);
      if (result.status) {
        if (result.type === "Submit") {
          navigate("/user/acknowledge", {
            state: { applicationId: result.referenceNumber },
          });
        } else if (result.type == "Edit") {
          setReferenceNumber(result.referenceNumber);
          navigate("/user/initiated");
        } else {
          setReferenceNumber(result.referenceNumber);
        }
      } else {
        console.error("Submission failed:", result);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      setButtonLoading(false);
    }
  };

  const renderField = (field, sectionIndex) => {
    const commonStyles = {
      "& .MuiOutlinedInput-root": {
        backgroundColor: "#ffffff", // Tailwind white
        borderRadius: "8px",
        transition: "all 0.3s ease-in-out",
        "& fieldset": {
          borderColor: "#d1d5db", // Tailwind gray-300
        },
        "&:hover fieldset": {
          borderColor: "#D2946A", // Tailwind blue-600
        },
        "&.Mui-focused fieldset": {
          borderColor: "#D2946A",
          boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)", // Blue glow
        },
        "&.Mui-error fieldset": {
          borderColor: "#ef4444", // Tailwind red-500
        },
        "&.Mui-disabled": {
          backgroundColor: "#f3f4f6", // Tailwind gray-100
        },
      },
      "& .MuiInputLabel-root": {
        color: "#6b7280", // Tailwind gray-500
        fontWeight: "500",
        fontSize: "0.875rem", // Tailwind text-sm
        "&.Mui-focused": {
          color: "#D2946A", // Tailwind blue-600
        },
        "&.Mui-error": {
          color: "#ef4444", // Tailwind red-500
        },
      },
      "& .MuiInputBase-input": {
        fontSize: "1rem", // Tailwind text-base
        color: "#1f2937", // Tailwind gray-800
        padding: "12px 14px",
      },
      "& .MuiFormHelperText-root": {
        color: "#ef4444", // Tailwind red-500
        fontSize: "0.75rem", // Tailwind text-xs
      },
      marginBottom: 3,
    };

    const buttonStyles = {
      backgroundColor: "primary.main", // Tailwind blue-600
      color: "background.paper",
      fontWeight: "bold",
      textTransform: "none",
      borderRadius: "8px",
      padding: "8px 16px",
      "&:hover": {
        backgroundColor: "#1d4ed8", // Tailwind blue-700
      },
      "&.Mui-disabled": {
        backgroundColor: "#9ca3af", // Tailwind gray-400
        color: "#d1d5db", // Tailwind gray-300
      },
      marginBottom: 3,
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
                  referenceNumber
                ),
            }}
            render={({ field: { onChange, value, ref } }) => (
              <TextField
                type={field.type}
                id={`field-${field.id}`}
                label={field.label}
                value={value || ""}
                onChange={(e) => {
                  let val = e.target.value;
                  if (
                    field.transformationFunctions?.includes("CaptilizeAlphabet")
                  ) {
                    val = val.toUpperCase();
                  }
                  onChange(val);
                }}
                onBlur={() => {
                  if (field.name === "BranchName") {
                    setBranchNameBlured(true);
                  }
                }}
                inputRef={ref}
                disabled={isFieldDisabled(field.name)}
                error={Boolean(errors[field.name])}
                helperText={errors[field.name]?.message || ""}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  maxLength: field.validationFunctions?.includes(
                    "specificLength"
                  )
                    ? field.maxLength
                    : undefined,
                }}
                sx={commonStyles}
              />
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
                  {field.label}
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
                <FormHelperText sx={{ color: "error.main" }}>
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
              if (field.optionsType === "dependent" && field.dependentOn) {
                const parentValue = watch(field.dependentOn);
                options =
                  field.dependentOptions && field.dependentOptions[parentValue]
                    ? field.dependentOptions[parentValue]
                    : [];
              } else {
                options = field.options || [];
              }
              // Ensure the selected value is in options
              if (value && !options.some((opt) => opt.value === value)) {
                options = [...options, { value, label: value }];
              }

              return (
                <>
                  <TextField
                    select
                    fullWidth
                    variant="outlined"
                    label={field.label}
                    value={value || ""}
                    id={`field-${field.id}`}
                    onChange={(e) => {
                      onChange(e);
                      const districtFields = [
                        "district",
                        "presentdistrict",
                        "permanentdistrict",
                      ];
                      const normalizedFieldName = field.name
                        .toLowerCase()
                        .replace(/\s/g, "");
                      const isDistrict =
                        districtFields.includes(normalizedFieldName);
                      if (isDistrict) {
                        handleDistrictChange(
                          sectionIndex,
                          field,
                          e.target.value
                        );
                      }
                    }}
                    onBlur={() => {
                      if (field.name === "BankName") {
                        setBankNameBlured(true);
                      }
                    }}
                    error={Boolean(errors[field.name])}
                    helperText={errors[field.name]?.message || ""}
                    InputLabelProps={{ shrink: true }}
                    inputRef={ref}
                    sx={commonStyles}
                    disabled={isFieldDisabled(field.name)}
                  >
                    {options.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                        sx={{
                          color: "text.primary",
                          "&:hover": { backgroundColor: "primary.light" },
                          "&.Mui-selected": {
                            backgroundColor: "primary.main",
                            color: "background.paper",
                          },
                        }}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {field.additionalFields &&
                    field.additionalFields[value] &&
                    field.additionalFields[value].map((additionalField) => (
                      <Col
                        xs={12}
                        lg={additionalField.span}
                        key={additionalField.id}
                      >
                        {renderField(
                          {
                            ...additionalField,
                            name:
                              additionalField.name ||
                              `${field.name}_${additionalField.id}`,
                          },
                          sectionIndex
                        )}
                      </Col>
                    ))}
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
        const selectValue =
          getValues(`${field.name}_select`) ||
          initialData?.[field.name]?.selected ||
          "";
        const options = field.options || [];
        // Ensure the selected value is in options
        if (selectValue && !options.some((opt) => opt.value === selectValue)) {
          options.push({ value: selectValue, label: selectValue });
        }

        return (
          <>
            <Controller
              name={`${field.name}_select`}
              control={control}
              defaultValue={selectValue}
              rules={{
                validate: async (value) =>
                  await runValidations(field, value, getValues()),
              }}
              render={({ field: { onChange, value, ref } }) => (
                <FormControl
                  fullWidth
                  margin="normal"
                  error={Boolean(errors[`${field.name}_select`])}
                  sx={commonStyles}
                >
                  <InputLabel id={`${field.id}_select-label`}>
                    {field.label}
                  </InputLabel>
                  <Select
                    labelId={`${field.id}_select-label`}
                    id={`${field.id}_select`}
                    value={value || ""}
                    label={field.label}
                    disabled={isFieldDisabled(`${field.name}_select`)}
                    onChange={(e) => onChange(e.target.value)}
                    inputRef={ref}
                  >
                    {options.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                        sx={{
                          color: "text.primary",
                          "&:hover": { backgroundColor: "primary.light" },
                          "&.Mui-selected": {
                            backgroundColor: "primary.main",
                            color: "background.paper",
                          },
                        }}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText sx={{ color: "error.main" }}>
                    {errors[`${field.name}_select`]?.message || ""}
                  </FormHelperText>
                </FormControl>
              )}
            />
            <Controller
              name={`${field.name}_file`}
              control={control}
              defaultValue={initialData?.[field.name]?.file || null}
              rules={{
                validate: async (value) =>
                  await runValidations(field, value, getValues()),
              }}
              render={({ field: { onChange, value } }) => (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <Button
                      variant="contained"
                      component="label"
                      sx={{
                        ...buttonStyles,
                        width: "100%",
                        borderRadius: 15,
                      }}
                      disabled={
                        isFieldDisabled(`${field.name}_file`) ||
                        !watch(`${field.name}_select`)
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
                        accept={field.accept}
                      />
                    </Button>
                    {value && (
                      <FormHelperText
                        sx={{
                          cursor: "pointer",
                          color: "primary.main",
                          textDecoration: "underline",
                          fontSize: 16,
                          textAlign: "center",
                          "&:hover": { color: "primary.dark" },
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
                    )}
                  </div>
                  <Box>
                    <FormHelperText sx={{ color: "error.main" }}>
                      {errors[`${field.name}_file`]?.message || ""}
                    </FormHelperText>
                  </Box>
                </>
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

  const CustomStepIcon = (props) => {
    const { active, completed, icon } = props;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          backgroundColor: active || completed ? "#dbeafe" : "#f3f4f6", // Tailwind blue-100 or gray-100
          boxShadow: active ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none", // Blue glow
          transition: "all 0.3s ease-in-out",
        }}
      >
        {React.cloneElement(icon, {
          sx: {
            fontSize: "24px", // Consistent size for all icons
            color: active || completed ? "#D2946A" : "#6b7280", // Tailwind blue-600 or gray-500
          },
        })}
      </div>
    );
  };

  if (loading) return <div>Loading form...</div>;

  return (
    <Box
      sx={{
        width: { xs: "80vw", lg: "50vw" },
        margin: "0 auto",
        backgroundColor: "#FFFFFF",
        borderRadius: 2,
        color: "primary.main",
        padding: { xs: 3, lg: 10 },
        boxShadow: 20,
      }}
    >
      <form onSubmit={handleSubmit((data) => onSubmit(data, "submit"))}>
        {formSections.length > 0 && (
          <Stepper activeStep={currentStep} alternativeLabel sx={{ mb: 4 }}>
            {formSections.map((section) => (
              <Step key={section.id}>
                <StepLabel
                  slots={{ stepIcon: CustomStepIcon }}
                  slotProps={{
                    stepIcon: {
                      icon: sectionIconMap[section.section] || (
                        <HelpOutlineIcon />
                      ),
                    },
                  }}
                >
                  {section.section}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        )}
        {formSections.length > 0 ? (
          <>
            {formSections.map((section, index) => {
              if (index !== currentStep) return null;
              return (
                <div
                  key={section.id}
                  style={{ display: "flex", flexDirection: "column" }}
                >
                  {section.section === "Permanent Address Details" && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isCopyAddressChecked}
                          onChange={(e) => {
                            setIsCopyAddressChecked(e.target.checked);
                            handleCopyAddress(e.target.checked, index);
                          }}
                        />
                      }
                      label="Same As Present Address"
                    />
                  )}
                  {section.section === "Applicant Details" && (
                    <Box
                      component="img"
                      src={applicantImagePreview}
                      alt="Applicant Image"
                      sx={{
                        width: 150,
                        height: 150,
                        borderRadius: "8px",
                        objectFit: "cover",
                        boxShadow: 2,
                        margin: "0 auto",
                      }}
                    />
                  )}
                  <Row
                    style={{
                      display: "flex",
                      flexDirection:
                        section.section === "Documents" ? "column" : "row",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {section.fields.map((field) => (
                      <Col xs={12} lg={field.span} key={field.id}>
                        {renderField(field, index)}
                      </Col>
                    ))}
                  </Row>
                </div>
              );
            })}

            <Box sx={{ display: "flex", justifyContent: "center", gap: 3 }}>
              {currentStep > 0 && (
                <Button
                  sx={{
                    backgroundColor: "primary.main",
                    borderRadius: 5,
                    color: "#FFFFFF",
                    fontSize: { xs: 18, lg: 16 },
                    width: "20%",
                    fontWeight: "bold",
                  }}
                  disabled={buttonLoading}
                  onClick={handlePrev}
                >
                  Previous
                </Button>
              )}
              {currentStep < formSections.length - 1 && (
                <Button
                  sx={{
                    backgroundColor: "primary.main",
                    borderRadius: 5,
                    color: "#FFFFFF",
                    fontSize: { xs: 18, lg: 16 },
                    width: "20%",
                    fontWeight: "bold",
                  }}
                  disabled={buttonLoading}
                  onClick={handleNext}
                >
                  Next
                </Button>
              )}
              {currentStep === formSections.length - 1 && (
                <Button
                  sx={{
                    backgroundColor: "primary.main",
                    borderRadius: 5,
                    color: "#FFFFFF",
                    fontSize: { xs: 18, lg: 16 },
                    width: "20%",
                    fontWeight: "bold",
                  }}
                  disabled={buttonLoading}
                  onClick={handleSubmit((data) => onSubmit(data, "submit"))}
                >
                  Submit{buttonLoading ? "..." : ""}
                </Button>
              )}
            </Box>

            <Box
              sx={{ display: "flex", justifyContent: "center", marginTop: 5 }}
            >
              {currentStep !== formSections.length - 1 && (
                <Button
                  sx={{
                    backgroundColor: "primary.main",
                    borderRadius: 5,
                    color: "#FFFFFF",
                    fontSize: { xs: 18, lg: 16 },
                    width: "20%",
                    fontWeight: "bold",
                    disabled: { buttonLoading },
                  }}
                  onClick={handleSubmit((data) => onSubmit(data, "save"))}
                >
                  Save
                </Button>
              )}
            </Box>
          </>
        ) : (
          !loading && <div>No form configuration available.</div>
        )}
      </form>
    </Box>
  );
};

export default DynamicStepForm;
