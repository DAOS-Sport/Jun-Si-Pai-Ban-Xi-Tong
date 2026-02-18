import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { REGIONS_DATA, VENUES_DATA, insertEmployeeSchema, insertVenueSchema, insertShiftSchema } from "@shared/schema";
import { z } from "zod";
import { validateAllRules } from "./labor-validation";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/regions", async (_req, res) => {
    const regions = await storage.getRegions();
    res.json(regions);
  });

  app.get("/api/employees/:regionCode", async (req, res) => {
    const { regionCode } = req.params;
    const region = await storage.getRegionByCode(regionCode);
    if (!region) return res.json([]);
    const employees = await storage.getEmployeesByRegion(region.id);
    res.json(employees);
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const parsed = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(parsed);
      res.json(employee);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "資料格式錯誤：" + err.errors.map((e: any) => e.message).join(", ") });
      }
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/employees/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partial = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(id, partial);
      if (!employee) return res.status(404).json({ message: "Employee not found" });
      res.json(employee);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "資料格式錯誤" });
      }
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/venues/:regionCode", async (req, res) => {
    const { regionCode } = req.params;
    const region = await storage.getRegionByCode(regionCode);
    if (!region) return res.json([]);
    const venues = await storage.getVenuesByRegion(region.id);
    res.json(venues);
  });

  app.post("/api/venues", async (req, res) => {
    try {
      const parsed = insertVenueSchema.parse(req.body);
      const venue = await storage.createVenue(parsed);
      res.json(venue);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "資料格式錯誤" });
      }
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/venues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partial = insertVenueSchema.partial().parse(req.body);
      const venue = await storage.updateVenue(id, partial);
      if (!venue) return res.status(404).json({ message: "Venue not found" });
      res.json(venue);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "資料格式錯誤" });
      }
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/shifts/:regionCode/:startDate/:endDate", async (req, res) => {
    const { regionCode, startDate, endDate } = req.params;
    const region = await storage.getRegionByCode(regionCode);
    if (!region) return res.json([]);
    const shifts = await storage.getShiftsByRegionAndDateRange(region.id, startDate, endDate);
    res.json(shifts);
  });

  app.post("/api/shifts", async (req, res) => {
    try {
      const parsed = insertShiftSchema.parse(req.body);

      const employee = await storage.getEmployee(parsed.employeeId);
      if (!employee || employee.status !== "active") {
        return res.status(400).json({ message: "該員工非在職狀態，無法排班" });
      }

      if (parsed.isDispatch && !parsed.dispatchCompany) {
        return res.status(400).json({ message: "派遣模式須填寫派遣公司" });
      }

      const existingShifts = await storage.getShiftsByEmployee(parsed.employeeId);
      const errors = validateAllRules(
        parsed.employeeId,
        parsed.date,
        parsed.startTime,
        parsed.endTime,
        existingShifts
      );

      const blocking = errors.filter((e) => e.type === "seven_day_rest" || e.type === "daily_12h");
      if (blocking.length > 0) {
        return res.status(400).json({ message: blocking[0].message });
      }

      const shift = await storage.createShift(parsed);

      const warnings = errors.filter((e) => e.type === "rest_11h");
      res.json({ ...shift, warnings });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "排班資料格式錯誤" });
      }
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/shifts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getShift(id);
      if (!existing) return res.status(404).json({ message: "Shift not found" });

      const partial = insertShiftSchema.partial().parse(req.body);
      const employeeId = partial.employeeId || existing.employeeId;
      const date = partial.date || existing.date;
      const startTime = partial.startTime || existing.startTime;
      const endTime = partial.endTime || existing.endTime;

      const employee = await storage.getEmployee(employeeId);
      if (!employee || employee.status !== "active") {
        return res.status(400).json({ message: "該員工非在職狀態，無法排班" });
      }

      const existingShifts = await storage.getShiftsByEmployee(employeeId);
      const errors = validateAllRules(employeeId, date, startTime, endTime, existingShifts, id);
      const blocking = errors.filter((e) => e.type === "seven_day_rest" || e.type === "daily_12h");
      if (blocking.length > 0) {
        return res.status(400).json({ message: blocking[0].message });
      }

      const shift = await storage.updateShift(id, partial);
      const warnings = errors.filter((e) => e.type === "rest_11h");
      res.json({ ...shift, warnings });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "排班資料格式錯誤" });
      }
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/shifts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteShift(id);
    if (!deleted) return res.status(404).json({ message: "Shift not found" });
    res.json({ success: true });
  });

  app.get("/api/venue-requirements/:regionCode", async (req, res) => {
    const { regionCode } = req.params;
    const region = await storage.getRegionByCode(regionCode);
    if (!region) return res.json([]);
    const requirements = await storage.getVenueRequirementsByRegion(region.id);
    res.json(requirements);
  });

  return httpServer;
}
