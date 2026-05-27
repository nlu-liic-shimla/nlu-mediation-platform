import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";

// Party pages
import PartyDashboard from "../pages/party/Dashboard";
import CaseDetails from "../pages/party/CaseDetails";
import IntakeWizard from "../pages/party/IntakeWizard";
import ProposalReview from "../pages/party/ProposalReview";
import Questionnaire from "../pages/party/Questionnaire";
import Settlement from "../pages/party/Settlement";
import UploadDocuments from "../pages/party/UploadDocuments";

// Mediator pages
import MediatorDashboard from "../pages/mediator/DashboardPage";
import CaseOverview from "../pages/mediator/CaseOverview";
import Analysis from "../pages/mediator/Analysis";
import ProposalManagement from "../pages/mediator/ProposalManagement";
import QuestionnaireManagement from "../pages/mediator/QuestionnaireManagement";

// Route guards
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/" element={<Login />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

        {/* ── Party routes (requesting_party + against_party) ── */}
        <Route
          path="/party"
          element={
            <ProtectedRoute>
              <RoleBasedRoute
                allowedRoles={["requesting_party", "against_party"]}
              >
                <PartyDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/party/cases/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute
                allowedRoles={["requesting_party", "against_party"]}
              >
                <CaseDetails />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/party/cases/:id/intake"
          element={
            <ProtectedRoute>
              <RoleBasedRoute
                allowedRoles={["requesting_party", "against_party"]}
              >
                <IntakeWizard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/party/cases/:id/questionnaire"
          element={
            <ProtectedRoute>
              <RoleBasedRoute
                allowedRoles={["requesting_party", "against_party"]}
              >
                <Questionnaire />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/party/cases/:id/proposal"
          element={
            <ProtectedRoute>
              <RoleBasedRoute
                allowedRoles={["requesting_party", "against_party"]}
              >
                <ProposalReview />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/party/cases/:id/documents"
          element={
            <ProtectedRoute>
              <RoleBasedRoute
                allowedRoles={["requesting_party", "against_party"]}
              >
                <UploadDocuments />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/party/cases/:id/settlement"
          element={
            <ProtectedRoute>
              <RoleBasedRoute
                allowedRoles={["requesting_party", "against_party"]}
              >
                <Settlement />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* ── Mediator routes ── */}
        <Route
          path="/mediator"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <MediatorDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mediator/cases/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <CaseOverview />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mediator/cases/:id/analysis"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <Analysis />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mediator/cases/:id/proposal"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <ProposalManagement />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mediator/cases/:id/questionnaire"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <QuestionnaireManagement />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
