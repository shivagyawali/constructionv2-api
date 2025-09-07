import { Request, Response } from "express";
import { EventService } from "./event.service";
import { asyncHandler } from "../../helpers/Utils/AsyncHandler";
import { sendSuccessResponse } from "../../helpers/Utils/response";
const eventService = new EventService();

export class EventController {
  static getAllEvents = asyncHandler(async (req: any, res: Response) => {
     const page = parseInt(req.query.page as string, 10) || 1;
        const filters: any = req.query;
        delete filters.page;
        const events = await eventService.getAllEvents(
          req,
          res,
          page,
          filters
        );
        return sendSuccessResponse(res,events.count ===0 ? "No data found":"Data Fetched Successfully", 200,events);
  });

 
}
