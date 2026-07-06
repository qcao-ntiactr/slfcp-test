import { Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import {
  queryClient,
  initializeQueryPersistence,
} from './services/reactQueryService';
import { Layout } from './components/Layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { ViewRequestsPage } from './pages/ViewRequestsPage';
import ProtectedRoute from './routes/ProtectedRoute';
import { HybridAuthProvider, UserRole } from './context/HybridAuthContext';
import { ConfirmNavigationModalProvider } from './context/ConfirmNavigationModalContext';
import './styles.css';
import { ViewDetailsPage } from './pages/ViewDetailsPage';
import { ReviseRequestPage } from './pages/ReviseRequestPage';
import { NewRequestPage } from './pages/NewRequestPage';
import { HelpPage } from './pages/HelpPage';
import { InquiryPage } from './pages/InquiryPage';
import { EditDraftPage } from './pages/EditDraftPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { Dashboard } from './pages/DashboardPage';
import { CommonConditionsPage } from './pages/CommonConditionsPage';
import { COMMON_CONDITIONS_ALLOWED_ROLES } from './components/Layout/NavBar/navbarConfig';
import { InstructionalPage } from './pages/InstructionalPage';

// 🔹 Initialize React Query session persistence before rendering
initializeQueryPersistence();

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HybridAuthProvider>
        <ConfirmNavigationModalProvider>
          <Routes>
            <Route path="/login" element={<SignInPage />} />
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/user-instructions" element={<InstructionalPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<LandingPage />} />
              <Route path="create-request" element={<NewRequestPage />} />
              <Route path="view-requests" element={<ViewRequestsPage />} />
              <Route
                path="view-details/:requestId"
                element={<ViewDetailsPage />}
              />
              <Route path="inquiries/:requestId" element={<InquiryPage />} />
              <Route
                path="revise-request/:requestId"
                element={<ReviseRequestPage />}
              />
              <Route
                path="edit-draft/:requestDraftId"
                element={<EditDraftPage />}
              />
              <Route
                path="common-conditions"
                element={
                  <ProtectedRoute
                    allowedRoles={[...COMMON_CONDITIONS_ALLOWED_ROLES]}
                  >
                    <CommonConditionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute requiredRole={UserRole.ntia}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="help" element={<HelpPage />} />
            </Route>
          </Routes>
        </ConfirmNavigationModalProvider>
      </HybridAuthProvider>
    </QueryClientProvider>
  );
};
