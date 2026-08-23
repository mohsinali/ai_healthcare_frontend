import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0", { variants: { variant: { default: "bg-primary text-primary-foreground hover:opacity-90", secondary: "bg-secondary text-secondary-foreground hover:bg-muted", destructive: "bg-destructive text-destructive-foreground hover:opacity-90", outline: "border bg-card hover:bg-muted", ghost: "hover:bg-muted hover:text-foreground" }, size: { default: "h-10", sm: "h-8 px-3 text-xs", icon: "size-10 p-0" } }, defaultVariants: { variant: "default", size: "default" } });

function Button({ className, variant, size, loading, children, disabled, asChild, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { loading?: boolean; asChild?: boolean }) {
  if (asChild && React.isValidElement(children)) return React.cloneElement(children as React.ReactElement<{ className?: string }>, { className: cn(buttonVariants({ variant, size, className }), (children.props as { className?: string }).className) });
  return <button className={cn(buttonVariants({ variant, size, className }))} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}{children}</button>;
}
export { Button, buttonVariants };
