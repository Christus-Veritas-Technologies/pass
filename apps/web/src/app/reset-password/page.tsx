"use client";
import { CheckmarkCircle01Icon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";
import { FormField, AuthInput } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { apiResetPassword } from "@/lib/auth";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="text-sm text-primary font-medium hover:underline underline-offset-4">
          Request a new link
        </Link>
      </div>
    );
  }

  function validate() {
    const e: typeof errors = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Must be at least 8 characters";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setErrors({});
    setLoading(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Reset failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {done ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-5 text-center"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Password updated!</h2>
            <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
          </div>
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0 }} className="space-y-7">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 mb-5">
              <Image src="/icon.png" alt="Pass" width={36} height={36} className="rounded-xl" />
              <span className="text-xl font-bold tracking-tight">Pass</span>
            </div>
            <h1 className="text-xl font-bold">Set a new password</h1>
            <p className="text-sm text-muted-foreground">Your new password must be at least 8 characters.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField label="New password" error={errors.password} htmlFor="password">
              <div className="relative">
                <AuthInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={!!errors.password}
                  autoComplete="new-password"
                  autoFocus
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <HugeiconsIcon
                    icon={showPassword ? ViewOffIcon : ViewIcon}
                    className="w-4 h-4"
                  />
                </button>
              </div>
            </FormField>

            <FormField label="Confirm password" error={errors.confirm} htmlFor="confirm">
              <AuthInput
                id="confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={!!errors.confirm}
                autoComplete="new-password"
              />
            </FormField>

            <AnimatePresence initial={false}>
              {errors.form && (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive"
                >
                  {errors.form}
                </motion.div>
              )}
            </AnimatePresence>

            <SubmitButton loading={loading}>Reset password</SubmitButton>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background force-light" style={{ colorScheme: "light" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[380px]"
      >
        <Suspense>
          <ResetForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
