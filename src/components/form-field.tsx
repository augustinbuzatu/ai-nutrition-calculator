import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  /** The control's id. Spread describedBy(id, error, hint) on the control. */
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
};

/** A label, a control, and below it the error if there is one, else the hint. */
export function FormField({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const message = error ?? hint;
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {message && (
        <p
          id={`${id}-message`}
          className={cn(
            "text-sm",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/** Links a control to its FormField message, so screen readers read both. */
export function describedBy(id: string, error?: string, hint?: string) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || hint ? `${id}-message` : undefined,
  };
}
