import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/app-layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Arrivals from "./pages/Arrivals";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Returns from "./pages/Returns";
import Inventory from "./pages/Inventory";
import Users from "./pages/Users";
import Stores from "./pages/Stores";
import Suppliers from "./pages/Suppliers";
import FinancialManagement from "./pages/FinancialManagement";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Transfers from "./pages/Transfers";
import Configuration from "./pages/Configuration";
import PendingValidation from "./pages/PendingValidation";
import Gamification from "./pages/Gamification";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/pending" element={<PendingValidation />} />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'dashboard'}>
                      <AppLayout>
                        <Admin />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['Vendeur', 'Manager', 'Admin', 'SuperAdmin']} pageKey={'dashboard'}>
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/products" 
                  element={
                    <ProtectedRoute allowedRoles={['Vendeur', 'Manager', 'Admin', 'SuperAdmin']} pageKey={'products'}>
                      <AppLayout>
                        <Products />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/arrivals" 
                  element={
                    <ProtectedRoute allowedRoles={['Manager', 'Admin', 'SuperAdmin']} pageKey={'arrivals'}>
                      <AppLayout>
                        <Arrivals />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/purchases" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'purchases'}>
                      <AppLayout>
                        <Purchases />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/sales" 
                  element={
                    <ProtectedRoute allowedRoles={['Vendeur', 'Manager', 'Admin', 'SuperAdmin']} pageKey={'sales'}>
                      <AppLayout>
                        <Sales />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/returns" 
                  element={
                    <ProtectedRoute allowedRoles={['Vendeur', 'Manager', 'Admin', 'SuperAdmin']} pageKey={'returns'}>
                      <AppLayout>
                        <Returns />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/transfers" 
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin']} pageKey={'transfers'}>
                      <AppLayout>
                        <Transfers />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/inventory" 
                  element={
                    <ProtectedRoute allowedRoles={['Manager', 'Admin', 'SuperAdmin']} pageKey={'inventory'}>
                      <AppLayout>
                        <Inventory />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/users" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'users'}>
                      <AppLayout>
                        <Users />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/stores" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'stores'}>
                      <AppLayout>
                        <Stores />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/suppliers" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'suppliers'}>
                      <AppLayout>
                        <Suppliers />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/financial" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'financial'}>
                      <AppLayout>
                        <FinancialManagement />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/analytics" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'analytics'}>
                      <AppLayout>
                        <Analytics />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/reports" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'reports'}>
                      <AppLayout>
                        <Reports />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'settings'}>
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/configuration" 
                  element={
                    <ProtectedRoute allowedRoles={['SuperAdmin']} pageKey={'configuration'}>
                      <AppLayout>
                        <Configuration />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/gamification" 
                  element={
                    <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']} pageKey={'gamification'}>
                      <AppLayout>
                        <Gamification />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute allowedRoles={['Vendeur', 'Manager', 'Admin', 'SuperAdmin']} pageKey={'profile'}>
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    </ProtectedRoute>
                  } 
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
