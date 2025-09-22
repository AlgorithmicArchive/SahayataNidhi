import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Utility to safely parse JSON from localStorage
  const safeParse = (key, defaultValue) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`Failed to parse ${key} from localStorage:`, error);
      return defaultValue;
    }
  };

  // Initialize state with safe parsing
  const [userType, setUserType] = useState(
    () => localStorage.getItem("userType") || null,
  );
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null,
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || null,
  );
  const [profile, setProfile] = useState(() => safeParse("profile", null));
  const [verified, setVerified] = useState(() => safeParse("verified", false));
  const [designation, setDesignation] = useState(
    () => localStorage.getItem("designation") || null,
  );
  const [officerAuthorities, setOfficerAuthorities] = useState(() =>
    safeParse("officerAuthorities", {}),
  );
  const [department, setDepartment] = useState(
    () => localStorage.getItem("department") || null,
  );
  const [tokenExpiry, setTokenExpiry] = useState(() =>
    safeParse("tokenExpiry", null),
  );

  // Sync state with localStorage
  useEffect(() => {
    if (userType) {
      localStorage.setItem("userType", userType);
    } else {
      localStorage.removeItem("userType");
    }
  }, [userType]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (username) {
      localStorage.setItem("username", username);
    } else {
      localStorage.removeItem("username");
    }
  }, [username]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem("profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("profile");
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("verified", JSON.stringify(verified));
  }, [verified]);

  useEffect(() => {
    if (designation) {
      localStorage.setItem("designation", designation);
    } else {
      localStorage.removeItem("designation");
    }
  }, [designation]);

  useEffect(() => {
    if (officerAuthorities && Object.keys(officerAuthorities).length > 0) {
      localStorage.setItem(
        "officerAuthorities",
        JSON.stringify(officerAuthorities),
      );
    } else {
      localStorage.removeItem("officerAuthorities");
    }
  }, [officerAuthorities]);

  useEffect(() => {
    if (department) {
      localStorage.setItem("department", department);
    } else {
      localStorage.removeItem("department");
    }
  }, [department]);

  useEffect(() => {
    if (tokenExpiry) {
      localStorage.setItem("tokenExpiry", JSON.stringify(tokenExpiry));
    } else {
      localStorage.removeItem("tokenExpiry");
    }
  }, [tokenExpiry]);

  return (
    <UserContext.Provider
      value={{
        userType,
        setUserType,
        token,
        setToken,
        username,
        setUsername,
        profile,
        setProfile,
        verified,
        setVerified,
        designation,
        setDesignation,
        officerAuthorities,
        setOfficerAuthorities,
        department,
        setDepartment,
        tokenExpiry,
        setTokenExpiry,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
