import { LucideIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AgentPageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  step: number;
  nextAgent?: {
    title: string;
    url: string;
  };
}

export function AgentPageHeader({ 
  icon: Icon, 
  title, 
  description, 
  step,
  nextAgent 
}: AgentPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              Agent {step}/5
            </span>
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      
      {nextAgent && (
        <Button 
          variant="outline" 
          className="gap-2 shrink-0"
          onClick={() => navigate(nextAgent.url)}
        >
          Next: {nextAgent.title}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
