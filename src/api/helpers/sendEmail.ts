import { AppDataSource } from "../../config/db";
import { defaultConfig } from "../../config/defaultConfig";
import { EmailTemplate } from "../../entity/EmailTemplate";
import nodemailer from "nodemailer";
import { NotFoundError } from "./Utils/ApiError";
import ejs from "ejs";

export async function sendEmail(eventType: string, to: any, variables: any) {
  const emailRepo = AppDataSource.getRepository(EmailTemplate);

  // 1. Fetch template
  const emailTemplate = await emailRepo.findOne({
    where: { event: eventType },
  });

  if (!emailTemplate) throw new NotFoundError("Email template not found");

  // 2. Render EJS template from the stored HTML string
  const htmlContent = await ejs.render(emailTemplate.htmlContent, variables);

  // 3. Configure Nodemailer
  const transporter = nodemailer.createTransport({
    // @ts-ignore
    host: defaultConfig.mail.host,
    port: defaultConfig.mail.port,
    secure: false,
    auth: {
      user: defaultConfig.mail.user,
      pass: defaultConfig.mail.password,
    },
  });

  // 4. Send email
  const mailOptions = {
    from: defaultConfig.mail.sender,
    to,
    subject: emailTemplate.subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
}
