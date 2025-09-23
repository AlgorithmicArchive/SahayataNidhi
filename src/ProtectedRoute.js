import React, { useContext, useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { UserContext } from "./UserContext";

const ProtectedRoute = ({ requiredRoles }) => {
  const {
    token,
    userType,
    verified,
    setToken,
    setUsername,
    setUserType,
    setProfile,
    setVerified,
  } = useContext(UserContext);

  const navigate = useNavigate();

  // Effect to handle unauthorized access by clearing data and redirecting
  useEffect(() => {
    if (
      !token ||
      !verified ||
      (requiredRoles && !requiredRoles.includes(userType))
    ) {
      // Clear user data
      setToken(null);
      setUserType(null);
      setUsername(null);
      setProfile(null);
      setVerified(false);
      sessionStorage.clear(); // Clear all sessionStorage on logout
      // Redirect to appropriate page after clearing data
      navigate(!token ? "/login" : "/unauthorized", { replace: true });
    }
  }, [
    token,
    verified,
    userType,
    requiredRoles,
    navigate,
    setToken,
    setUserType,
    setUsername,
    setProfile,
    setVerified,
  ]);

  // Render the outlet only if the user is authenticated and authorized
  return token &&
    verified &&
    (!requiredRoles || requiredRoles.includes(userType)) ? (
    <Outlet />
  ) : null;
};

export default ProtectedRoute;
