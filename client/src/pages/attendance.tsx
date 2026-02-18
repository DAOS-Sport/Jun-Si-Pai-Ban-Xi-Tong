import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionTabs } from "@/components/region-tabs";
import { useRegion } from "@/lib/region-context";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Clock, FileSearch } from "lucide-react";
import type { Employee, Shift } from "@shared/schema";
import { useMemo } from "react";

export default function AttendancePage() {
  const { activeRegion } = useRegion();
  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const dateRange = useMemo(
    () => ({
      start: format(weekStart, "yyyy-MM-dd"),
      end: format(addDays(weekStart, 6), "yyyy-MM-dd"),
    }),
    [weekStart]
  );

  const { data: employees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", activeRegion],
  });

  const { data: shifts = [], isLoading: shiftLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", activeRegion, dateRange.start, dateRange.end],
  });

  const isLoading = empLoading || shiftLoading;
  const activeEmployees = employees.filter((e) => e.status === "active");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayShifts = shifts.filter((s) => s.date === todayStr);
  const scheduledToday = todayShifts.length;

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-attendance-title">考勤稽核</h1>
          <p className="text-sm text-muted-foreground">排班與打卡自動比對</p>
        </div>
        <RegionTabs />
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">今日應到</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mt-1" />
                ) : (
                  <p className="text-2xl font-bold mt-1" data-testid="text-scheduled-today">{scheduledToday}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">人次</p>
              </div>
              <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">考勤異常</p>
                <p className="text-2xl font-bold mt-1 text-muted-foreground" data-testid="text-attendance-issues">—</p>
                <p className="text-xs text-muted-foreground mt-0.5">待匯入打卡數據</p>
              </div>
              <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">合規率</p>
                <p className="text-2xl font-bold mt-1 text-muted-foreground" data-testid="text-compliance-rate">—</p>
                <p className="text-xs text-muted-foreground mt-0.5">待數據計算</p>
              </div>
              <div className="p-2 rounded-md bg-green-50 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <FileSearch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">考勤比對功能</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              系統將自動比對排班紀錄與打卡數據，揪出「有班無卡」、「無班有卡」、「遲到」等異常。
              請先匯入打卡數據以啟用稽核功能。
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <Badge variant="outline">有班無卡偵測</Badge>
              <Badge variant="outline">無班有卡偵測</Badge>
              <Badge variant="outline">遲到判定（晚1秒即計）</Badge>
              <Badge variant="outline">GPS 圍欄驗證</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">本週排班記錄</h3>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : shifts.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">本週尚無排班記錄</p>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-auto">
              {shifts.slice(0, 20).map((s) => {
                const emp = employees.find((e) => e.id === s.employeeId);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-md p-2 text-sm bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{emp?.name || "—"}</span>
                      <span className="text-muted-foreground text-xs">{s.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {s.startTime.substring(0, 5)}-{s.endTime.substring(0, 5)}
                      </span>
                      <Badge variant="secondary" className="text-xs">待驗證</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
