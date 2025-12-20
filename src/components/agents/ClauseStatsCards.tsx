import { FileText, Scale, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ParsedClause } from "@/contexts/PipelineContext";

interface ClauseStatsCardsProps {
  clauses: ParsedClause[];
  regulationsCount: number;
}

export function ClauseStatsCards({ clauses, regulationsCount }: ClauseStatsCardsProps) {
  const stats = [
    {
      label: "Source Regulations",
      value: regulationsCount,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Parsed Clauses",
      value: clauses.length,
      icon: Scale,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "With Penalties",
      value: clauses.filter(c => c.penalties && c.penalties.length > 10).length,
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Conditional Rules",
      value: clauses.filter(c => c.conditions && c.conditions.length > 10).length,
      icon: CheckCircle,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
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
