import { Bot, FileSearch, FileText, Scale, MessageSquare } from "lucide-react";

const agents = [
  {
    icon: FileSearch,
    name: "Regulation Monitoring",
    description: "Continuously fetches and indexes latest rules from 15+ government portals",
    color: "primary",
  },
  {
    icon: FileText,
    name: "Legal Parsing",
    description: "Converts unstructured regulations into machine-readable compliance clauses",
    color: "accent",
  },
  {
    icon: Bot,
    name: "Transaction Understanding",
    description: "Extracts and classifies financial transaction details using Document AI",
    color: "primary",
  },
  {
    icon: Scale,
    name: "Compliance Mapping",
    description: "RAG-based matching of transactions against relevant legal frameworks",
    color: "accent",
  },
  {
    icon: MessageSquare,
    name: "Auditor Assistant",
    description: "Generates explainable reports with corrective recommendations",
    color: "primary",
  },
];

const SolutionSection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            The Solution
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Multi-Agent <span className="text-gradient-primary">Agentic Architecture</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Five specialized AI agents work autonomously to ensure real-time regulatory 
            compliance without manual intervention.
          </p>
        </div>
        
        {/* Agent flow visualization */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connection lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {agents.map((agent, index) => (
              <div 
                key={index}
                className="relative group"
              >
                {/* Arrow indicator for desktop */}
                {index < agents.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-6 -translate-y-1/2 z-10">
                    <div className="w-2 h-2 border-t-2 border-r-2 border-primary/50 rotate-45 translate-x-1" />
                  </div>
                )}
                
                <div className={`h-full p-6 rounded-2xl bg-card border border-border hover:border-${agent.color}/50 transition-all duration-300 hover:-translate-y-1`}>
                  <div className={`w-14 h-14 rounded-xl bg-${agent.color}/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <agent.icon className={`w-7 h-7 text-${agent.color}`} />
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">Agent {index + 1}</div>
                  <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Result summary */}
        <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { label: "Compliance Status", values: ["✓ Pass", "⚠ Risk", "✗ Violation"] },
            { label: "Detailed Reports", values: ["Clause references", "Reasoning", "Actions"] },
            { label: "Real-time Alerts", values: ["Violations", "Reg changes", "Deadlines"] },
          ].map((output, index) => (
            <div key={index} className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <h4 className="font-semibold mb-3">{output.label}</h4>
              <div className="flex flex-wrap gap-2">
                {output.values.map((value, vIndex) => (
                  <span 
                    key={vIndex}
                    className="px-3 py-1 rounded-full bg-card text-xs text-muted-foreground"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
