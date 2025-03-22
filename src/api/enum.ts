export enum UserRole {
  ROOT = "root",
  ADMIN = "admin",
  CLIENT = "client", //can have subuser.. ex: users->subuser 1
  WORKER = "worker",
}


export enum CompanyStatus {
  PENDING_VERIFICATION = "pending_verification",
  VERIFID = "verified",
  ACTIVE = "active",
  INACTIVE = "inactive",
}

