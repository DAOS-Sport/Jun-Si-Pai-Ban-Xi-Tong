import { db } from "./db";
import { regions, venues, employees, venueRequirements, shifts } from "@shared/schema";
import { REGIONS_DATA, VENUES_DATA } from "@shared/schema";
import { eq } from "drizzle-orm";
import { format, addDays, startOfWeek } from "date-fns";

export async function seedDatabase() {
  const existingRegions = await db.select().from(regions);
  if (existingRegions.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  const regionRecords: Record<string, number> = {};
  for (const r of REGIONS_DATA) {
    const [created] = await db.insert(regions).values({ name: r.name, code: r.code }).returning();
    regionRecords[r.code] = created.id;
  }

  const venueRecords: Record<string, number> = {};
  const venueData = [
    { name: "三重商工館", shortName: "三重商工", regionCode: "A", address: "新北市三重區中正北路163號", lat: 25.0645, lng: 121.4873 },
    { name: "新北高中館", shortName: "新北高中", regionCode: "A", address: "新北市三重區三信路1號", lat: 25.0712, lng: 121.4956 },
    { name: "三民高中館", shortName: "三民高中", regionCode: "A", address: "新北市蘆洲區三民路60號", lat: 25.0834, lng: 121.4789 },
    { name: "松山國小館", shortName: "松山國小", regionCode: "B", address: "台北市松山區八德路四段746號", lat: 25.0498, lng: 121.5785 },
    { name: "新竹科學園區", shortName: "新竹科園", regionCode: "C", address: "新竹市東區新安路2號", lat: 24.7862, lng: 120.9976 },
  ];

  for (const v of venueData) {
    const [created] = await db.insert(venues).values({
      name: v.name,
      shortName: v.shortName,
      regionId: regionRecords[v.regionCode],
      address: v.address,
      latitude: v.lat,
      longitude: v.lng,
      radius: 100,
    }).returning();
    venueRecords[v.shortName] = created.id;
  }

  const employeeData = [
    { name: "陳志明", code: "PT001", phone: "0912345678", email: "chen@example.com", region: "A", role: "pt" },
    { name: "林美玲", code: "PT002", phone: "0923456789", email: "lin@example.com", region: "A", role: "pt" },
    { name: "王大偉", code: "PT003", phone: "0934567890", email: "wang@example.com", region: "A", role: "pt" },
    { name: "張雅婷", code: "PT004", phone: "0945678901", email: "zhang@example.com", region: "A", role: "pt" },
    { name: "李建宏", code: "PT005", phone: "0956789012", email: "li@example.com", region: "A", role: "manager" },
    { name: "黃淑芬", code: "PT006", phone: "0967890123", email: "huang@example.com", region: "B", role: "pt" },
    { name: "趙文傑", code: "PT007", phone: "0978901234", email: "zhao@example.com", region: "B", role: "pt" },
    { name: "周佳蓉", code: "PT008", phone: "0989012345", email: "zhou@example.com", region: "C", role: "pt" },
    { name: "吳俊賢", code: "PT009", phone: "0990123456", email: "wu@example.com", region: "C", role: "pt" },
    { name: "許家豪", code: "PT010", phone: "0901234567", email: "xu@example.com", region: "A", role: "pt", status: "inactive" },
  ];

  const empRecords: Record<string, number> = {};
  for (const e of employeeData) {
    const [created] = await db.insert(employees).values({
      name: e.name,
      employeeCode: e.code,
      phone: e.phone,
      email: e.email,
      regionId: regionRecords[e.region],
      role: e.role,
      status: (e as any).status || "active",
    }).returning();
    empRecords[e.code] = created.id;
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const shiftData = [
    { emp: "PT001", venue: "三重商工", dayOffset: 0, start: "08:00", end: "12:00" },
    { emp: "PT001", venue: "新北高中", dayOffset: 1, start: "09:00", end: "17:00" },
    { emp: "PT001", venue: "三重商工", dayOffset: 2, start: "08:00", end: "16:00" },
    { emp: "PT002", venue: "新北高中", dayOffset: 0, start: "13:00", end: "21:00" },
    { emp: "PT002", venue: "三民高中", dayOffset: 1, start: "08:00", end: "16:00" },
    { emp: "PT002", venue: "新北高中", dayOffset: 3, start: "10:00", end: "18:00" },
    { emp: "PT003", venue: "三民高中", dayOffset: 0, start: "09:00", end: "17:00" },
    { emp: "PT003", venue: "三重商工", dayOffset: 2, start: "13:00", end: "21:00" },
    { emp: "PT004", venue: "三重商工", dayOffset: 1, start: "08:00", end: "12:00" },
    { emp: "PT004", venue: "三民高中", dayOffset: 3, start: "09:00", end: "17:00" },
    { emp: "PT006", venue: "松山國小", dayOffset: 0, start: "08:00", end: "16:00" },
    { emp: "PT006", venue: "松山國小", dayOffset: 2, start: "09:00", end: "17:00" },
    { emp: "PT007", venue: "松山國小", dayOffset: 1, start: "10:00", end: "18:00" },
    { emp: "PT008", venue: "新竹科園", dayOffset: 0, start: "08:00", end: "16:00" },
    { emp: "PT008", venue: "新竹科園", dayOffset: 2, start: "08:00", end: "16:00" },
    { emp: "PT009", venue: "新竹科園", dayOffset: 1, start: "13:00", end: "21:00" },
  ];

  for (const s of shiftData) {
    const date = format(addDays(weekStart, s.dayOffset), "yyyy-MM-dd");
    await db.insert(shifts).values({
      employeeId: empRecords[s.emp],
      venueId: venueRecords[s.venue],
      date,
      startTime: s.start,
      endTime: s.end,
      isDispatch: false,
    });
  }

  const dispatchDate = format(addDays(weekStart, 4), "yyyy-MM-dd");
  await db.insert(shifts).values({
    employeeId: empRecords["PT001"],
    venueId: venueRecords["三重商工"],
    date: dispatchDate,
    startTime: "08:00",
    endTime: "16:00",
    isDispatch: true,
    dispatchCompany: "力行人力",
    dispatchName: "郭大明",
    dispatchPhone: "0955123456",
  });

  for (const v of Object.entries(venueRecords)) {
    for (let day = 1; day <= 5; day++) {
      await db.insert(venueRequirements).values({
        venueId: v[1],
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "17:00",
        requiredCount: 2,
      });
    }
  }

  console.log("Database seeded successfully!");
}
