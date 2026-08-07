"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  variant?: "default" | "header";
};

export default function BrandLogo({ className, variant = "default" }: BrandLogoProps) {
  if (variant === "header") {
    return (
      <Image
        alt="Venda Cantada - CAOA"
        className={cn("block h-full w-full object-contain", className)}
        height={294}
        priority
        src="/images/logo-header-white-green.png"
        width={827}
      />
    );
  }

  return (
    <picture className={cn("block h-full w-full", className)}>
      {/* Prefer raster PNGs if present (you can replace these with the attached image files) */}
      <source srcSet="/images/logo-dark.png" media="(prefers-color-scheme: dark)" />
      <source srcSet="/images/logo-dark.svg" media="(prefers-color-scheme: dark)" />

      <source srcSet="/images/logo-light.png" />
      <img src="/images/logo-light.png" alt="Venda Cantada - CAOA" className={cn("block h-full w-full object-contain", className)} />
    </picture>
  );
}
