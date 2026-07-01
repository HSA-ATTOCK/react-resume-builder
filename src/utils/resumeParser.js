/**
 * Resume Parser Utility
 *
 * Extracts text from PDF / DOCX and maps it to the resume form data structure.
 * Rewritten to handle this resume's exact format correctly.
 */

// ─── Static imports (Vite bundles the worker at build time) ──────────────────
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// ─── Text Extraction ──────────────────────────────────────────────────────────

export async function extractTextFromFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf") return extractTextFromPDF(file);
  if (ext === "docx" || ext === "doc") return extractTextFromDOCX(file);
  throw new Error("Unsupported file type. Please upload a PDF or DOCX file.");
}

async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items by y-coordinate (same visual line)
    const byY = {};
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x: item.transform[4], text: item.str });
    }

    // Sort top-to-bottom (desc y), then left-to-right within each line
    const sortedYs = Object.keys(byY).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineText = byY[y]
        .sort((a, b) => a.x - b.x)
        .map((i) => i.text)
        .join("")           // join without inserting extra spaces
        .replace(/\s+/g, " ") // collapse any whitespace runs to a single space
        .trim();
      if (lineText) allLines.push(lineText);
    }
  }

  return allLines.join("\n");
}

async function extractTextFromDOCX(file) {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ─── Section Headers ──────────────────────────────────────────────────────────

const SECTION_PATTERNS = {
  profile:   /^(profile|summary|professional\s+summary|about\s+me|career\s+summary)\s*:?$/i,
  objective: /^(objective|career\s+objective|professional\s+objective)\s*:?$/i,
  education: /^(education|academic|educational\s+background|academics|qualifications?)\s*:?$/i,
  experience:/^(experience|work\s+experience|employment|work\s+history|professional\s+experience|career\s+history|internship)\s*:?$/i,
  projects:  /^(projects?|personal\s+projects?|key\s+projects?|academic\s+projects?)\s*:?$/i,
  skills:    /^(skills?|technical\s+skills?|core\s+competencies|competencies|expertise|key\s+skills?|technologies|tech\s+stack)\s*:?$/i,
  languages: /^(languages?|language\s+skills?|spoken\s+languages?)\s*:?$/i,
  links:     /^(social\s+links?|links?|online\s+presence|social\s+media|contact\s+links?|profiles?)\s*:?$/i,
};

// ─── Main Parser ──────────────────────────────────────────────────────────────

export function parseResumeText(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // ── Contact field extraction via labeled prefixes ──────────────────────────

  // Phone (labeled "Phone:")
  const phoneLabelMatch = text.match(/(?:^|\n)\s*phone[:\s]+(\+?[\d][\d\s\-(). ]{5,}\d)/im);
  // Fallback: first bare phone-like number
  const phoneFallback = text.match(/(?<!\d)(\+?[\d][\d\s\-().]{6,}\d)(?!\d)/);
  const phone = phoneLabelMatch
    ? phoneLabelMatch[1].trim()
    : phoneFallback ? phoneFallback[1].trim() : "";

  // WhatsApp (labeled)
  const whatsappMatch = text.match(/(?:^|\n)\s*whatsapp[:\s]+(\+?[\d][\d\s\-(). ]{5,}\d)/im);

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);

  // DOB
  const dobMatch = text.match(/(?:dob|date\s+of\s+birth|born)\s*[:\s]+([^\n,]{4,30})/i);

  // Nationality / Citizenship
  const nationalityMatch = text.match(/(?:nationality|citizenship)\s*[:\s]+([^\n,]{2,30})/i);

  // Driving license ONLY — avoid matching "License Verification" from project descriptions
  const licenseMatch = text.match(/driving\s+licen[cs]e\s*[:\s]+([^\n]{2,40})/i);

  // ── Name + Title (first non-contact lines) ────────────────────────────────
  let fullName = "";
  let title = "";

  const skipLine = (l) =>
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(l) || // email
    /^\+?\d[\d\s\-().]{5,}$/.test(l) ||                              // bare phone number
    /^(phone|whatsapp|email|address|website|portfolio|github|linkedin)\s*:/i.test(l) || // labeled contact
    /https?:\/\//.test(l) ||                                          // URL
    /^(resume|curriculum\s+vitae|cv)\s*$/i.test(l);                  // doc title

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const l = lines[i];
    if (skipLine(l) || l.length < 2 || l.length > 70) continue;
    if (!fullName) { fullName = l; continue; }
    if (!title)    { title = l; break; }
  }

  // ── Split text into sections ───────────────────────────────────────────────
  const sections = {};
  let currentSection = "header";
  sections[currentSection] = [];

  for (const line of lines) {
    let matched = false;
    for (const [key, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(line)) {
        currentSection = key;
        sections[currentSection] = sections[currentSection] || [];
        matched = true;
        break;
      }
    }
    if (!matched) {
      sections[currentSection] = sections[currentSection] || [];
      sections[currentSection].push(line);
    }
  }

  // ── Parse each section ────────────────────────────────────────────────────
  const education   = parseEducation(sections.education || []);
  const experience  = parseExperience(sections.experience || []);
  const projects    = parseProjects(sections.projects || []);
  const customLinks = parseLinks(sections.links || [], text);

  const rawSkills = (sections.skills || [])
    .join(", ")
    .replace(/[•\-\*]/g, ",")
    .replace(/,\s*,+/g, ",")
    .trim();

  const rawLanguages = (sections.languages || [])
    .join(", ")
    .replace(/[•\-\*]/g, ",")
    .replace(/,\s*,+/g, ",")
    .trim();

  const profile   = (sections.profile || []).join(" ").trim();
  const objective = (sections.objective || []).join(" ").trim();

  return {
    fullName,
    title,
    email:        emailMatch ? emailMatch[0] : "",
    phone,
    whatsapp:     whatsappMatch ? whatsappMatch[1].trim() : "",
    dob:          dobMatch ? dobMatch[1].trim() : "",
    nationality:  nationalityMatch ? nationalityMatch[1].trim() : "",
    license:      licenseMatch ? licenseMatch[1].trim() : "",
    maritalStatus: "",
    religion:     "",
    profile,
    objective,
    skills:       rawSkills,
    languages:    rawLanguages,
    education:    education.length  ? education  : [{ institute: "", degree: "" }],
    experience:   experience.length ? experience : [{ title: "", company: "", period: "", details: [""] }],
    projects:     projects.length   ? projects   : [{ title: "", role: "", description: "", skills: "", link: "" }],
    customLinks:  customLinks.length ? customLinks : [{ title: "", url: "" }],
  };
}

