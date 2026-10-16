import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type GoalKind, describeProgress } from "@/lib/diary/progress";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatTileProps = {
  label: string;
  /** What was eaten, already rounded for display. */
  value: number;
  goal: number;
  unit: string;
  kind: GoalKind;
};

export function StatTile({ label, value, goal, unit, kind }: StatTileProps) {
  const progress = describeProgress(value, goal, unit, kind);
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight">
            {formatNumber(value)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatNumber(goal)} {unit}
          </span>
        </p>
        {/* Base UI renders role="progressbar" with the aria-value* attributes. */}
        <Progress
          value={progress.percent}
          aria-label={label}
          className={cn(
            "[&_[data-slot=progress-track]]:h-2",
            progress.over &&
              "[&_[data-slot=progress-indicator]]:bg-destructive",
          )}
        />
        <p
          className={cn(
            "text-sm",
            progress.over ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {progress.status}
        </p>
      </CardContent>
    </Card>
  );
}
