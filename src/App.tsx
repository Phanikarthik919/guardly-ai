import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PipelineProvider } from "@/contexts/PipelineContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ProblemPage from "./pages/dashboard/ProblemPage";
import SolutionPage from "./pages/dashboard/SolutionPage";
import ArchitecturePage from "./pages/dashboard/ArchitecturePage";
import ComplianceQAPage from "./pages/dashboard/ComplianceQAPage";
import FeaturesPage from "./pages/dashboard/FeaturesPage";
import TechStackPage from "./pages/dashboard/TechStackPage";
import TeamPage from "./pages/dashboard/TeamPage";
import PipelineOverviewPage from "./pages/dashboard/PipelineOverviewPage";
import NotificationsPage from "./pages/dashboard/NotificationsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import HelpPage from "./pages/dashboard/HelpPage";
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
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Dashboard Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/dashboard/problem" element={
                <ProtectedRoute><ProblemPage /></ProtectedRoute>
              } />
              <Route path="/dashboard/solution" element={
                <ProtectedRoute><SolutionPage /></ProtectedRoute>
              } />
              <Route path="/dashboard/architecture" element={
                <ProtectedRoute><ArchitecturePage /></ProtectedRoute>
              } />
              <Route path="/dashboard/compliance-qa" element={
                <ProtectedRoute><ComplianceQAPage /></ProtectedRoute>
              } />
              <Route path="/dashboard/features" element={
                <ProtectedRoute><FeaturesPage /></ProtectedRoute>
              } />
              <Route path="/dashboard/tech-stack" element={
                <ProtectedRoute><TechStackPage /></ProtectedRoute>
              } />
              <Route path="/dashboard/team" element={
                <ProtectedRoute><TeamPage /></ProtectedRoute>
              } />
              <Route path="/dashboard/pipeline" element={
                <ProtectedRoute><PipelineOverviewPage /></ProtectedRoute>
              } />
              
              {/* Agent Routes */}
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
              
              {/* Bottom Nav Routes */}
              <Route path="/notifications" element={
                <ProtectedRoute><NotificationsPage /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><SettingsPage /></ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute><HelpPage /></ProtectedRoute>
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