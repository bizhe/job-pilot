import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ImgHTMLAttributes } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfilePageContent } from "@/components/profile/ProfilePageContent";
import { getInsforgeBrowserClient } from "@/lib/insforge-client";
import { getInsforgePublicConfig } from "@/lib/insforge-config";
import { capturePostHogEvent, capturePostHogException, identifyPostHogUser } from "@/lib/posthog-client";

const replace = vi.fn();
const router = { replace };
const getCurrentUser = vi.fn();
const from = vi.fn();
const storageFrom = vi.fn();
const remove = vi.fn();
const upload = vi.fn();
const single = vi.fn();
const fetchMock = vi.fn();

type BuilderResult = {
  data: unknown;
  error: unknown;
};

type MockBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

type ProfileClientOptions = {
  loadResult?: BuilderResult;
  createResult?: BuilderResult;
  saveResult?: BuilderResult;
  uploadResult?: BuilderResult;
  removeResult?: BuilderResult;
};

const profileRow = {
  id: "profile-user",
  email: "faizan@example.com",
  full_name: "Faizan Ali",
  phone: "+1 555 000 0000",
  location: "New York, United States",
  current_title: "Frontend Engineer",
  experience_level: "mid",
  years_experience: 4,
  skills: ["React", "TypeScript"],
  industries: ["SaaS"],
  work_experience: [
    {
      companyName: "Vercel",
      jobTitle: "Frontend Engineer",
      startDate: "January 2022",
      endDate: "",
      currentRole: true,
      keyResponsibilities: "Built product features.",
    },
  ],
  education: {
    highestDegree: "bachelors",
    fieldOfStudy: "Computer Science",
    institutionName: "State University",
    graduationYear: "2020",
  },
  job_titles_seeking: ["Frontend Engineer"],
  remote_preference: "any",
  preferred_locations: ["Remote"],
  salary_expectation: "$120k+",
  linkedin_url: "https://linkedin.com/in/faizan",
  portfolio_url: "https://github.com/jsmastery",
  work_authorization: "citizen",
  resume_pdf_url: "",
  resume_pdf_key: "",
  is_complete: true,
  completion_percentage: 100,
  missing_fields: [],
};

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    void priority;

    return createElement("img", { alt: alt ?? "", ...props });
  },
}));

vi.mock("@/lib/insforge-config", () => ({
  getInsforgePublicConfig: vi.fn(),
}));

vi.mock("@/lib/insforge-client", () => ({
  getInsforgeBrowserClient: vi.fn(),
}));

vi.mock("@/lib/posthog-client", () => ({
  capturePostHogEvent: vi.fn(),
  capturePostHogException: vi.fn(),
  identifyPostHogUser: vi.fn(),
}));

function createBuilder(options: {
  loadResult: BuilderResult;
  createResult: BuilderResult;
  saveResult: BuilderResult;
  uploadResult: BuilderResult;
  insertedValues: unknown[];
  updatedValues: unknown[];
}): MockBuilder {
  const builder: Partial<MockBuilder> = {};
  let singleResult = options.loadResult;

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => options.loadResult);
  builder.insert = vi.fn((value: unknown) => {
    options.insertedValues.push(value);
    singleResult = options.createResult;
    return builder;
  });
  builder.update = vi.fn((value: unknown) => {
    options.updatedValues.push(value);
    singleResult =
      typeof value === "object" && value !== null && "resume_pdf_url" in value
        ? options.uploadResult
        : options.saveResult;
    return builder;
  });
  builder.single = single.mockImplementation(async () => singleResult);

  return builder as MockBuilder;
}

