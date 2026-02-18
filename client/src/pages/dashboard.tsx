import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionTabs } from "@/components/region-tabs";
import { useRegion } from "@/lib/region-context";
import { Users, Building2, Calendar, AlertTriangle, CheckCircle2, Clock, Shield } from "lucide-react";
import type { Employee, Venue, Shift, VenueRequirement, VacancyInfo } from "@shared/schema";
import { useMemo } from "react";

export default function DashboardPage() {
  const { activeRegion } = useRegion();

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const dateRange = useMemo(
    () => ({
      start: format(weekDates[0], "yyyy-MM-dd"),
      end: format(weekDates[6], "yyyy-MM-dd"),
    }),
    [weekDates]
  );

  const { data: employees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees", activeRegion],
  });

  const { data: venues = [], isLoading: venLoading } = useQuery<Venue[]>({
    queryKey: ["/api/venues", activeRegion],
  });

  const { data: shifts = [], isLoading: shiftLoading } = useQuery<Shift[]>({
    queryKey: ["/api/shifts", activeRegion, dateRange.start, dateRange.end],
  });

  const activeCount = employees.filter((e) => e.status === "active").length;
  const totalShifts = shifts.length;
  const dispatchShifts = shifts.filter((s) => s.isDispatch).length;
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayShifts = shifts.filter((s) => s.date === todayStr);

  const isLoading = empLoading || venLoading || shiftLoading;

  const stats = [
    {
      label: "在職員工",
      value: activeCount,
      total: employees.length,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "管轄場館",
      value: venues.length,
      icon: Building2,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "本週排班",
      value: totalShifts,
      subtitle: dispatchShifts > 0 ? `含 ${dispatchShifts} 派遣` : undefined,
      icon: Calendar,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "今日出勤",
      value: todayShifts.length,
      subtitle: `${todayShifts.filter((s) => s.isDispatch).length} 派遣`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-dashboard-title">排班總覽</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "yyyy 年 M 月 d 日")} 系統狀態
          </p>
        </div>
        <RegionTabs />
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold" data-testid={`text-stat-${stat.label}`}>
                        {stat.value}
                      </span>
                      {stat.total !== undefined && (
                        <span className="text-xs text-muted-foreground">/ {stat.total}</span>
                      )}
                    </div>
                  )}
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-2 rounded-md ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm">勞基法合規引擎</h3>
              <Badge variant="secondary" className="text-xs">HR Eye</Badge>
            </div>
            <div className="space-y-2">
              {[
                { rule: "七休一攔截", desc: "連續 6 天後自動阻斷第 7 天排班" },
                { rule: "單日 12h 上限", desc: "跨館跨時段即時加總工時" },
                { rule: "11h 輪班間隔", desc: "檢核前日下班與今日上班休息時間" },
                { rule: "在職狀態檢核", desc: "離職員工即時從排班選單移除" },
              ].map((item) => (
                <div key={item.rule} className="flex items-center gap-2 rounded-md p-2 bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-800/50">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">{item.rule}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-sm">今日排班明細</h3>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : todayShifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                今日無排班記錄
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-auto">
                {todayShifts.map((s) => {
                  const emp = employees.find((e) => e.id === s.employeeId);
                  const venue = venues.find((v) => v.id === s.venueId);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between gap-2 rounded-md p-2 text-sm ${
                        s.isDispatch
                          ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/50"
                          : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{emp?.name || "—"}</span>
                        {s.isDispatch && (
                          <Badge variant="outline" className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 text-[10px] shrink-0">
                            派遣
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                        <span className="text-xs">{venue?.shortName}</span>
                        <span className="text-xs">
                          {s.startTime.substring(0, 5)}-{s.endTime.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
