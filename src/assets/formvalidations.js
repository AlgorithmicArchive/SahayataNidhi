import "@tensorflow/tfjs-backend-webgl"; // Load backend first
import * as tf from "@tensorflow/tfjs"; // Then core TF
import * as cocoSsd from "@tensorflow-models/coco-ssd";

// Make tf globally available (temporarily for debugging)
if (typeof window !== "undefined") {
  window.tf = tf;
  console.log(
    "[DEBUG] TensorFlow.js version:",
    tf.version?.tfjs || "Not loaded",
  );
}

// Validation functions
export function notEmpty(field, value) {
  if (value === "" || value == "Please Select") {
    return "This field is required.";
  }
  return true;
}
export function onlyAlphabets(field, value) {
  if (!/^[A-Za-z .']+$/.test(value)) {
    return "Please use letters (a-z, A-Z) and special characters (. and ') only.";
  }
  return true;
}
export function onlyDigits(field, value) {
  if (!/^\d+$/.test(value)) {
    return "Please enter only digits.";
  }
  return true;
}
export function specificLength(field, value, formData = {}) {
  let maxLengthValue;
  console.log(formData);
  // Determine maxLength based on dependent field if needed
  if (typeof field.maxLength === "object" && field.maxLength.dependentOn) {
    const dependentFieldId = field.maxLength.dependentOn;
    const dependentValue = formData[dependentFieldId];
    if (!dependentValue) {
      return `Dependent field (${dependentFieldId}) value is missing.`;
    }
    maxLengthValue = field.maxLength[dependentValue];
    if (maxLengthValue === undefined) {
      return `No maximum length defined for option (${dependentValue}).`;
    }
  } else {
    maxLengthValue = field.maxLength;
  }
  // Check the length
  if (value.length !== maxLengthValue) {
    return `This must be exactly ${maxLengthValue} characters long.`;
  }
  return true;
}
export function isEmailValid(field, value) {
  if (
    value.length > 0 &&
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)
  ) {
    return "Invalid Email Address.";
  }
  return true;
}
export async function duplicateAccountNumber(
  field,
  value,
  formData,
  referenceNumber,
) {
  try {
    const bankName =
      formData["BankDetail"] != null
        ? formData["Bank Details"][0].value
        : formData.BankName;
    const ifscCode =
      formData["BankDetail"] != null
        ? formData["Bank Details"][2].value
        : formData.IfscCode;
    const fd = new FormData();
    fd.append("bankName", bankName);
    fd.append("ifscCode", ifscCode);
    fd.append("accNo", value);
    fd.append("applicationId", referenceNumber);
    const res = await fetch(`/Base/IsDuplicateAccNo`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const errorText = await res.text(); // Get raw text for debugging
      console.error(`Server error: ${res.status} - Response: ${errorText}`);
      return "Validation failed due to a server error.";
    }
    const data = await res.json();
    if (data.status) {
      return "Account Number already exists.";
    }
    return true;
  } catch (error) {
    console.error("Error in duplicateAccountNumber:", error);
    return "Validation failed due to a server error.";
  }
}

