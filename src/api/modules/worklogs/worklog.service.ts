import { AppDataSource } from "../../../config/db";
import { WorkLog } from "../../../entity/WorkLog";
import { User } from "../../../entity/User";
import { instanceToPlain } from "class-transformer";

export class WorkLogService {
  private workLogRepo = AppDataSource.getRepository(WorkLog);
  private userRepo = AppDataSource.getRepository(User);

  async startWork(
    userId: any,
    latitude: number,
    longitude: number
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const workLog = this.workLogRepo.create({
      user,
      startTime: new Date(),
      startLatitude: latitude,
      startLongitude: longitude,
    });

    return await this.workLogRepo.save(workLog);
  }

  async endWork(
    userId:any,
    latitude: number,
    longitude: number
  ) {
    const workLog:any = await this.workLogRepo.findOne({
      where: { user: { id: userId } },
      order: { startTime: "DESC" },
      relations: ["user"], // Ensures `hourlyRate` is available
    });

    if (!workLog) throw new Error("No active work session found");

    const endTime = new Date();
    const totalHours =
      (endTime.getTime() - workLog.startTime.getTime()) / 3600000;
    const earnings = totalHours * (workLog.user.hourlyRate || 0);

    Object.assign(workLog, {
      endTime,
      totalHours,
      earnings,
      endLatitude: latitude,
      endLongitude: longitude,
    });

    return await this.workLogRepo.save(workLog);
  }

  async getWorkLogs(userId: any) {
    return 
      await this.workLogRepo.find({
        where: { user: { id: userId } },
        order: { startTime: "DESC" },
      })
    
  }
}
