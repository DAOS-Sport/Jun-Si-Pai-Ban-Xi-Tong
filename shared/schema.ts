import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, date, time, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const regions = pgTable("regions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
});

export const insertRegionSchema = createInsertSchema(regions).omit({ id: true });
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type Region = typeof regions.$inferSelect;

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  regionId: integer("region_id").notNull(),
  address: text("address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  radius: integer("radius").default(100),
});

export const insertVenueSchema = createInsertSchema(venues).omit({ id: true });
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue = typeof venues.$inferSelect;

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  employeeCode: text("employee_code").notNull().unique(),
  phone: text("phone"),
  email: text("email"),
  regionId: integer("region_id").notNull(),
  status: text("status").notNull().default("active"),
  role: text("role").notNull().default("pt"),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  venueId: integer("venue_id").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isDispatch: boolean("is_dispatch").default(false),
  dispatchCompany: text("dispatch_company"),
  dispatchName: text("dispatch_name"),
  dispatchPhone: text("dispatch_phone"),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true });
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

export const venueRequirements = pgTable("venue_requirements", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  requiredCount: integer("required_count").notNull().default(1),
});

export const insertVenueRequirementSchema = createInsertSchema(venueRequirements).omit({ id: true });
export type InsertVenueRequirement = z.infer<typeof insertVenueRequirementSchema>;
export type VenueRequirement = typeof venueRequirements.$inferSelect;

export const REGIONS_DATA = [
  { name: "三蘆戰區", code: "A" },
  { name: "松山區", code: "B" },
  { name: "新竹區", code: "C" },
] as const;

export const VENUES_DATA = [
  { name: "三重商工館", shortName: "三重商工", regionCode: "A" },
  { name: "新北高中館", shortName: "新北高中", regionCode: "A" },
  { name: "三民高中館", shortName: "三民高中", regionCode: "A" },
  { name: "松山國小館", shortName: "松山國小", regionCode: "B" },
  { name: "新竹科學園區", shortName: "新竹科園", regionCode: "C" },
] as const;

export type RegionCode = "A" | "B" | "C";

export interface ShiftValidationError {
  type: "seven_day_rest" | "daily_12h" | "rest_11h" | "inactive_employee";
  message: string;
  employeeId: number;
  date: string;
}

export interface VacancyInfo {
  venueId: number;
  venueName: string;
  timeSlot: string;
  required: number;
  assigned: number;
  shortage: number;
}
