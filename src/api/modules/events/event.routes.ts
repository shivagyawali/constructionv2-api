import { Router } from "express";
import { EventController } from "./event.controller";
import { checkAccess } from "../../helpers/checkAccess";
const router = Router();
router.use(checkAccess);
router.get("/list", EventController.getAllEvents);


export default router;
