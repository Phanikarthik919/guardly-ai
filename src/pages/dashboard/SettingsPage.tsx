import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and application preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.email || "Not available"}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Account ID</p>
              <p className="text-sm text-muted-foreground font-mono">{user?.id || "Not available"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Application settings coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Additional settings and preferences will be available in future updates.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}