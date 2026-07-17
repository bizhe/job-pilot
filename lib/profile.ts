import type { InsForgeClient } from "@insforge/sdk";

export type ExperienceLevel = "" | "junior" | "mid" | "senior" | "lead";
export type RemotePreference = "" | "remote" | "onsite" | "hybrid" | "any";
export type WorkAuthorization = "" | "citizen" | "permanent_resident" | "visa_required";
export type HighestDegree = "" | "high_school" | "bachelors" | "masters";

export type WorkExperienceItem = {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  currentRole: boolean;
  keyResponsibilities: string;
};

export type Education = {
  highestDegree: HighestDegree;
  fieldOfStudy: string;
  institutionName: string;
  graduationYear: string;
};

export type ProfileFormState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  workAuthorization: WorkAuthorization;
  currentTitle: string;
  experienceLevel: ExperienceLevel;
  yearsExperience: string;
  skills: string[];
  industries: string[];
  workExperience: WorkExperienceItem[];
  education: Education;
  jobTitlesSeeking: string[];
  remotePreference: RemotePreference;
  salaryExpectation: string;
  preferredLocations: string[];
  resumePdfUrl: string;
  resumePdfKey: string;
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
};

export type ProfileCompletion = {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
};

export type ProfileSaveResult = {
  success: boolean;
  profile?: ProfileFormState;
  error?: string;
};

export type ResumeUploadResult = {
  success: boolean;
  profile?: ProfileFormState;
  error?: string;
};

export type LoadProfileResult = ProfileSaveResult & {
  created?: boolean;
};

export type ExtractedProfile = Partial<
  Pick<
    ProfileFormState,
    | "fullName"
    | "phone"
    | "location"
    | "linkedinUrl"
    | "portfolioUrl"
    | "workAuthorization"
    | "currentTitle"
    | "experienceLevel"
    | "yearsExperience"
    | "skills"
    | "industries"
    | "workExperience"
    | "education"
    | "jobTitlesSeeking"
    | "remotePreference"
    | "salaryExpectation"
    | "preferredLocations"
  >
>;

export type ResumeExtractionResult = {
  success: boolean;
  profile?: ExtractedProfile;
  error?: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  experience_level: string | null;
  years_experience: number | null;
  skills: string[] | null;
  industries: string[] | null;
  work_experience: unknown;
  education: unknown;
  job_titles_seeking: string[] | null;
  remote_preference: string | null;
  preferred_locations: string[] | null;
  salary_expectation: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  work_authorization: string | null;
  resume_pdf_url: string | null;
  resume_pdf_key: string | null;
  is_complete: boolean | null;
  completion_percentage: number | null;
  missing_fields: string[] | null;
};

type ProfilePayload = {
  full_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  experience_level: ExperienceLevel | null;
  years_experience: number | null;
  skills: string[];
  industries: string[];
  work_experience: WorkExperienceItem[];
  education: Education | null;
  job_titles_seeking: string[];
  remote_preference: RemotePreference | null;
  preferred_locations: string[];
  salary_expectation: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  work_authorization: WorkAuthorization | null;
  is_complete: boolean;
  completion_percentage: number;
  missing_fields: string[];
};

export const EMPTY_WORK_EXPERIENCE_ITEM: WorkExperienceItem = {
  companyName: "",
  jobTitle: "",
  startDate: "",
  endDate: "",
  currentRole: false,
  keyResponsibilities: "",
};

export const EMPTY_EDUCATION: Education = {
  highestDegree: "",
  fieldOfStudy: "",
  institutionName: "",
  graduationYear: "",
};

export const EMPTY_PROFILE_FORM: ProfileFormState = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedinUrl: "",
  portfolioUrl: "",
  workAuthorization: "",
  currentTitle: "",
  experienceLevel: "",
  yearsExperience: "",
  skills: [],
  industries: [],
  workExperience: [{ ...EMPTY_WORK_EXPERIENCE_ITEM }],
  education: { ...EMPTY_EDUCATION },
  jobTitlesSeeking: [],
  remotePreference: "",
  salaryExpectation: "",
  preferredLocations: [],
  resumePdfUrl: "",
  resumePdfKey: "",
  isComplete: false,
  completionPercentage: 0,
  missingFields: ["FULL NAME", "EMAIL", "PHONE", "LOCATION", "CURRENT TITLE", "EXPERIENCE LEVEL", "YEARS EXPERIENCE", "SKILLS", "TARGET ROLES", "REMOTE PREFERENCE", "WORK AUTHORIZATION", "WORK OR EDUCATION"],
};

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
export const MIN_RESUME_TEXT_LENGTH = 120;

