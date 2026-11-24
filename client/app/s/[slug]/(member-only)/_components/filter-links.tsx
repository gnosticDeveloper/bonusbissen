import Link from "next/link";
import { cn } from "@/lib/helpers/utils";

type FilterOption = { value: string; label: string; count?: number };

/**
 * Filter chips as links (`?param=value`), so the server renders the filtered list and the
 * current filter survives reloads and sharing. The first option is the default and drops the param.
 */
export function FilterLinks({
  label,
  basePath,
  param,
  options,
  active,
}: {
  label: string;
  basePath: string;
  param: string;
  options: readonly FilterOption[];
  active: string;
}) {
  return (
    <nav aria-label={label} className="-mx-5 overflow-x-auto px-5 pb-1">
      <ul className="flex w-max gap-2">
        {options.map((option, index) => {
          const current = option.value === active;
          const href = index === 0 ? basePath : `${basePath}?${new URLSearchParams({ [param]: option.value })}`;

          return (
            <li key={option.value}>
              <Link
                href={href}
                replace
                scroll={false}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/70",
                  current ? "border-transparent bg-foreground text-background" : "border-border text-foreground/85 hover:bg-foreground/5",
                )}
              >
                {option.label}
                {option.count !== undefined && <span className="tabular-nums opacity-75">{option.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
