"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { BrandPanel } from "@/components/auth/brand-panel";
import { FormField, AuthInput } from "@/components/auth/form-field";
import { GoogleButton } from "@/components/auth/google-button";
import { SubmitButton } from "@/components/auth/submit-button";
import { apiLogin, storeTokens } from "@/lib/auth";

const STAGGER = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      storeTokens(data);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Login failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07 } } }}
          className="w-full max-w-[400px] space-y-7"
        >
          {/* Mobile logo */}
          <motion.div variants={STAGGER} className="flex items-center gap-2.5 lg:hidden">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-black text-lg leading-none">P</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Pass</span>
          </motion.div>

          <motion.div variants={STAGGER} className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue studying</p>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <motion.div variants={STAGGER}>
              <FormField label="Email" error={errors.email} htmlFor="email">
                <AuthInput
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={!!errors.email}
                  autoComplete="email"
                />
              </FormField>
            </motion.div>

            <motion.div variants={STAGGER}>
              <FormField label="Password" error={errors.password} htmlFor="password">
                <div className="relative">
                  <AuthInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!errors.password}
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormField>
            </motion.div>

            <motion.div variants={STAGGER} className="flex justify-end -mt-1">
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </motion.div>

            <AnimatePresence initial={false}>
              {errors.form && (
                <motion.div
                  key="form-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive"
                >
                  {errors.form}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={STAGGER}>
              <SubmitButton loading={loading}>Sign in</SubmitButton>
            </motion.div>
          </form>

          <motion.div variants={STAGGER} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">or</span>
            </div>
          </motion.div>

          <motion.div variants={STAGGER}>
            <GoogleButton label="Sign in with Google" />
          </motion.div>

          <motion.p variants={STAGGER} className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline underline-offset-4">
              Sign up
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
