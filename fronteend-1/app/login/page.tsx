"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-6">
      <Link href="/" className="absolute top-8 left-8 z-20 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowRight className="w-4 h-4 rotate-180" />
        Back
      </Link>
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl glass-card-strong mb-5">
            <Leaf className="w-8 h-8 text-ayur-gold" />
          </div>
          <h1 className="text-3xl font-display tracking-tight mb-2">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Continue your Ayurvedic journey</p>
        </div>
        <div className="flex justify-center">
          <SignIn routing="hash" afterSignInUrl="/chat" signUpUrl="/login" />
        </div>
      </div>
    </div>
  );
}