function cleanText(value: string): string {
  return value.trim();
}

function nullableText(value: string): string | null {
  const text = cleanText(value);
  return text.length > 0 ? text : null;
}

export function parseListInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function addListValue(values: string[], nextValue: string): string[] {
  const value = cleanText(nextValue);

  if (!value) {
    return values;
  }

  const exists = values.some((item) => item.toLowerCase() === value.toLowerCase());

  if (exists) {
    return values;
  }

  return [...values, value];
}

export function removeListValue(values: string[], value: string): string[] {
  return values.filter((item) => item !== value);
}

function normalizeList(values: string[]): string[] {
  return values.reduce<string[]>((result, item) => addListValue(result, item), []);
}

function parseYearsExperience(value: string): number | null {
  const trimmed = cleanText(value);

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizeWorkExperience(items: WorkExperienceItem[]): WorkExperienceItem[] {
  return items
    .slice(0, 3)
    .map((item) => ({
      companyName: cleanText(item.companyName),
      jobTitle: cleanText(item.jobTitle),
      startDate: cleanText(item.startDate),
      endDate: item.currentRole ? "" : cleanText(item.endDate),
      currentRole: item.currentRole,
      keyResponsibilities: cleanText(item.keyResponsibilities),
    }))
    .filter((item) => (
      item.companyName ||
      item.jobTitle ||
      item.startDate ||
      item.endDate ||
      item.keyResponsibilities
    ));
}

function normalizeEducation(education: Education): Education {
  return {
    highestDegree: education.highestDegree,
    fieldOfStudy: cleanText(education.fieldOfStudy),
    institutionName: cleanText(education.institutionName),
    graduationYear: cleanText(education.graduationYear),
  };
}

function hasWorkExperience(items: WorkExperienceItem[]): boolean {
  return items.some((item) => (
    item.companyName &&
    item.jobTitle &&
    item.keyResponsibilities
  ));
}

function hasEducation(education: Education): boolean {
  return Boolean(
    education.highestDegree ||
    education.fieldOfStudy ||
    education.institutionName ||
    education.graduationYear,
  );
}

export function computeProfileCompletion(profile: ProfileFormState): ProfileCompletion {
  const years = parseYearsExperience(profile.yearsExperience);
  const normalizedWork = normalizeWorkExperience(profile.workExperience);
  const normalizedEducation = normalizeEducation(profile.education);

  const checks = [
    { label: "FULL NAME", met: cleanText(profile.fullName).length > 0 },
    { label: "EMAIL", met: cleanText(profile.email).length > 0 },
    { label: "PHONE", met: cleanText(profile.phone).length > 0 },
    { label: "LOCATION", met: cleanText(profile.location).length > 0 },
    { label: "CURRENT TITLE", met: cleanText(profile.currentTitle).length > 0 },
    { label: "EXPERIENCE LEVEL", met: profile.experienceLevel.length > 0 },
    { label: "YEARS EXPERIENCE", met: years !== null },
    { label: "SKILLS", met: normalizeList(profile.skills).length > 0 },
    { label: "TARGET ROLES", met: normalizeList(profile.jobTitlesSeeking).length > 0 },
    { label: "REMOTE PREFERENCE", met: profile.remotePreference.length > 0 },
    { label: "WORK AUTHORIZATION", met: profile.workAuthorization.length > 0 },
    { label: "WORK OR EDUCATION", met: hasWorkExperience(normalizedWork) || hasEducation(normalizedEducation) },
  ];

  const metCount = checks.filter((check) => check.met).length;
  const missingFields = checks
    .filter((check) => !check.met)
    .map((check) => check.label);

  return {
    isComplete: missingFields.length === 0,
    completionPercentage: Math.round((metCount / checks.length) * 100),
    missingFields,
  };
}

export function normalizeProfileForSave(profile: ProfileFormState): ProfileFormState {
  const normalizedWork = normalizeWorkExperience(profile.workExperience);
  const normalizedEducation = normalizeEducation(profile.education);
  const normalizedProfile: ProfileFormState = {
    ...profile,
    fullName: cleanText(profile.fullName),
    email: cleanText(profile.email),
    phone: cleanText(profile.phone),
    location: cleanText(profile.location),
    linkedinUrl: cleanText(profile.linkedinUrl),
    portfolioUrl: cleanText(profile.portfolioUrl),
    currentTitle: cleanText(profile.currentTitle),
    yearsExperience: cleanText(profile.yearsExperience),
    skills: normalizeList(profile.skills),
    industries: normalizeList(profile.industries),
    workExperience: normalizedWork.length > 0 ? normalizedWork : [{ ...EMPTY_WORK_EXPERIENCE_ITEM }],
    education: normalizedEducation,
    jobTitlesSeeking: normalizeList(profile.jobTitlesSeeking),
    salaryExpectation: cleanText(profile.salaryExpectation),
    preferredLocations: normalizeList(profile.preferredLocations),
  };
  const completion = computeProfileCompletion(normalizedProfile);

  return {
    ...normalizedProfile,
    ...completion,
  };
}

export function validateProfileForSave(profile: ProfileFormState): string | null {
  const years = cleanText(profile.yearsExperience);

  if (years && parseYearsExperience(years) === null) {
    return "Years of experience must be a whole number of zero or more.";
  }

  if (!cleanText(profile.email)) {
    return "We could not confirm your email. Please sign in again.";
  }

  return null;
}

export function validateResumeFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Please choose a PDF file.";
  }

  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return "Please choose a PDF smaller than 5MB.";
  }

  return null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readExperienceLevel(value: unknown): ExperienceLevel {
  return value === "junior" || value === "mid" || value === "senior" || value === "lead" ? value : "";
}

