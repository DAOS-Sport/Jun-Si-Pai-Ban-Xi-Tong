import { CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VacancyInfo } from "@shared/schema";

interface VacancyFooterProps {
  vacancies: VacancyInfo[];
}

export function VacancyFooter({ vacancies }: VacancyFooterProps) {
  if (vacancies.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-700 dark:text-green-300 font-medium">
          所有時段人力已滿
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <span>即時缺班觀測站</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {vacancies.map((v, i) => {
          const isFull = v.shortage <= 0;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                isFull
                  ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                  : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
              }`}
              data-testid={`vacancy-${v.venueId}-${i}`}
            >
              {isFull ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              )}
              <span className={isFull ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                {v.venueName}
              </span>
              <span className="text-muted-foreground">
                {v.timeSlot}
              </span>
              {!isFull && (
                <Badge variant="destructive" className="text-xs">
                  缺 {v.shortage} 人
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
