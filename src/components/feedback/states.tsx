import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
export function EmptyState({
  title = "Nothing Here Yet",
  description = "Items will appear here when they are available.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <div className="mb-3 rounded-lg bg-accent p-3 text-accent-foreground">
        <Inbox aria-hidden="true" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorState() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="mb-3 text-destructive" aria-hidden="true" />
      <h3 className="font-semibold">Unable to Load Data</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Something went wrong while loading this information.
      </p>
      <Button variant="outline" className="mt-4">
        <RefreshCw />
        Try Again
      </Button>
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="space-y-3 p-5" aria-label="Loading content">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-4/5" />
    </div>
  );
}
