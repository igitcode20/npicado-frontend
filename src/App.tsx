import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UsageProvider } from './context/UsageContext'
import { AppShell } from './components/AppShell'
import {
  AdminRoute,
  ProtectedRoute,
  PublicOnlyRoute,
} from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { ChatPage } from './pages/ChatPage'
import { GeneratePage } from './pages/GeneratePage'
import { LibraryPage } from './pages/LibraryPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { ProfilePage } from './pages/ProfilePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <UsageProvider>
                  <AppShell />
                </UsageProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/chat" replace />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="generar" element={<GeneratePage />} />
            <Route path="biblioteca" element={<LibraryPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route
              path="admin/usuarios"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
