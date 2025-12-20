import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PipelineProvider } from "@/contexts/PipelineContext";
import Index from "./pages/Index";
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
      <PipelineProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agents/regulation-monitor" element={<RegulationMonitorPage />} />
            <Route path="/agents/legal-parser" element={<LegalParserPage />} />
            <Route path="/agents/transaction-understanding" element={<TransactionUnderstandingPage />} />
            <Route path="/agents/compliance-mapping" element={<ComplianceMappingPage />} />
            <Route path="/agents/auditor-assistant" element={<AuditorAssistantPage />} />
            <Route path="/notifications" element={<Dashboard />} />
            <Route path="/settings" element={<Dashboard />} />
            <Route path="/help" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PipelineProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