function readRemotePreference(value: unknown): RemotePreference {
  return value === "remote" || value === "onsite" || value === "hybrid" || value === "any" ? value : "";
}

function readWorkAuthorization(value: unknown): WorkAuthorization {
  return value === "citizen" || value === "permanent_resident" || value === "visa_required" ? value : "";
}

function readHighestDegree(value: unknown): HighestDegree {
  return value === "high_school" || value === "bachelors" || value === "masters" ? value : "";
}

function readWorkExperience(value: unknown): WorkExperienceItem[] {
  if (!Array.isArray(value)) {
    return [{ ...EMPTY_WORK_EXPERIENCE_ITEM }];
  }

  const items = value
    .filter(isObject)
    .slice(0, 3)
    .map((item) => ({
      companyName: readString(item.companyName),
      jobTitle: readString(item.jobTitle),
      startDate: readString(item.startDate),
      endDate: readString(item.endDate),
      currentRole: readBoolean(item.currentRole),
      keyResponsibilities: readString(item.keyResponsibilities),
    }));

  return items.length > 0 ? items : [{ ...EMPTY_WORK_EXPERIENCE_ITEM }];
}

function readOptionalWorkExperience(value: unknown): WorkExperienceItem[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = readWorkExperience(value);
  const normalizedItems = normalizeWorkExperience(items);

  return normalizedItems.length > 0 ? normalizedItems : undefined;
}

function readEducation(value: unknown): Education {
  if (!isObject(value)) {
    return { ...EMPTY_EDUCATION };
  }

  return {
    highestDegree: readHighestDegree(value.highestDegree),
    fieldOfStudy: readString(value.fieldOfStudy),
    institutionName: readString(value.institutionName),
    graduationYear: readString(value.graduationYear),
  };
}

function readOptionalEducation(value: unknown): Education | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const education = readEducation(value);

  return hasEducation(education) ? education : undefined;
}

function readCleanString(value: unknown): string | undefined {
  const text = readString(value).trim();

  return text.length > 0 ? text : undefined;
}

function readCleanStringArray(value: unknown): string[] | undefined {
  const values = normalizeList(readStringArray(value));

  return values.length > 0 ? values : undefined;
}

