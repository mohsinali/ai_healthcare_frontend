import { cn } from "@/lib/utils";
const styles = { success: "bg-success/10 text-success", warning: "bg-warning/10 text-warning", danger: "bg-destructive/10 text-destructive", info: "bg-info/10 text-info", neutral: "bg-muted text-muted-foreground" };
export function StatusBadge({ children, variant = "neutral" }: { children: React.ReactNode; variant?: keyof typeof styles }) { return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium", styles[variant])}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{children}</span>; }
