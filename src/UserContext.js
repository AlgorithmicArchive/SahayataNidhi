import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userType, setUserType] = useState(() => {
    const savedUserType = localStorage.getItem("userType");
    return savedUserType ? JSON.parse(savedUserType) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || null;
  });

  const [username, setUsername] = useState(() => {
    return localStorage.getItem("username") || null;
  });

  const [profile, setProfile] = useState(() => {
    const savedProfile = localStorage.getItem("profile");
    return savedProfile ? JSON.parse(savedProfile) : null;
  });

  const [verified, setVerified] = useState(() => {
    const savedVerified = localStorage.getItem("verified");
    return savedVerified ? JSON.parse(savedVerified) : false;
  });

  const [designation, setDesignation] = useState(() => {
    const savedDesignation = localStorage.getItem("designation");
    return savedDesignation ? JSON.parse(savedDesignation) : null;
  });

  const [officerAuthorities, setOfficerAuthorities] = useState({});
  const [department, setDepartment] = useState(null); // New state for department

  const [tokenExpiry, setTokenExpiry] = useState(null); // New state for token expiry

  useEffect(() => {
    if (userType) {
      localStorage.setItem("userType", JSON.stringify(userType));
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
      localStorage.setItem("designation", JSON.stringify(designation));
    } else {
      localStorage.removeItem("designation");
    }
  }, [designation]);

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
        tokenExpiry,
        setTokenExpiry, // Expose tokenExpiry and setter
        officerAuthorities,
        setOfficerAuthorities,
        department,
        setDepartment, // Expose department and setter
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
