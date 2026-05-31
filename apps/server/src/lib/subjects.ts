/**
 * Canonical ZIMSEC subject list — all levels, no grouping.
 *
 * Validation normalises both the stored key and the user's input the same way:
 *   1. lowercase
 *   2. strip everything except a-z, 0-9, and spaces
 *   3. collapse + trim whitespace
 *   4. replace spaces with "-"
 *
 * This means "Computer Science", "computer science", "Computer-Science",
 * and "COMPUTER SCIENCE" all normalise to "computer-science" and match.
 */

// ── Canonical list (title case) ───────────────────────────────────────────────

export const ZIMSEC_SUBJECTS: readonly string[] = [
  // Mathematics
  "Mathematics",
  "Additional Mathematics",
  "Further Mathematics",
  "Statistics",

  // English & Languages
  "English Language",
  "Literature in English",
  "Shona",
  "Ndebele",

  // Sciences
  "Combined Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Environmental Science",

  // Agriculture & Food
  "Agriculture",
  "Food and Nutrition",
  "Food Science and Technology",

  // Humanities & Social Sciences
  "History",
  "Geography",
  "Sociology",
  "Law",
  "Philosophy",
  "Heritage Studies",
  "Religious and Moral Education",
  "Religious Studies",

  // Business & Economics
  "Commerce",
  "Accounting",
  "Economics",
  "Business Studies",
  "Business Enterprise",

  // Technology
  "Computer Science",
  "Technical Graphics",
  "Building Technology",
  "Metal Technology",
  "Wood Technology",
  "Electrical Technology",

  // Creative & Practical
  "Art",
  "Art and Design",
  "Music",
  "Clothing and Textiles",
  "Fashion and Fabrics",
  "Home Economics",
  "Art and Craft",

  // Physical
  "Physical Education",

  // Primary
  "Science",
];

// ── Normalisation ─────────────────────────────────────────────────────────────

/** Normalise a subject string to a lookup key. */
export function toSubjectKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ") // strip special chars → space
    .replace(/\s+/g, " ")          // collapse runs
    .trim()
    .replace(/ /g, "-");           // spaces → dashes
}

// Pre-build the canonical key → title-case name map
const SUBJECT_MAP = new Map<string, string>(
  ZIMSEC_SUBJECTS.map((s) => [toSubjectKey(s), s]),
);

// ── Aliases for common shorthand / typos ─────────────────────────────────────

const ALIASES: Record<string, string> = {
  // Mathematics
  "maths":                     "mathematics",
  "math":                      "mathematics",
  "add-maths":                 "additional-mathematics",
  "add-math":                  "additional-mathematics",
  "further-maths":             "further-mathematics",
  "further-math":              "further-mathematics",
  "stats":                     "statistics",

  // English
  "english":                   "english-language",
  "lit":                       "literature-in-english",
  "literature":                "literature-in-english",

  // Sciences
  "combined":                  "combined-science",
  "comb-science":              "combined-science",
  "phy":                       "physics",
  "phys":                      "physics",
  "chem":                      "chemistry",
  "bio":                       "biology",
  "environmental":             "environmental-science",
  "env-science":               "environmental-science",

  // Agriculture
  "agri":                      "agriculture",
  "agric":                     "agriculture",

  // Food
  "food":                      "food-and-nutrition",
  "food-nutrition":            "food-and-nutrition",
  "food-science":              "food-science-and-technology",

  // Humanities
  "hist":                      "history",
  "geo":                       "geography",
  "geog":                      "geography",
  "soc":                       "sociology",
  "heritage":                  "heritage-studies",
  "rme":                       "religious-and-moral-education",
  "religion":                  "religious-and-moral-education",
  "religious":                 "religious-and-moral-education",
  "rs":                        "religious-studies",

  // Business
  "business":                  "business-studies",
  "econ":                      "economics",
  "acc":                       "accounting",
  "accounts":                  "accounting",

  // Technology
  "cs":                        "computer-science",
  "it":                        "computer-science",
  "computing":                 "computer-science",
  "computer":                  "computer-science",
  "tech-graphics":             "technical-graphics",
  "building":                  "building-technology",
  "metal":                     "metal-technology",
  "wood":                      "wood-technology",
  "electrical":                "electrical-technology",

  // Creative
  "art-design":                "art-and-design",
  "art-craft":                 "art-and-craft",
  "home-ec":                   "home-economics",
  "home-econ":                 "home-economics",
  "pe":                        "physical-education",
  "sport":                     "physical-education",
  "fashion":                   "fashion-and-fabrics",
  "clothing":                  "clothing-and-textiles",
  "textiles":                  "clothing-and-textiles",
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return the canonical (title-case) subject name for `raw`, or `undefined`
 * if it is not a recognised ZIMSEC subject.
 */
export function canonicalSubject(raw: string): string | undefined {
  const key = toSubjectKey(raw);
  // Direct match
  if (SUBJECT_MAP.has(key)) return SUBJECT_MAP.get(key)!;
  // Alias match
  const aliasKey = ALIASES[key];
  if (aliasKey && SUBJECT_MAP.has(aliasKey)) return SUBJECT_MAP.get(aliasKey)!;
  return undefined;
}

/** `true` if `raw` resolves to a known ZIMSEC subject. */
export function isValidSubject(raw: string): boolean {
  return canonicalSubject(raw) !== undefined;
}

/** The full flat list of canonical subject names (for display in hints). */
export const SUBJECT_NAMES: readonly string[] = ZIMSEC_SUBJECTS;
