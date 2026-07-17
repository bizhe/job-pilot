import { expect, type Page, test } from "@playwright/test";

const backendUrl = "https://pm5ayshf.eu-central.insforge.app";

const authBody = {
  accessToken: "profile-token",
  csrfToken: "profile-csrf",
  user: {
    id: "profile-user",
    email: "faizan@example.com",
  },
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

async function stubSignedInProfile(page: Page): Promise<{
  saveSeen: Promise<boolean>;
}> {
  let resolveSaveSeen: (value: boolean) => void = () => undefined;
  const saveSeen = new Promise<boolean>((resolve) => {
    resolveSaveSeen = resolve;
  });

  await page.route("**/api/auth/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(authBody),
    });
  });
  await page.route(`${backendUrl}/api/database/records/profiles**`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/1" },
        body: JSON.stringify([profileRow]),
      });
      return;
    }

    resolveSaveSeen(true);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(profileRow),
    });
  });
  await page.route("https://eu-assets.i.posthog.com/**", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });
  await page.route("https://eu.i.posthog.com/**", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  return { saveSeen };
}

test.describe("profile smoke flow", () => {
  test("loads and saves a signed in profile, covers: AC-1 AC-3 AC-4 AC-6", async ({
    page,
  }) => {
    const { saveSeen } = await stubSignedInProfile(page);

    await page.goto("/profile");

    await expect(
      page.getByRole("heading", { name: "Profile ready" }),
    ).toBeVisible();
    await expect(page.getByLabel("Full Name")).toHaveValue("Faizan Ali");
    await expect(page.getByLabel("Email")).toBeDisabled();

    await page.getByRole("button", { name: "Save Profile" }).click();

    await expect(page.getByRole("status")).toHaveText("Profile is saved.");
    await expect(saveSeen).resolves.toBe(true);
  });

  test("redirects unauthenticated profile visitors to login, covers: AC-6", async ({
    page,
  }) => {
    await page.route("**/api/auth/**", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "unauthorized" }),
      });
    });

    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login/);
  });
});
