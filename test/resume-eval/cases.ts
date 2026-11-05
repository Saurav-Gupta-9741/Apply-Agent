/** A labelled evaluation set for the resume reader. Every person, company, school and link here is made up.
 *
 * Text cases are plain resume text (as pasted or as read from a simple file). PDF and DOCX cases are real file bytes
 * built by ./pdf-writer, so layout (columns, tables, right-aligned dates) and hyperlinks are read the way a user's
 * file is read. `expect` lists what a careful human would take from the resume; a field left out must NOT be
 * suggested (any value there counts as wrong). */

import { linkOver, makeDocx, makePdf, type PdfLink, type PdfText } from "./pdf-writer";

export interface ExpectedJob {
  title: string;
  company: string;
  /** "2021-01", or "2021" when only years are written. */
  start: string;
  /** "present" for a current job. */
  end: string;
}

/** A string, or several acceptable spellings. */
export type Accept = string | string[];

export interface Expected {
  firstName?: Accept;
  lastName?: Accept;
  email?: Accept;
  phone?: Accept;
  location?: Accept;
  linkedin?: Accept;
  github?: Accept;
  portfolio?: Accept;
  currentTitle?: Accept;
  currentCompany?: Accept;
  work?: ExpectedJob[];
  school?: Accept;
  degree?: Accept;
  discipline?: Accept;
  graduationYear?: Accept;
  educationStatus?: "pursuing";
  skills?: string[];
  /** Skills that are fine to suggest (written in the skills section) but not required. */
  skillsAlsoOk?: string[];
  languages?: string[];
}

export interface EvalCase {
  id: string;
  kind: "text" | "pdf" | "docx";
  text?: string;
  bytes?: () => Uint8Array;
  expect: Expected;
}

// --- PDF layout helpers --------------------------------------------------------------------------------------

interface Cell extends PdfText {
  links?: Record<string, string>;
}

function page(cells: Cell[], extraLinks: PdfLink[] = []) {
  const links: PdfLink[] = [...extraLinks];
  for (const c of cells) for (const [word, url] of Object.entries(c.links ?? {})) links.push(linkOver(c, word, url));
  return { texts: cells.map(({ links: _l, ...t }) => t), links };
}

// --- cases ---------------------------------------------------------------------------------------------------

