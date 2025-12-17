import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import OwnerDashboard from './pages/OwnerDashboard'
import TenantDashboard from './pages/TenantDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import PropertySearch from './pages/PropertySearch'
import PropertyDetail from './pages/PropertyDetail'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/properties/search" element={<PropertySearch />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <div className="container mx-auto px-4 py-16">
                  <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">
                      Welcome to PropertyHub
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                      Your comprehensive property rental management solution.
                      Access your dashboard to manage properties, rentals, and more.
                    </p>
                  </div>
                </div>
              </ProtectedRoute>
            } />

            <Route path="/owner/dashboard" element={
              <ProtectedRoute allowedRoles={['owner']}>
                <OwnerDashboard />
              </ProtectedRoute>
            } />

            <Route path="/tenant/dashboard" element={
              <ProtectedRoute allowedRoles={['tenant']}>
                <TenantDashboard />
              </ProtectedRoute>
            } />

            <Route path="/manager/dashboard" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        <Toaster />
      </div>
    </AuthProvider>
  )
}

export default App
