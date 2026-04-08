import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEntrySchema, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";
import { spawn } from "child_process";
import { join } from "path";
import { unlinkSync, existsSync } from "fs";
import { tmpdir } from "os";

export async function registerRoutes(app: Express): Promise<Server> {
  // ── ENTRIES ────────────────────────────────────────────────────────────────
  app.get("/api/entries", (_req, res) => {
    const data = storage.getEntries();
    res.json(data);
  });

  app.post("/api/entries", (req, res) => {
    const parsed = insertEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const entry = storage.createEntry(parsed.data);
    res.status(201).json(entry);
  });

  app.delete("/api/entries/:id", (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    storage.deleteEntry(id);
    res.json({ ok: true });
  });

  app.delete("/api/entries", (_req, res) => {
    storage.clearEntries();
    res.json({ ok: true });
  });

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  app.get("/api/settings", (_req, res) => {
    const data = storage.getSettings();
    res.json(data);
  });

  app.patch("/api/settings", (req, res) => {
    const parsed = insertSettingsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const updated = storage.updateSettings(parsed.data);
    res.json(updated);
  });

  // ── PDF EXPORT ─────────────────────────────────────────────────────────────
  app.post("/api/export/pdf", async (req, res) => {
    try {
      const { month, sectors } = req.body as { month?: string; sectors?: string[] };

      const entries  = storage.getEntries();
      const settings = storage.getSettings();

      const payload = JSON.stringify({
        entries,
        settings,
        month:       month  ?? "",
        sectors:     sectors ?? [],
        generatedAt: new Date().toISOString(),
      });

      const pdfPath    = join(tmpdir(), `mindos_export_${Date.now()}.pdf`);
      // Pfad zum Python-Script: erst neben index.cjs, dann in resources/dist/ (Electron)
      let scriptPath = join(__dirname, "generate_invoice_pdf.py");
      if (!require("fs").existsSync(scriptPath) && process.resourcesPath) {
        scriptPath = join(process.resourcesPath, "dist", "generate_invoice_pdf.py");
      }

      // Use spawn so we can pipe stdin reliably
      await new Promise<void>((resolve, reject) => {
        const child = spawn("python3", [scriptPath, "-", pdfPath]);
        let stderr = "";
        child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
        child.on("close", (code: number) => {
          if (code !== 0 || !existsSync(pdfPath)) {
            reject(new Error(`PDF generation failed (exit ${code}): ${stderr}`));
          } else {
            resolve();
          }
        });
        child.on("error", reject);
        child.stdin.write(payload, "utf8");
        child.stdin.end();
      });

      const pdfBuffer = require("fs").readFileSync(pdfPath);
      try { unlinkSync(pdfPath); } catch {}

      const fileMonth = month || "alle";
      const filename  = `MindOS_Export_${fileMonth}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("PDF export error:", err);
      res.status(500).json({ error: err.message ?? "PDF generation failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
