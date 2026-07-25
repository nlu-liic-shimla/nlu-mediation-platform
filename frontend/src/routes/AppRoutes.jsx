// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// // Auth pages
// import Login from "../pages/auth/Login";
// import Register from "../pages/auth/Register";
// import ForgotPassword from "../pages/auth/ForgotPassword";
// import InvitationAccept from "../pages/auth/InvitationAccept";

// // Party pages
// import PartyDashboard from "../pages/party/Dashboard";
// import CaseDetails from "../pages/party/CaseDetails";
// import IntakeWizard from "../pages/party/IntakeWizard";
// import ProposalReview from "../pages/party/ProposalReview";
// import Questionnaire from "../pages/party/Questionnaire";
// import Settlement from "../pages/party/Settlement";
// import UploadDocuments from "../pages/party/UploadDocuments";

// // Mediator pages
// import MediatorDashboard from "../pages/mediator/DashboardPage";
// import CaseOverview from "../pages/mediator/CaseOverview";
// import Analysis from "../pages/mediator/Analysis";
// import ProposalManagement from "../pages/mediator/ProposalManagement";
// import QuestionnaireManagement from "../pages/mediator/QuestionnaireManagement";

// // Route guards
// import ProtectedRoute from "./ProtectedRoute";
// import RoleBasedRoute from "./RoleBasedRoute";

// export default function AppRoutes() {
//   return (
//     <BrowserRouter>
//       <Routes>

//         {/* ── Public routes ── */}
//         <Route path="/" element={<Login />} />
//         <Route path="/auth/login" element={<Login />} />
//         <Route path="/auth/register" element={<Register />} />
//         <Route path="/auth/forgot-password" element={<ForgotPassword />} />
//         <Route path="/invitations/:token" element={<InvitationAccept />} />

//         {/* ── Party routes (requesting_party + against_party) ── */}
//         <Route
//           path="/party/cases/:id/intake"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute
//                 allowedRoles={["requesting_party", "against_party"]}
//               >
//                 <IntakeWizard />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/party"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute allowedRoles={["party_user"]}>
//                 <PartyDashboard />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/party/cases/:id"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute allowedRoles={["party_user"]}>
//                 <CaseDetails />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/party/cases/:id/intake"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute allowedRoles={["party_user"]}>
//                 <IntakeWizard />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/party/cases/:id/questionnaire"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute allowedRoles={["party_user"]}>
//                 <Questionnaire />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/party/cases/:id/proposal"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute allowedRoles={["party_user"]}>
//                 <ProposalReview />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/party/cases/:id/documents"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute allowedRoles={["party_user"]}>
//                 <UploadDocuments />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/party/cases/:id/settlement"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute allowedRoles={["party_user"]}>
//                 <Settlement />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />
//         <Route path="/invitations/:token" element={<InvitationAccept />} />

//         <Route
//           path="/party/cases/:id/intake"
//           element={
//             <ProtectedRoute>
//               <RoleBasedRoute
//                 allowedRoles={["requesting_party", "against_party"]}
//               >
//                 <IntakeWizard />
//               </RoleBasedRoute>
//             </ProtectedRoute>
//           }
//         />

//         {/* ── Mediator routes ── */}
//         <Route path="/mediator" element={
//           <ProtectedRoute>
//             <RoleBasedRoute allowedRoles={["mediator"]}>
//               <MediatorDashboard />
//             </RoleBasedRoute>
//           </ProtectedRoute>
//         } />

//         <Route path="/mediator/cases/:id" element={
//           <ProtectedRoute>
//             <RoleBasedRoute allowedRoles={["mediator"]}>
//               <CaseOverview />
//             </RoleBasedRoute>
//           </ProtectedRoute>
//         } />

//         <Route path="/mediator/cases/:id/analysis" element={
//           <ProtectedRoute>
//             <RoleBasedRoute allowedRoles={["mediator"]}>
//               <Analysis />
//             </RoleBasedRoute>
//           </ProtectedRoute>
//         } />

