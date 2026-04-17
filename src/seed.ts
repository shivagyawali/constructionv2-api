/**
 * seed.ts — Run once to bootstrap:
 *   1. SuperAdmin account
 *   2. Demo construction company
 *   3. Company admin user
 *   4. Default role permissions for the company
 *
 * Usage:
 *   npx ts-node src/seed.ts
 */

import "reflect-metadata";
import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "./config/data-source";
import { User, UserRole } from "./entities/User.entity";
import { Company, CompanyStatus, CompanyPlan } from "./entities/Company.entity";
import { RolePermission } from "./entities/RolePermission.entity";

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin:      ["/dashboard","/clients","/projects","/tasks","/workers","/invoice-periods","/invoices"],
  manager:    ["/dashboard","/clients","/projects","/tasks","/workers","/invoice-periods","/invoices"],
  supervisor: ["/dashboard","/projects","/tasks"],
  worker:     ["/dashboard","/tasks"],
  contractor: ["/dashboard"],
};

async function seed() {
  await AppDataSource.initialize();
  console.log("✅ DB connected");

  const userRepo    = AppDataSource.getRepository(User);
  const companyRepo = AppDataSource.getRepository(Company);
  const roleRepo    = AppDataSource.getRepository(RolePermission);

  // ── 1. SuperAdmin ──────────────────────────────────────────────────────────
  const SA_EMAIL    = process.env.SUPERADMIN_EMAIL    ?? "superadmin@gmail.io";
  const SA_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? "SuperAdmin@123";

  let superAdmin = await userRepo.findOne({ where: { email: SA_EMAIL } });
  if (!superAdmin) {
    superAdmin = userRepo.create({
      firstName: "Super",
      lastName:  "Admin",
      email:     SA_EMAIL,
      password:  SA_PASSWORD,
      role:      UserRole.SUPERADMIN,
      isActive:  true,
    });
    await userRepo.save(superAdmin);
    console.log(`✅ SuperAdmin created: ${SA_EMAIL} / ${SA_PASSWORD}`);
  } else {
    console.log(`ℹ️  SuperAdmin already exists: ${SA_EMAIL}`);
  }

  // ── 2. Demo Company ────────────────────────────────────────────────────────
  let company = await companyRepo.findOne({ where: { slug: "buildersoft-construction" } });
  if (!company) {
    company = companyRepo.create({
      name:         "Buildersoft Construction",
      slug:         "buildersoft-construction",
      email:        "admin@gmail.com",
      phone:        "+1-555-0100",
      address:      "123 Builder Street",
      city:         "Toronto",
      province:     "Ontario",
      country:      "Canada",
      postalCode:   "M5H 2N2",
      website:      "https://buildersoft.ca",
      description:  "Premium construction management services",
      status:       CompanyStatus.ACTIVE,
      plan:         CompanyPlan.PRO,
      maxUsers:     20,
      maxProjects:  50,
      maxWorkers:   100,
      trialEndsAt:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await companyRepo.save(company);
    console.log(`✅ Demo company created: ${company.name} (${company.id})`);
  } else {
    console.log(`ℹ️  Demo company already exists`);
  }

  // ── 3. Company Admin ───────────────────────────────────────────────────────
  const ADMIN_EMAIL    = process.env.COMPANY_ADMIN_EMAIL    ?? "admin@gmail.com";
  const ADMIN_PASSWORD = process.env.COMPANY_ADMIN_PASSWORD ?? "Admin@123456";

  let companyAdmin = await userRepo.findOne({ where: { email: ADMIN_EMAIL } });
  if (!companyAdmin) {
    companyAdmin = userRepo.create({
      firstName: "Company",
      lastName:  "Admin",
      email:     ADMIN_EMAIL,
      password:  ADMIN_PASSWORD,
      role:      UserRole.ADMIN,
      companyId: company.id,
      isActive:  true,
    });
    await userRepo.save(companyAdmin);
    company.ownerId = companyAdmin.id;
    await companyRepo.save(company);
    console.log(`✅ Company admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`ℹ️  Company admin already exists`);
  }

  // ── 4. Demo Users (manager, supervisor, worker) ────────────────────────────
  const demoUsers = [
    { firstName: "Mike",  lastName: "Johnson", email: "manager@gmail.com",    role: UserRole.MANAGER,    password: "Manager@123" },
    { firstName: "Sarah", lastName: "Chen",    email: "supervisor@gmail.com", role: UserRole.SUPERVISOR, password: "Supervisor@123" },
    { firstName: "Jake",  lastName: "Torres",  email: "worker@gmail.com",     role: UserRole.WORKER,     password: "Worker@123" },
  ];

  for (const u of demoUsers) {
    const exists = await userRepo.findOne({ where: { email: u.email } });
    if (!exists) {
      const user = userRepo.create({ ...u, companyId: company.id, isActive: true });
      await userRepo.save(user);
      console.log(`✅ Demo user created: ${u.email} / ${u.password} [${u.role}]`);
    } else {
      console.log(`ℹ️  Demo user exists: ${u.email}`);
    }
  }

  // ── 5. Role Permissions for company ───────────────────────────────────────
  for (const [role, allowedRoutes] of Object.entries(DEFAULT_PERMISSIONS)) {
    const exists = await roleRepo.findOne({ where: { companyId: company.id, role } });
    if (!exists) {
      const row = roleRepo.create({ companyId: company.id, role, allowedRoutes });
      await roleRepo.save(row);
      console.log(`✅ Role permission seeded: ${role}`);
    }
  }

  // ── 6. Global (fallback) permissions ──────────────────────────────────────
  for (const [role, allowedRoutes] of Object.entries(DEFAULT_PERMISSIONS)) {
    const exists = await roleRepo.findOne({ where: { role } });
    if (!exists) {
      const row = roleRepo.create({ role, allowedRoutes } as any);
      await roleRepo.save(row);
    }
  }

  console.log("\n🎉 Seed complete!\n");
  console.log("┌────────────────────────────────────────────────────────┐");
  console.log("│  CREDENTIALS                                           │");
  console.log("├────────────────────────────────────────────────────────┤");
  console.log(`│  SuperAdmin:  ${SA_EMAIL.padEnd(30)} ${SA_PASSWORD.padEnd(10)} │`);
  console.log(`│  CompanyAdmin:${ADMIN_EMAIL.padEnd(30)} Admin@123456  │`);
  console.log(`│  Manager:     manager@gmail.com           Manager@123   │`);
  console.log(`│  Supervisor:  supervisor@gmail.com        Supervisor@123│`);
  console.log(`│  Worker:      worker@gmail.com            Worker@123    │`);
  console.log("└────────────────────────────────────────────────────────┘\n");

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
