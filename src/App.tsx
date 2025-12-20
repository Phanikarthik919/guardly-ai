import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PipelineProvider } from "@/contexts/PipelineContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import RegulationMonitorPage from "./pages/agents/RegulationMonitorPage";
import LegalParserPage from "./pages/agents/LegalParserPage";
import TransactionUnderstandingPage from "./pages/agents/TransactionUnderstandingPage";
import ComplianceMappingPage from "./pages/agents/ComplianceMappingPage";
import AuditorAssistantPage from "./pages/agents/AuditorAssistantPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <PipelineProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/agents/regulation-monitor" element={
                <ProtectedRoute><RegulationMonitorPage /></ProtectedRoute>
              } />
              <Route path="/agents/legal-parser" element={
                <ProtectedRoute><LegalParserPage /></ProtectedRoute>
              } />
              <Route path="/agents/transaction-understanding" element={
                <ProtectedRoute><TransactionUnderstandingPage /></ProtectedRoute>
              } />
              <Route path="/agents/compliance-mapping" element={
                <ProtectedRoute><ComplianceMappingPage /></ProtectedRoute>
              } />
              <Route path="/agents/auditor-assistant" element={
                <ProtectedRoute><AuditorAssistantPage /></ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PipelineProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
