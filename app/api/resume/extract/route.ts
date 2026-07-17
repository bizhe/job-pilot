import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import { NextResponse } from "next/server";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { createInsforgeServer } from "@/lib/insforge-server";
import {
  MIN_RESUME_TEXT_LENGTH,
  validateExtractedProfile,
  validateResumeFile,
} from "@/lib/profile";

export const runtime = "nodejs";

const require = createRequire(join(process.cwd(), "package.json"));
const pdfParseEntryPath = require.resolve("pdf-parse");
const pdfWorkerSrc = pathToFileURL(join(dirname(pdfParseEntryPath), "pdf.worker.mjs")).toString();

type ApiError = {
  success: false;
  error: string;
};

type ApiSuccess = {
  success: true;
  data: NonNullable<ReturnType<typeof validateExtractedProfile>>;
};

function errorResponse(error: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error }, { status });
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string"
  );
}

function readBearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");

  if (!header) {
    return undefined;
  }

  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  PDFParse.setWorker(pdfWorkerSrc);
  const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });

  try {
    const result = await parser.getText();

    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

function buildSystemPrompt(): string {
  return [
    "You extract profile data from a resume for JobPilot.",
    "Return only valid JSON using the exact field names requested.",
    "Use empty strings or empty arrays when a field is not present.",
    "Allowed experienceLevel values are junior, mid, senior, lead, or an empty string.",
    "Allowed workAuthorization values are citizen, permanent_resident, visa_required, or an empty string.",
    "Allowed remotePreference values are remote, onsite, hybrid, any, or an empty string.",
    "Allowed highestDegree values are high_school, bachelors, masters, or an empty string.",
    "Return at most 3 workExperience items.",
  ].join(" ");
}

function buildUserPrompt(resumeText: string): string {
  return JSON.stringify({
    fields: {
      fullName: "string",
      phone: "string",
      location: "string",
      linkedinUrl: "string",
      portfolioUrl: "string",
      workAuthorization: "citizen | permanent_resident | visa_required | empty string",
      currentTitle: "string",
      experienceLevel: "junior | mid | senior | lead | empty string",
      yearsExperience: "whole number as string when clear, otherwise empty string",
      skills: ["string"],
      industries: ["string"],
      workExperience: [
        {
          companyName: "string",
          jobTitle: "string",
          startDate: "string",
          endDate: "string",
          currentRole: "boolean",
          keyResponsibilities: "string",
        },
      ],
      education: {
        highestDegree: "high_school | bachelors | masters | empty string",
        fieldOfStudy: "string",
        institutionName: "string",
        graduationYear: "string",
      },
      jobTitlesSeeking: ["string"],
      remotePreference: "remote | onsite | hybrid | any | empty string",
      salaryExpectation: "string",
      preferredLocations: ["string"],
    },
    resumeText,
  });
}

async function extractProfileWithOpenAI(resumeText: string): Promise<unknown> {
  const openai = getOpenAIClient();

  if (!openai) {
    throw new Error("OpenAI API key is not configured.");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(resumeText) },
    ],
  });
  const content = response.choices[0]?.message.content;

  if (!content) {
    return null;
  }

  return JSON.parse(content);
}

export async function POST(request: Request): Promise<NextResponse<ApiError | ApiSuccess>> {
  try {
    const accessToken = readBearerToken(request);
    const insforge = await createInsforgeServer(accessToken ? { accessToken } : undefined);

    if (!insforge) {
      return errorResponse("Authentication is not configured.", 500);
    }

    const userResult = await insforge.auth.getCurrentUser();

    if (userResult.error || !userResult.data.user) {
      return errorResponse("Please sign in again before extracting your resume.", 401);
    }

    const formData = await request.formData();
    const resume = formData.get("resume");

    if (!isUploadedFile(resume)) {
      return errorResponse("Please choose a PDF file.", 400);
    }

    const fileError = validateResumeFile(resume);

    if (fileError) {
      return errorResponse(fileError, 400);
    }

    const resumeText = await extractPdfText(resume);

    if (resumeText.length < MIN_RESUME_TEXT_LENGTH) {
      return errorResponse("Could not extract text from this PDF. Please try a different file.", 422);
    }

    const extracted = validateExtractedProfile(await extractProfileWithOpenAI(resumeText));

    if (!extracted) {
      return errorResponse("We could not read usable profile details from this resume.", 422);
    }

    return NextResponse.json({ success: true, data: extracted });
  } catch (error: unknown) {
    console.error("[api/resume/extract]", error instanceof Error ? error.message : "Extraction failed.");

    return errorResponse("We could not extract your resume. Please try again.", 500);
  }
}
