import { describe, expect, it } from "vitest";

import {
  addListValue,
  applyExtractedProfile,
  computeProfileCompletion,
  EMPTY_PROFILE_FORM,
  normalizeProfileForSave,
  parseListInput,
  validateExtractedProfile,
  validateProfileForSave,
  validateResumeFile,
  type ProfileFormState,
} from "@/lib/profile";

function completeProfile(): ProfileFormState {
  return {
    ...EMPTY_PROFILE_FORM,
    fullName: "Faizan Ali",
    email: "faizan@example.com",
    phone: "+1 555 000 0000",
    location: "New York, United States",
    workAuthorization: "citizen",
    currentTitle: "Frontend Engineer",
    experienceLevel: "mid",
    yearsExperience: "4",
    skills: ["React", "TypeScript"],
    workExperience: [
      {
        companyName: "Vercel",
        jobTitle: "Frontend Engineer",
        startDate: "January 2022",
        endDate: "",
        currentRole: true,
        keyResponsibilities: "Built Next.js features.",
      },
    ],
    jobTitlesSeeking: ["Frontend Engineer"],
    remotePreference: "any",
  };
}

describe("profile helpers", () => {
  it("computes a complete matching profile, covers: AC-4", () => {
    const completion = computeProfileCompletion(completeProfile());

    expect(completion).toEqual({
      isComplete: true,
      completionPercentage: 100,
      missingFields: [],
    });
  });

  it("reports missing required matching fields, covers: AC-4", () => {
    const completion = computeProfileCompletion({
      ...EMPTY_PROFILE_FORM,
      email: "faizan@example.com",
    });

    expect(completion.isComplete).toBe(false);
    expect(completion.completionPercentage).toBe(8);
    expect(completion.missingFields).toContain("PHONE");
    expect(completion.missingFields).toContain("WORK OR EDUCATION");
  });

  it("normalizes list and work values before save, covers: AC-3", () => {
    const normalized = normalizeProfileForSave({
      ...completeProfile(),
      skills: [" React ", "react", "TypeScript"],
      jobTitlesSeeking: [" Frontend Engineer ", "React Developer"],
      workExperience: [
        {
          companyName: " Vercel ",
          jobTitle: " Frontend Engineer ",
          startDate: " January 2022 ",
          endDate: " Present ",
          currentRole: true,
          keyResponsibilities: " Built product features. ",
        },
      ],
    });

    expect(normalized.skills).toEqual(["React", "TypeScript"]);
    expect(normalized.jobTitlesSeeking).toEqual(["Frontend Engineer", "React Developer"]);
    expect(normalized.workExperience[0]).toMatchObject({
      companyName: "Vercel",
      endDate: "",
      keyResponsibilities: "Built product features.",
    });
  });

  it("rejects invalid years before save, covers: AC-7", () => {
    const error = validateProfileForSave({
      ...completeProfile(),
      yearsExperience: "1.5",
    });

    expect(error).toBe("Years of experience must be a whole number of zero or more.");
  });

  it("parses comma separated chips and avoids duplicates, covers: AC-3", () => {
    expect(parseListInput("React, TypeScript, , Next.js")).toEqual([
      "React",
      "TypeScript",
      "Next.js",
    ]);
    expect(addListValue(["React"], "react")).toEqual(["React"]);
  });

  it("validates resume PDF files, covers: AC-5", () => {
    const pdf = new File(["content"], "resume.pdf", { type: "application/pdf" });
    const text = new File(["content"], "resume.txt", { type: "text/plain" });

    expect(validateResumeFile(pdf)).toBeNull();
    expect(validateResumeFile(text)).toBe("Please choose a PDF file.");
  });

  it("validates extracted profile fields and caps work history, covers: AC-4 AC-8", () => {
    const extracted = validateExtractedProfile({
      fullName: " Ada Lovelace ",
      email: "wrong@example.com",
      experienceLevel: "principal",
      remotePreference: "remote",
      yearsExperience: 6,
      skills: [" TypeScript ", "typeScript", ""],
      workExperience: [
        { companyName: "A", jobTitle: "Engineer", startDate: "2020", endDate: "2021", currentRole: false, keyResponsibilities: "One" },
        { companyName: "B", jobTitle: "Lead", startDate: "2021", endDate: "2022", currentRole: false, keyResponsibilities: "Two" },
        { companyName: "C", jobTitle: "Staff", startDate: "2022", endDate: "2023", currentRole: false, keyResponsibilities: "Three" },
        { companyName: "D", jobTitle: "Principal", startDate: "2023", endDate: "", currentRole: true, keyResponsibilities: "Four" },
      ],
    });

    expect(extracted).toMatchObject({
      fullName: "Ada Lovelace",
      remotePreference: "remote",
      yearsExperience: "6",
      skills: ["TypeScript"],
    });
    expect(extracted?.experienceLevel).toBeUndefined();
    expect(extracted?.workExperience).toHaveLength(3);
    expect("email" in (extracted ?? {})).toBe(false);
  });

  it("applies extracted fields as a draft while preserving email and resume keys, covers: AC-5 AC-6", () => {
    const current = {
      ...completeProfile(),
      fullName: "Manual Name",
      email: "manual@example.com",
      resumePdfUrl: "https://example.com/manual.pdf",
      resumePdfKey: "profile-user/resume.pdf",
    };
    const next = applyExtractedProfile(current, {
      fullName: "Resume Name",
      currentTitle: "Staff Engineer",
      skills: ["Node.js"],
    });

    expect(next.fullName).toBe("Resume Name");
    expect(next.currentTitle).toBe("Staff Engineer");
    expect(next.skills).toEqual(["Node.js"]);
    expect(next.email).toBe("manual@example.com");
    expect(next.resumePdfUrl).toBe("https://example.com/manual.pdf");
    expect(next.resumePdfKey).toBe("profile-user/resume.pdf");
  });
});
