"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiRequest(
        "/auth/forgot-password",
        { method: "POST", body: JSON.stringify({ email }) },
        false,
      );
    } finally {
      setBusy(false);
      setDone(true);
    }
  }
  return (
    <AuthLayout
      title="Forgot Password"
      description="We’ll send password reset instructions if an account exists."
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, password reset instructions
            will be sent.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Return to Sign In</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button className="w-full" disabled={busy}>
            <Mail />
            {busy ? "Sending…" : "Send Reset Link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
