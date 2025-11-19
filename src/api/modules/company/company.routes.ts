import { Router } from "express";
import { CompanyController } from "../company/company.controllers";
import { authorize } from "../../middleware/authorization";

const router = Router();
router.use((req, res, next) => {
  const resource = req.originalUrl.split("/")[2];
  const method = req.method.toLowerCase();
  const actionMap: any = {
    get: "view",
    post: "create",
    put: "edit",
    delete: "delete",
  };

  const action = actionMap[method];

  authorize(resource, action)(req, res, next);
});

router.get("/list", CompanyController.getAllCompanies);
router.post("/register", CompanyController.registerCompany);

export default router;
