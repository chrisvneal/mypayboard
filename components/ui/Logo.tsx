// components/Logo.tsx
// MyPayBoard wordmark — Nunito 600, brand colors
// Usage: <Logo /> <Logo size="sm" /> <Logo size="lg" /> <Logo className="..." />

import localFont from "next/font/local";

// If you already have Nunito in your project via next/font/google, replace this
// with your existing font reference and skip the Google import below.
import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

type LogoSize = "sm" | "md" | "lg";

const sizeMap: Record<LogoSize, string> = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-5xl",
};

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span
      className={`${nunito.className} ${sizeMap[size]} leading-none tracking-tight select-none ${className}`}
    >
      <span style={{ color: "#3A9D5D" }}>my</span>
      <span style={{ color: "#185FA5" }}>payboard</span>
    </span>
  );
}