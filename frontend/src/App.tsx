import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAppSelector } from '@/store'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

import LoginPage from '@/components/pages/LoginPage'
import RegisterPage from '@/components/pages/RegisterPage'
import ForgotPasswordPage from '@/components/pages/ForgotPasswordPage'

const DashboardPage = lazy(() => import('@/components/pages/DashboardPage'))
const FamilyIntroPage = lazy(() => import('@/components/pages/FamilyIntroPage'))
const FamilyTreePage = lazy(() => import('@/components/pages/FamilyTreePage'))
const FamilyEventsPage = lazy(() => import('@/components/pages/FamilyEventsPage'))
const FamilyAlbumPage = lazy(() => import('@/components/pages/FamilyAlbumPage'))
const FamilyBranchesPage = lazy(() => import('@/components/pages/FamilyBranchesPage'))
const KinshipCalculatorPage = lazy(() => import('@/components/pages/KinshipCalculatorPage'))
const WufuChartPage = lazy(() => import('@/components/pages/WufuChartPage'))
const FamilySettingsPage = lazy(() => import('@/components/pages/FamilySettingsPage'))
const MemberDetailPage = lazy(() => import('@/components/pages/MemberDetailPage'))
const MemorialPage = lazy(() => import('@/components/pages/MemorialPage'))
const GedcomImportPage = lazy(() => import('@/components/pages/GedcomImportPage'))
const RelationshipPathPage = lazy(() => import('@/components/pages/RelationshipPathPage'))
const InkIconsShowcase = lazy(() => import('@/components/pages/InkIconsShowcase'))
const FamilyMapPage = lazy(() => import('@/components/pages/FamilyMapPage'))
const OcrImportPage = lazy(() => import('@/components/pages/OcrImportPage'))
const ZibeiPage = lazy(() => import('@/components/pages/ZibeiPage'))
const LineageChartPage = lazy(() => import('@/components/pages/LineageChartPage'))
const CousinTreePage = lazy(() => import('@/components/pages/CousinTreePage'))
const HistoryPage = lazy(() => import('@/components/pages/HistoryPage'))
const LivingBookPage = lazy(() => import('@/components/pages/LivingBookPage'))
const FamilyExhibitPage = lazy(() => import('@/components/pages/FamilyExhibitPage'))
const HonorWallPage = lazy(() => import('@/components/pages/HonorWallPage'))
const FeedPage = lazy(() => import('@/components/pages/FeedPage'))
const ChatPage = lazy(() => import('@/components/pages/ChatPage'))
const CouncilPage = lazy(() => import('@/components/pages/CouncilPage'))
const TemplePage = lazy(() => import('@/components/pages/TemplePage'))
const StatsPage = lazy(() => import('@/components/pages/StatsPage'))
const AdminUsersPage = lazy(() => import('@/components/pages/AdminUsersPage'))
const AdminDashboardPage = lazy(() => import('@/components/pages/AdminDashboardPage'))
const AdminConfigPage = lazy(() => import('@/components/pages/AdminConfigPage'))
const AdminAuditLogsPage = lazy(() => import('@/components/pages/AdminAuditLogsPage'))
const ProfilePage = lazy(() => import('@/components/pages/ProfilePage'))
const NotFoundPage = lazy(() => import('@/components/pages/NotFoundPage'))
const MemberBatchPage = lazy(() => import('@/components/pages/MemberBatchPage'))
const PublicFamilyTreePage = lazy(() => import('@/components/pages/PublicFamilyTreePage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!user?.is_admin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="relative min-h-screen">
          <div className="relative z-10">
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <RegisterPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPasswordPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/intro"
                element={
                  <ProtectedRoute>
                    <FamilyIntroPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/batch"
                element={
                  <ProtectedRoute>
                    <MemberBatchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id"
                element={
                  <ProtectedRoute>
                    <FamilyTreePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/events"
                element={
                  <ProtectedRoute>
                    <FamilyEventsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/album"
                element={
                  <ProtectedRoute>
                    <FamilyAlbumPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/branches"
                element={
                  <ProtectedRoute>
                    <FamilyBranchesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/kinship"
                element={
                  <ProtectedRoute>
                    <KinshipCalculatorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/path"
                element={
                  <ProtectedRoute>
                    <RelationshipPathPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/icons"
                element={
                  <ProtectedRoute>
                    <InkIconsShowcase />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/wufu/:memberId"
                element={
                  <ProtectedRoute>
                    <WufuChartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/settings"
                element={
                  <ProtectedRoute>
                    <FamilySettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/member/:memberId"
                element={
                  <ProtectedRoute>
                    <MemberDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/memorial"
                element={
                  <ProtectedRoute>
                    <MemorialPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/gedcom"
                element={
                  <ProtectedRoute>
                    <GedcomImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/map"
                element={
                  <ProtectedRoute>
                    <FamilyMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/ocr"
                element={
                  <ProtectedRoute>
                    <OcrImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/zibei"
                element={
                  <ProtectedRoute>
                    <ZibeiPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/lineage"
                element={
                  <ProtectedRoute>
                    <LineageChartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/cousin"
                element={
                  <ProtectedRoute>
                    <CousinTreePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/book"
                element={
                  <ProtectedRoute>
                    <LivingBookPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/exhibit"
                element={
                  <ProtectedRoute>
                    <FamilyExhibitPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/oldbook"
                element={
                  <ProtectedRoute>
                    <LivingBookPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/honors"
                element={
                  <ProtectedRoute>
                    <HonorWallPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/feed"
                element={
                  <ProtectedRoute>
                    <FeedPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/council"
                element={
                  <ProtectedRoute>
                    <CouncilPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/temple"
                element={
                  <ProtectedRoute>
                    <TemplePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/family/:id/stats"
                element={
                  <ProtectedRoute>
                    <StatsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AdminUsersPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/config"
                element={
                  <AdminRoute>
                    <AdminConfigPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <AdminRoute>
                    <AdminAuditLogsPage />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
              <Route
                path="/share/:token"
                element={<PublicFamilyTreePage />}
              />
            </Routes>
            </Suspense>
          </div>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
