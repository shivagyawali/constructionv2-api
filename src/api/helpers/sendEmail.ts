import { AppDataSource } from "../../config/db";
import { defaultConfig } from "../../config/defaultConfig";
import { EmailTemplate } from "../../entity/EmailTemplate";
import nodemailer from "nodemailer";
import { NotFoundError } from "./Utils/ApiError";


const replaceVariables = (
  template: string,
  variables: Record<string, string>
) => {
  return template.replace(
    /\{\{(.*?)\}\}/g,
    (_, key) => variables[key.trim()] || ""
  );
};
export async function sendEmail(eventType: string, to: any, variables:any) {
  try {
   
    const emailRepo = AppDataSource.getRepository(EmailTemplate);

    const emailTemplate = await emailRepo.findOne({
      where: { event: eventType },
    });
    if (!emailTemplate) throw new NotFoundError("Email template not found");
    const htmlContent = replaceVariables(emailTemplate.htmlContent, variables);
    // Configure Nodemailer Transporter
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

    const mailOptions = {
      from: defaultConfig.mail.sender,
      to,
      subject: emailTemplate.subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
  } finally {
   
  }
}
