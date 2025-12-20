const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

async function main() {
  console.info("Resetting database...");
  await prisma.assignmentHistory.deleteMany();
  await prisma.course.deleteMany();
  await prisma.trainer.deleteMany();

  const trainers = await Promise.all([
    prisma.trainer.create({
      data: {
        name: "Alice Dupont",
        email: "alice.dupont@example.com",
        location: "Paris",
        trainingSubjects: ["Agile", "Scrum", "Product Discovery"],
        availabilityRanges: [
          { start: "2025-01-10T08:00:00.000Z", end: "2025-01-31T17:00:00.000Z" },
          { start: "2025-03-03T08:00:00.000Z", end: "2025-03-21T17:00:00.000Z" },
        ],
        hourlyRate: new Prisma.Decimal(120),
        rating: 5,
      },
    }),
    prisma.trainer.create({
      data: {
        name: "Bruno Martin",
        email: "bruno.martin@example.com",
        location: "Lyon",
        trainingSubjects: ["Data Visualization", "Power BI", "Excel Advanced"],
        availabilityRanges: [{ start: "2025-01-13T08:00:00.000Z", end: "2025-02-14T17:00:00.000Z" }],
        hourlyRate: new Prisma.Decimal(110),
        rating: 4,
      },
    }),
    prisma.trainer.create({
      data: {
        name: "Chloe Bernard",
        email: "chloe.bernard@example.com",
        location: "Marseille",
        trainingSubjects: ["Public Speaking", "Facilitation", "Management"],
        availabilityRanges: [
          { start: "2025-02-01T08:00:00.000Z", end: "2025-02-28T17:00:00.000Z" },
          { start: "2025-04-07T08:00:00.000Z", end: "2025-04-18T17:00:00.000Z" },
        ],
        hourlyRate: new Prisma.Decimal(95),
        rating: 5,
      },
    }),
    prisma.trainer.create({
      data: {
        name: "David Leroy",
        email: "david.leroy@example.com",
        location: "Lille",
        trainingSubjects: ["Cloud", "DevOps", "Terraform", "AWS"],
        availabilityRanges: [
          { start: "2025-01-27T08:00:00.000Z", end: "2025-02-28T17:00:00.000Z" },
          { start: "2025-04-01T08:00:00.000Z", end: "2025-04-30T17:00:00.000Z" },
        ],
        hourlyRate: new Prisma.Decimal(130),
        rating: 4,
      },
    }),
    prisma.trainer.create({
      data: {
        name: "Emma Caron",
        email: "emma.caron@example.com",
        location: "Bordeaux",
        trainingSubjects: ["Security Awareness", "OWASP Top 10", "Risk Management"],
        availabilityRanges: [
          { start: "2025-01-20T08:00:00.000Z", end: "2025-02-10T17:00:00.000Z" },
          { start: "2025-03-17T08:00:00.000Z", end: "2025-03-28T17:00:00.000Z" },
        ],
        hourlyRate: new Prisma.Decimal(115),
        rating: 5,
      },
    }),
    prisma.trainer.create({
      data: {
        name: "Farid Nguyen",
        email: "farid.nguyen@example.com",
        location: "Remote",
        trainingSubjects: ["Python", "Machine Learning", "Data Science"],
        availabilityRanges: [{ start: "2025-02-10T08:00:00.000Z", end: "2025-03-15T17:00:00.000Z" }],
        hourlyRate: new Prisma.Decimal(105),
        rating: 4,
      },
    }),
    prisma.trainer.create({
      data: {
        name: "Ines Laurent",
        email: "ines.laurent@example.com",
        location: "Nantes",
        trainingSubjects: ["Leadership", "Change Management", "Communication"],
        availabilityRanges: [
          { start: "2025-01-15T08:00:00.000Z", end: "2025-01-31T17:00:00.000Z" },
          { start: "2025-03-03T08:00:00.000Z", end: "2025-03-21T17:00:00.000Z" },
        ],
        hourlyRate: new Prisma.Decimal(90),
        rating: 5,
      },
    }),
  ]);

  const trainerByEmail = Object.fromEntries(trainers.map((t) => [t.email, t]));

  const coursesInput = [
    {
      name: "Agile Kickoff",
      startDate: new Date("2025-01-15T08:00:00.000Z"),
      endDate: new Date("2025-01-17T16:00:00.000Z"),
      subject: ["Agile", "Scrum"],
      location: "Paris",
      participants: 18,
      notes: "On-site workshop with product and engineering leads.",
      price: new Prisma.Decimal(4200),
      trainerPrice: new Prisma.Decimal(2100),
      status: "scheduled",
      assignedTrainerEmail: "alice.dupont@example.com",
    },
    {
      name: "Data Viz Bootcamp",
      startDate: new Date("2025-01-20T09:00:00.000Z"),
      endDate: new Date("2025-01-22T17:00:00.000Z"),
      subject: ["Data Visualization", "Power BI"],
      location: "Lyon",
      participants: 15,
      notes: "Focus on dashboard storytelling for executives.",
      price: new Prisma.Decimal(5200),
      trainerPrice: new Prisma.Decimal(2600),
      status: "scheduled",
      assignedTrainerEmail: "bruno.martin@example.com",
    },
    {
      name: "Executive Presentation Skills",
      startDate: new Date("2025-02-05T09:00:00.000Z"),
      endDate: new Date("2025-02-05T17:00:00.000Z"),
      subject: ["Public Speaking", "Storytelling"],
      location: "Remote",
      participants: 10,
      notes: "Remote-friendly, includes live recording practice.",
      price: new Prisma.Decimal(1800),
      trainerPrice: new Prisma.Decimal(950),
      status: "draft",
      assignedTrainerEmail: "chloe.bernard@example.com",
    },
    {
      name: "AI for Managers",
      startDate: new Date("2025-02-12T09:00:00.000Z"),
      endDate: new Date("2025-02-13T17:00:00.000Z"),
      subject: ["AI Fundamentals", "Use Cases"],
      location: "Paris",
      participants: 20,
      notes: "Draft session; trainer to be confirmed after availability review.",
      price: new Prisma.Decimal(5600),
      trainerPrice: new Prisma.Decimal(2800),
      status: "draft",
      assignedTrainerEmail: null,
    },
    {
      name: "Cloud Foundations Sprint",
      startDate: new Date("2025-02-10T09:00:00.000Z"),
      endDate: new Date("2025-02-11T17:00:00.000Z"),
      subject: ["Cloud", "AWS"],
      location: "Lille",
      participants: 14,
      notes: "Hands-on labs with Terraform and AWS basics.",
      price: new Prisma.Decimal(4800),
      trainerPrice: new Prisma.Decimal(2400),
      status: "scheduled",
      assignedTrainerEmail: "david.leroy@example.com",
    },
    {
      name: "Security Awareness for Managers",
      startDate: new Date("2025-01-23T09:00:00.000Z"),
      endDate: new Date("2025-01-23T17:00:00.000Z"),
      subject: ["Security Awareness", "Risk Management"],
      location: "Bordeaux",
      participants: 22,
      notes: "Executive-friendly overview with phishing simulations.",
      price: new Prisma.Decimal(2600),
      trainerPrice: new Prisma.Decimal(1300),
      status: "scheduled",
      assignedTrainerEmail: "emma.caron@example.com",
    },
    {
      name: "Data Science for Analysts",
      startDate: new Date("2025-02-25T09:00:00.000Z"),
      endDate: new Date("2025-02-27T17:00:00.000Z"),
      subject: ["Data Science", "Python"],
      location: "Remote",
      participants: 16,
      notes: "Practical notebooks on feature engineering and evaluation.",
      price: new Prisma.Decimal(5400),
      trainerPrice: new Prisma.Decimal(2700),
      status: "scheduled",
      assignedTrainerEmail: "farid.nguyen@example.com",
    },
    {
      name: "Leadership Offsite",
      startDate: new Date("2025-03-10T09:00:00.000Z"),
      endDate: new Date("2025-03-11T17:00:00.000Z"),
      subject: ["Leadership", "Change Management"],
      location: "Rennes",
      participants: 12,
      notes: "Small cohort offsite focused on facilitation and alignment.",
      price: new Prisma.Decimal(3600),
      trainerPrice: new Prisma.Decimal(1800),
      status: "scheduled",
      assignedTrainerEmail: "ines.laurent@example.com",
    },
    {
      name: "Generative AI Primer",
      startDate: new Date("2025-04-08T09:00:00.000Z"),
      endDate: new Date("2025-04-09T17:00:00.000Z"),
      subject: ["AI Fundamentals", "Prompting"],
      location: "Paris",
      participants: 18,
      notes: "Draft session to validate demand before assigning a trainer.",
      price: new Prisma.Decimal(4200),
      trainerPrice: new Prisma.Decimal(2100),
      status: "draft",
      assignedTrainerEmail: null,
    },
  ];

  for (const course of coursesInput) {
    const assignedTrainerId = course.assignedTrainerEmail
      ? trainerByEmail[course.assignedTrainerEmail]?.id ?? null
      : null;

    const createdCourse = await prisma.course.create({
      data: {
        name: course.name,
        startDate: course.startDate,
        endDate: course.endDate,
        subject: course.subject,
        location: course.location,
        participants: course.participants,
        notes: course.notes,
        price: course.price,
        trainerPrice: course.trainerPrice,
        status: course.status,
        assignedTrainerId,
      },
    });

    if (assignedTrainerId) {
      await prisma.assignmentHistory.create({
        data: {
          courseId: createdCourse.id,
          trainerId: assignedTrainerId,
          action: "assigned",
          actor: adminEmail,
        },
      });
    }
  }

  console.info("Seed completed.");
}

main()
  .catch((err) => {
    console.error("Seed failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

