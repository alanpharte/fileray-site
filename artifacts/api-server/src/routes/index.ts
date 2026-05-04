import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import filesRouter from "./files";
import foldersRouter from "./folders";
import sharedRouter from "./shared";
import teamRouter from "./team";
import organiserRouter from "./organiser";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(filesRouter);
router.use(foldersRouter);
router.use(sharedRouter);
router.use(teamRouter);
router.use(organiserRouter);
router.use(settingsRouter);
router.use(dashboardRouter);

export default router;
