import axiosInstance from "../axiosConfig"; // Adjust the path as needed
import axios from "axios";

export async function Login(formData) {
  try {
    const response = await fetch("/Home/Login", {
      method: "POST",
      body: formData,
    });
    return response.json();
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

export async function Validate(formData) {
  try {
    const response = await axiosInstance.post("/Home/Verification", formData);
    return response.data; // Return response data directly, no need to parse
  } catch (error) {
    console.error("Verification failed:", error);
    throw error;
  }
}

export const fetchData = async (page, rowsPerPage, URL, params) => {
  try {
    const url = `${URL}?page=${page}&size=${rowsPerPage}`;
    const response = await axiosInstance.get(url, { params: params });
    return {
      data: response.data.data,
      totalCount: response.data.totalCount,
      columns: response.data.columns, // Columns are still included if dynamic
      currentPage: page,
      pageSize: rowsPerPage,
    };
  } catch (error) {
    console.error("Error while fetching data:", error);
    throw error;
  }
};

export const fetchDataPost = async (
  page,
  rowsPerPage,
  URL,
  params,
  formdata,
) => {
  try {
    console.log(formdata);
    const url = `${URL}?page=${page}&size=${rowsPerPage}`;
    const response = await axiosInstance.post(url, formdata);
    console.log(response.data);
    return {
      data: response.data.data,
      totalCount: response.data.totalCount,
      columns: response.data.columns, // Columns are still included if dynamic
      currentPage: page,
      pageSize: rowsPerPage,
    };
  } catch (error) {
    console.error("Error while fetching data:", error);
    throw error;
  }
};

export async function SetServiceId(formData) {
  try {
    // Make POST request to the desired endpoint with formData as the body
    const response = await axiosInstance.post("/User/SetServiceForm", formData);
    return response.data;
  } catch (error) {
    // Handle error
    console.error("Error setting service ID:", error);
    throw error;
  }
}

export async function GetServiceContent(ServiceId) {
  try {
    const response = await axiosInstance.get("/User/GetServiceContent", {
      params: { ServiceId },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting service content:", error);
    throw error;
  }
}

export const fetchDistrictsForService = async (setDistrictOptions) => {
  try {
    const response = await axiosInstance.get("/User/GetDistrictsForService");
    console.log(response);
    const { status, districts } = response.data;
    if (status) {
      const formattedDistricts = districts.map((district) => ({
        label: district.districtName,
        value: district.districtId,
      }));
      setDistrictOptions(formattedDistricts);
    } else {
      alert("Failed to load districts.");
    }
  } catch (error) {
    console.error("Error fetching districts:", error);
  }
};

export const fetchDistricts = async (setDistrictOptions) => {
  try {
    const response = await axios.get("/Base/GetDistricts");
    const { status, districts } = response.data;
    if (status) {
      const formattedDistricts = districts.map((district) => ({
        label: district.districtName,
        value: district.districtId,
      }));
      setDistrictOptions(formattedDistricts);
    } else {
      alert("Failed to load districts.");
    }
  } catch (error) {
    console.error("Error fetching districts:", error);
  }
};

export const fetchServiceList = async (
  setServices,
  setOfficerRole,
  setOfficerArea,
) => {
  try {
    const response = await axiosInstance.get("/Officer/GetServiceList");
    const serviceList = response.data.serviceList.map((item) => ({
      label: item.serviceName,
      value: item.serviceId,
    }));
    setServices(serviceList);
    setOfficerRole(response.data.role);
    setOfficerArea(response.data.area);
  } catch (error) {
    console.error("Failed to fetch service list:", error);
  }
};

export const fetchTehsils = async (districtId, setTehsilOptions) => {
  try {
    const response = await axios.get(
      `/Base/GetTeshilForDistrict?districtId=${districtId}`,
    );
    const { status, tehsils } = response.data;
    if (status) {
      const formattedTehsils = tehsils.map((tehsil) => ({
        label: tehsil.tehsilName,
        value: tehsil.tehsilId,
      }));
      setTehsilOptions(formattedTehsils);
    } else {
      alert("Failed to load tehsils.");
    }
  } catch (error) {
    console.error("Error fetching tehsils:", error);
  }
};

export const fetchBlocks = async (districtId, setBlockOptions) => {
  try {
    const response = await axios.get(
      `/Base/GetBlockForDistrict?districtId=${districtId}`,
    );
    const { status, blocks } = response.data;
    if (status) {
      const formattedBlocks = blocks.map((block) => ({
        label: block.blockName,
        value: block.blockId,
      }));
      setBlockOptions(formattedBlocks);
    } else {
      alert("Failed to load blocks.");
    }
  } catch (error) {
    console.error("Error fetching blocks:", error);
  }
};

export async function fetchDesignation(setDesignations, setAccessLevelMap) {
  try {
    const response = await axios.get("/Home/GetDesignations");
    const { status, designations } = response.data;
    if (status) {
      // Create an object with designation.designation as the key and designation.accessLevel as the value
      const designationObject = designations.reduce((acc, designation) => {
        acc[designation.designation] = designation.accessLevel;
        return acc;
      }, {});
      let Designations = designations.map((designation) => ({
        label: designation.designation,
        value: designation.designation,
      }));
      Designations = [{ label: "Select Option", value: "" }, ...Designations];
      setDesignations(Designations);
      setAccessLevelMap(designationObject);
    }
  } catch (error) {
    console.log("Error", error);
  }
}

export async function fetchAcknowledgement(applicationId) {
  try {
    const response = await axiosInstance.get("/User/GetAcknowledgement", {
      params: { ApplicationId: applicationId },
    });
    console.log("RESPONSE", response.data);
    const { fullPath } = response.data;
    console.log(fullPath);

    // Ensure that the path includes the protocol
    const completePath = fullPath.startsWith("http")
      ? fullPath
      : `http://localhost:5004/${fullPath}`;
    console.log("Complete PDF Path:", completePath);
    return { fullPath, completePath };
  } catch (error) {
    console.error("Error fetching PDF path:", error);
  }
}

export async function checkBankFile(districtId, serviceId) {
  const response = await axiosInstance.get(
    "/Officer/VerifyBankFileAndRecords",
    {
      params: { ServiceId: serviceId, DistrictId: districtId },
    },
  );
  return response.data;
}

export async function createBankFile(districtId, serviceId) {
  const response = await axiosInstance.get("/Officer/BankCsvFile", {
    params: { serviceId, districtId },
  });
}

export async function fetchUserDetail(
  applicationId,
  setFormDetails,
  setActionForm = null,
  setHaspending,
  setCanTakeAction = null,
  setPrivateFields = null,
  setCurrentOfficerDetails = null,
  setPreviousOfficer = null,
) {
  const response = await axiosInstance.get("/Officer/GetUserDetails", {
    params: { applicationId: applicationId },
  });
  console.log("Response", response.data);
  setFormDetails(response.data.list);
  setHaspending(response.data.hasPending);
  if (setActionForm != null)
    setActionForm(response.data.currentOfficerDetails.actionForm);
  if (setCanTakeAction != null) setCanTakeAction(!response.data.isSanctioned);
  if (setPrivateFields != null) setPrivateFields(response.data.privatedFields);

  if (setCurrentOfficerDetails != null)
    setCurrentOfficerDetails(response.data.currentOfficerDetails);
  if (setPreviousOfficer != null) {
    setPreviousOfficer(response.data.previousOfficer);
  }
}

export async function fetchFormDetails(applicationId) {
  const response = await axiosInstance.get("/User/GetFormDetails", {
    params: { applicationId: applicationId },
  });
  return {
    formDetails: response.data.formDetails,
    additionalDetails: response.data.additionalDetails,
  };
}

export async function fetchCertificateDetails() {
  try {
    const response = await axiosInstance.get("/Officer/GetCertificateDetails");
    console.log("fetchCertificateDetails response:", response.data); // Debug
    if (!response.data.success || !response.data.certificateDetails) {
      throw new Error("Failed to fetch certificate details.");
    }
    return response.data.certificateDetails;
  } catch (error) {
    console.error("Error fetching certificate details:", error);
    return null;
  }
}
