import { AppDataSource } from "../../../config/db";
import { WorkLog } from "../../../entity/WorkLog";
import { Invoice } from "../../../entity/Invoice";
import { User } from "../../../entity/User";
import { instanceToPlain } from "class-transformer";
import { LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { NotFoundError } from "../../helpers/Utils/ApiError";
import moment from "moment";

export class InvoiceService {
  private invoiceRepo = AppDataSource.getRepository(Invoice);
  private workLogRepo = AppDataSource.getRepository(WorkLog);
  private userRepo = AppDataSource.getRepository(User);

  async generateInvoice(userId: string, startDate: Date, endDate: Date) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    const workLogs = await this.workLogRepo.find({
      where: {
        user: { id: userId },
        startTime: MoreThanOrEqual(moment(startDate).startOf("day").toDate()),
        endTime: LessThanOrEqual(moment(endDate).endOf("day").toDate()),
      },
      order: { startTime: "ASC" },
    });

    if (!workLogs.length)
      throw new NotFoundError("No work logs found for the selected period");

    const totalHours = workLogs.reduce(
      (sum, log) => sum + Number(log.totalHours || 0),
      0
    );
    const totalEarnings = totalHours * (Number(user.hourlyRate) || 0);

    const invoice = this.invoiceRepo.create({
      user,
      startDate,
      endDate,
      totalHours,
      totalEarnings,
      status: "PENDING",
    });

    return instanceToPlain(await this.invoiceRepo.save(invoice));
  }

  async markInvoiceAsPaid(invoiceId: string) {
    let where=  {
       id: invoiceId
     }
 
    const invoice = await this.invoiceRepo.findOne({
     where
    });
    if (!invoice) throw new NotFoundError("Invoice not found");

    invoice.status = "PAID";
    return await this.invoiceRepo.save(invoice);
  }

  async cancelInvoice(invoiceId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
    });
    if (!invoice) throw new NotFoundError("Invoice not found");

    invoice.status = "CANCELLED";
    return await this.invoiceRepo.save(invoice);
  }

  async getInvoices(data?:any) {
     data =  {user: { id: data.id,
      ...data.companyId&& data.companyId
      } }
    return instanceToPlain(
      await this.invoiceRepo.find({
        where: data,
        relations:["user"],
        order: { createdAt: "DESC" },
      })
    );
  }
}
