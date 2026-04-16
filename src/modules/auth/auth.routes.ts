import { Router } from "express";
import { body } from "express-validator";
import { AuthController } from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new AuthController();

router.post("/register",
  validate([
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ]),
  ctrl.register
);

router.post("/login",
  validate([
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  ctrl.login
);

router.post("/refresh", ctrl.refresh);
router.post("/logout", authenticate, ctrl.logout);
router.get("/profile", authenticate, ctrl.getProfile);
router.patch("/profile", authenticate, ctrl.updateProfile);
router.post("/change-password", authenticate, ctrl.changePassword);

export default router;
