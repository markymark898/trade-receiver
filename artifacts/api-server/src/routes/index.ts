import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import signalsRouter from "./signals";
import settingsRouter from "./settings";
import storageRouter from "./storage";
import guideAssetsRouter from "./guide-assets";
import guideFilesRouter from "./guide-files";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(settingsRouter);
router.use(signalsRouter);
router.use(storageRouter);
router.use(guideAssetsRouter);
router.use(guideFilesRouter);

export default router;
