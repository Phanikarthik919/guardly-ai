import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import ArchitectureSection from "@/components/ArchitectureSection";
import FeaturesSection from "@/components/FeaturesSection";
import TechStackSection from "@/components/TechStackSection";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <section id="problem">
          <ProblemSection />
        </section>
        <section id="solution">
          <SolutionSection />
        </section>
        <section id="architecture">
          <ArchitectureSection />
        </section>
        <section id="features">
          <FeaturesSection />
        </section>
        <TechStackSection />
        <section id="team">
          <TeamSection />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
