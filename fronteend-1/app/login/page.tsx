"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Leaf, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth delay
    await new Promise((r) => setTimeout(r, 1200));
    localStorage.setItem("vaidya_auth", "true");
    router.push("/chat");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Animated background */}
      <div className="absolute inset-0 z-0">
        {/* Radial gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-ayur-gold/5 blur-3xl float-subtle" />
        <div
          className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-ayur-sage/5 blur-3xl float-subtle"
          style={{ animationDelay: "-3s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-ayur-amber/3 blur-3xl"
          style={{ animation: "float-y 8s ease-in-out infinite" }}
        />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
              backgroundSize: "60px 60px",
            }}
          />
        </div>
      </div>

      {/* Back to landing */}
      <a
        href="/"
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="w-4 h-4 rotate-180" />
        Back
      </a>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-card-strong mb-6">
            <Leaf className="w-8 h-8 text-ayur-gold" />
          </div>
          <h1 className="text-3xl font-display tracking-tight mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-sm">
            Continue your Ayurvedic journey
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="relative">
            <label
              htmlFor="login-email"
              className={`absolute left-4 transition-all duration-300 pointer-events-none ${
                focusedField === "email" || email
                  ? "top-2 text-[10px] font-mono text-ayur-gold"
                  : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
              }`}
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              className="w-full h-14 px-4 pt-5 pb-1 rounded-xl glass-card-strong text-foreground text-sm outline-none transition-all duration-300 focus:border-ayur-gold/30 focus:shadow-[0_0_0_1px_var(--ayur-gold)]"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <label
              htmlFor="login-password"
              className={`absolute left-4 transition-all duration-300 pointer-events-none z-10 ${
                focusedField === "password" || password
                  ? "top-2 text-[10px] font-mono text-ayur-gold"
                  : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
              }`}
            >
              Password
            </label>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              className="w-full h-14 px-4 pt-5 pb-1 pr-12 rounded-xl glass-card-strong text-foreground text-sm outline-none transition-all duration-300 focus:border-ayur-gold/30 focus:shadow-[0_0_0_1px_var(--ayur-gold)]"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-ayur-gold transition-colors"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="relative w-full h-14 rounded-xl bg-foreground text-background font-medium text-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-ayur-gold/10 disabled:opacity-70 group"
          >
            <span
              className={`inline-flex items-center gap-2 transition-all duration-300 ${
                isLoading
                  ? "opacity-0 -translate-y-4"
                  : "opacity-100 translate-y-0"
              }`}
            >
              Begin Journey
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>

            {isLoading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-background typing-dot"
                      style={{ animationDelay: `${i * 0.16}s` }}
                    />
                  ))}
                </span>
              </span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-mono">
            or continue with
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social login */}
        <div className="flex gap-3">
          <button className="flex-1 h-12 rounded-xl glass-card hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button className="flex-1 h-12 rounded-xl glass-card hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            GitHub
          </button>
        </div>

        {/* Sign up link */}
        <p className="text-center mt-8 text-sm text-muted-foreground">
          New to Vaidya?{" "}
          <button className="text-ayur-gold hover:underline">
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
