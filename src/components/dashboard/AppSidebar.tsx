import { 
  Shield, 
  Home, 
  Radio, 
  FileText, 
  Receipt, 
  GitCompare, 
  ClipboardCheck,
  Settings,
  HelpCircle,
  Bell,
  ChevronDown,
  Workflow,
  AlertTriangle,
  Lightbulb,
  Network,
  MessageSquare,
  Sparkles,
  Cpu,
  Users
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePipeline } from "@/contexts/PipelineContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const mainNavItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Problem", url: "/dashboard/problem", icon: AlertTriangle },
  { title: "Solution", url: "/dashboard/solution", icon: Lightbulb },
  { title: "Architecture", url: "/dashboard/architecture", icon: Network },
  { title: "Compliance Q&A", url: "/dashboard/compliance-qa", icon: MessageSquare },
  { title: "Features", url: "/dashboard/features", icon: Sparkles },
];

const agents = [
  { 
    title: "Regulation Monitoring", 
    url: "/agents/regulation-monitor", 
    icon: Radio,
    description: "Fetch & index regulations",
    dataKey: "regulations" as const
  },
  { 
    title: "Legal Parsing", 
    url: "/agents/legal-parser", 
    icon: FileText,
    description: "Parse legal clauses",
    dataKey: "parsedClauses" as const
  },
  { 
    title: "Transaction Understanding", 
    url: "/agents/transaction-understanding", 
    icon: Receipt,
    description: "Extract transaction data",
    dataKey: "transactions" as const
  },
  { 
    title: "Compliance Mapping", 
    url: "/agents/compliance-mapping", 
    icon: GitCompare,
    description: "Check compliance",
    dataKey: "complianceResults" as const
  },
  { 
    title: "Auditor Assistant", 
    url: "/agents/auditor-assistant", 
    icon: ClipboardCheck,
    description: "Generate audit reports",
    dataKey: "auditReports" as const
  },
];

const additionalNav = [
  { title: "Technology Stack", url: "/dashboard/tech-stack", icon: Cpu },
  { title: "Meet ReguGuard Innovators", url: "/dashboard/team", icon: Users },
];

const bottomLinks = [
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Help & Support", url: "/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [agentsOpen, setAgentsOpen] = useState(true);
  const pipeline = usePipeline();

  const getDataCount = (dataKey: typeof agents[number]['dataKey']) => {
    return pipeline[dataKey]?.length || 0;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-bold text-sm">
              <span className="text-gradient-primary">ReguGuard</span> AI
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI Agents */}
        <SidebarGroup>
          <Collapsible open={agentsOpen} onOpenChange={setAgentsOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4" />
                  {!collapsed && <span>AI Agents</span>}
                </div>
                {!collapsed && (
                  <ChevronDown className={`h-4 w-4 transition-transform ${agentsOpen ? '' : '-rotate-90'}`} />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {agents.map((agent, index) => (
                    <SidebarMenuItem key={agent.title}>
                      <SidebarMenuButton asChild tooltip={agent.title}>
                        <NavLink 
                          to={agent.url}
                          className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors group"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <div className="flex items-center justify-center w-5 h-5 shrink-0">
                            <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground">
                              {index + 1}
                            </span>
                          </div>
                          <agent.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate text-sm">{agent.title}</span>
                              {getDataCount(agent.dataKey) > 0 && (
                                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                  {getDataCount(agent.dataKey)}
                                </Badge>
                              )}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Additional Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {additionalNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomLinks.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2 hover:bg-sidebar-accent rounded-md transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="p-2">
          <SidebarTrigger className="w-full" />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}