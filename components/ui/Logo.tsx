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
  onDark?: boolean;
}

export function Logo({ size = "md", className = "", onDark = false }: LogoProps) {
  return (
    <span
      className={`${nunito.className} ${sizeMap[size]} leading-none tracking-tight select-none ${className}`}
    >
      <span style={{ color: "#3A9D5D" }}>my</span>
      <span style={{ color: onDark ? "#ffffff" : "#185FA5" }}>payboard</span>
    </span>
  );
}