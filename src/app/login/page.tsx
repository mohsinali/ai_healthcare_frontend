"use client";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div
            className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-label="Checking session"
          />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
