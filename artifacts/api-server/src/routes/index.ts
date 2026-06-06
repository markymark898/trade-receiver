import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import signalsRouter from "./signals";
import settingsRouter from "./settings";
import storageRouter from "./storage";
import guideAssetsRouter from "./guide-assets";
import portfolioRouter from "./portfolio";
import authRouter from "./auth";
import tradesRouter from "./trades";
import strategiesRouter from "./strategies";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(webhookRouter);
router.use(settingsRouter);
router.use(signalsRouter);
router.use(storageRouter);
router.use(guideAssetsRouter);
router.use(portfolioRouter);
router.use(tradesRouter);
router.use(strategiesRouter);

export default router;