function mockConfiguredClient(options: ProfileClientOptions = {}): {
  insertedValues: unknown[];
  updatedValues: unknown[];
} {
  const insertedValues: unknown[] = [];
  const updatedValues: unknown[] = [];
  const builder = createBuilder({
    loadResult: options.loadResult ?? { data: profileRow, error: null },
    createResult: options.createResult ?? { data: profileRow, error: null },
    saveResult: options.saveResult ?? { data: profileRow, error: null },
    uploadResult: options.uploadResult ?? {
      data: { ...profileRow, resume_pdf_key: "profile-user/resume.pdf", resume_pdf_url: "https://example.com/resume.pdf" },
      error: null,
    },
    insertedValues,
    updatedValues,
  });

  from.mockReturnValue(builder);
  remove.mockResolvedValue(options.removeResult ?? { data: { message: "ok" }, error: null });
  upload.mockResolvedValue({
    data: {
      bucket: "resumes",
      key: "profile-user/resume.pdf",
      size: 9,
      mimeType: "application/pdf",
      uploadedAt: "2026-07-17T00:00:00.000Z",
      url: "https://example.com/resume.pdf",
    },
    error: null,
  });
  storageFrom.mockReturnValue({ remove, upload });
  vi.mocked(getInsforgePublicConfig).mockReturnValue({
    baseUrl: "https://example.insforge.app",
    anonKey: "public-anon-key",
  });
  vi.mocked(getInsforgeBrowserClient).mockReturnValue({
    getHttpClient: () => ({
      getValidAccessToken: async () => "browser-token",
    }),
    auth: {
      getCurrentUser,
    },
    database: {
      from,
    },
    storage: {
      from: storageFrom,
    },
  });

  return { insertedValues, updatedValues };
}

function mockSignedInUser(): void {
  getCurrentUser.mockResolvedValue({
    data: {
      user: {
        id: "profile-user",
        email: "faizan@example.com",
      },
    },
    error: null,
  });
}