export async function validateIfscCode(
  field,
  value,
  formData,
  referenceNumber,
  setValue, // Keep parameter but handle it safely
) {
  const ifscCode = formData.IfscCode || value;
  const bankName = formData.BankName;

  // Ensure IFSC code exists
  if (!ifscCode || !ifscCode.trim()) {
    return true; // Allow empty IFSC
  }

  if (!bankName || bankName === "Please Select") {
    return "Please select a bank name first";
  }

  try {
    const fd = new FormData();
    fd.append("bankName", bankName);
    fd.append("ifscCode", ifscCode.trim().toUpperCase());

    const res = await fetch(`/Base/ValidateIfscCode`, {
      method: "POST",
      body: fd,
    });

    if (!res.ok) {
      if (typeof setValue === "function") {
        setValue("BranchName", "", { shouldValidate: true });
      }
      return "Failed to validate IFSC code. Please try again.";
    }

    const data = await res.json();

    if (!data || !data.status || !data.bankDetails) {
      if (typeof setValue === "function") {
        setValue("BranchName", "", { shouldValidate: true });
      }
      return "IFSC Code is incorrect or branch details not available.";
    }

    // Update BranchName if setValue exists
    if (typeof setValue === "function") {
      setValue("BranchName", data.bankDetails.branch, { shouldValidate: true });
    }

    return true; // Validation passed
  } catch (error) {
    console.error("Error validating IFSC:", error);

    if (typeof setValue === "function") {
      setValue("BranchName", "", { shouldValidate: true });
    }

    return "Error validating IFSC code. Please try again.";
  }
}
export async function validateFile(field, value) {
  try {
    const formData = new FormData();
    if (field.accept.includes(".jpg")) formData.append("fileType", "image");
    else if (field.accept.includes(".pdf")) formData.append("fileType", "pdf");
    else return;
    const notRequired = !field.validationFunctions.includes("notEmpty");
    formData.append("file", value);
    const res = await fetch("/Base/Validate", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (!data.isValid) {
      if (data.errorMessage == "No file uploaded." && notRequired) {
        return true;
      }
      return data.errorMessage;
    }
    return true;
  } catch (error) {
    console.error("Error in validateFile:", error);
    return "File validation failed due to a server error.";
  }
}
export function range(field, value) {
  console.log(field, value);
  if (value < field.minLength || value > field.maxLength) {
    return `The value must be between ${field.minLength} and ${field.maxLength}.`;
  }
}
// Helper function to parse DD/MM/YYYY and return a Date object
/**
 * Parses a date string in either DD/MM/YYYY or YYYY-MM-DD format.
 * Returns a Date object (with time zeroed) or null if invalid.
 */
function parseDDMMYYYY(value) {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();

  // 1. Try DD/MM/YYYY first
  const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const ddMatch = trimmed.match(ddmmyyyyPattern);
  if (ddMatch) {
    const [, day, month, year] = ddMatch.map(Number);
    const date = new Date(year, month - 1, day);

    // Validate the date (catches 31/02/2025, 30/02/2025, etc.)
    if (isNaN(date.getTime()) || date.getDate() !== day) return null;

    date.setHours(0, 0, 0, 0);
    return date;
  }

  // 2. Try YYYY-MM-DD (ISO format)
  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
  const isoMatch = trimmed.match(isoPattern);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    const date = new Date(year, month - 1, day);

    if (isNaN(date.getTime()) || date.getDate() !== day) return null;

    date.setHours(0, 0, 0, 0);
    return date;
  }

  // Not a recognised format
  return null;
}
export function isAgeGreaterThan(field, value, formData) {
  let maxLengthValue;
  // Determine maxLength based on dependent field if needed
  if (typeof field.maxLength === "object" && field.maxLength.dependentOn) {
    const dependentFieldId = field.maxLength.dependentOn;
    const dependentValue = formData[dependentFieldId];
    if (!dependentValue) {
      return `Dependent field (${dependentFieldId}) value is missing.`;
    }
    maxLengthValue = field.maxLength[dependentValue];
    if (maxLengthValue === undefined) {
      return `No maximum length defined for option (${dependentValue}).`;
    }
  } else {
    maxLengthValue = field.maxLength;
  }
  // Parse the input date
  const inputDate = parseDDMMYYYY(value);
  if (!inputDate) {
    return `${field.label || "Date"} must be in DD/MM/YYYY format and valid.`;
  }
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  // Compute the date that corresponds to the minimum age
  const compareDate = new Date(
    currentDate.getFullYear() - maxLengthValue,
    currentDate.getMonth(),
    currentDate.getDate(),
  );
  compareDate.setHours(0, 0, 0, 0);
  if (inputDate >= compareDate) {
    return `Age should be greater than or equal to ${maxLengthValue}.`;
  }
  return true;
}
// 1. Check if date is within a range of months from current date
export function isDateWithinRange(field, value) {
  const dateOfMarriage = parseDDMMYYYY(value);
  if (!dateOfMarriage) {
    return `${field.label || "Date"} must be in DD/MM/YYYY format and valid.`;
  }
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const minDate = new Date(currentDate);
  minDate.setMonth(currentDate.getMonth() + parseInt(field.minLength));
  const maxDate = new Date(currentDate);
  maxDate.setMonth(currentDate.getMonth() + parseInt(field.maxLength));
  if (dateOfMarriage < minDate || dateOfMarriage > maxDate) {
    return `The date should be between ${field.minLength} to ${field.maxLength} months from current date.`;
  }
  return true;
}
export function isDateAfterCurrentDate(field, value, formData) {
  const inputDate = parseDDMMYYYY(value);
  if (!inputDate) {
    return `${field.label || "Date"} must be in DD/MM/YYYY format and valid.`;
  }
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  if (inputDate <= currentDate) {
    return `${field.label || "Date"} must be after the current date.`;
  }
  if (field.name === "IfTemporaryDisabilityUdidCardValidUpto") {
    const issueDate = parseDDMMYYYY(formData["UdidCardIssueDate"]);
    if (!issueDate) {
      return `UDID Card Issue Date must be in DD/MM/YYYY format and valid.`;
    }
    if (inputDate <= issueDate) {
      return `${field.label || "Date"} must be after the UDID Card Issue date.`;
    }
  }
  return true;
}
// 3. Check if date is before the current date
export function isDateBeforeCurrentDate(field, value) {
  const inputDate = parseDDMMYYYY(value);
  if (!inputDate) {
    return `${field.label || "Date"} must be in DD/MM/YYYY format and valid.`;
  }
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  if (inputDate >= currentDate) {
    return `${field.label || "Date"} must be before the current date.`;
  }
  return true;
}
export async function tehsilForDistrict(field, districtValue) {
  if (!districtValue) return [];
  try {
    const fd = new FormData();
    fd.append("districtId", districtValue);
    const response = await fetch(`/Base/GetTeshilForDistrict`, {
      method: "POST",
      body: fd,
    });
    const data = await response.json();
    if (data.status && Array.isArray(data.tehsils)) {
      // Map the returned tehsils to the expected format
      return data.tehsils.map((tehsil) => ({
        value: tehsil.tehsilId,
        label: tehsil.tehsilName,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error in tehsilForDistrict:", error);
    return [];
  }
}
let modelLoaded = false;
let cocoSsdModel = null;

// UPDATED loadCocoSsdModel function
export async function loadCocoSsdModel() {
  if (!modelLoaded) {
    try {
      console.log("[DEBUG] Initializing TensorFlow.js...");

      // IMPORTANT FIX: Call the backendNames function
      const backendNames = tf.engine().backendNames();
      console.log("[DEBUG] Available backends:", backendNames);

      // Check if backends are available
      if (!backendNames || backendNames.length === 0) {
        throw new Error("No TensorFlow.js backends available");
      }

      // Try WebGL first, then CPU
      let backendToUse = "cpu"; // Default fallback

      if (backendNames.includes("webgl")) {
        backendToUse = "webgl";
      } else if (backendNames.includes("cpu")) {
        backendToUse = "cpu";
      }

      console.log("[DEBUG] Using backend:", backendToUse);

      // Set and initialize the backend
      await tf.setBackend(backendToUse);
      await tf.ready();

      console.log(
        "[DEBUG] TensorFlow ready, current backend:",
        tf.getBackend(),
      );
      console.log("[DEBUG] TensorFlow version:", tf.version.tfjs);

      // Now load the COCO-SSD model
      cocoSsdModel = await cocoSsd.load();
      modelLoaded = true;
      console.log("[DEBUG] COCO-SSD model loaded successfully");
    } catch (error) {
      console.error("[DEBUG] Error loading COCO-SSD model:", error);

      // More specific error handling
      if (
        error.message.includes("No backend found") ||
        error.message.includes("No TensorFlow.js backends")
      ) {
        console.error(
          "[DEBUG] Backend issue detected. Trying manual initialization...",
        );

        // Try manual backend setup
        try {
          // Force register CPU backend
          const cpuBackend = "cpu";
          await tf.setBackend(cpuBackend);
          await tf.ready();

          cocoSsdModel = await cocoSsd.load();
          modelLoaded = true;
          console.log("[DEBUG] Model loaded with forced CPU backend");
        } catch (cpuError) {
          throw new Error(
            `Failed to initialize any backend: ${cpuError.message}`,
          );
        }
      } else {
        throw new Error(`Failed to load COCO-SSD model: ${error.message}`);
      }
    }
  }
}

// UPDATED detectHuman function - TEMPORARILY DISABLED
export async function detectHuman(field, value) {
  // REMOVE THE BYPASS - use original logic
  if (!value || !(value instanceof File)) {
    return "No valid image file provided.";
  }

  try {
    await loadCocoSsdModel();

    // Create image from file
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load image"));
      image.src = URL.createObjectURL(value);
    });

    // Detect objects in the image using COCO-SSD
    const predictions = await cocoSsdModel.detect(img);

    // Revoke the object URL
    URL.revokeObjectURL(img.src);

    // Check if any prediction is a "person" with sufficient confidence
    const personPrediction = predictions.find(
      (pred) => pred.class === "person" && pred.score > 0.5,
    );

    if (personPrediction) {
      return true;
    } else {
      return "No human detected in the image. Please upload a photo containing a human.";
    }
  } catch (error) {
    console.error("Error in detectHuman with COCO-SSD:", error);

    // Provide specific error messages
    if (
      error.message.includes("backend") ||
      error.message.includes("Backend")
    ) {
      return "Human detection failed: Graphics/GPU issue. Please try again or use a different browser.";
    }

    return "Human detection failed due to an error. Please try again.";
  }
}

export const runValidations = async (
  field,
  value,
  formData,
  referenceNumber,
  setValue,
) => {
  if (!Array.isArray(field.validationFunctions)) return true;
  for (const validationFn of field.validationFunctions) {
    const fun = ValidationFunctionsList[validationFn];
    if (typeof fun !== "function") continue;
    try {
      let error = await fun(
        field,
        value || "",
        formData,
        referenceNumber,
        setValue,
      );
      if (error !== true) return error;
    } catch (err) {
      return "Validation failed due to an unexpected error.";
    }
  }
  return true;
};
export function formatKey(input) {
  if (!input) return input; // Check for empty or null input
  // Use Regex to insert space before each capital letter, except for the first one
  const result = input.replace(/(?<!^)([A-Z])/g, " $1");
  return result;
}
// Mapping of Validation Functions
const ValidationFunctionsList = {
  notEmpty,
  onlyAlphabets,
  onlyDigits,
  specificLength,
  isAgeGreaterThan,
  isEmailValid,
  isDateWithinRange,
  duplicateAccountNumber,
  validateFile,
  validateIfscCode,
  range,
  isDateAfterCurrentDate,
  isDateBeforeCurrentDate,
  detectHuman,
};
export const TransformationFunctionsList = {
  CaptilizeAlphabet: (value) => value.toUpperCase(),
  MaskAadhaar: (value, aadhaarNumber) => {
    const input =
      typeof aadhaarNumber === "string" && aadhaarNumber.length > 0
        ? aadhaarNumber
        : value;
    let digitCount = 0;
    return input.replace(/\d/g, (digit) => {
      return digitCount++ < 8 ? "X" : digit;
    });
  },
};
export const validationFunctionsList = [
  { id: "notEmpty", label: "Required" },
  { id: "onlyAlphabets", label: "Only Alphabets" },
  { id: "onlyDigits", label: "Only Digits" },
  { id: "specificLength", label: "Specific Length" },
  { id: "isAgeGreaterThan", label: "Age Limit" },
  { id: "isEmailValid", label: "Email Format" },
  { id: "isDateWithinRange", label: "Date Range" },
  { id: "duplicateAccountNumber", label: "Duplicate Account Number" },
  { id: "validateFile", label: "Validate File" },
  { id: "validateIfscCode", label: "Validate IFSC" },
  { id: "range", label: "Range Value" },
  { id: "isDateAfterCurrentDate", label: "After Current Date" },
  { id: "isDateBeforeCurrentDate", label: "Before Current Date" },
  { id: "detectHuman", label: "Detect Human" },
];
export const transformationFunctionsList = [
  { id: "CaptilizeAlphabet", label: "Capital Alphabets" },
  { id: "handleCopyAddress", label: "Copy Address" },
  { id: "MaskAadhaar", label: "Mask Aadhaar" },
];
