// RoutesComponent.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import HomeScreen from "../screens/home/HomeScreen";
import LoginScreen from "../screens/home/LoginScreen";
import RegisterScreen from "../screens/home/Registration";
import Verification from "../screens/home/Verification";
import UserHome from "../screens/user/UserHome";
import Services from "../screens/user/Services";
import UserLayout from "../screens/user/UserLayout";
import DesignerLayout from "../screens/designer/DesignerLayout";
import Dashboard from "../screens/designer/Dashboard";
import Form from "../screens/user/Form";
import ProtectedRoute from "../ProtectedRoute"; // Import the ProtectedRoute component
import Unauthorized from "../screens/Unauthorized"; // Create this component
import OfficerRegisterScreen from "../screens/home/OfficerRegisterScreen";
import Acknowledgement from "../screens/user/Acknowledgement";
import Initiated from "../screens/user/Initiated";
import Incomplete from "../screens/user/Incomplete";
import OfficerLayout from "../screens/officer/OfficerLayout";
import OfficerHome from "../screens/officer/OfficerHome";
import Reports from "../screens/officer/Reports";
import UserDetails from "../screens/officer/UserDetails";
import AdminLayout from "../screens/admin/AdminLayout";
import AdminHome from "../screens/admin/AdminHome";
import EditForm from "../screens/user/EditForm";
import BankFile from "../screens/officer/BankFile";
import ResponseFile from "../screens/officer/ResponseFile";
import Settings from "../screens/Settings";
import CreateService from "../screens/designer/CreateService";
import DynamicScrollableForm from "../screens/designer/Form";
import CreateWorkflow from "../screens/designer/CreateWorkFlow";
import ViewUserDetails from "../screens/officer/ViewUserDetails";
import IncompleteForm from "../screens/user/IncompleteForm";
import CreateLetterPdf from "../screens/designer/CreateLetterPdf";
import RegisterDSC from "../screens/officer/RegisterDSC";
import CreateWebService from "../screens/designer/CreateWebService";
import ForgotPassword from "../screens/home/ForgotPassword";
import ReportsAdmin from "../screens/admin/Reports";
import AddAdmin from "../screens/admin/AddAdmin";
import ValidateOfficer from "../screens/admin/ValidateOfficer";
import EmailSettings from "../screens/designer/EmailSettings";
import ViewerLayout from "../screens/viewer/ViewerLayout";
import ViewerHome from "../screens/viewer/ViewerHome";
import IssueCorrigendum from "../screens/officer/IssueCorrigendum";
import ViewCorrigendumDetails from "../screens/officer/ViewCorrigendumDetails";
import Corrections from "../screens/designer/Corrections";
import UpdateExpiringDocument from "../screens/user/UpdateExpiringDocument";
import Withheld from "../screens/officer/Withheld";
import ValidateAadhaar from "../screens/officer/ValidateAadhaar";
import AadhaarValidations from "../screens/viewer/AadhaarValidations";
import OfficerAadhaarValidations from "../screens/officer/AadhaarValidations";
import SearchApplication from "../screens/officer/SearchApplication";
import CreateReports from "../screens/designer/CreateReports";
import AddDesignations from "../screens/admin/AddDesignations";
import AddDepartment from "../screens/admin/AddDepartment";
import Feedback from "../screens/Feedback";
import ViewFeedbacks from "../screens/admin/ViewFeedbacks";
import SubmissionLimitations from "../screens/designer/SubmissionLimitations";
import AddOffices from "../screens/admin/AddOffices";
import AddOfficeDetails from "../screens/admin/AddOfficeDetails";
import NotValidated from "../screens/home/NotValidated";
import OfficerChoice from "../screens/home/OfficerChoice";

const RoutesComponent = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/choice" element={<OfficerChoice />} />
      <Route path="/verification" element={<Verification />} />
      <Route path="/notValidated" element={<NotValidated />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/officerRegistration" element={<OfficerRegisterScreen />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Unauthorized Route */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute requiredRoles={["Citizen"]} />}>
        <Route path="/user" element={<UserLayout />}>
          <Route path="home" element={<UserHome />} />
          <Route path="services" element={<Services />} />
          <Route path="form" element={<Form />} />
          <Route path="acknowledge" element={<Acknowledgement />} />
          <Route path="initiated" element={<Initiated />} />
          <Route path="incomplete" element={<Incomplete />} />
          <Route path="incompleteform" element={<IncompleteForm />} />
          <Route path="editform" element={<EditForm />} />
          <Route
            path="updateexpiringdocument"
            element={<UpdateExpiringDocument />}
          />
        </Route>
      </Route>
      <Route element={<ProtectedRoute requiredRoles={["Officer"]} />}>
        <Route path="/officer" element={<OfficerLayout />}>
          <Route path="home" element={<OfficerHome />} />
          <Route path="reports" element={<Reports />} />
          <Route path="userDetails" element={<UserDetails />} />
          <Route path="viewUserDetails" element={<ViewUserDetails />} />
          <Route path="bankFile" element={<BankFile />} />
          <Route path="responseFile" element={<ResponseFile />} />
          <Route path="registerdsc" element={<RegisterDSC />} />
          <Route path="issuecorrigendum" element={<IssueCorrigendum />} />
          <Route path="withheld" element={<Withheld />} />
          <Route
            path="aadhaarvalidations"
            element={<OfficerAadhaarValidations />}
          />
          <Route
            path="viewcorrigendumdetails"
            element={<ViewCorrigendumDetails />}
          />
          <Route path="validateaadhaar" element={<ValidateAadhaar />} />
          <Route path="searchapplication" element={<SearchApplication />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute requiredRoles={["Viewer"]} />}>
        <Route path="/viewer" element={<ViewerLayout />}>
          <Route path="home" element={<ViewerHome />} />
          <Route path="aadhaarvalidations" element={<AadhaarValidations />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute requiredRoles={["Admin"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="home" element={<AdminHome />} />
          <Route path="reports" element={<ReportsAdmin />} />
          <Route path="addadmin" element={<AddAdmin />} />
          <Route path="addDesignations" element={<AddDesignations />} />
          <Route path="addDepartment" element={<AddDepartment />} />
          <Route path="addOffices" element={<AddOffices />} />
          <Route path="addOfficeDetails" element={<AddOfficeDetails />} />
          <Route path="viewFeedbacks" element={<ViewFeedbacks />} />
          <Route path="validateofficer" element={<ValidateOfficer />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute requiredRoles={["Designer"]} />}>
        <Route path="/designer" element={<DesignerLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="createservice" element={<CreateService />} />
          <Route path="createworkflow" element={<CreateWorkflow />} />
          <Route path="createletterpdf" element={<CreateLetterPdf />} />
          <Route path="createwebservice" element={<CreateWebService />} />
          <Route path="createreports" element={<CreateReports />} />
          <Route path="dynamicform" element={<DynamicScrollableForm />} />
          <Route path="emailsettings" element={<EmailSettings />} />
          <Route path="corrections" element={<Corrections />} />
          <Route
            path="submissionlimitations"
            element={<SubmissionLimitations />}
          />
          {/* <Route path="createreports" element={<CreateReports />} /> */}
        </Route>
      </Route>
      <Route
        element={
          <ProtectedRoute
            requiredRoles={[
              "Citizen",
              "Officer",
              "Admin",
              "Designer",
              "Viewer",
            ]}
          />
        }
      >
        <Route path="/settings" element={<Settings />} />
        <Route path="/feedback" element={<Feedback />} />
      </Route>
    </Routes>
  );
};

export default RoutesComponent;