// ─── Education Parser ─────────────────────────────────────────────────────────
//
// PDF format:
//   Degree Name                                     ← plain line (bold)
//   Institute Name (Month YYYY - Month YYYY)        ← italic line with date in parens
//
// Strategy: any line matching the date-in-parens pattern is an institute line;
// everything else is a degree line.

function parseEducation(lines) {
  const entries = [];

  // Institute lines contain a date range inside parentheses, e.g.:
  //   "Government Boys High School Marri Kanjoor (May 2018 - April 2020)"
  //   "Riphah International College Attock City (November 2023 - September 2025)"
  // Pattern: opening paren, then somewhere a 4-digit year, a dash, and another year or "present"
  const isInstituteLine = (l) =>
    /\(.*\b\d{4}\b.*[-–].*\b(\d{4}|present|current|now)\b.*\)/i.test(l);

  for (const line of lines) {
    if (isInstituteLine(line)) {
      // Attach to the last entry that still has no institute
      if (entries.length > 0 && !entries[entries.length - 1].institute) {
        entries[entries.length - 1].institute = line;
      } else {
        entries.push({ degree: "", institute: line });
      }
    } else {
      // New degree entry
      entries.push({ degree: line, institute: "" });
    }
  }

  return entries.filter((e) => e.degree || e.institute);
}

