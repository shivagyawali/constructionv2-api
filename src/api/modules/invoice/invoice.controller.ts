import { Request, Response } from "express";
import { InvoiceService } from "./invoice.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { UserRole } from "../../enum";
import { sendSuccessResponse } from "../../helpers/Utils/response";

const invoiceService = new InvoiceService();

export class InvoiceController {
  static  createInvoice = asyncHandler(async(req: Request, res: Response)=>{
    const { userId, startDate, endDate } = req.body;
    const invoice = await invoiceService.generateInvoice(
      userId,
      new Date(startDate),
      new Date(endDate)
    );
    return sendSuccessResponse(res, "Invoice Created", 200, invoice);
  })

  static getAllInvoices = asyncHandler(async(req: any, res: Response) =>{
    const { id, companyId, role, isSubAccount } = req.user;
    let data:any = {
      id,
      ...(role === UserRole.CLIENT && !isSubAccount && { companyId }),
      ...(role === UserRole.WORKER  && { companyId }),
    };
    if(role===UserRole.ROOT){
      data={}
    }

     const invoices = await invoiceService.getInvoices(data);
     return sendSuccessResponse(res, "Invoice Fetched", 200, invoices);
  })

  static  markAsPaid = asyncHandler(async(req: Request, res: Response) =>{
    const { invoiceId } = req.params;
    const invoice = await invoiceService.markInvoiceAsPaid(invoiceId);
    return sendSuccessResponse(res, "Invoice Marked as paid", 200, invoice);
  })

  static cancelInvoice = asyncHandler(async(req: any, res: Response)=> {
    const { invoiceId } = req.params;
      
      const invoice = await invoiceService.cancelInvoice(invoiceId);
       return sendSuccessResponse(res, "Invoice Cancelled", 200, invoice);
  })
}
