"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function ResetPasswordPage() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const token =
      new URLSearchParams(window.location.search).get("token") ?? "";
    if (pw.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (pw !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        "/auth/reset-password",
        { method: "POST", body: JSON.stringify({ token, newPassword: pw }) },
        false,
      );
      setDone(true);
    } catch {
      setError("This password reset link is invalid or expired.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout
      title="Reset Password"
      description="Choose a new password of at least 12 characters."
    >
      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your password has been reset. Please sign in again.
          </p>
          <Button asChild className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={12}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            <KeyRound />
            {busy ? "Resetting…" : "Reset Password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