// ─── Experience Parser ────────────────────────────────────────────────────────
//
// Supports two common PDF formats:
//
// Format A (this builder's output — "Company — Date" anchor lines):
//   Job Title
//   Company (Location) — Date Range       ← em/en dash separates company from date
//   • Responsibilities...
//
// Format B (generic — bare date lines):
//   Job Title
//   Company Name
//   Jan 2020 - Dec 2022
//   Responsibilities...

function parseExperience(lines) {
  const entries = [];

  // ── Format A detection ──────────────────────────────────────────────────────
  // A "Company — Date" anchor line: contains " — " or " – " and ends with a year/present
  const companyDateAnchor =
    /^.+\s[—–]\s.{2,}(\d{4}|present|current|now)\b/i;

  const anchorIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (companyDateAnchor.test(lines[i])) anchorIndices.push(i);
  }

  if (anchorIndices.length > 0) {
    // Structured approach:
    // - The title is the line immediately BEFORE each anchor
    // - The anchor itself contains "Company — Period"
    // - Everything after the anchor up to the next title line is description
    for (let a = 0; a < anchorIndices.length; a++) {
      const anchorIdx  = anchorIndices[a];
      const anchorLine = lines[anchorIdx];

      // Title = line right before the anchor (skip if it's out of bounds)
      const title = anchorIdx > 0 ? lines[anchorIdx - 1] : "";

      // Split anchor on first em/en dash to get company and period
      const dashMatch = anchorLine.match(/^(.+?)\s[—–]\s(.+)$/);
      const company   = dashMatch ? dashMatch[1].trim() : "";
      const period    = dashMatch ? dashMatch[2].trim() : anchorLine;

      // Description: lines after anchor up to (but not including) the title
      // line of the NEXT entry (which is anchorIndices[a+1] - 1)
      const nextTitleIdx =
        anchorIndices[a + 1] !== undefined
          ? anchorIndices[a + 1] - 1
          : lines.length;
      const descLines = lines
        .slice(anchorIdx + 1, nextTitleIdx)
        .map((l) => l.replace(/^[•\-\*]\s*/, "").trim()) // strip leading bullets
        .filter(Boolean);

      // Join into a single paragraph (collapsed whitespace, no newlines)
      const description = descLines.join(" ").replace(/\s+/g, " ").trim();

      entries.push({
        title,
        company,
        period,
        details: [description],
      });
    }

    return entries;
  }

  // ── Format B fallback — generic date-line detection ─────────────────────────
  let current     = null;
  let detailLines = [];
  let inDetails   = false;

  const datePattern =
    /\b(\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b.{0,25}(\d{4}|present|current|now)\b/i;
  const roleLabel    = /^role\s*:\s*/i;
  const companyLabel = /^company\s*:\s*/i;

  const flush = () => {
    if (current) {
      const description = detailLines
        .map((l) => l.replace(/^[•\-\*]\s*/, "").trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      entries.push({ ...current, details: [description] });
      detailLines = [];
      inDetails   = false;
      current     = null;
    }
  };

  for (const line of lines) {
    if (roleLabel.test(line)) {
      if (!current) current = { title: "", company: "", period: "", details: [""] };
      current.title = line.replace(roleLabel, "").trim();
    } else if (companyLabel.test(line)) {
      if (!current) current = { title: "", company: "", period: "", details: [""] };
      current.company = line.replace(companyLabel, "").trim();
    } else if (datePattern.test(line)) {
      if (current && !current.period) {
        current.period = line;
        inDetails = false;
      } else {
        flush();
        current   = { title: "", company: "", period: line, details: [""] };
        inDetails = false;
      }
    } else if (current) {
      if (!current.title) {
        current.title = line;
      } else {
        inDetails = true;
        detailLines.push(line);
      }
    } else {
      current   = { title: line, company: "", period: "", details: [""] };
      inDetails = false;
    }
  }

  flush();
  return entries;
}

// ─── Projects Parser ──────────────────────────────────────────────────────────
//
// PDF format per project:
//   Project Title               ← plain line (bold)
//   Role: [role text]
//   Skills: [skills, may wrap across multiple lines]
//   Link: [url]
//
// Key challenge: Skills can wrap to 2-3 lines. We accumulate them until we
// see the next labeled line (Role:, Link:) or a URL, then stop.

function parseProjects(lines) {
  const entries = [];
  let current = null;
  let inSkills = false; // true while accumulating wrapped skills lines

  const isRoleLine   = (l) => /^role\s*:\s*/i.test(l);
  const isSkillsLine = (l) => /^skills?\s*:\s*/i.test(l);
  const isLinkLine   = (l) => /^link\s*:\s*/i.test(l);
  const hasURL       = (l) => /https?:\/\//i.test(l);

  for (const line of lines) {
    if (isRoleLine(line)) {
      inSkills = false;
      if (current) current.role = line.replace(/^role\s*:\s*/i, "").trim();

    } else if (isSkillsLine(line)) {
      inSkills = true;
      if (current) current.skills = line.replace(/^skills?\s*:\s*/i, "").trim();

    } else if (isLinkLine(line) || hasURL(line)) {
      inSkills = false;
      if (current) {
        const urlMatch = line.match(/https?:\/\/[^\s)>]+/);
        if (urlMatch) current.link = urlMatch[0];
      }

    } else if (inSkills) {
      // Continuation line for wrapped skills — append until next label/url
      if (current) current.skills += " " + line.trim();

    } else {
      // Plain non-labeled line = new project title
      if (current) entries.push(current);
      current = {
        title: line,
        role: "",
        description: "",
        skills: "",
        link: "",
      };
      inSkills = false;
    }
  }

  if (current) entries.push(current);
  return entries;
}

