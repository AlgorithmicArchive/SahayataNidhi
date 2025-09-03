// axiosConfig.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/", // Replace with your API base URL
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // Retrieve token from localStorage
    if (token) {
      config.headers["Authorization"] = "Bearer " + token;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token might be expired or invalid
      localStorage.removeItem("token");
      localStorage.removeItem("userType");
      // Optionally, you can dispatch an event or use other methods to update your context
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
