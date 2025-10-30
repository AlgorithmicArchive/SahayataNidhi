import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  // ---------- Helper ----------
  const safeParse = (key, defaultValue) => {
    try {
      const v = sessionStorage.getItem(key);
      return v ? JSON.parse(v) : defaultValue;
    } catch (e) {
      console.error(`Failed to parse ${key}`, e);
      return defaultValue;
    }
  };

  // ---------- State ----------
  const [userType, setUserType] = useState(
    () => sessionStorage.getItem("userType") || null,
  );
  const [actualUserType, setActualUserType] = useState(
    () => sessionStorage.getItem("actualUserType") || null,
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

  // ---------- Sync with sessionStorage ----------
  useEffect(() => {
    userType
      ? sessionStorage.setItem("userType", userType)
      : sessionStorage.removeItem("userType");
  }, [userType]);

  useEffect(() => {
    actualUserType
      ? sessionStorage.setItem("actualUserType", actualUserType)
      : sessionStorage.removeItem("actualUserType");
  }, [actualUserType]);

  useEffect(() => {
    token
      ? sessionStorage.setItem("token", token)
      : sessionStorage.removeItem("token");
  }, [token]);

  useEffect(() => {
    username
      ? sessionStorage.setItem("username", username)
      : sessionStorage.removeItem("username");
  }, [username]);

  useEffect(() => {
    userId
      ? sessionStorage.setItem("userId", userId)
      : sessionStorage.removeItem("userId");
  }, [userId]);

  useEffect(() => {
    profile
      ? sessionStorage.setItem("profile", JSON.stringify(profile))
      : sessionStorage.removeItem("profile");
  }, [profile]);

  useEffect(() => {
    sessionStorage.setItem("verified", JSON.stringify(verified));
  }, [verified]);

  useEffect(() => {
    designation
      ? sessionStorage.setItem("designation", designation)
      : sessionStorage.removeItem("designation");
  }, [designation]);

  useEffect(() => {
    officerAuthorities && Object.keys(officerAuthorities).length
      ? sessionStorage.setItem(
          "officerAuthorities",
          JSON.stringify(officerAuthorities),
        )
      : sessionStorage.removeItem("officerAuthorities");
  }, [officerAuthorities]);

  useEffect(() => {
    department
      ? sessionStorage.setItem("department", department)
      : sessionStorage.removeItem("department");
  }, [department]);

  useEffect(() => {
    tokenExpiry
      ? sessionStorage.setItem("tokenExpiry", JSON.stringify(tokenExpiry))
      : sessionStorage.removeItem("tokenExpiry");
  }, [tokenExpiry]);

  return (
    <UserContext.Provider
      value={{
        // current view
        userType,
        setUserType,
        // original role (from SSO / DB)
        actualUserType,
        setActualUserType,
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