// ─── Links Parser ────────────────────────────────────────────────────────────

function parseLinks(lines, fullText) {
  const found = new Map(); // url → label

  for (const line of lines) {
    const urlMatch = line.match(/https?:\/\/[^\s,)>]+/);
    if (urlMatch) {
      // Strip the URL and any punctuation to get the label
      const labelRaw = line
        .replace(/https?:\/\/[^\s,)>]+/, "")
        .replace(/[:\-|]/g, " ")
        .trim();
      const label = labelRaw || detectLinkTitle(urlMatch[0]);
      found.set(urlMatch[0], label);
    }
  }

  // Fallback: scan full text for well-known social profiles
  if (found.size === 0) {
    const social = [
      { re: /https?:\/\/(www\.)?linkedin\.com\/in\/[^\s,)>]+/g,   label: "LinkedIn"     },
      { re: /https?:\/\/(www\.)?github\.com\/[^\s,)>]+/g,         label: "GitHub"       },
      { re: /https?:\/\/(www\.)?twitter\.com\/[^\s,)>]+/g,        label: "Twitter"      },
      { re: /https?:\/\/(www\.)?behance\.net\/[^\s,)>]+/g,        label: "Behance"      },
      { re: /https?:\/\/(www\.)?dribbble\.com\/[^\s,)>]+/g,       label: "Dribbble"     },
      { re: /https?:\/\/(www\.)?upwork\.com\/[^\s,)>]+/g,         label: "Upwork"       },
      { re: /https?:\/\/(www\.)?stackoverflow\.com\/[^\s,)>]+/g,  label: "Stack Overflow"},
    ];
    for (const { re, label } of social) {
      const m = fullText.match(re);
      if (m && !found.has(m[0])) found.set(m[0], label);
    }
  }

  return Array.from(found.entries()).map(([url, title]) => ({ title, url }));
}

function detectLinkTitle(url) {
  const u = url.toLowerCase();
  if (u.includes("linkedin"))     return "LinkedIn";
  if (u.includes("github"))       return "GitHub";
  if (u.includes("twitter"))      return "Twitter";
  if (u.includes("behance"))      return "Behance";
  if (u.includes("dribbble"))     return "Dribbble";
  if (u.includes("upwork"))       return "Upwork";
  if (u.includes("stackoverflow")) return "Stack Overflow";
  if (u.includes("portfolio"))    return "Portfolio";
  return "Link";
}
