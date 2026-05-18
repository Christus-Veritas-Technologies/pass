import prisma from "../src/index";

const resources = [
  // Mathematics
  { title: "Mathematics Grade 12 Past Paper 2024", subject: "Mathematics", grade: "12", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/math-12-2024.pdf" },
  { title: "Mathematics Grade 12 Marking Guide 2024", subject: "Mathematics", grade: "12", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/math-12-2024-memo.pdf" },
  { title: "Mathematics Grade 12 Past Paper 2023", subject: "Mathematics", grade: "12", year: 2023, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/math-12-2023.pdf" },
  { title: "Mathematics Grade 12 Marking Guide 2023", subject: "Mathematics", grade: "12", year: 2023, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/math-12-2023-memo.pdf" },
  { title: "Mathematics Grade 11 Past Paper 2024", subject: "Mathematics", grade: "11", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/math-11-2024.pdf" },
  { title: "Mathematics Grade 11 Marking Guide 2024", subject: "Mathematics", grade: "11", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/math-11-2024-memo.pdf" },
  { title: "Mathematics Grade 10 Past Paper 2024", subject: "Mathematics", grade: "10", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/math-10-2024.pdf" },
  { title: "Mathematics Curriculum Syllabus 2024", subject: "Mathematics", grade: "12", year: 2024, type: "SYLLABUS" as const, fileUrl: "https://storage.pass.app/resources/math-syllabus-2024.pdf" },

  // English Language
  { title: "English Language Grade 12 Past Paper 2024", subject: "English", grade: "12", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/english-12-2024.pdf" },
  { title: "English Language Grade 12 Marking Guide 2024", subject: "English", grade: "12", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/english-12-2024-memo.pdf" },
  { title: "English Language Grade 12 Past Paper 2023", subject: "English", grade: "12", year: 2023, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/english-12-2023.pdf" },
  { title: "English Language Grade 11 Past Paper 2024", subject: "English", grade: "11", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/english-11-2024.pdf" },
  { title: "English Language Syllabus 2024", subject: "English", grade: "12", year: 2024, type: "SYLLABUS" as const, fileUrl: "https://storage.pass.app/resources/english-syllabus-2024.pdf" },

  // Biology
  { title: "Biology Grade 12 Past Paper 2024", subject: "Biology", grade: "12", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/bio-12-2024.pdf" },
  { title: "Biology Grade 12 Marking Guide 2024", subject: "Biology", grade: "12", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/bio-12-2024-memo.pdf" },
  { title: "Biology Grade 12 Past Paper 2023", subject: "Biology", grade: "12", year: 2023, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/bio-12-2023.pdf" },
  { title: "Biology Grade 11 Past Paper 2024", subject: "Biology", grade: "11", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/bio-11-2024.pdf" },
  { title: "Biology Syllabus 2024", subject: "Biology", grade: "12", year: 2024, type: "SYLLABUS" as const, fileUrl: "https://storage.pass.app/resources/bio-syllabus-2024.pdf" },

  // Chemistry
  { title: "Chemistry Grade 12 Past Paper 2024", subject: "Chemistry", grade: "12", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/chem-12-2024.pdf" },
  { title: "Chemistry Grade 12 Marking Guide 2024", subject: "Chemistry", grade: "12", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/chem-12-2024-memo.pdf" },
  { title: "Chemistry Grade 12 Past Paper 2023", subject: "Chemistry", grade: "12", year: 2023, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/chem-12-2023.pdf" },
  { title: "Chemistry Grade 11 Past Paper 2024", subject: "Chemistry", grade: "11", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/chem-11-2024.pdf" },
  { title: "Chemistry Syllabus 2024", subject: "Chemistry", grade: "12", year: 2024, type: "SYLLABUS" as const, fileUrl: "https://storage.pass.app/resources/chem-syllabus-2024.pdf" },

  // Physics
  { title: "Physics Grade 12 Past Paper 2024", subject: "Physics", grade: "12", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/physics-12-2024.pdf" },
  { title: "Physics Grade 12 Marking Guide 2024", subject: "Physics", grade: "12", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/physics-12-2024-memo.pdf" },
  { title: "Physics Grade 12 Past Paper 2023", subject: "Physics", grade: "12", year: 2023, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/physics-12-2023.pdf" },
  { title: "Physics Grade 11 Past Paper 2024", subject: "Physics", grade: "11", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/physics-11-2024.pdf" },

  // History
  { title: "History Grade 12 Past Paper 2024", subject: "History", grade: "12", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/history-12-2024.pdf" },
  { title: "History Grade 12 Marking Guide 2024", subject: "History", grade: "12", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/history-12-2024-memo.pdf" },
  { title: "History Grade 11 Past Paper 2024", subject: "History", grade: "11", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/history-11-2024.pdf" },

  // Geography
  { title: "Geography Grade 12 Past Paper 2024", subject: "Geography", grade: "12", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/geo-12-2024.pdf" },
  { title: "Geography Grade 12 Marking Guide 2024", subject: "Geography", grade: "12", year: 2024, type: "MARKING_GUIDE" as const, fileUrl: "https://storage.pass.app/resources/geo-12-2024-memo.pdf" },
  { title: "Geography Grade 11 Past Paper 2024", subject: "Geography", grade: "11", year: 2024, type: "PAST_PAPER" as const, fileUrl: "https://storage.pass.app/resources/geo-11-2024.pdf" },
];

async function main() {
  console.log("Seeding resources…");

  await prisma.resource.deleteMany();

  for (const r of resources) {
    await prisma.resource.create({ data: r });
  }

  console.log(`Seeded ${resources.length} resources.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
