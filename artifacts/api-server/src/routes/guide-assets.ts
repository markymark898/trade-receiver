import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { guideAssets } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/guide-assets", async (req: Request, res: Response) => {
  const { assetType } = req.query as { assetType?: string };
  const rows = await db
    .select()
    .from(guideAssets)
    .orderBy(guideAssets.uploadedAt);
  const filtered = assetType ? rows.filter((r) => r.assetType === assetType) : rows;
  res.json(filtered);
});

router.post("/guide-assets", async (req: Request, res: Response) => {
  const { name, label, description, objectPath, contentType, size, assetType } =
    req.body as {
      name: string;
      label: string;
      description?: string;
      objectPath: string;
      contentType: string;
      size?: number;
      assetType: string;
    };

  const [row] = await db
    .insert(guideAssets)
    .values({ name, label, description, objectPath, contentType, size, assetType })
    .returning();

  res.status(201).json(row);
});

router.delete("/guide-assets/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await db.delete(guideAssets).where(eq(guideAssets.id, id));
  res.status(204).end();
});

export default router;
