import { Router } from "express";
import { body } from "express-validator";
import { CompaniesController } from "./companies.controller";
import { authenticate, authorize, superadminOnly } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl   = new CompaniesController();

router.use(authenticate);

// List / create — superadmin only
router.get("/",    superadminOnly, ctrl.list);
router.post("/",   superadminOnly,
  validate([
    body("name").notEmpty().withMessage("Company name is required"),
    body("ownerEmail").optional().isEmail(),
    body("ownerPassword").optional().isLength({ min: 8 }),
  ]),
  ctrl.create
);

// Single company — superadmin or own-company admin
router.get("/:id",               ctrl.getOne);
router.patch("/:id",             ctrl.update);
router.post("/:id/toggle-status", superadminOnly, ctrl.toggleStatus);
router.delete("/:id",            superadminOnly, ctrl.remove);

// Users within company
router.get("/:id/users",    ctrl.listUsers);
router.post("/:id/users",
  authorize("admin", "superadmin"),
  validate([
    body("firstName").notEmpty(),
    body("lastName").notEmpty(),
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
  ]),
  ctrl.createUser
);

// Role permissions per company
router.get("/:id/role-permissions",  ctrl.getRolePermissions);
router.put("/:id/role-permissions",
  authorize("admin", "superadmin"),
  validate([body("permissions").notEmpty()]),
  ctrl.updateRolePermissions
);

export default router;
