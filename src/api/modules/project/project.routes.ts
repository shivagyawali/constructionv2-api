import { Router } from "express";
import { ProjectController } from "./project.controller";
import { checkAccess } from "../../helpers/checkAccess";
const router = Router();

router.use(checkAccess);

router.post("/create", ProjectController.createProject);
router.get("/list", ProjectController.getAllProjects);
router.get("/:id", ProjectController.getOneProject);
router.put("/:id", ProjectController.updateProject);
router.delete("/:id", ProjectController.deleteProject);

export default router;
