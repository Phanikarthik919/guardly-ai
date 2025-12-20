import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your compliance alerts and system notifications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No new notifications</CardTitle>
            <CardDescription>You're all caught up! Check back later for updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Notifications about compliance issues, regulation updates, and system alerts will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}