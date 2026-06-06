import { Router } from "express";

const router = Router();

router.post("/auth/login", (req, res) => {
  const appPassword = process.env["APP_PASSWORD"];

  if (!appPassword) {
    res.status(503).json({ ok: false, error: "APP_PASSWORD secret not configured on the server." });
    return;
  }

  const { password } = req.body as { password?: string };

  if (!password || password !== appPassword) {
    res.status(401).json({ ok: false, error: "Incorrect password." });
    return;
  }

  res.json({ ok: true });
});

export default router;
