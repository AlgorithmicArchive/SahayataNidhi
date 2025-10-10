import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // Utility to safely parse JSON from sessionStorage
  const safeParse = (key, defaultValue) => {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.error(`Failed to parse ${key} from sessionStorage:`, error);
      return defaultValue;
    }
  };

  // Initialize state with safe parsing
  const [userType, setUserType] = useState(
    () => sessionStorage.getItem("userType") || null,
  );
  const [token, setToken] = useState(
    () => sessionStorage.getItem("token") || null,
  );
  const [username, setUsername] = useState(
    () => sessionStorage.getItem("username") || null,
  );
  const [userId, setUserId] = useState(
    () => sessionStorage.getItem("userId") || null,
  );
  const [profile, setProfile] = useState(() => safeParse("profile", null));
  const [verified, setVerified] = useState(() => safeParse("verified", false));
  const [designation, setDesignation] = useState(
    () => sessionStorage.getItem("designation") || null,
  );
  const [officerAuthorities, setOfficerAuthorities] = useState(() =>
    safeParse("officerAuthorities", {}),
  );
  const [department, setDepartment] = useState(
    () => sessionStorage.getItem("department") || null,
  );
  const [tokenExpiry, setTokenExpiry] = useState(() =>
    safeParse("tokenExpiry", null),
  );

  // Sync state with sessionStorage
  useEffect(() => {
    if (userType) sessionStorage.setItem("userType", userType);
    else sessionStorage.removeItem("userType");
  }, [userType]);

  useEffect(() => {
    if (token) sessionStorage.setItem("token", token);
    else sessionStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    if (username) sessionStorage.setItem("username", username);
    else sessionStorage.removeItem("username");
  }, [username]);

  useEffect(() => {
    if (userId) sessionStorage.setItem("userId", userId);
    else sessionStorage.removeItem("userId");
  }, [userId]);

  useEffect(() => {
    if (profile) sessionStorage.setItem("profile", JSON.stringify(profile));
    else sessionStorage.removeItem("profile");
  }, [profile]);

  useEffect(() => {
    sessionStorage.setItem("verified", JSON.stringify(verified));
  }, [verified]);

  useEffect(() => {
    if (designation) sessionStorage.setItem("designation", designation);
    else sessionStorage.removeItem("designation");
  }, [designation]);

  useEffect(() => {
    if (officerAuthorities && Object.keys(officerAuthorities).length > 0) {
      sessionStorage.setItem(
        "officerAuthorities",
        JSON.stringify(officerAuthorities),
      );
    } else {
      sessionStorage.removeItem("officerAuthorities");
    }
  }, [officerAuthorities]);

  useEffect(() => {
    if (department) sessionStorage.setItem("department", department);
    else sessionStorage.removeItem("department");
  }, [department]);

  useEffect(() => {
    if (tokenExpiry)
      sessionStorage.setItem("tokenExpiry", JSON.stringify(tokenExpiry));
    else sessionStorage.removeItem("tokenExpiry");
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
        userId,
        setUserId,
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
