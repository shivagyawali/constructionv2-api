import { Router } from "express";
import { ProjectController } from "./project.controller";


const router = Router();

router.post("/", ProjectController.createProject);
router.get("/", ProjectController.getAllProjects);
router.put("/:id", ProjectController.updateProject);
router.delete("/:id", ProjectController.deleteProject);

export default router;