export const CASES: EvalCase[] = [
  {
    id: "T1 India fresher, categories, (Expected)",
    kind: "text",
    text: `ROHAN VERMA
+91 98765 43210 | rohan.verma.dev@gmail.com | Pune, Maharashtra
linkedin.com/in/rohan-verma-dev | github.com/rohanverma-dev

EDUCATION
Vishwakarma Institute of Technology, Pune
B.Tech in Computer Engineering | CGPA: 8.62/10 | 2023 – 2027 (Expected)
Delhi Public School, Pune
Class XII (CBSE) | 91.4% | 2023
Class X (CBSE) | 94.2% | 2021

INTERNSHIPS
Software Development Intern | Brightpath Technologies Pvt Ltd | May 2025 – Jul 2025
• Built REST APIs in Node.js for an inventory dashboard used by 40 staff.
• Wrote unit tests with Jest, raising coverage from 52% to 81%.

PROJECTS
Campus Connect – a React Native app for student clubs
• Implemented chat with Firebase and push notifications.

TECHNICAL SKILLS
Languages: C++, Java, Python, JavaScript
Frameworks: React, Node.js, Express
Databases: MySQL, MongoDB
Tools: Git, Docker, Postman

CERTIFICATIONS
• AWS Certified Cloud Practitioner (2025)

LANGUAGES
English (Fluent), Hindi (Native), Marathi (Conversational)
`,
    expect: {
      firstName: "Rohan", lastName: "Verma", email: "rohan.verma.dev@gmail.com", phone: "+91 98765 43210", location: "Pune",
      linkedin: "linkedin.com/in/rohan-verma-dev", github: "github.com/rohanverma-dev",
      work: [{ title: "Software Development Intern", company: "Brightpath Technologies Pvt Ltd", start: "2025-05", end: "2025-07" }],
      school: ["Vishwakarma Institute of Technology", "Vishwakarma Institute of Technology, Pune"], degree: "B.Tech", discipline: "Computer Engineering",
      graduationYear: "2027", educationStatus: "pursuing",
      skills: ["C++", "Java", "Python", "JavaScript", "React", "Node.js", "Express", "MySQL", "MongoDB", "Git", "Docker", "Postman"],
      languages: ["English", "Hindi", "Marathi"],
    },
  },
  {
    id: "T2 US senior, em-dash rows, website",
    kind: "text",
    text: `Maya Ortiz
Austin, TX 78701 • (512) 555-0147 • maya.ortiz.codes@outlook.com • www.mayaortiz.dev
linkedin.com/in/mayaortiz

SUMMARY
Backend engineer with 8 years building payment systems.

EXPERIENCE
Senior Software Engineer — Northwind Payments, Austin, TX        Jan 2021 – Present
• Led migration of settlement services to Kubernetes.
Software Engineer — Bluebonnet Analytics, Dallas, TX        Jun 2016 – Dec 2020
• Built ETL pipelines in Python and Airflow.

EDUCATION
B.S. in Computer Science, The University of Texas at Austin, 2016

SKILLS
Go, Python, PostgreSQL, Kafka, Kubernetes, Terraform, AWS
`,
    expect: {
      firstName: "Maya", lastName: "Ortiz", email: "maya.ortiz.codes@outlook.com", phone: "(512) 555-0147", location: "Austin",
      linkedin: "linkedin.com/in/mayaortiz", portfolio: "www.mayaortiz.dev",
      currentTitle: "Senior Software Engineer", currentCompany: "Northwind Payments",
      work: [
        { title: "Senior Software Engineer", company: "Northwind Payments", start: "2021-01", end: "present" },
        { title: "Software Engineer", company: "Bluebonnet Analytics", start: "2016-06", end: "2020-12" },
      ],
      school: ["The University of Texas at Austin", "University of Texas at Austin"], degree: "B.S.", discipline: "Computer Science", graduationYear: "2016",
      skills: ["Go", "Python", "PostgreSQL", "Kafka", "Kubernetes", "Terraform", "AWS"],
    },
  },
  {
    id: "T3 UK, skills first, mm/yyyy, stacked job lines",
    kind: "text",
    text: `OLIVER BENNETT-HAYES
Data Engineer
London, United Kingdom | +44 20 7946 0958 | o.bennetthayes@protonmail.com
github.com/obhayes

PROFILE
Data engineer focused on streaming pipelines.

SKILLS
Programming: Python, Scala, SQL
Big data: Spark, Kafka, Airflow
Cloud: Azure, Databricks

EMPLOYMENT HISTORY
Data Engineer
Harbourline Insurance Group, London
09/2022 – present
• Built Spark streaming jobs processing 2M events per hour.

Junior Data Analyst
Kestrel Retail Ltd, Manchester
03/2019 – 08/2022
• Automated weekly reports in Python.

EDUCATION
MSc Data Science — University of Manchester (2019)
BSc Mathematics — University of Leeds (2018)

LANGUAGES
English (native), French (B2)
`,
    expect: {
      firstName: "Oliver", lastName: "Bennett-Hayes", email: "o.bennetthayes@protonmail.com", phone: "+44 20 7946 0958", location: "London",
      github: "github.com/obhayes",
      currentTitle: "Data Engineer", currentCompany: "Harbourline Insurance Group",
      work: [
        { title: "Data Engineer", company: "Harbourline Insurance Group", start: "2022-09", end: "present" },
        { title: "Junior Data Analyst", company: "Kestrel Retail Ltd", start: "2019-03", end: "2022-08" },
      ],
      school: "University of Manchester", degree: "MSc", discipline: "Data Science", graduationYear: "2019",
      skills: ["Python", "Scala", "SQL", "Spark", "Kafka", "Airflow", "Azure", "Databricks"],
      languages: ["English", "French"],
    },
  },
  {
    id: "T4 India experienced, company then roles, labels",
    kind: "text",
    text: `Ananya Krishnan
Senior Systems Engineer
Email: ananya.k.work@yahoo.co.in
Mobile: 09876543210
Address: Bengaluru, Karnataka 560001

PROFESSIONAL EXPERIENCE
Lotus Infosystems Limited                     Bengaluru
Senior Systems Engineer                       Jun 2021 – Present
• Maintained Java microservices for a banking client.
Systems Engineer                              Aug 2018 – May 2021
• Wrote Spring Boot services and Oracle PL/SQL procedures.

EDUCATION
B.E. (Electronics and Communication), R. V. College of Engineering, Bengaluru — 72.5% — 2018

KEY SKILLS
Java, Spring Boot, Oracle, Microservices, Jenkins, Angular
`,
    expect: {
      firstName: "Ananya", lastName: "Krishnan", email: "ananya.k.work@yahoo.co.in", phone: "09876543210", location: "Bengaluru",
      currentTitle: "Senior Systems Engineer", currentCompany: "Lotus Infosystems Limited",
      work: [
        { title: "Senior Systems Engineer", company: "Lotus Infosystems Limited", start: "2021-06", end: "present" },
        { title: "Systems Engineer", company: "Lotus Infosystems Limited", start: "2018-08", end: "2021-05" },
      ],
      school: ["R. V. College of Engineering", "R. V. College of Engineering, Bengaluru"], degree: "B.E.", discipline: "Electronics and Communication", graduationYear: "2018",
      skills: ["Java", "Spring Boot", "Oracle", "Microservices", "Jenkins", "Angular"], skillsAlsoOk: ["Spring"],
    },
  },
  {
    id: "T5 icons in headings and contact, @ company",
    kind: "text",
    text: `👤 KARAN MEHTA
📞 +91-91234-56780 | ✉️ karan.mehta.ml@gmail.com | 📍 Hyderabad, Telangana
🔗 linkedin.com/in/karanmehta-ml | 💻 github.com/karanmehta-ml

🎓 EDUCATION
International Institute of Information Technology, Hyderabad
M.Tech in Computer Science — CGPA 9.1/10 — 2024 – Present
Osmania University
B.Sc. Mathematics, Statistics, Computer Science — 82% — 2019 – 2022

💼 WORK EXPERIENCE
Machine Learning Engineer Intern @ Quillbyte AI — Hyderabad (Jan 2025 – Jun 2025)
• Fine-tuned transformer models with PyTorch and Hugging Face.

🛠️ SKILLS
Python, PyTorch, TensorFlow, Scikit-learn, SQL, Docker

🌐 LANGUAGES
English, Hindi, Telugu
`,
    expect: {
      firstName: "Karan", lastName: "Mehta", email: "karan.mehta.ml@gmail.com", phone: "+91-91234-56780", location: "Hyderabad",
      linkedin: "linkedin.com/in/karanmehta-ml", github: "github.com/karanmehta-ml",
      work: [{ title: "Machine Learning Engineer Intern", company: "Quillbyte AI", start: "2025-01", end: "2025-06" }],
      school: ["International Institute of Information Technology", "International Institute of Information Technology, Hyderabad"],
      degree: "M.Tech", discipline: "Computer Science", educationStatus: "pursuing",
      skills: ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "SQL", "Docker"],
      languages: ["English", "Hindi", "Telugu"],
    },
  },
  {
    id: "T6 academic, honorific, research experience",
    kind: "text",
    text: `Dr. Elena Petrova
Postdoctoral Researcher, Department of Physics, University of Toronto
elena.petrova@physics.example.edu | +1 (416) 555-0198 | Toronto, Ontario, Canada
Website: https://epetrova-lab.org

RESEARCH EXPERIENCE
Postdoctoral Researcher, University of Toronto, 2021 – present
Graduate Research Assistant, ETH Zurich, 2016 – 2021

EDUCATION
Ph.D. in Physics, ETH Zurich, 2021
M.Sc. in Physics, Moscow State University, 2015

SKILLS
Python, Julia, C++, MATLAB

LANGUAGES
English (fluent), Russian (native), German (intermediate)
`,
    expect: {
      firstName: "Elena", lastName: "Petrova", email: "elena.petrova@physics.example.edu", phone: "+1 (416) 555-0198", location: "Toronto",
      portfolio: "epetrova-lab.org",
      currentTitle: "Postdoctoral Researcher", currentCompany: "University of Toronto",
      work: [
        { title: "Postdoctoral Researcher", company: "University of Toronto", start: "2021", end: "present" },
        { title: "Graduate Research Assistant", company: "ETH Zurich", start: "2016", end: "2021" },
      ],
      school: "ETH Zurich", degree: "Ph.D.", discipline: "Physics", graduationYear: "2021",
      skills: ["Python", "Julia", "C++"],
      languages: ["English", "Russian", "German"],
    },
  },
  {
    id: "T7 India biodata, labelled, education table",
    kind: "text",
    text: `CURRICULUM VITAE

Name: Sneha Patil
Email: sneha.patil2001@rediffmail.com
Mobile No.: +91 90040 12345
Address: Flat 12, Shanti Nagar, Nagpur, Maharashtra - 440010
LinkedIn: https://www.linkedin.com/in/sneha-patil-2001/

CAREER OBJECTIVE
To work in a challenging environment where I can use my skills for the growth of the organisation.

EDUCATIONAL QUALIFICATIONS
Qualification | Institute | Board/University | Year | Percentage/CGPA
MCA | Shri Ramdeobaba College of Engineering and Management | RTMNU | 2024 | 8.9 CGPA
BCA | Hislop College | RTMNU | 2022 | 78%
HSC | Somalwar High School | Maharashtra Board | 2019 | 71%

WORK EXPERIENCE
Associate Software Engineer
Cedarleaf Software Solutions Pvt. Ltd., Nagpur
July 2024 – Present
• Developing web modules in ASP.NET and SQL Server.

TECHNICAL SKILLS
• Programming: C#, Java
• Web: ASP.NET, HTML, CSS, JavaScript
• Database: SQL Server, MySQL

LANGUAGES KNOWN
English, Hindi, Marathi

DECLARATION
I hereby declare that the above information is true to the best of my knowledge.
`,
    expect: {
      firstName: "Sneha", lastName: "Patil", email: "sneha.patil2001@rediffmail.com", phone: "+91 90040 12345", location: "Nagpur",
      linkedin: "linkedin.com/in/sneha-patil-2001",
      currentTitle: "Associate Software Engineer", currentCompany: ["Cedarleaf Software Solutions Pvt. Ltd.", "Cedarleaf Software Solutions Pvt. Ltd"],
      work: [{ title: "Associate Software Engineer", company: "Cedarleaf Software Solutions Pvt. Ltd.", start: "2024-07", end: "present" }],
      school: "Shri Ramdeobaba College of Engineering and Management", degree: "MCA", graduationYear: "2024",
      skills: ["C#", "Java", "ASP.NET", "HTML", "CSS", "JavaScript", "SQL Server", "MySQL"], skillsAlsoOk: ["SQL"],
      languages: ["English", "Hindi", "Marathi"],
    },
  },
  {
    id: "T8 US student, Expected May 2027, co-op",
    kind: "text",
    text: `Aisha Khan
aisha.khan@student.example.edu · (617) 555-0123 · Boston, MA
github.com/aishakhan-dev · aishakhan.dev

Education
Northeastern University, Boston, MA
Bachelor of Science in Computer Science, Expected May 2027
GPA: 3.8/4.0

Experience
Software Engineering Co-op, Harborview Health — Boston, MA    Jan 2025 – Jun 2025
- Built FHIR integrations in TypeScript.
Teaching Assistant, Northeastern University    Sep 2024 – Dec 2024
- Held office hours for Fundamentals of Computer Science.

Projects
Trailmix: a hiking planner built with Next.js and Supabase.

Skills
Languages: TypeScript, Python, Java; Frameworks: Next.js, React; Tools: Git, Supabase
`,
    expect: {
      firstName: "Aisha", lastName: "Khan", email: "aisha.khan@student.example.edu", phone: "(617) 555-0123", location: "Boston",
      github: "github.com/aishakhan-dev", portfolio: "aishakhan.dev",
      work: [
        { title: "Software Engineering Co-op", company: "Harborview Health", start: "2025-01", end: "2025-06" },
        { title: "Teaching Assistant", company: "Northeastern University", start: "2024-09", end: "2024-12" },
      ],
      school: ["Northeastern University", "Northeastern University, Boston, MA"], degree: "Bachelor of Science", discipline: "Computer Science",
      graduationYear: "2027", educationStatus: "pursuing",
      skills: ["TypeScript", "Python", "Java", "Next.js", "React", "Git", "Supabase"],
    },
  },
  {
    id: "T9 references, repo link in text, years only",
    kind: "text",
    text: `Daniel J. Okafor
Lagos, Nigeria | daniel.okafor.eng@gmail.com | +234 803 123 4567

EXPERIENCE
Lead Mobile Engineer | Kolanut Fintech Ltd | 2019 - Present
• Shipped the Android app (Kotlin) to 1M users; open-sourced github.com/kolanut/ledger-sync.
Mobile Developer | Sahel Logistics | 2016 - 2019
• Built Flutter apps for delivery drivers across three cities.

EDUCATION
University of Lagos
B.Sc. Computer Science, 2016

SKILLS
Kotlin, Flutter, Dart, Firebase, Java

REFERENCES
Grace Adeyemi, Engineering Manager, Kolanut Fintech Ltd
grace.adeyemi@example.com | +234 802 555 0101 | linkedin.com/in/grace-adeyemi
`,
    expect: {
      firstName: "Daniel", lastName: "Okafor", email: "daniel.okafor.eng@gmail.com", phone: "+234 803 123 4567", location: "Lagos",
      currentTitle: "Lead Mobile Engineer", currentCompany: "Kolanut Fintech Ltd",
      work: [
        { title: "Lead Mobile Engineer", company: "Kolanut Fintech Ltd", start: "2019", end: "present" },
        { title: "Mobile Developer", company: "Sahel Logistics", start: "2016", end: "2019" },
      ],
      school: "University of Lagos", degree: "B.Sc.", discipline: "Computer Science", graduationYear: "2016",
      skills: ["Kotlin", "Flutter", "Dart", "Firebase", "Java"],
    },
  },
  {
    id: "P1 PDF one column, named hyperlinks, caps degree",
    kind: "pdf",
    bytes: () => makePdf([page([
      { text: "ARJUN NAIR", x: 40, y: 750, size: 18, bold: true },
      { text: "+91 99887 76655 | arjun.nair.dev@gmail.com | Kochi, Kerala | LinkedIn | GitHub | Portfolio", x: 40, y: 730,
        links: { "arjun.nair.dev@gmail.com": "mailto:arjun.nair.dev@gmail.com", LinkedIn: "https://www.linkedin.com/in/arjun-nair-kochi/", GitHub: "https://github.com/arjunnair-dev", Portfolio: "https://arjunnair.netlify.app" } },
      { text: "EDUCATION", x: 40, y: 700, size: 12, bold: true },
      { text: "NATIONAL INSTITUTE OF TECHNOLOGY CALICUT", x: 40, y: 684, bold: true },
      { text: "2019 – 2023", x: 500, y: 684 },
      { text: "B.TECH IN COMPUTER SCIENCE AND ENGINEERING | CGPA: 8.45/10", x: 40, y: 670 },
      { text: "EXPERIENCE", x: 40, y: 640, size: 12, bold: true },
      { text: "Software Engineer | Tidewater Systems Pvt Ltd", x: 40, y: 624, bold: true },
      { text: "Jul 2023 – Present", x: 480, y: 624 },
      { text: "• Built Kotlin microservices for logistics tracking across 300 depots.", x: 48, y: 610 },
      { text: "• Reduced p95 latency by 35% using Redis caching.", x: 48, y: 596 },
      { text: "PROJECTS", x: 40, y: 566, size: 12, bold: true },
      { text: "Fleet Tracker | GitHub", x: 40, y: 550, bold: true, links: { GitHub: "https://github.com/arjunnair-dev/fleet-tracker" } },
      { text: "• Real-time map of delivery vans with WebSockets.", x: 48, y: 536 },
      { text: "SKILLS", x: 40, y: 506, size: 12, bold: true },
      { text: "Languages: Kotlin, Java, Python | Tools: Docker, Kubernetes, Redis, Git", x: 40, y: 490 },
    ])]),
    expect: {
      firstName: "Arjun", lastName: "Nair", email: "arjun.nair.dev@gmail.com", phone: "+91 99887 76655", location: "Kochi",
      linkedin: "linkedin.com/in/arjun-nair-kochi", github: "github.com/arjunnair-dev", portfolio: "arjunnair.netlify.app",
      currentTitle: "Software Engineer", currentCompany: "Tidewater Systems Pvt Ltd",
      work: [{ title: "Software Engineer", company: "Tidewater Systems Pvt Ltd", start: "2023-07", end: "present" }],
      school: "National Institute of Technology Calicut", degree: "B.Tech", discipline: "Computer Science and Engineering", graduationYear: "2023",
      skills: ["Kotlin", "Java", "Python", "Docker", "Kubernetes", "Redis", "Git"],
    },
  },
  {
    id: "P2 PDF two columns, name hyperlinked to LinkedIn",
    kind: "pdf",
    bytes: () => {
      const L = 40;
      const R = 250;
      const y = (i: number) => 700 - i * 16;
      return makePdf([page([
        { text: "LUCIA FERNANDEZ", x: L, y: 750, size: 20, bold: true, links: { "LUCIA FERNANDEZ": "https://www.linkedin.com/in/luciafernandez-ux" } },
        { text: "CONTACT", x: L, y: y(0), bold: true },
        { text: "PROFILE", x: R, y: y(0), bold: true },
        { text: "lucia.fernandez.ux@gmail.com", x: L, y: y(1) },
        { text: "Product designer who also ships front-end code.", x: R, y: y(1) },
        { text: "+34 612 345 678", x: L, y: y(2) },
        { text: "Madrid, Spain", x: L, y: y(3) },
        { text: "EXPERIENCE", x: R, y: y(3), bold: true },
        { text: "github.com/luciafdz", x: L, y: y(4) },
        { text: "Senior Product Designer", x: R, y: y(4), bold: true },
        { text: "Ondaverde Studio, Madrid", x: R, y: y(5) },
        { text: "SKILLS", x: L, y: y(6), bold: true },
        { text: "Mar 2021 – Present", x: R, y: y(6) },
        { text: "Figma", x: L, y: y(7) },
        { text: "• Led the redesign of a booking app used by two million people.", x: R, y: y(7) },
        { text: "JavaScript", x: L, y: y(8) },
        { text: "Product Designer", x: R, y: y(8), bold: true },
        { text: "TypeScript", x: L, y: y(9) },
        { text: "Pixelmar Digital, Valencia", x: R, y: y(9) },
        { text: "React", x: L, y: y(10) },
        { text: "Jan 2018 – Feb 2021", x: R, y: y(10) },
        { text: "CSS", x: L, y: y(11) },
        { text: "• Designed and prototyped onboarding flows in Figma.", x: R, y: y(11) },
        { text: "LANGUAGES", x: L, y: y(13), bold: true },
        { text: "Spanish (Native)", x: L, y: y(14) },
        { text: "English (Fluent)", x: L, y: y(15) },
        { text: "EDUCATION", x: L, y: y(17), bold: true },
        { text: "Universidad Politécnica de Madrid", x: L, y: y(18) },
        { text: "Bachelor of Fine Arts", x: L, y: y(19) },
        { text: "2014 – 2018", x: L, y: y(20) },
      ])]);
    },
    expect: {
      firstName: "Lucia", lastName: "Fernandez", email: "lucia.fernandez.ux@gmail.com", phone: "+34 612 345 678", location: "Madrid",
      linkedin: "linkedin.com/in/luciafernandez-ux", github: "github.com/luciafdz",
      currentTitle: "Senior Product Designer", currentCompany: "Ondaverde Studio",
      work: [
        { title: "Senior Product Designer", company: "Ondaverde Studio", start: "2021-03", end: "present" },
        { title: "Product Designer", company: "Pixelmar Digital", start: "2018-01", end: "2021-02" },
      ],
      school: "Universidad Politécnica de Madrid", degree: "Bachelor of Fine Arts", graduationYear: "2018",
      skills: ["JavaScript", "TypeScript", "React", "CSS"],
      languages: ["Spanish", "English"],
    },
  },
  {
    id: "P3 PDF Indian table education, dated bullets, repo links",
    kind: "pdf",
    bytes: () => makePdf([page([
      { text: "VIKRAM SINGH RATHORE", x: 40, y: 760, size: 14, bold: true },
      { text: "+91-9001122334", x: 470, y: 760 },
      { text: "M.TECH", x: 40, y: 746 },
      { text: "vikram.rathore.cs@gmail.com", x: 430, y: 746, links: { "vikram.rathore.cs@gmail.com": "mailto:vikram.rathore.cs@gmail.com" } },
      { text: "COMPUTER SCIENCE AND ENGINEERING", x: 40, y: 732 },
      { text: "GitHub | LinkedIn", x: 480, y: 732, links: { GitHub: "https://github.com/vikramrathore-cs", LinkedIn: "https://www.linkedin.com/in/vikram-rathore-cs/" } },
      { text: "INDIAN INSTITUTE OF TECHNOLOGY ROORKEE", x: 40, y: 718 },
      { text: "Education", x: 40, y: 694, size: 12, bold: true },
      { text: "Degree", x: 40, y: 680, bold: true },
      { text: "Institution", x: 130, y: 680, bold: true },
      { text: "CGPA/Percentage", x: 380, y: 680, bold: true },
      { text: "Date", x: 490, y: 680, bold: true },
      { text: "M.TECH CSE", x: 40, y: 666 },
      { text: "INDIAN INSTITUTE OF TECHNOLOGY ROORKEE", x: 130, y: 666 },
      { text: "8.10", x: 380, y: 666 },
      { text: "Jul 2025 - Present", x: 490, y: 666 },
      { text: "B.E IT", x: 40, y: 652 },
      { text: "SARDAR PATEL INSTITUTE OF TECHNOLOGY", x: 130, y: 652 },
      { text: "8.95", x: 380, y: 652 },
      { text: "Aug 2021 - May 2025", x: 490, y: 652 },
      { text: "Class 12", x: 40, y: 638 },
      { text: "KENDRIYA VIDYALAYA JAIPUR", x: 130, y: 638 },
      { text: "88.20%", x: 380, y: 638 },
      { text: "Apr 2020 - May 2021", x: 490, y: 638 },
      { text: "Class 10", x: 40, y: 624 },
      { text: "KENDRIYA VIDYALAYA JAIPUR", x: 130, y: 624 },
      { text: "91.0%", x: 380, y: 624 },
      { text: "Apr 2018 - May 2019", x: 490, y: 624 },
      { text: "Experience", x: 40, y: 600, size: 12, bold: true },
      { text: "• Software Engineering Intern", x: 40, y: 586, bold: true },
      { text: "Apr 2024 - Jun 2024", x: 490, y: 586 },
      { text: "Corvid Networks Pvt Ltd", x: 52, y: 572 },
      { text: "– Built a Go service that ingests router telemetry and flags anomalous links in near real", x: 52, y: 558 },
      { text: "time, cutting triage effort for the on-call team.", x: 60, y: 544 },
      { text: "– Wrote integration tests in Python, raising coverage of the ingest path to 85%.", x: 52, y: 530 },
      { text: "Projects & Open Source Contributions", x: 40, y: 506, size: 12, bold: true },
      { text: "• Packet Lens (network visualiser) GitHub", x: 40, y: 492, bold: true, links: { GitHub: "https://github.com/vikramrathore-cs/packet-lens" } },
      { text: "Jan 2025 - Mar 2025", x: 490, y: 492 },
      { text: "– Rendered live packet flows with D3 and WebSockets.", x: 52, y: 478 },
      { text: "• Bug fix in an open-source scheduler GitHub", x: 40, y: 464, bold: true, links: { GitHub: "https://github.com/openflux/scheduler/pull/412" } },
      { text: "Nov 2024", x: 490, y: 464 },
      { text: "Technical Skills", x: 40, y: 440, size: 12, bold: true },
      { text: "• Programming Languages: Go, Python, C++", x: 40, y: 426 },
      { text: "• Tools & OS: Git, Linux, Docker", x: 40, y: 412 },
      { text: "Certifications", x: 40, y: 388, size: 12, bold: true },
      { text: "• Cloud Fundamentals - Google [View Credential]", x: 40, y: 374, links: { "[View Credential]": "https://www.credly.com/badges/0000-demo/public_url" } },
      { text: "Feb 2024", x: 490, y: 374 },
    ])]),
    expect: {
      firstName: "Vikram", lastName: "Rathore", email: "vikram.rathore.cs@gmail.com", phone: "+91-9001122334",
      linkedin: "linkedin.com/in/vikram-rathore-cs", github: "github.com/vikramrathore-cs",
      work: [{ title: "Software Engineering Intern", company: "Corvid Networks Pvt Ltd", start: "2024-04", end: "2024-06" }],
      school: "Indian Institute of Technology Roorkee", degree: "M.Tech", discipline: ["CSE", "Computer Science and Engineering"], educationStatus: "pursuing",
      skills: ["Go", "Python", "C++", "Git", "Linux", "Docker"],
    },
  },
  {
    id: "P4 PDF repo and credential links only",
    kind: "pdf",
    bytes: () => makePdf([page([
      { text: "NADIA RAHMAN", x: 40, y: 750, size: 16, bold: true },
      { text: "Dhaka, Bangladesh | nadia.rahman.data@gmail.com | +880 1712 345678", x: 40, y: 732 },
      { text: "EXPERIENCE", x: 40, y: 704, size: 12, bold: true },
      { text: "Data Analyst | Meghna Textiles Ltd", x: 40, y: 688, bold: true },
      { text: "Feb 2022 – Present", x: 480, y: 688 },
      { text: "• Built Power BI dashboards for 12 factories.", x: 48, y: 674 },
      { text: "PROJECTS", x: 40, y: 646, size: 12, bold: true },
      { text: "Sales Forecasting — GitHub", x: 40, y: 630, bold: true, links: { GitHub: "https://github.com/meghna-analytics/sales-forecast" } },
      { text: "• ARIMA and XGBoost models in Python.", x: 48, y: 616 },
      { text: "EDUCATION", x: 40, y: 588, size: 12, bold: true },
      { text: "BRAC University — BSc in Computer Science and Engineering — 2021", x: 40, y: 572 },
      { text: "CERTIFICATIONS", x: 40, y: 544, size: 12, bold: true },
      { text: "Google Data Analytics Certificate [View Credential]", x: 40, y: 528, links: { "[View Credential]": "https://www.coursera.org/account/accomplishments/verify/DEMO123" } },
      { text: "SKILLS", x: 40, y: 500, size: 12, bold: true },
      { text: "Python, SQL, Power BI, Excel, XGBoost", x: 40, y: 484 },
    ])]),
    expect: {
      firstName: "Nadia", lastName: "Rahman", email: "nadia.rahman.data@gmail.com", phone: "+880 1712 345678", location: "Dhaka",
      currentTitle: "Data Analyst", currentCompany: "Meghna Textiles Ltd",
      work: [{ title: "Data Analyst", company: "Meghna Textiles Ltd", start: "2022-02", end: "present" }],
      school: "BRAC University", degree: "BSc", discipline: "Computer Science and Engineering", graduationYear: "2021",
      skills: ["Python", "SQL", "Power BI", "Excel", "XGBoost"],
    },
  },
  {
    id: "D1 DOCX hyperlinks (relationship and field code)",
    kind: "docx",
    bytes: () => makeDocx([
      ["Priyanka Sharma"],
      ["Gurugram, Haryana | +91 98111 22334 | priyanka.sharma.pm@gmail.com"],
      [{ text: "LinkedIn", url: "https://www.linkedin.com/in/priyanka-sharma-pm" }, " | ", { text: "GitHub", url: "https://github.com/priyankasharma-pm" }, " | ",
        { text: "Portfolio", url: "https://priyankasharma.design", field: true }],
      ["EXPERIENCE"],
      ["Product Manager, Zephyr Commerce Pvt Ltd — Gurugram    Apr 2022 – Present"],
      ["• Owned the checkout funnel; raised conversion by 9%."],
      ["Associate Product Manager, Lumen Edtech — Noida    Jul 2019 – Mar 2022"],
      ["• Launched a live-class scheduler used by 30,000 learners."],
      ["EDUCATION"],
      ["MBA, Indian Institute of Management Indore, 2019"],
      ["B.Tech in Mechanical Engineering, Delhi Technological University, 2017"],
      ["SKILLS"],
      ["SQL, Jira, Excel, Tableau, Python"],
      ["LANGUAGES"],
      ["English, Hindi"],
    ]),
    expect: {
      firstName: "Priyanka", lastName: "Sharma", email: "priyanka.sharma.pm@gmail.com", phone: "+91 98111 22334", location: "Gurugram",
      linkedin: "linkedin.com/in/priyanka-sharma-pm", github: "github.com/priyankasharma-pm", portfolio: "priyankasharma.design",
      currentTitle: "Product Manager", currentCompany: "Zephyr Commerce Pvt Ltd",
      work: [
        { title: "Product Manager", company: "Zephyr Commerce Pvt Ltd", start: "2022-04", end: "present" },
        { title: "Associate Product Manager", company: "Lumen Edtech", start: "2019-07", end: "2022-03" },
      ],
      school: "Indian Institute of Management Indore", degree: "MBA", graduationYear: "2019",
      skills: ["SQL", "Jira", "Excel", "Tableau", "Python"],
      languages: ["English", "Hindi"],
    },
  },
];
