import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import HeroSection from "@/components/HeroSection";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <HeroSection />
      </div>
    </DashboardLayout>
  );
}