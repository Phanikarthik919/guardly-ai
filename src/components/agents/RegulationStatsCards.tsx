import { FileText, Globe, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Regulation } from "@/contexts/PipelineContext";

interface RegulationStatsCardsProps {
  regulations: Regulation[];
}

export function RegulationStatsCards({ regulations }: RegulationStatsCardsProps) {
  const uniqueSources = new Set(regulations.map((r) => r.source)).size;
  
  const recentCount = regulations.filter((r) => {
    const regDate = new Date(r.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return regDate >= thirtyDaysAgo;
  }).length;

  const stats = [
    {
      label: "Total Regulations",
      value: regulations.length,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Unique Sources",
      value: uniqueSources,
      icon: Globe,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Recent (30 days)",
      value: recentCount,
      icon: Calendar,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Processing Rate",
      value: regulations.length > 0 ? "Active" : "Idle",
      icon: TrendingUp,
      color: regulations.length > 0 ? "text-warning" : "text-muted-foreground",
      bgColor: regulations.length > 0 ? "bg-warning/10" : "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card/50 border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
