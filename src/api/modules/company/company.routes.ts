import { Router } from "express";
import { CompanyController } from "../company/company.controllers";

const router = Router();

router.post("/register", CompanyController.registerCompany);

export default router;
