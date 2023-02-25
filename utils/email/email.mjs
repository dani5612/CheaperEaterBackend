import { env } from "node:process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import handlebars from "handlebars";

/*Send email
 * @param {Object}
 * from: email recepient
 * to: email sender
 * subject: email subject
 * emailTemplate: html template
 * templatePayload: html template variables
 */
const sendEmail = async ({
  from,
  to,
  subject,
  emailTemplate,
  templatePayload,
}) => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: true,
    auth: {
      user: env.SMTP_ACCOUNT,
      pass: env.SMTP_PASSWORD,
    },
  });

  return await transporter.sendMail({
    from: from,
    to: to,
    subject: subject,
    html: handlebars.compile(
      readFileSync(
        path.join(
          path.dirname(fileURLToPath(import.meta.url)),
          "templates",
          emailTemplate
        ),
        "utf8"
      )
    )(templatePayload),
  });
};

export { sendEmail };
