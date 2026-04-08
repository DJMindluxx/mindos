import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In Electron (gepackt): index.cjs liegt in resources/dist/, public/ daneben
  // In normaler Produktion: __dirname ist dist/, public/ liegt direkt drin
  let distPath = path.resolve(__dirname, "public");

  // Fallback: über process.resourcesPath (Electron-spezifisch)
  if (!fs.existsSync(distPath) && process.resourcesPath) {
    distPath = path.join(process.resourcesPath, "dist", "public");
  }

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
