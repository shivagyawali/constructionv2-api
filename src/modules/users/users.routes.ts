import { Router } from "express";
import { body } from "express-validator";
import { UsersController } from "./users.controller";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new UsersController();

router.use(authenticate, authorize("admin", "manager"));

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);

router.post("/",
  authorize("admin"),
  validate([
    body("firstName").notEmpty(),
    body("lastName").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    body("role").notEmpty(),
  ]),
  ctrl.create
);

router.patch("/:id", ctrl.update);
router.patch("/:id/role", authorize("admin"), validate([body("role").notEmpty()]), ctrl.updateRole);
router.patch("/:id/toggle-active", authorize("admin"), ctrl.toggleActive);
router.post("/:id/reset-password", authorize("admin"), validate([body("newPassword").isLength({ min: 8 })]), ctrl.resetPassword);
router.delete("/:id", authorize("admin"), ctrl.remove);

export default router;
