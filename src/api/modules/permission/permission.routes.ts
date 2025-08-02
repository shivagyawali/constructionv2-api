import { Router } from "express";
import { PermissionController } from "./permission.controller";
import { checkAccess } from "../../helpers/checkAccess";
const router = Router();
router.use(checkAccess);
router.get("/list", PermissionController.getAllPermissions);
router.post("/create", PermissionController.createPermission);

export default router;
