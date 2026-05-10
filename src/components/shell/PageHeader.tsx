/**
 * PageHeader
 *
 * Consistent page-level header used by non-dashboard routes (Analytics,
 * Territories, Customers, Settings). Renders a display title, an optional
 * eyebrow mono-label, a description line, and an actions slot on the right.
 */

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {eyebrow ? (
          <div className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </span>
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-on-surface md:text-[32px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export default PageHeader;
