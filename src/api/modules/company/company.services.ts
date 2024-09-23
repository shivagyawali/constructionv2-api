import { AppDataSource } from "../../../config/db";
import bcrypt from "bcryptjs";
import { validate, ValidationError } from "class-validator";
import { Company } from "../../../entity/Company";
import { User } from "../../../entity/User";
import { ApiError } from "../../helpers/Utils/ApiError";

export class CompanyService {
  static async registerCompany(
    res: unknown,
    companyName: string,
    companyEmail: string,
    name: string,
    email: string,
    password: string
  ) {
    const companyRepo = AppDataSource.getRepository(Company);
    const userRepo = AppDataSource.getRepository(User);

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the company entity
    const company = companyRepo.create({
      name: companyName,
      email: companyEmail,
    });

    // Validate the company entity
    const companyErrors = await validate(company);
    if (companyErrors.length > 0) {
      const formattedErrors = this.formatValidationErrors(companyErrors);
      throw new ApiError(
        "Company Validation Failed",
        400,
        "Invalid company details provided",
        formattedErrors
      );
    }

    // Save the company to the database
    await companyRepo.save(company);

    // Create the user entity
    const user = userRepo.create({
      email,
      name,
      password: hashedPassword,
      role: "admin",
      company, // Associate the user with the newly created company
    });

    // Validate the user entity
    const userErrors = await validate(user);
    if (userErrors.length > 0) {
      throw new ApiError(
        "User Validation Failed",
        400,
        "Invalid user details provided",
        this.formatValidationErrors(userErrors)
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
