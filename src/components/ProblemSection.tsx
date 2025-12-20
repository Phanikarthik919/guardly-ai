import { AlertTriangle, Clock, FileX, TrendingDown } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "6-8 Hours Daily",
    description: "Compliance officers spend most of their day on manual verification tasks",
    impact: "₹50,000+ per officer annually in wasted time",
  },
  {
    icon: FileX,
    title: "3-6 Month Backlog",
    description: "Audit delays cause fund disbursement and project timeline issues",
    impact: "Delayed government initiatives",
  },
  {
    icon: AlertTriangle,
    title: "12-15% Error Rate",
    description: "Manual reviews miss compliance gaps in reviewed transactions",
    impact: "Financial penalties & audit failures",
  },
  {
    icon: TrendingDown,
    title: "15+ Data Sources",
    description: "Regulations scattered across multiple government portals",
    impact: "Officers miss critical updates",
  },
];

const ProblemSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
            The Challenge
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Government Compliance is <span className="text-destructive">Broken</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Indian government departments process over 50,000+ financial transactions daily, 
            each requiring verification against 100+ regulatory clauses.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-destructive/50 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <problem.icon className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
              <p className="text-muted-foreground text-sm mb-4">{problem.description}</p>
              <div className="pt-4 border-t border-border">
                <span className="text-xs text-destructive/80 font-medium">{problem.impact}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Impact summary */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-r from-destructive/5 to-transparent border border-destructive/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Why Current Solutions Fail</h3>
              <p className="text-muted-foreground">
                Generic compliance tools don't understand government-specific rules. 
                RPA can't reason about legal compliance. Manual improvements don't scale.
              </p>
            </div>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-8 h-8" />
              <span className="text-3xl font-bold">₹50K+</span>
              <span className="text-sm">Cost per officer/year</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
