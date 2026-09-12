import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const Route = createFileRoute("/_dashboard")({
  component: LayoutRoute,
});

function LayoutRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segment = pathname.split("/").filter(Boolean)[0];
  return <DashboardLayout pathSegment={segment} />;
}
