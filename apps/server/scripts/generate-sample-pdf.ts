/**
 * Generates a sample project PDF using dummy data.
 * Run: bun apps/server/scripts/generate-sample-pdf.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { generateProjectPdfBuffer } from "../src/lib/projectPdfDocument";
import type { Project } from "@pass/db";

const SAMPLE_CONTENT = `
# Introduction

This project investigates the application of quadratic equations in the design of rainwater harvesting tanks commonly used in rural Zimbabwe. Rainwater harvesting is an ancient practice that has been refined over centuries and remains a critical source of fresh water for many communities.

## Background and Context

Zimbabwe's rural communities have long relied on traditional water harvesting methods passed down through generations. The Heritage-Based Curriculum encourages students to apply mathematical principles to real-world indigenous knowledge systems.

**Key concepts covered in this project:**

- Volume calculations using quadratic and cubic functions
- Optimisation of tank dimensions for minimum material cost
- Integration of traditional design principles with modern engineering

## Research Objectives

The objectives of this project are as follows:

- To derive quadratic models for tank volume as a function of base radius
- To determine the optimal radius that maximises volume for a fixed surface area
- To compare modern engineered designs with traditional clay pot designs from the Shona people
- To present findings in a format accessible to the wider school community

## Methodology

### Data Collection

Primary data was collected from three homesteads in Masvingo Province. Tank dimensions were measured using a standard tape measure and recorded in a field notebook. Secondary data was drawn from the Zimbabwe National Water Authority (ZINWA) technical guidelines.

### Mathematical Modelling

Let the cylindrical tank have radius r (metres) and height h (metres). The total surface area A is given by:

A = 2 pi r h + pi r squared

Solving for h and substituting into the volume formula V = pi r squared h, we obtain the quadratic relationship between V and r.

### Analysis

| Radius (m) | Height (m) | Volume (m³) | Surface Area (m²) |
|---|---|---|---|
| 0.5 | 3.2 | 2.51 | 11.00 |
| 0.8 | 2.0 | 4.02 | 11.06 |
| 1.0 | 1.6 | 5.03 | 11.31 |
| 1.2 | 1.1 | 4.97 | 11.52 |

## Results and Discussion

The analysis revealed that a radius of approximately 1.0 metre yields the maximum volume for a fixed surface area of 11 square metres. This aligns with the dimensions observed in the most efficient traditional clay storage vessels collected from local heritage museums.

**Key findings:**

- The volume function V(r) is concave and has a unique maximum
- Traditional craftsmen intuitively arrived at near-optimal proportions without formal mathematics
- Modern HDPE tanks deviate from optimal dimensions due to manufacturing constraints

## Heritage Connection

This investigation affirms the scientific sophistication embedded in traditional Zimbabwean water management. The Shona concept of _kusimudza mvura_ (lifting water) reflects an understanding of gravity-fed systems that predates European engineering texts.

## Conclusion

Quadratic equations provide an accurate and accessible framework for modelling rainwater tank design. Students are encouraged to extend this project by exploring solar-powered pumping systems that complement traditional harvesting methods.

## References

- Zimbabwe National Water Authority. (2022). _Rural Water Supply Technical Guidelines_. Harare: ZINWA.
- Mlambo, T. (2019). _Indigenous Knowledge and Water Harvesting in Sub-Saharan Africa_. Journal of African Studies, 14(2), 88–104.
- Ministry of Primary and Secondary Education. (2023). _HBC 5.0 Mathematics Syllabus_. Harare: MOPSE.
`.trim();

const fakeProject: Project = {
  id: "sample-project-001",
  userId: "user-001",
  topic: "Designing Rainwater Harvesting Tanks with Quadratic Equations",
  subject: "Mathematics",
  grade: "Form 6",
  studentName: "Tatenda Moyo",
  schoolName: "Goromonzi High School",
  district: "Goromonzi",
  province: "Mashonaland East",
  centreNumber: "4021",
  candidateNumber: "001245",
  content: SAMPLE_CONTENT,
  pdfUrl: null,
  outline: null,
  category: "mathematics",
  createdAt: new Date("2026-05-31"),
};

const buf = await generateProjectPdfBuffer(fakeProject);
const out = join(import.meta.dir, "../../../..", "sample-project-template.pdf");
writeFileSync(out, buf);
console.log(`PDF written to: ${out}`);
