import { Router } from "express";
import { ProjectController } from "./project.controller";
import { authorize } from "../../middleware/authorization";
const router = Router();

router.use((req, res, next) => {
  const resource = req.originalUrl.split("/")[2];
  const method = req.method.toLowerCase(); 
  const actionMap:any = {
    get: "view",
    post: "create",
    put: "edit",
    delete: "delete",
  };

  const action = actionMap[method];

  authorize(resource, action)(req, res, next);
});

router.post("/create", ProjectController.createProject);
router.get("/", ProjectController.getAllProjects);
router.put("/:id", ProjectController.updateProject);
router.delete("/:id", ProjectController.deleteProject);

export default router;
