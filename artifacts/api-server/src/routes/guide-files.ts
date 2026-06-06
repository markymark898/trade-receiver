import { Router } from "express";
import { readdir, readFile } from "fs/promises";
import path from "path";

const GUIDES_DIR = path.resolve(process.cwd(), "../../guides");

const router = Router();

router.get("/guide-files", async (_req, res) => {
  try {
    const files = await readdir(GUIDES_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    res.json(mdFiles.map((f) => ({ name: f, slug: f.replace(/\.md$/, "") })));
  } catch {
    res.json([]);
  }
});

router.get("/guide-files/:slug", async (req, res) => {
  const slug = req.params["slug"] ?? "";
  if (!slug || /[./\\]/.test(slug)) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }
  try {
    const filePath = path.join(GUIDES_DIR, `${slug}.md`);
    const content = await readFile(filePath, "utf-8");
    res.type("text/plain").send(content);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

export default router;
