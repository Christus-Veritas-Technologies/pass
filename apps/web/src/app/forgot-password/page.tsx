"use client";
import { ArrowLeft01Icon, CheckmarkCircle01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { FormField, AuthInput } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { apiForgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) { setError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a valid email"); return; }
    setError("");
    setLoading(true);
    try {
      await apiForgotPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[380px]"
      >
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  If <span className="text-foreground font-medium">{email}</span> has an account,
                  we&apos;ve sent a reset link. Check your spam folder if you don&apos;t see it.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-block text-sm text-primary font-medium hover:underline underline-offset-4"
              >
                Back to sign in
              </Link>
            </motion.div>
          ) : (
            <motion.div key="form" exit={{ opacity: 0 }} className="space-y-7">
              <div className="space-y-5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
                  Back to sign in
                </Link>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                    <span className="text-primary-foreground font-black text-lg leading-none">P</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight">Pass</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold">Reset your password</h1>
                  </div>
                  <p className="text-sm text-muted-foreground pl-0.5">
                    Enter your email and we&apos;ll send you a reset link.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <FormField label="Email" error={error} htmlFor="email">
                  <AuthInput
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!error}
                    autoComplete="email"
                    autoFocus
                  />
                </FormField>

                <SubmitButton loading={loading}>Send reset link</SubmitButton>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
