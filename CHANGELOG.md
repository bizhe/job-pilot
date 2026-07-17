# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

* Added PostHog browser and server analytics setup, including root initialization, typed product events, user identification after auth session confirmation, and exception capture during auth errors.
* Added the InsForge database schema migration for profiles, agent runs, jobs, and agent logs, with row level security, owner policies, indexes, constraints, and timestamp triggers.
* Added durable context for analytics and database conventions so later agent work can find the PostHog and migration rules.
* Added saved profile loading, missing profile row creation, profile completion calculation, profile saving, and PDF resume upload for signed in users.
* Added unit and browser coverage for the profile save flow, including saved profile loading, profile creation, PDF validation, save behavior, safe error states, and auth redirects.

### Changed

* Updated the progress tracker and UI registry to record that PostHog initialization and the database schema foundation are complete.
* Replaced the protected profile placeholder with the full profile form backed by the current InsForge browser session.
* Updated Playwright browser tests to use `localhost` and explicit auth stubs for stable auth and profile checks.