function readYearsExperienceString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return String(value);
  }

  const text = readCleanString(value);

  if (!text) {
    return undefined;
  }

  return parseYearsExperience(text) === null ? undefined : text;
}

export function validateExtractedProfile(value: unknown): ExtractedProfile | null {
  if (!isObject(value)) {
    return null;
  }

  const profile: ExtractedProfile = {};
  const fullName = readCleanString(value.fullName);
  const phone = readCleanString(value.phone);
  const location = readCleanString(value.location);
  const linkedinUrl = readCleanString(value.linkedinUrl);
  const portfolioUrl = readCleanString(value.portfolioUrl);
  const workAuthorization = readWorkAuthorization(value.workAuthorization);
  const currentTitle = readCleanString(value.currentTitle);
  const experienceLevel = readExperienceLevel(value.experienceLevel);
  const yearsExperience = readYearsExperienceString(value.yearsExperience);
  const skills = readCleanStringArray(value.skills);
  const industries = readCleanStringArray(value.industries);
  const workExperience = readOptionalWorkExperience(value.workExperience);
  const education = readOptionalEducation(value.education);
  const jobTitlesSeeking = readCleanStringArray(value.jobTitlesSeeking);
  const remotePreference = readRemotePreference(value.remotePreference);
  const salaryExpectation = readCleanString(value.salaryExpectation);
  const preferredLocations = readCleanStringArray(value.preferredLocations);

  if (fullName) {
    profile.fullName = fullName;
  }

  if (phone) {
    profile.phone = phone;
  }

  if (location) {
    profile.location = location;
  }

  if (linkedinUrl) {
    profile.linkedinUrl = linkedinUrl;
  }

  if (portfolioUrl) {
    profile.portfolioUrl = portfolioUrl;
  }

  if (workAuthorization) {
    profile.workAuthorization = workAuthorization;
  }

  if (currentTitle) {
    profile.currentTitle = currentTitle;
  }

  if (experienceLevel) {
    profile.experienceLevel = experienceLevel;
  }

  if (yearsExperience) {
    profile.yearsExperience = yearsExperience;
  }

  if (skills) {
    profile.skills = skills;
  }

  if (industries) {
    profile.industries = industries;
  }

  if (workExperience) {
    profile.workExperience = workExperience;
  }

  if (education) {
    profile.education = education;
  }

  if (jobTitlesSeeking) {
    profile.jobTitlesSeeking = jobTitlesSeeking;
  }

  if (remotePreference) {
    profile.remotePreference = remotePreference;
  }

  if (salaryExpectation) {
    profile.salaryExpectation = salaryExpectation;
  }

  if (preferredLocations) {
    profile.preferredLocations = preferredLocations;
  }

  return Object.keys(profile).length > 0 ? profile : null;
}

export function applyExtractedProfile(
  currentProfile: ProfileFormState,
  extractedProfile: ExtractedProfile,
): ProfileFormState {
  return normalizeProfileForSave({
    ...currentProfile,
    ...extractedProfile,
    email: currentProfile.email,
    resumePdfUrl: currentProfile.resumePdfUrl,
    resumePdfKey: currentProfile.resumePdfKey,
  });
}

export async function extractProfileFromResume(
  file: File,
  accessToken?: string | null,
): Promise<ResumeExtractionResult> {
  const validationError = validateResumeFile(file);

  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const formData = new FormData();
    formData.set("resume", file);
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    const response = await fetch("/api/resume/extract", {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
    });
    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = isObject(body) && typeof body.error === "string"
        ? body.error
        : "We could not extract your resume. Please try again.";

      return { success: false, error };
    }

    if (!isObject(body) || body.success !== true) {
      return { success: false, error: "We could not extract your resume. Please try again." };
    }

    const profile = validateExtractedProfile(body.data);

    if (!profile) {
      return { success: false, error: "We could not read usable profile details from this resume." };
    }

    return { success: true, profile };
  } catch (error: unknown) {
    console.error("[profile/resume/extract]", error);
    return { success: false, error: "We could not extract your resume. Please try again." };
  }
}

