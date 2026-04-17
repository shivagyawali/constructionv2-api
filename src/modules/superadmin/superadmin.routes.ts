import { Router } from "express";
import { body } from "express-validator";
import { SuperadminController } from "./superadmin.controller";
import { authenticate, superadminOnly } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl   = new SuperadminController();

router.use(authenticate, superadminOnly);

router.get("/overview",       ctrl.overview);
router.get("/users",          ctrl.listAllUsers);
router.get("/report/company", ctrl.companyReport);

router.post("/users",
  validate([
    body("firstName").notEmpty(),
    body("lastName").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
  ]),
  ctrl.createSuperadmin
);

router.patch("/users/:id",           ctrl.updateUser);
router.post("/users/:id/reset-password",
  validate([body("newPassword").isLength({ min: 8 })]),
  ctrl.resetPassword
);

export default router;
