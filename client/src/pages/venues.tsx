import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RegionTabs } from "@/components/region-tabs";
import { useRegion } from "@/lib/region-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, MapPin, Plus, Edit2, Navigation } from "lucide-react";
import type { Venue } from "@shared/schema";
import { REGIONS_DATA } from "@shared/schema";

export default function VenuesPage() {
  const { activeRegion } = useRegion();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    address: "",
    latitude: "",
    longitude: "",
    radius: "100",
  });

  const regionId = REGIONS_DATA.findIndex((r) => r.code === activeRegion) + 1;
  const regionName = REGIONS_DATA.find((r) => r.code === activeRegion)?.name || "";

  const { data: venues = [], isLoading } = useQuery<Venue[]>({
    queryKey: ["/api/venues", activeRegion],
  });

  const createVenue = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/venues", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({ title: "場館已新增" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "新增失敗", description: err.message, variant: "destructive" });
    },
  });

  const updateVenue = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/venues/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venues"] });
      toast({ title: "場館已更新" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "更新失敗", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({ name: "", shortName: "", address: "", latitude: "", longitude: "", radius: "100" });
    setEditingVenue(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setForm({
      name: venue.name,
      shortName: venue.shortName,
      address: venue.address || "",
      latitude: venue.latitude?.toString() || "",
      longitude: venue.longitude?.toString() || "",
      radius: venue.radius?.toString() || "100",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.shortName) return;
    const payload = {
      name: form.name,
      shortName: form.shortName,
      address: form.address || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      radius: parseInt(form.radius) || 100,
      regionId,
    };
    if (editingVenue) {
      updateVenue.mutate({ id: editingVenue.id, ...payload });
    } else {
      createVenue.mutate(payload);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-venues-title">場館管理</h1>
          <p className="text-sm text-muted-foreground">管理場館地點與 GPS 圍欄設定</p>
        </div>
        <RegionTabs />
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button onClick={openCreate} data-testid="button-add-venue">
            <Plus className="h-4 w-4 mr-1.5" />
            新增場館
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>此區域尚無場館</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {venues.map((venue) => (
              <Card key={venue.id} className="p-4" data-testid={`card-venue-${venue.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{venue.name}</h3>
                      <p className="text-xs text-muted-foreground">{venue.shortName}</p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(venue)}
                    data-testid={`button-edit-venue-${venue.id}`}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {venue.address && (
                  <div className="flex items-start gap-1.5 mt-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{venue.address}</span>
                  </div>
                )}
                {venue.latitude && venue.longitude && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                    <Navigation className="h-3 w-3 shrink-0" />
                    <span>{venue.latitude?.toFixed(4)}, {venue.longitude?.toFixed(4)}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      半徑 {venue.radius}m
                    </Badge>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVenue ? "編輯場館" : "新增場館"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>場館名稱 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="三重商工館"
                  data-testid="input-venue-name"
                />
              </div>
              <div className="space-y-2">
                <Label>簡稱 *</Label>
                <Input
                  value={form.shortName}
                  onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                  placeholder="三重商工"
                  data-testid="input-venue-short-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>地址</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="新北市三重區..."
                data-testid="input-venue-address"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>緯度</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="25.0645"
                  data-testid="input-venue-lat"
                />
              </div>
              <div className="space-y-2">
                <Label>經度</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="121.4873"
                  data-testid="input-venue-lng"
                />
              </div>
              <div className="space-y-2">
                <Label>半徑 (m)</Label>
                <Input
                  type="number"
                  value={form.radius}
                  onChange={(e) => setForm({ ...form, radius: e.target.value })}
                  placeholder="100"
                  data-testid="input-venue-radius"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-venue">
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name || !form.shortName || createVenue.isPending || updateVenue.isPending}
              data-testid="button-save-venue"
            >
              {createVenue.isPending || updateVenue.isPending ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
