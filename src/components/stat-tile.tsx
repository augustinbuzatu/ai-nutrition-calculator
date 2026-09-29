import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";

type StatTileProps = {
  label: string;
  value: number;
  goal: number;
  unit: string;
};

export function StatTile({ label, value, goal, unit }: StatTileProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="flex items-baseline gap-1.5">
          <span className="text-3xl font-semibold tracking-tight">
            {formatNumber(value)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formatNumber(goal)} {unit}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
