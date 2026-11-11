import type { ReactNode } from "react";
import { isTauri } from "../lib/backend";
import { openExternal } from "../lib/external";

/** A link that opens in the user's browser, in the website and in the Mac app. */
export function ExternalLink({
  href,
  className,
  title,
  children,
}: {
  href?: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noreferrer noopener"
      className={className}
      onClick={(e) => {
        // The Mac app cannot follow links by itself.
        if (isTauri && href && href.startsWith("http")) {
          e.preventDefault();
          openExternal(href);
        }
      }}
    >
      {children}
    </a>
  );
}
