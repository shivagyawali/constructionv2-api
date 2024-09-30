import { AppDataSource } from "../../../config/db";
import bcrypt from "bcryptjs";
import { validate, ValidationError } from "class-validator";
import { Company } from "../../../entity/Company";
import { User } from "../../../entity/User";
import { ApiError } from "../../helpers/Utils/ApiError";
import { UserRole } from "../../enum";

export class CompanyService {
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
}