function profileRowFromUnknown(value: unknown): ProfileRow | null {
  if (!isObject(value)) {
    return null;
  }

  const email = readString(value.email);
  const id = readString(value.id);

  if (!id || !email) {
    return null;
  }

  return {
    id,
    full_name: readString(value.full_name) || null,
    email,
    phone: readString(value.phone) || null,
    location: readString(value.location) || null,
    current_title: readString(value.current_title) || null,
    experience_level: readString(value.experience_level) || null,
    years_experience: readNumber(value.years_experience),
    skills: readStringArray(value.skills),
    industries: readStringArray(value.industries),
    work_experience: value.work_experience,
    education: value.education,
    job_titles_seeking: readStringArray(value.job_titles_seeking),
    remote_preference: readString(value.remote_preference) || null,
    preferred_locations: readStringArray(value.preferred_locations),
    salary_expectation: readString(value.salary_expectation) || null,
    linkedin_url: readString(value.linkedin_url) || null,
    portfolio_url: readString(value.portfolio_url) || null,
    work_authorization: readString(value.work_authorization) || null,
    resume_pdf_url: readString(value.resume_pdf_url) || null,
    resume_pdf_key: readString(value.resume_pdf_key) || null,
    is_complete: typeof value.is_complete === "boolean" ? value.is_complete : null,
    completion_percentage: readNumber(value.completion_percentage),
    missing_fields: readStringArray(value.missing_fields),
  };
}

function formFromProfileRow(row: ProfileRow): ProfileFormState {
  const profile: ProfileFormState = {
    fullName: row.full_name ?? "",
    email: row.email,
    phone: row.phone ?? "",
    location: row.location ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    portfolioUrl: row.portfolio_url ?? "",
    workAuthorization: readWorkAuthorization(row.work_authorization),
    currentTitle: row.current_title ?? "",
    experienceLevel: readExperienceLevel(row.experience_level),
    yearsExperience: row.years_experience === null ? "" : String(row.years_experience),
    skills: row.skills ?? [],
    industries: row.industries ?? [],
    workExperience: readWorkExperience(row.work_experience),
    education: readEducation(row.education),
    jobTitlesSeeking: row.job_titles_seeking ?? [],
    remotePreference: readRemotePreference(row.remote_preference),
    salaryExpectation: row.salary_expectation ?? "",
    preferredLocations: row.preferred_locations ?? [],
    resumePdfUrl: row.resume_pdf_url ?? "",
    resumePdfKey: row.resume_pdf_key ?? "",
    isComplete: row.is_complete ?? false,
    completionPercentage: row.completion_percentage ?? 0,
    missingFields: row.missing_fields ?? [],
  };
  const completion = computeProfileCompletion(profile);

  if (row.missing_fields && row.missing_fields.length > 0) {
    return profile;
  }

  return {
    ...profile,
    ...completion,
  };
}

function payloadFromProfile(profile: ProfileFormState): ProfilePayload {
  const normalized = normalizeProfileForSave(profile);
  const yearsExperience = parseYearsExperience(normalized.yearsExperience);
  const education = hasEducation(normalized.education) ? normalized.education : null;

  return {
    full_name: nullableText(normalized.fullName),
    email: normalized.email,
    phone: nullableText(normalized.phone),
    location: nullableText(normalized.location),
    current_title: nullableText(normalized.currentTitle),
    experience_level: normalized.experienceLevel || null,
    years_experience: yearsExperience,
    skills: normalized.skills,
    industries: normalized.industries,
    work_experience: normalizeWorkExperience(normalized.workExperience),
    education,
    job_titles_seeking: normalized.jobTitlesSeeking,
    remote_preference: normalized.remotePreference || null,
    preferred_locations: normalized.preferredLocations,
    salary_expectation: nullableText(normalized.salaryExpectation),
    linkedin_url: nullableText(normalized.linkedinUrl),
    portfolio_url: nullableText(normalized.portfolioUrl),
    work_authorization: normalized.workAuthorization || null,
    is_complete: normalized.isComplete,
    completion_percentage: normalized.completionPercentage,
    missing_fields: normalized.missingFields,
  };
}

function safeProfileError(fallback: string): string {
  return fallback;
}

