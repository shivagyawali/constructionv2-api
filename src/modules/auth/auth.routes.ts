import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();
const ctrl = new AuthController();

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.post("/refresh", ctrl.refresh);
router.post("/logout", authenticate, ctrl.logout);
router.get("/profile", authenticate, ctrl.getProfile);
router.patch("/profile", authenticate, ctrl.updateProfile);
router.post("/change-password", authenticate, ctrl.changePassword);

export default router;
