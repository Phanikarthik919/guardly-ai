import { ArrowDown, ArrowRight, Database, Cpu, FileOutput, Monitor } from "lucide-react";

const ArchitectureSection = () => {
  return (
    <section className="py-24 bg-secondary/30 overflow-hidden">
      <div className="container px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Architecture
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            System <span className="text-gradient-primary">Data Flow</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            End-to-end processing from regulation ingestion to compliance report generation in under 2 minutes.
          </p>
        </div>
        
        {/* Architecture diagram */}
        <div className="max-w-5xl mx-auto">
          <div className="grid gap-8">
            {/* Tier 1: Input */}
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                <h3 className="font-semibold">Data Ingestion</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: "Government Portals", desc: "15+ sources scraped hourly" },
                  { label: "Regulatory Sources", desc: "PDFs, circulars, amendments" },
                  { label: "Transaction Streams", desc: "APIs, file uploads, ERP" },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <div className="text-sm font-medium mb-1">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-primary" />
            </div>
            
            {/* Tier 2: Processing */}
            <div className="p-6 rounded-2xl bg-card border border-primary/30 glow-primary">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Agent Processing Layer (Google Stitch)</h3>
                </div>
              </div>
              <div className="grid md:grid-cols-5 gap-3">
                {[
                  "Regulation Monitor",
                  "Legal Parser",
                  "Transaction Extractor",
                  "Compliance Mapper",
                  "Auditor Assistant",
                ].map((agent, i) => (
                  <div key={i} className="relative">
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                      <div className="text-xs font-medium">{agent}</div>
                    </div>
                    {i < 4 && (
                      <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2">
                        <ArrowRight className="w-4 h-4 text-primary/50" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-primary" />
            </div>
            
            {/* Tier 3: Storage */}
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">3</div>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold">Knowledge Base (Firestore + Vector DB)</h3>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  "Compliance Clauses",
                  "Transaction Records",
                  "Precedent Cases",
                  "Vector Embeddings",
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-center">
                    <div className="text-xs font-medium">{item}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center">
              <ArrowDown className="w-6 h-6 text-primary" />
            </div>
            
            {/* Tier 4: Output */}
            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-xs font-bold text-success">4</div>
                <div className="flex items-center gap-2">
                  <FileOutput className="w-5 h-5 text-success" />
                  <h3 className="font-semibold">Output & Presentation</h3>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { label: "Live Dashboard", icon: Monitor },
                  { label: "Alert System", desc: "Real-time violations" },
                  { label: "Report Archive", desc: "Audit trails" },
                  { label: "Integration APIs", desc: "ERP connectivity" },
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-xl bg-success/5 border border-success/20">
                    <div className="text-sm font-medium mb-1">{item.label}</div>
                    {item.desc && <div className="text-xs text-muted-foreground">{item.desc}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Processing time */}
          <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <span className="text-sm text-muted-foreground">Total End-to-End Processing Time: </span>
            <span className="text-lg font-bold text-primary">&lt; 2 minutes</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
