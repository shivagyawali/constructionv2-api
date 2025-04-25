import { Router } from "express";
import { UserController } from "./user.controller";
import { checkAccess } from "../../helpers/checkAccess";
const router = Router();
router.use(checkAccess);
router.post("/create", UserController.createUser);
router.get("/profile", UserController.profile);
router.get("/list", UserController.getAllUsers);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);
router.get("/:id", UserController.getOne);

export default router;
