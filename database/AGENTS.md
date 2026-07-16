# Database

This area owns InsForge schema migrations and storage infrastructure.

- Migrations live in `database/migrations/` and use a numbered file name such as `0002-database-schema.sql`.
- Apply schema changes through the InsForge MCP raw SQL tool, then verify with InsForge metadata, table schema, bucket listing, and focused catalog queries.
- Keep migrations repeat safe with guarded creation, named constraints, `drop policy if exists`, and `create index if not exists`.
- Application tables must enable row level security and use owner policies based on `auth.uid()`.
- User owned tables use `profiles(id)` as the ownership root. Related records store `user_id` and filter policies through that value.
- Resume storage uses the private `resumes` bucket. Application code stores both `resume_pdf_url` and `resume_pdf_key` on `profiles`.
- Job records use `source = 'search'` until a later spec deliberately adds another source.
- The governing spec for the current schema is `docs/specs/0002-database-schema.md`.

_Drafted by /sync from the introducing change, worth a quick human pass._
