import { Router } from "express";
import { body } from "express-validator";
import { WorkersController } from "./workers.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

const router = Router();
const ctrl = new WorkersController();

router.use(authenticate);
router.get("/", ctrl.list);
router.post("/",
  validate([
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
  ]),
  ctrl.create
);
router.get("/:id", ctrl.getOne);
router.get("/:id/stats", ctrl.stats);
router.get("/:id/logs", ctrl.logs);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

export default router;
