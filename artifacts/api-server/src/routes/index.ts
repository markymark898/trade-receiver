import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import signalsRouter from "./signals";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(settingsRouter);
router.use(signalsRouter);

export default router;
