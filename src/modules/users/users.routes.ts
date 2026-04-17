import { Router } from "express";
import { body } from "express-validator";
import { UsersController } from "./users.controller";
import { authenticate, authorize, tenantScope } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl   = new UsersController();

router.use(authenticate, tenantScope, authorize("admin","manager","superadmin"));

router.get("/",     ctrl.list);
router.get("/:id",  ctrl.getOne);

router.post("/",    authorize("admin","superadmin"),
  validate([
    body("firstName").notEmpty(), body("lastName").notEmpty(),
    body("email").isEmail(), body("password").isLength({ min: 8 }), body("role").notEmpty(),
  ]),
  ctrl.create
);

router.patch("/:id",                authorize("admin","superadmin"), ctrl.update);
router.patch("/:id/role",           authorize("admin","superadmin"), validate([body("role").notEmpty()]), ctrl.updateRole);
router.patch("/:id/toggle-active",  authorize("admin","superadmin"), ctrl.toggleActive);
router.post("/:id/reset-password",  authorize("admin","superadmin"), validate([body("newPassword").isLength({ min: 8 })]), ctrl.resetPassword);
router.delete("/:id",               authorize("admin","superadmin"), ctrl.remove);

export default router;
