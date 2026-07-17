import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const createInsforgeServer = vi.fn();
const getText = vi.fn();
const destroy = vi.fn();
const create = vi.fn();
const setWorker = vi.fn();

vi.mock("@/lib/insforge-server", () => ({
  createInsforgeServer,
}));

vi.mock("pdf-parse", () => ({
  PDFParse: Object.assign(vi.fn(function PDFParse() {
    return {
      getText,
      destroy,
    };
  }), { setWorker }),
}));

vi.mock("openai", () => ({
  default: vi.fn(function OpenAI() {
    return {
      chat: {
        completions: {
          create,
        },
      },
    };
  }),
}));

function requestWithFile(file?: File, init?: RequestInit): Request {
  const formData = new FormData();

  if (file) {
    formData.set("resume", file);
  }

  return new Request("http://localhost/api/resume/extract", {
    method: "POST",
    body: formData,
    ...init,
  });
}

describe("POST /api/resume/extract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    createInsforgeServer.mockResolvedValue({
      auth: {
        getCurrentUser,
      },
    });
    getCurrentUser.mockResolvedValue({
      data: {
        user: {
          id: "profile-user",
          email: "faizan@example.com",
        },
      },
      error: null,
    });
    getText.mockResolvedValue({
      text: "Frontend engineer resume with React TypeScript Node.js product work ".repeat(4),
    });
    destroy.mockResolvedValue(undefined);
    create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              fullName: "Faizan Ali",
              currentTitle: "Frontend Engineer",
              experienceLevel: "mid",
              yearsExperience: "4",
              skills: ["React", "TypeScript"],
              jobTitlesSeeking: ["Frontend Engineer"],
              remotePreference: "remote",
            }),
          },
        },
      ],
    });
  });

  it("rejects unauthenticated requests before parsing the PDF, covers: AC-2 AC-3 AC-7", async () => {
    getCurrentUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { POST } = await import("./route");
    const response = await POST(requestWithFile(new File(["%PDF body"], "resume.pdf", { type: "application/pdf" })));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      error: "Please sign in again before extracting your resume.",
    });
    expect(getText).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects short PDF text with safe copy, covers: AC-3 AC-7", async () => {
    getText.mockResolvedValue({ text: "too short" });
    const { POST } = await import("./route");
    const response = await POST(requestWithFile(new File(["%PDF body"], "resume.pdf", { type: "application/pdf" })));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      success: false,
      error: "Could not extract text from this PDF. Please try a different file.",
    });
    expect(create).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it("returns validated extracted profile JSON, covers: AC-4 AC-8", async () => {
    const { POST } = await import("./route");
    const response = await POST(requestWithFile(new File(["%PDF body"], "resume.pdf", { type: "application/pdf" })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        fullName: "Faizan Ali",
        currentTitle: "Frontend Engineer",
        experienceLevel: "mid",
        yearsExperience: "4",
        skills: ["React", "TypeScript"],
        jobTitlesSeeking: ["Frontend Engineer"],
        remotePreference: "remote",
      },
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 800,
    }));
  });

  it("sets the installed PDF worker before parsing, covers: dev worker chunk regression", async () => {
    const { POST } = await import("./route");
    const response = await POST(requestWithFile(new File(["%PDF body"], "resume.pdf", { type: "application/pdf" })));

    expect(response.status).toBe(200);
    expect(setWorker).toHaveBeenCalledWith(expect.stringMatching(/^file:.*pdf\.worker\.mjs$/));
    expect(setWorker.mock.invocationCallOrder[0]).toBeLessThan(getText.mock.invocationCallOrder[0]);
  });

  it("uses the browser bearer token when no server cookie is available", async () => {
    createInsforgeServer.mockImplementation(async (options?: { accessToken?: string }) => ({
      auth: {
        getCurrentUser: options?.accessToken === "browser-token"
          ? getCurrentUser
          : vi.fn(async () => ({
            data: { user: null },
            error: null,
          })),
      },
    }));

    const { POST } = await import("./route");
    const response = await POST(requestWithFile(
      new File(["%PDF body"], "resume.pdf", { type: "application/pdf" }),
      { headers: { Authorization: "Bearer browser-token" } },
    ));

    expect(response.status).toBe(200);
    expect(createInsforgeServer).toHaveBeenCalledWith({ accessToken: "browser-token" });
  });
});
