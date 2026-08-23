import * as React from "react";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("rounded-lg border bg-card text-card-foreground", className)} {...props} />; }
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />; }
export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) { return <h3 className={cn("text-sm font-semibold", className)} {...props} />; }
export function CardDescription({ className, ...props }: React.ComponentProps<"p">) { return <p className={cn("text-sm text-muted-foreground", className)} {...props} />; }
export function CardContent({ className, ...props }: React.ComponentProps<"div">) { return <div className={cn("px-5 pb-5", className)} {...props} />; }
