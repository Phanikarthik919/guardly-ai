import { 
  RefreshCcw, 
  Bot, 
  MessageSquareText, 
  BellRing, 
  FileCheck, 
  TrendingUp,
  Users,
  Globe
} from "lucide-react";

const features = [
  {
    icon: RefreshCcw,
    title: "Real-Time Updates",
    description: "Autonomous monitoring of 15+ government portals with instant notification when new rules are published.",
  },
  {
    icon: Bot,
    title: "Autonomous Auditing",
    description: "95% of routine transactions pass compliance without human intervention. AI handles 50+ violation types.",
  },
  {
    icon: MessageSquareText,
    title: "Explainable AI",
    description: "Every decision includes legal references, plain-language explanations, and recommended fixes.",
  },
  {
    icon: BellRing,
    title: "Exception Alerts",
    description: "Officers see only violations, not compliant transactions. Smart filtering by severity level.",
  },
  {
    icon: FileCheck,
    title: "Audit-Ready Reports",
    description: "Cryptographically signed reports with violation details, corrective actions, and timestamps.",
  },
  {
    icon: TrendingUp,
    title: "Compliance Analytics",
    description: "Track trends, identify bottlenecks, monitor vendor performance, and measure officer productivity.",
  },
  {
    icon: Users,
    title: "Human-in-the-Loop",
    description: "Critical decisions require human approval. AI explains reasoning; officers can override with documentation.",
  },
  {
    icon: Globe,
    title: "Multi-Tenancy",
    description: "One system serves multiple departments and states. Extensible architecture for new agents.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24">
      <div className="container px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Enterprise-Grade <span className="text-gradient-accent">Compliance</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for the unique requirements of government financial management 
            with security, auditability, and explainability at its core.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-6 rounded-2xl bg-card border border-border hover:border-accent/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
