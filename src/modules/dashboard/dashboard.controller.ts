import { Response } from "express";
import { AppDataSource } from "../../config/data-source";
import { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendError } from "../../utils/response";

export class DashboardController {
  overview = async (req: AuthRequest, res: Response) => {
    try {
      // Scope all queries to company (if not superadmin viewing all)
      const cid = req.companyId;
      const cidQ = cid ? "AND companyId = ?" : "";
      const cidP = cid ? [cid] : [];

      const [
        clientStats,
        projectStats,
        invoiceStats,
        workerStats,
        recentProjects,
        recentInvoices,
        monthlyRevenue,
        taskOverview,
      ] = await Promise.all([
        AppDataSource.query(
          `SELECT COUNT(*) as total, SUM(isActive=1) as active FROM clients WHERE 1=1 ${cidQ}`,
          cidP,
        ),
        AppDataSource.query(
          `SELECT 
    SUM(t.status='todo') as todo,
    SUM(t.status='in_progress') as in_progress,
    SUM(t.status='review') as review,
    SUM(t.status='done') as done,
    SUM(t.status='cancelled') as cancelled,
    COUNT(*) as total,
    ROUND(AVG(t.progress),1) as avgProgress
   FROM tasks t
   INNER JOIN projects p ON p.id = t.projectId
   WHERE 1=1 ${cidQ ? "AND p.companyId = ?" : ""}`,
          cid ? [cid] : [],
        ),
        AppDataSource.query(
          `SELECT COUNT(*) as total, SUM(status='paid') as paid,
           SUM(status IN ('sent','viewed','partially_paid','overdue')) as pending,
           COALESCE(SUM(CASE WHEN status='paid' THEN totalAmount ELSE 0 END),0) as totalRevenue,
           COALESCE(SUM(CASE WHEN status IN ('sent','viewed','partially_paid') THEN amountDue ELSE 0 END),0) as outstanding,
           COALESCE(SUM(CASE WHEN status='overdue' THEN amountDue ELSE 0 END),0) as overdue
           FROM invoices WHERE 1=1 ${cidQ}`,
          cidP,
        ),
        AppDataSource.query(
          `SELECT COUNT(*) as total, SUM(status='active') as active,
           SUM(status='inactive') as inactive, SUM(status='on_leave') as on_leave
           FROM workers WHERE 1=1 ${cidQ}`,
          cidP,
        ),
        AppDataSource.query(
          `SELECT p.id, p.name, p.status, p.priority, p.progress, p.expectedEndDate,
           c.firstName, c.lastName, c.company
           FROM projects p LEFT JOIN clients c ON c.id = p.clientId
           WHERE 1=1 ${cidQ ? "AND p.companyId = ?" : ""}
           ORDER BY p.updatedAt DESC LIMIT 6`,
          cid ? [cid] : [],
        ),
        AppDataSource.query(
          `SELECT i.id, i.invoiceNumber, i.status, i.totalAmount, i.amountDue,
           i.dueDate, i.issueDate, c.firstName, c.lastName
           FROM invoices i LEFT JOIN clients c ON c.id = i.clientId
           WHERE 1=1 ${cidQ ? "AND i.companyId = ?" : ""}
           ORDER BY i.createdAt DESC LIMIT 6`,
          cid ? [cid] : [],
        ),
        AppDataSource.query(
          `SELECT DATE_FORMAT(issueDate,'%Y-%m') as month,
           COALESCE(SUM(CASE WHEN status='paid' THEN totalAmount ELSE 0 END),0) as revenue,
           COALESCE(SUM(totalAmount),0) as billed, COUNT(*) as invoiceCount
           FROM invoices
           WHERE issueDate >= DATE_SUB(NOW(), INTERVAL 6 MONTH) ${cidQ}
           GROUP BY DATE_FORMAT(issueDate,'%Y-%m') ORDER BY month ASC`,
          cidP,
        ),
        AppDataSource.query(
          `SELECT SUM(status='todo') as todo, SUM(status='in_progress') as in_progress,
           SUM(status='review') as review, SUM(status='done') as done,
           SUM(status='cancelled') as cancelled, COUNT(*) as total,
           ROUND(AVG(progress),1) as avgProgress
           FROM tasks t
           INNER JOIN projects p ON p.id = t.projectId
           WHERE 1=1 ${cidQ ? "AND p.companyId = ?" : ""}`,
          cid ? [cid] : [],
        ),
      ]);

      return sendSuccess(res, {
        clients: {
          total: Number(clientStats[0].total),
          active: Number(clientStats[0].active),
        },
        projects: {
          total: Number(projectStats[0].total),
          active: Number(projectStats[0].active),
          planning: Number(projectStats[0].planning),
          completed: Number(projectStats[0].completed),
          on_hold: Number(projectStats[0].on_hold),
          cancelled: Number(projectStats[0].cancelled),
        },
        invoices: {
          total: Number(invoiceStats[0].total),
          paid: Number(invoiceStats[0].paid),
          pending: Number(invoiceStats[0].pending),
          totalRevenue: Number(invoiceStats[0].totalRevenue),
          outstanding: Number(invoiceStats[0].outstanding),
          overdue: Number(invoiceStats[0].overdue),
        },
        workers: {
          total: Number(workerStats[0].total),
          active: Number(workerStats[0].active),
          inactive: Number(workerStats[0].inactive),
          on_leave: Number(workerStats[0].on_leave),
        },
        tasks: {
          total: Number(taskOverview[0].total),
          todo: Number(taskOverview[0].todo),
          in_progress: Number(taskOverview[0].in_progress),
          review: Number(taskOverview[0].review),
          done: Number(taskOverview[0].done),
          cancelled: Number(taskOverview[0].cancelled),
          avgProgress: Number(taskOverview[0].avgProgress),
        },
        recentProjects,
        recentInvoices,
        monthlyRevenue,
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };

  laborSummary = async (req: AuthRequest, res: Response) => {
    try {
      const cid = req.companyId;
      const { from, to } = req.query;
      let clause = "1=1";
      const params: any[] = [];
      if (from) {
        clause += " AND wl.logDate >= ?";
        params.push(from);
      }
      if (to) {
        clause += " AND wl.logDate <= ?";
        params.push(to);
      }
      if (cid) {
        clause += " AND p.companyId = ?";
        params.push(cid);
      }

      const [summary, byWorker, byProject] = await Promise.all([
        AppDataSource.query(
          `SELECT COALESCE(SUM(hoursWorked),0) as totalHours,
           COALESCE(SUM(overtimeHours),0) as totalOvertime,
           COALESCE(SUM(totalCost),0) as totalCost,
           COUNT(*) as totalLogs,
           COUNT(DISTINCT workerId) as workers,
           COUNT(DISTINCT wl.projectId) as projects
           FROM worker_logs wl
           INNER JOIN projects p ON p.id = wl.projectId
           WHERE ${clause} AND wl.status != 'rejected'`,
          params,
        ),
        AppDataSource.query(
          `SELECT w.id, w.firstName, w.lastName, w.role,
           COALESCE(SUM(wl.hoursWorked),0) as hours,
           COALESCE(SUM(wl.overtimeHours),0) as overtime,
           COALESCE(SUM(wl.totalCost),0) as cost, COUNT(*) as logs
           FROM worker_logs wl
           JOIN workers w ON w.id = wl.workerId
           INNER JOIN projects p ON p.id = wl.projectId
           WHERE ${clause} AND wl.status != 'rejected'
           GROUP BY w.id ORDER BY hours DESC LIMIT 10`,
          params,
        ),
        AppDataSource.query(
          `SELECT p.id, p.name,
           COALESCE(SUM(wl.hoursWorked),0) as hours,
           COALESCE(SUM(wl.totalCost),0) as cost, COUNT(*) as logs
           FROM worker_logs wl JOIN projects p ON p.id = wl.projectId
           WHERE ${clause} AND wl.status != 'rejected'
           GROUP BY p.id ORDER BY hours DESC LIMIT 10`,
          params,
        ),
      ]);

      return sendSuccess(res, {
        summary: {
          totalHours: Number(summary[0].totalHours),
          totalOvertime: Number(summary[0].totalOvertime),
          totalCost: Number(summary[0].totalCost),
          totalLogs: Number(summary[0].totalLogs),
          workers: Number(summary[0].workers),
          projects: Number(summary[0].projects),
        },
        byWorker,
        byProject,
      });
    } catch (e: any) {
      return sendError(res, e.message, 500);
    }
  };
}
