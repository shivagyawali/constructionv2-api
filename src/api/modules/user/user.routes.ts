import { Router } from "express";
import { UserController } from "./user.controller";
const router = Router();
router.post("/", UserController.createUser);
router.get("/", UserController.getAllUsers);
router.put("/:id", UserController.updateUser);
router.delete("/:id", UserController.deleteUser);

export default router;
