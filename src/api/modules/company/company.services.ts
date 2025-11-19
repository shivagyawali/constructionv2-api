import { AppDataSource } from "../../../config/db";
import bcrypt from "bcryptjs";
import { validate, ValidationError } from "class-validator";
import { Company } from "../../../entity/Company";
import { User } from "../../../entity/User";
import { ApiError, ForbiddenError } from "../../helpers/Utils/ApiError";
import { UserRole } from "../../enum";
import { constructWhereConditions } from "../../helpers/Utils/constructWhereConditions";
import { paginate } from "../../helpers/Utils/paginate";

export class CompanyService {
  private companyRepository = AppDataSource.getRepository(Company);

  static async registerCompany(
    res:any,
    name:any,
    companyName:any,
    companyEmail:any,
    email:any,
    password:any
  ) {
    const companyRepo = AppDataSource.getRepository(Company);
    const userRepo = AppDataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash(password, 10);
    const company = companyRepo.create({
      name: companyName,
      email: companyEmail,
    });

    // Validate the company entity
    const companyErrors = await validate(company);
    if (companyErrors.length > 0) {
      const formattedErrors = this.formatValidationErrors(companyErrors);
      throw new ApiError(
        400,
        "Company Validation Failed",
        JSON.stringify(formattedErrors)
      );
    }
    const co = await companyRepo.save(company);
    const user = userRepo.create({
      email,
      name,
      password: hashedPassword,
      role: UserRole.CLIENT,
      company,
      companyId: co?.id,
    });

    // Validate the user entity
    const userErrors = await validate(user);
    if (userErrors.length > 0) {
      throw new ApiError(
        400,
        "User Validation Failed",
        JSON.stringify(userErrors)
      );
    }

    // Save the user to the database
    await userRepo.save(user);

    return {
      company: {
        companyName: company.name,
        companyEmail: company.email,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private static formatValidationErrors(errors: ValidationError[]) {
    return errors.map((error) => {
      return {
        field: error.property,
        messages: Object.values(error.constraints || {}),
      };
    });
  }

  getAllCompanies = async (
      req?: any,
      res?: Response,
      page: number = 1,
      filters: { [key: string]: any } = {}
    ) => {
      const { user: { role,isSubAccount, companyId } = {} } = req || {};
        if (role !== UserRole.ROOT && role !== UserRole.CLIENT && isSubAccount) {
          throw new ForbiddenError(
            "You don't have access to view this page"
          );
        }
      let where = {
        ...constructWhereConditions(filters),
        ...(role === UserRole.CLIENT && { id: companyId }),
      };
  
      const [results, count] = await this.companyRepository.findAndCount({
        where,
        relations: ["tasks", "projects"],
        skip: (page - 1) * 10,
        take: 10,
        order: { createdAt: "DESC" },
      });
      return { ...paginate(page, count), results, count };
    };
}