export async function loadProfileForUser(
  client: InsForgeClient,
  userId: string,
  email: string,
): Promise<LoadProfileResult> {
  try {
    const selectResult: { data: unknown; error: unknown } = await client.database
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (selectResult.error) {
      console.error("[profile/load]", selectResult.error);
      return { success: false, error: safeProfileError("We could not load your profile. Please try again.") };
    }

    const existingRow = profileRowFromUnknown(selectResult.data);

    if (existingRow) {
      return {
        success: true,
        profile: formFromProfileRow(existingRow),
        created: false,
      };
    }

    const insertResult: { data: unknown; error: unknown } = await client.database
      .from("profiles")
      .insert({
        id: userId,
        email,
        missing_fields: EMPTY_PROFILE_FORM.missingFields,
      })
      .select()
      .single();

    if (insertResult.error) {
      console.error("[profile/create]", insertResult.error);
      return { success: false, error: safeProfileError("We could not create your profile. Please try again.") };
    }

    const createdRow = profileRowFromUnknown(insertResult.data);

    if (!createdRow) {
      console.error("[profile/create]", "Created profile response was not usable.");
      return { success: false, error: safeProfileError("We could not create your profile. Please try again.") };
    }

    return {
      success: true,
      profile: formFromProfileRow(createdRow),
      created: true,
    };
  } catch (error: unknown) {
    console.error("[profile/load]", error);
    return { success: false, error: safeProfileError("We could not load your profile. Please try again.") };
  }
}

export async function saveProfileForUser(
  client: InsForgeClient,
  userId: string,
  profile: ProfileFormState,
): Promise<ProfileSaveResult> {
  const validationError = validateProfileForSave(profile);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const normalized = normalizeProfileForSave(profile);
  const payload = payloadFromProfile(normalized);

  try {
    const updateResult: { data: unknown; error: unknown } = await client.database
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select()
      .single();

    if (updateResult.error) {
      console.error("[profile/save]", updateResult.error);
      return { success: false, error: safeProfileError("We could not save your profile. Please try again.") };
    }

    const savedRow = profileRowFromUnknown(updateResult.data);

    if (!savedRow) {
      console.error("[profile/save]", "Saved profile response was not usable.");
      return { success: false, error: safeProfileError("We could not save your profile. Please try again.") };
    }

    return {
      success: true,
      profile: formFromProfileRow(savedRow),
    };
  } catch (error: unknown) {
    console.error("[profile/save]", error);
    return { success: false, error: safeProfileError("We could not save your profile. Please try again.") };
  }
}

export async function uploadResumeForUser(
  client: InsForgeClient,
  userId: string,
  file: File,
  profile: ProfileFormState,
): Promise<ResumeUploadResult> {
  const validationError = validateResumeFile(file);

  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    if (profile.resumePdfKey) {
      const removeResult = await client.storage.from("resumes").remove(profile.resumePdfKey);

      if (removeResult.error) {
        console.error("[profile/resume/remove]", removeResult.error);
      }
    }

    const uploadResult = await client.storage
      .from("resumes")
      .upload(`${userId}/resume.pdf`, file);

    if (uploadResult.error || !uploadResult.data) {
      console.error("[profile/resume/upload]", uploadResult.error);
      return { success: false, error: safeProfileError("We could not upload your resume. Please try again.") };
    }

    const updateResult: { data: unknown; error: unknown } = await client.database
      .from("profiles")
      .update({
        resume_pdf_url: uploadResult.data.url,
        resume_pdf_key: uploadResult.data.key,
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateResult.error) {
      console.error("[profile/resume/save]", updateResult.error);
      return { success: false, error: safeProfileError("Your resume uploaded, but we could not save it to your profile.") };
    }

    const savedRow = profileRowFromUnknown(updateResult.data);

    if (!savedRow) {
      console.error("[profile/resume/save]", "Resume profile response was not usable.");
      return { success: false, error: safeProfileError("Your resume uploaded, but we could not save it to your profile.") };
    }

    return {
      success: true,
      profile: formFromProfileRow(savedRow),
    };
  } catch (error: unknown) {
    console.error("[profile/resume]", error);
    return { success: false, error: safeProfileError("We could not upload your resume. Please try again.") };
  }
}