//         <Route path="/mediator/cases/:id/proposal" element={
//           <ProtectedRoute>
//             <RoleBasedRoute allowedRoles={["mediator"]}>
//               <ProposalManagement />
//             </RoleBasedRoute>
//           </ProtectedRoute>
//         } />

//         <Route path="/mediator/cases/:id/questionnaire" element={
//           <ProtectedRoute>
//             <RoleBasedRoute allowedRoles={["mediator"]}>
//               <QuestionnaireManagement />
//             </RoleBasedRoute>
//           </ProtectedRoute>
//         } />

//         <Route path="/mediator/analysis" element={
//           <ProtectedRoute>
//             <RoleBasedRoute allowedRoles={["mediator"]}>
//               <Analysis />
//             </RoleBasedRoute>
//           </ProtectedRoute>
//         } />

//         <Route path="/mediator/proposals" element={
//           <ProtectedRoute>
//             <RoleBasedRoute allowedRoles={["mediator"]}>
//               <ProposalManagement />
//             </RoleBasedRoute>
//           </ProtectedRoute>
//         } />

//         {/* ── Fallback ── */}
//         <Route path="*" element={<Navigate to="/" replace />} />

//       </Routes>
//     </BrowserRouter>
//   );
// }

// src/routes/AppRoutes.jsx
// Fixed: removed 2 duplicate /party/cases/:id/intake routes
// Fixed: removed 1 duplicate /invitations/:token route
// Fixed: requesting_party + against_party roles added to /party route

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import InvitationAccept from "../pages/auth/InvitationAccept";

import PartyDashboard from "../pages/party/Dashboard";
import CaseDetails from "../pages/party/CaseDetails";
import IntakeWizard from "../pages/party/IntakeWizard";
import ProposalReview from "../pages/party/ProposalReview";
import Questionnaire from "../pages/party/Questionnaire";
import Settlement from "../pages/party/Settlement";
import ApplyForMediation from "../pages/party/ApplyForMediation";
import UploadDocuments from "../pages/party/UploadDocuments";

import MediatorDashboard from "../pages/mediator/DashboardPage";
import CaseOverview from "../pages/mediator/CaseOverview";
import Analysis from "../pages/mediator/Analysis";
import ProposalManagement from "../pages/mediator/ProposalManagement";
import QuestionnaireManagement from "../pages/mediator/QuestionnaireManagement";
import AdminPanel from "../pages/mediator/AdminPanel";

import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";

import BatnaWatna from "../pages/mediator/BatnaWatna";
import ProposalEditor from "../pages/mediator/ProposalEditor";
import ProposalRevision from "../pages/mediator/ProposalRevision";
import FinaliseCase from "../pages/mediator/FinaliseCase";
import AuditLog from "../pages/mediator/AuditLog";

const PARTY_ROLES = ["party_user", "requesting_party", "against_party"];

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<Login />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/invitations/:token" element={<InvitationAccept />} />

        {/* ── Party ── */}
        <Route
          path="/party"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <PartyDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/apply"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <ApplyForMediation />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/cases/:id"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <CaseDetails />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/cases/:id/intake"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <IntakeWizard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/cases/:id/questionnaire"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <Questionnaire />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/cases/:id/proposal"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <ProposalReview />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/cases/:id/documents"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <UploadDocuments />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/party/cases/:id/settlement"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={PARTY_ROLES}>
                <Settlement />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* ── Mediator ── */}
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

        <Route
          path="/mediator/analysis"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <Analysis />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mediator/proposals"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <ProposalManagement />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mediator/cases/:id/proposals"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <ProposalManagement />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mediator/cases/:id/questionnaires"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <QuestionnaireManagement />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/mediator/cases/:id/batna-watna"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <BatnaWatna />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mediator/cases/:id/proposals/new"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <ProposalEditor />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mediator/cases/:id/proposals/:p_id/revise"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <ProposalRevision />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mediator/cases/:id/finalise"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <FinaliseCase />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mediator/cases/:id/audit-log"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <AuditLog />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mediator/admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["mediator"]}>
                <AdminPanel />
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

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
