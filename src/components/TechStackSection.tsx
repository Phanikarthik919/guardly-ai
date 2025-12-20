import { Cloud, Database, Cpu, Lock, Code, Layers } from "lucide-react";

const technologies = [
  {
    category: "AI & Reasoning",
    icon: Cpu,
    items: [
      { name: "Vertex AI Gemini 2.0", description: "Core language model for understanding" },
      { name: "Google Stitch", description: "Agent orchestration & workflow" },
      { name: "Google Jules", description: "Agentic reasoning & explainability" },
      { name: "Google Antigravity", description: "Safe multi-agent execution" },
    ],
  },
  {
    category: "Document Processing",
    icon: Layers,
    items: [
      { name: "Document AI", description: "Invoice & document extraction" },
      { name: "Vector Search", description: "Semantic clause retrieval" },
    ],
  },
  {
    category: "Data & Storage",
    icon: Database,
    items: [
      { name: "Firestore", description: "Regulations & transaction storage" },
      { name: "Cloud Storage", description: "Document archives" },
    ],
  },
  {
    category: "Backend",
    icon: Code,
    items: [
      { name: "Cloud Functions", description: "Serverless compute" },
      { name: "Cloud Scheduler", description: "Automated monitoring" },
    ],
  },
  {
    category: "Frontend",
    icon: Cloud,
    items: [
      { name: "React + TypeScript", description: "Dashboard interface" },
      { name: "Firebase Hosting", description: "Deployment" },
    ],
  },
  {
    category: "Security",
    icon: Lock,
    items: [
      { name: "Firebase Auth", description: "Role-based access" },
      { name: "Cloud Logging", description: "Audit trails" },
    ],
  },
];

const TechStackSection = () => {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Technology
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Powered by <span className="text-gradient-primary">Google Cloud</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built entirely on Google's advanced AI stack, leveraging the latest 
            in agentic AI, document processing, and serverless architecture.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {technologies.map((tech, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <tech.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold">{tech.category}</h3>
              </div>
              <div className="space-y-3">
                {tech.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">— {item.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Google Cloud badge */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border">
            <Cloud className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Google Cloud AI Hackathon 2025 Project</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TechStackSection;
