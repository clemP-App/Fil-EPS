"use client";

import { useState } from "react";

export function CoverImage({ src, academy, className = "" }: { src: string | null; academy: string; className?: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed || !src) {
    return (
      <div className={`relative grid place-items-center overflow-hidden bg-pine-soft text-pine ${className}`} aria-hidden="true">
        <span className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-pine/20" />
        <span className="absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-pine/10" />
        <span className="relative px-4 text-center text-sm font-bold tracking-wide">{academy}</span>
      </div>
    );
  }
  return (
    // Les images restent sur le site d'origine : pas de recopie dans notre hébergement.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`block h-full w-full object-cover ${className}`} referrerPolicy="strict-origin-when-cross-origin" onError={() => setFailed(true)} />
  );
}
