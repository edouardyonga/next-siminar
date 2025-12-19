import nodemailer from "nodemailer";
import { env } from "./env";
import { formatDate, formatMoney } from "./format";

type AssignmentEmailInput = {
  course: {
    name: string;
    startDate: Date | string;
    endDate: Date | string;
    location: string;
    participants: number;
    notes?: string | null;
    price: unknown;
    trainerPrice: unknown;
    subject: string[];
  };
  trainer: { name: string; email: string };
  assignedBy?: string | null;
};

const mailPort = Number(env.MAIL_PORT) || 1025;

const transporter = nodemailer.createTransport({
  host: env.MAIL_HOST,
  port: mailPort,
  secure: mailPort === 465,
  tls: { rejectUnauthorized: false },
});

function toNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function sendTrainerAssignmentEmail(input: AssignmentEmailInput) {
  if (!input.trainer?.email) throw new Error("Trainer email is missing");

  const start = formatDate(input.course.startDate, { month: "long", day: "numeric", year: "numeric" });
  const end = formatDate(input.course.endDate, { month: "long", day: "numeric", year: "numeric" });
  const schedule = start === end ? start : `${start} – ${end}`;
  const subjects = input.course.subject?.length ? input.course.subject.join(", ") : "—";
  const price = formatMoney(toNumber(input.course.price));
  const trainerPrice = formatMoney(toNumber(input.course.trainerPrice));
  const notes =
    (typeof input.course.notes === "string" && input.course.notes.trim()) || "No additional notes provided.";
  const assignedBy = input.assignedBy ?? "Scheduling team";

  const textBody = [
    `Hello ${input.trainer.name},`,
    "",
    `You have been assigned to the course "${input.course.name}".`,
    "",
    `Dates: ${schedule}`,
    `Location: ${input.course.location}`,
    `Participants: ${input.course.participants}`,
    `Subjects: ${subjects}`,
    `Client pricing: ${price}`,
    `Trainer compensation: ${trainerPrice}`,
    `Notes: ${notes}`,
    `Assigned by: ${assignedBy}`,
    "",
    "Please confirm your availability or share any constraints.",
    "Thank you.",
  ].join("\n");

  const htmlBody = `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background: #f4f5fb; padding: 24px;">
      <tr>
        <td>
          <table width="600" cellpadding="0" cellspacing="0" align="center" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(17,24,39,0.08);">
            <tr>
              <td style="background: linear-gradient(90deg,#4f46e5,#6366f1); padding: 20px 24px; color: #ffffff;">
                <div style="font-size: 14px; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.08em;">Training Assignment</div>
                <div style="font-size: 20px; font-weight: 700; margin-top: 6px;">${input.course.name}</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px;">
                <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">Hello ${input.trainer.name},</p>
                <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px; line-height: 1.5;">
                  You have been assigned to the course <strong>${input.course.name}</strong>. Below are the details of the session.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 14px; color: #111827;">
                  <tr>
                    <td style="padding: 10px 12px; background: #f9fafb; font-weight: 600; width: 170px;">Dates</td>
                    <td style="padding: 10px 12px; background: #f9fafb;">${schedule}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px;">Location</td>
                    <td style="padding: 10px 12px;">${input.course.location}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; background: #f9fafb;">Participants</td>
                    <td style="padding: 10px 12px; background: #f9fafb;">${input.course.participants}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px;">Subjects</td>
                    <td style="padding: 10px 12px;">${subjects}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; background: #f9fafb;">Client pricing</td>
                    <td style="padding: 10px 12px; background: #f9fafb;">${price}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px;">Trainer compensation</td>
                    <td style="padding: 10px 12px;">${trainerPrice}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; background: #f9fafb; vertical-align: top;">Notes</td>
                    <td style="padding: 10px 12px; background: #f9fafb; white-space: pre-wrap;">${notes}</td>
                  </tr>
                </table>
                <div style="margin-top: 18px; padding: 14px 16px; background: #eef2ff; border-radius: 10px; color: #312e81; font-size: 13px; line-height: 1.5;">
                  Assigned by: <strong>${assignedBy}</strong><br/>
                  Please confirm your availability or share any constraints.
                </div>
                <p style="margin: 18px 0 0 0; color: #111827; font-size: 14px;">Thank you,</p>
                <p style="margin: 4px 0 0 0; color: #4f46e5; font-weight: 700;">Seminar Operations Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const message = {
    from: `Seminar Ops <${env.MAIL_FROM}>`,
    to: `${input.trainer.name} <${input.trainer.email}>`,
    subject: `New course assignment: ${input.course.name}`,
    text: textBody,
    html: htmlBody,
  };

  const info = await transporter.sendMail(message);
  return info;
}