describe("ProfilePageContent", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleError.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockSignedInUser();
    mockConfiguredClient();
  });

  it("loads a saved profile and keeps the auth email locked, covers: AC-1 AC-6", async () => {
    render(<ProfilePageContent />);

    expect(await screen.findByRole("heading", { name: "Profile ready" })).toBeVisible();
    expect(screen.getByLabelText("Full Name")).toHaveValue("Faizan Ali");
    expect(screen.getByLabelText("Email")).toHaveValue("faizan@example.com");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Profile complete")).toBeInTheDocument();
    expect(identifyPostHogUser).toHaveBeenCalledWith("profile-user");
  });

  it("creates a missing profile row from auth identity, covers: AC-2", async () => {
    const { insertedValues } = mockConfiguredClient({
      loadResult: { data: null, error: null },
      createResult: {
        data: {
          ...profileRow,
          full_name: null,
          completion_percentage: 8,
          missing_fields: ["FULL NAME", "PHONE"],
        },
        error: null,
      },
    });

    render(<ProfilePageContent />);

    expect(await screen.findByText("Your profile is ready to fill in.")).toBeVisible();
    expect(screen.getByLabelText("Email")).toHaveValue("faizan@example.com");
    expect(insertedValues[0]).toMatchObject({
      id: "profile-user",
      email: "faizan@example.com",
    });
  });

  it("saves the current normalized profile for the current user, covers: AC-3 AC-4 AC-6", async () => {
    const user = userEvent.setup();
    const { updatedValues } = mockConfiguredClient();

    render(<ProfilePageContent />);

    await screen.findByRole("heading", { name: "Profile ready" });
    await user.click(screen.getByRole("button", { name: "Save Profile" }));
    await waitFor(() => {
      expect(updatedValues).toHaveLength(1);
    });

    expect(from).toHaveBeenCalledWith("profiles");
    expect(updatedValues[0]).toMatchObject({
      years_experience: 4,
      salary_expectation: "$120k+",
      is_complete: true,
      completion_percentage: 100,
      missing_fields: [],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Profile is saved.");
    expect(capturePostHogEvent).not.toHaveBeenCalled();
  });

  it("fires the completion event only when an incomplete profile becomes complete, covers: AC-4", async () => {
    const user = userEvent.setup();
    mockConfiguredClient({
      loadResult: {
        data: {
          ...profileRow,
          is_complete: false,
          completion_percentage: 92,
          missing_fields: ["PHONE"],
        },
        error: null,
      },
      saveResult: {
        data: profileRow,
        error: null,
      },
    });

    render(<ProfilePageContent />);

    await screen.findByRole("heading", { name: "Profile needs attention" });
    await user.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(capturePostHogEvent).toHaveBeenCalledWith("profile_completed", {
        userId: "profile-user",
      });
    });
  });

  it("rejects a non PDF resume before storage is called, covers: AC-5 AC-7", async () => {
    mockConfiguredClient();

    render(<ProfilePageContent />);

    await screen.findByRole("heading", { name: "Profile ready" });
    fireEvent.change(screen.getByLabelText("Select resume PDF"), {
      target: {
        files: [new File(["hello"], "resume.txt", { type: "text/plain" })],
      },
    });

    expect(await screen.findByText("Please choose a PDF file.")).toBeVisible();
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads a valid resume and saves the returned storage key and url, covers: AC-5", async () => {
    const user = userEvent.setup();
    const { updatedValues } = mockConfiguredClient();

    render(<ProfilePageContent />);

    await screen.findByRole("heading", { name: "Profile ready" });
    await user.upload(
      screen.getByLabelText("Select resume PDF"),
      new File(["%PDF body"], "resume.pdf", { type: "application/pdf" }),
    );

    expect(await screen.findByText("Resume uploaded.")).toBeVisible();
    expect(storageFrom).toHaveBeenCalledWith("resumes");
    expect(upload).toHaveBeenCalledWith("profile-user/resume.pdf", expect.any(File));
    expect(updatedValues[0]).toMatchObject({
      resume_pdf_url: "https://example.com/resume.pdf",
      resume_pdf_key: "profile-user/resume.pdf",
    });
  });

  it("extracts the selected resume into the editable draft without saving, covers: AC-1 AC-5 AC-6 AC-7", async () => {
    const user = userEvent.setup();
    const { updatedValues } = mockConfiguredClient();
    fetchMock.mockResolvedValue(new Response(
      JSON.stringify({
        success: true,
        data: {
          fullName: "Resume Name",
          currentTitle: "Staff Frontend Engineer",
          experienceLevel: "senior",
          yearsExperience: "7",
          skills: ["React", "Node.js"],
          jobTitlesSeeking: ["Staff Frontend Engineer"],
          remotePreference: "remote",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));

    render(<ProfilePageContent />);

    await screen.findByRole("heading", { name: "Profile ready" });
    expect(screen.getByRole("button", { name: "Extract from Resume" })).toBeDisabled();

    await user.upload(
      screen.getByLabelText("Select resume PDF"),
      new File(["%PDF body"], "resume.pdf", { type: "application/pdf" }),
    );
    expect(await screen.findByText("Resume uploaded.")).toBeVisible();
    const extractButton = await screen.findByRole("button", { name: "Extract from Resume" });

    expect(extractButton).toBeEnabled();
    await user.click(extractButton);

    await waitFor(() => {
    expect(fetchMock).toHaveBeenCalledWith("/api/resume/extract", expect.objectContaining({
      method: "POST",
      headers: { Authorization: "Bearer browser-token" },
      credentials: "include",
    }));
    });
    expect(await screen.findByText("Resume extracted. Review the fields below before saving.")).toBeVisible();
    expect(screen.getByLabelText("Full Name")).toHaveValue("Resume Name");
    expect(screen.getByLabelText("Current/Recent Job Title")).toHaveValue("Staff Frontend Engineer");
    expect(screen.getByLabelText("Email")).toHaveValue("faizan@example.com");
    expect(updatedValues).toHaveLength(1);
  });

  it("redirects unauthenticated visitors before rendering profile content, covers: AC-6", async () => {
    getCurrentUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockConfiguredClient();

    render(<ProfilePageContent />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByRole("heading", { name: "Profile Information" })).not.toBeInTheDocument();
  });

  it("shows a safe load error without exposing backend payloads, covers: AC-7", async () => {
    mockConfiguredClient({
      loadResult: {
        data: null,
        error: new Error("secret backend payload"),
      },
    });

    render(<ProfilePageContent />);

    expect(await screen.findByText("We could not load your profile. Please try again.")).toBeVisible();
    expect(screen.queryByText("secret backend payload")).not.toBeInTheDocument();
    expect(capturePostHogException).not.toHaveBeenCalled();
  });
});
