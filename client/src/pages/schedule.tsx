import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RegionTabs } from "@/components/region-tabs";
import { VacancyFooter } from "@/components/vacancy-footer";
import { ShiftCellEditor } from "@/components/shift-cell-editor";
import { useRegion } from "@/lib/region-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, AlertTriangle, Shield } from "lucide-react";
import type { Employee, Venue, Shift, VacancyInfo, VenueRequirement } from "@shared/schema";

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export default function SchedulePage() {
  const { activeRegion } = useRegion();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 });
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<Shift | undefined>();

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

  const { data: requirements = [] } = useQuery<VenueRequirement[]>({
    queryKey: ["/api/venue-requirements", activeRegion],
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === "active"),
    [employees]
  );

  const venueMap = useMemo(() => {
    const map = new Map<number, Venue>();
    venues.forEach((v) => map.set(v.id, v));
    return map;
  }, [venues]);

  const shiftsByEmployeeDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    shifts.forEach((s) => {
      const key = `${s.employeeId}-${s.date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [shifts]);

  const vacancies = useMemo<VacancyInfo[]>(() => {
    const result: VacancyInfo[] = [];
    weekDates.forEach((d) => {
      const dateStr = format(d, "yyyy-MM-dd");
      const dayOfWeek = d.getDay();
      const dayReqs = requirements.filter((r) => r.dayOfWeek === dayOfWeek);
      dayReqs.forEach((req) => {
        const venue = venueMap.get(req.venueId);
        if (!venue) return;
        const assignedCount = shifts.filter(
          (s) =>
            s.date === dateStr &&
            s.venueId === req.venueId &&
            s.startTime <= req.startTime &&
            s.endTime >= req.endTime
        ).length;
        if (assignedCount < req.requiredCount) {
          result.push({
            venueId: req.venueId,
            venueName: venue.shortName,
            timeSlot: `${format(d, "M/d")} ${req.startTime.substring(0, 5)}-${req.endTime.substring(0, 5)}`,
            required: req.requiredCount,
            assigned: assignedCount,
            shortage: req.requiredCount - assignedCount,
          });
        }
      });
    });
    return result;
  }, [weekDates, requirements, shifts, venueMap]);

  const createShift = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/shifts", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      if (data.warnings && data.warnings.length > 0) {
        toast({ title: "排班已儲存（含警告）", description: data.warnings[0].message, variant: "destructive" });
      } else {
        toast({ title: "排班已儲存" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "排班失敗", description: err.message, variant: "destructive" });
    },
  });

  const updateShift = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/shifts/${id}`, data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      if (data.warnings && data.warnings.length > 0) {
        toast({ title: "排班已更新（含警告）", description: data.warnings[0].message, variant: "destructive" });
      } else {
        toast({ title: "排班已更新" });
      }
    },
    onError: (err: Error) => {
      toast({ title: "更新失敗", description: err.message, variant: "destructive" });
    },
  });

  const deleteShift = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      toast({ title: "排班已刪除" });
    },
  });

  const handleCellClick = (employee: Employee, dateStr: string, shift?: Shift) => {
    setSelectedEmployee(employee);
    setSelectedDate(dateStr);
    setSelectedShift(shift);
    setEditorOpen(true);
  };

  const handleSaveShift = (data: any) => {
    if (selectedShift) {
      updateShift.mutate({ id: selectedShift.id, ...data, employeeId: selectedEmployee!.id, date: selectedDate });
    } else {
      createShift.mutate({ ...data, employeeId: selectedEmployee!.id, date: selectedDate });
    }
  };

  const isLoading = empLoading || venLoading || shiftLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-page-title">排班編輯器</h1>
          <p className="text-sm text-muted-foreground">智慧試算表排班 — 即時勞基法攔截</p>
        </div>
        <RegionTabs />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            data-testid="button-next-week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium" data-testid="text-week-range">
            {format(weekDates[0], "yyyy/MM/dd")} — {format(weekDates[6], "MM/dd")}
          </span>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-pick-date">
              <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
              選擇週
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={weekStart}
              onSelect={(d) => {
                if (d) setWeekStart(startOfWeek(d, { weekStartsOn: 1 }));
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <div className="min-w-[800px]">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr>
                  <th className="text-left p-2 border-b border-r w-32 font-medium text-muted-foreground">
                    員工
                  </th>
                  {weekDates.map((d, i) => {
                    const isToday = format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th
                        key={i}
                        className={`text-center p-2 border-b border-r font-medium min-w-[120px] ${
                          isToday
                            ? "bg-primary/5"
                            : isWeekend
                              ? "bg-muted/30"
                              : ""
                        }`}
                      >
                        <div className="text-xs text-muted-foreground">
                          週{DAY_NAMES[d.getDay()]}
                        </div>
                        <div className={isToday ? "text-primary font-semibold" : ""}>
                          {format(d, "M/d")}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="p-2 border-b border-r">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="p-2 border-b border-r">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : activeEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      此區域尚無在職員工
                    </td>
                  </tr>
                ) : (
                  activeEmployees.map((emp) => (
                    <tr key={emp.id} className="group">
                      <td className="p-2 border-b border-r sticky left-0 bg-background z-[5]">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm" data-testid={`text-employee-name-${emp.id}`}>
                            {emp.name}
                          </span>
                          <span className="text-xs text-muted-foreground">{emp.employeeCode}</span>
                        </div>
                      </td>
                      {weekDates.map((d, di) => {
                        const dateStr = format(d, "yyyy-MM-dd");
                        const cellShifts = shiftsByEmployeeDate.get(`${emp.id}-${dateStr}`) || [];
                        const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                        return (
                          <td
                            key={di}
                            className={`p-1 border-b border-r relative min-h-[48px] cursor-pointer transition-colors hover:bg-muted/50 ${
                              isToday ? "bg-primary/5" : isWeekend ? "bg-muted/20" : ""
                            }`}
                            onClick={() => {
                              if (cellShifts.length === 0) {
                                handleCellClick(emp, dateStr);
                              }
                            }}
                            data-testid={`cell-${emp.id}-${dateStr}`}
                          >
                            {cellShifts.length > 0 ? (
                              <div className="space-y-1">
                                {cellShifts.map((s) => {
                                  const venue = venueMap.get(s.venueId);
                                  return (
                                    <div
                                      key={s.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCellClick(emp, dateStr, s);
                                      }}
                                      className={`rounded-md px-1.5 py-1 text-xs cursor-pointer transition-colors ${
                                        s.isDispatch
                                          ? "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800"
                                          : "bg-primary/10 text-primary border border-primary/20"
                                      }`}
                                      data-testid={`shift-${s.id}`}
                                    >
                                      <div className="font-medium truncate">
                                        {venue?.shortName || "未知"}
                                      </div>
                                      <div className="text-[10px] opacity-75">
                                        {s.startTime.substring(0, 5)}-{s.endTime.substring(0, 5)}
                                      </div>
                                      {s.isDispatch && (
                                        <div className="text-[10px] opacity-60 truncate">
                                          派遣{s.dispatchName ? `：${s.dispatchName}` : ""}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-[40px] opacity-0 group-hover:opacity-30 transition-opacity">
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="border-t p-4 bg-card">
          <VacancyFooter vacancies={vacancies} />
        </div>
      </div>

      {selectedEmployee && (
        <ShiftCellEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          employee={selectedEmployee}
          date={selectedDate}
          venues={venues}
          existingShifts={shifts}
          currentShift={selectedShift}
          onSave={handleSaveShift}
          onDelete={
            selectedShift
              ? () => deleteShift.mutate(selectedShift.id)
              : undefined
          }
        />
      )}
    </div>
  );
}
