import { Shield, ArrowRight, Zap, Cpu } from "lucide-react";
import { Button } from "./ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div 
        className="absolute inset-0"
        style={{ background: "var(--gradient-hero)" }}
      />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      
      <div className="container relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/80 border border-border mb-8 animate-fade-in">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Google Cloud AI Hackathon 2025
            </span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            <span className="text-gradient-primary">ReguGuard</span>
            <span className="text-foreground"> AI</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Autonomous Agentic Compliance System
          </p>
          <p className="text-lg text-muted-foreground/80 mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            for Government Financial Transactions
          </p>
          
          {/* Description */}
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "0.3s" }}>
            Multi-agent AI system that continuously monitors regulatory changes, 
            parses legal documents, and ensures real-time compliance for 50,000+ 
            daily government transactions.
          </p>
          
          {/* CTA Buttons - Removed animation to ensure visibility */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="group" asChild>
              <Link to="/automation">
                <Cpu className="w-5 h-5 mr-2" />
                Launch Master Automation
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              Read Documentation
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            {[
              { value: "85-90%", label: "Effort Reduction" },
              { value: "<2 min", label: "Processing Time" },
              { value: "99%+", label: "Accuracy" },
              { value: "50K+", label: "Daily Transactions" },
            ].map((stat, index) => (
              <div key={index} className="p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                <div className="text-2xl md:text-3xl font-bold text-gradient-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
