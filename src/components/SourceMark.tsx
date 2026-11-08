"use client";

import { useState } from "react";
import { sourceInitials, sourceLogoUrl, sourceMarkColor } from "@/lib/source-mark";

export function SourceMark({ slug, name }: { slug: string; name: string }) {
  const logo = sourceLogoUrl(slug);
  const [failed, setFailed] = useState(!logo);
  if (failed || !logo) {
    return (
      <span
        aria-hidden="true"
        className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold tracking-tight text-white"
        style={{ background: sourceMarkColor(slug) }}
      >
        {sourceInitials(name)}
      </span>
    );
  }
  return (
    // Le symbole reste hébergé par la source.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logo}
      alt=""
      width={40}
      height={40}
      className="size-10 shrink-0 rounded-xl border border-line bg-white object-contain"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
