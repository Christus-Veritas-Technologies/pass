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
import { apiSignup, storeTokens } from "@/lib/auth";

const STAGGER = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string; email?: string; password?: string; form?: string;
  }>({});

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Must be at least 8 characters";
    return e;
  }

  // Password strength
  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3
    : 2;
  const strengthLabels = ["", "Weak", "Fair", "Strong"];
  const strengthColors = ["", "bg-red-500", "bg-amber-400", "bg-emerald-500"];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await apiSignup(name.trim(), email, password);
      storeTokens(data);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : "Sign up failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.065 } } }}
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
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground">Start your exam prep journey today</p>
          </motion.div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <motion.div variants={STAGGER}>
              <FormField label="Full name" error={errors.name} htmlFor="name">
                <AuthInput
                  id="name"
                  type="text"
                  placeholder="Tatenda Moyo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={!!errors.name}
                  autoComplete="name"
                />
              </FormField>
            </motion.div>

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
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!errors.password}
                    autoComplete="new-password"
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
                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength ? strengthColors[strength] : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strengthLabels[strength]}</p>
                  </div>
                )}
              </FormField>
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
              <SubmitButton loading={loading}>Create account</SubmitButton>
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
            <GoogleButton label="Sign up with Google" />
          </motion.div>

          <motion.p variants={STAGGER} className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline underline-offset-4">
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
