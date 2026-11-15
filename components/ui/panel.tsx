import { cn } from "@/lib/utils";

/** Our customised card: 1px border, soft shadow that grows on hover (transition-shadow). */
export function Panel({
  className,
  hover = false,
  ...props
}: React.ComponentProps<"section"> & { hover?: boolean }) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border bg-card p-4 shadow-xs md:p-5",
        hover && "transition-shadow duration-200 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3">
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-xs">
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-[11rem] flex-1">
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground md:text-[13px]">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
