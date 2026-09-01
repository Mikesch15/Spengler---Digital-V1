# Spengler-DIGITAL – Claude Code Project Instructions

## 1. Project identity

**Spengler-DIGITAL** is a German-language web application for Swiss plumbing/sheet-metal businesses (Spenglerbetriebe).

The product is intended to become a professional **multi-company SaaS web app / PWA**. It is NOT primarily an Android/iOS native app. The browser/PWA is the main product.

Repository: `Mikesch15/Spengler---Digital-V1`
Current development branch at the time this file was created: `refactor/safe-split-v1-49`
Current app version visible in the UI: `1.49`

## 2. Current technical state

The current application is a browser-based HTML/CSS/JavaScript app using Supabase.

Current root application structure includes:
- `index.html` – application shell/UI
- `css/style.css` – styles
- `js/core.js`
- `js/auth.js`
- `js/data.js`
- `js/work-report.js`
- `js/settings.js`
- `js/sheet.js`
- `js/projects.js`
- `js/reports.js`
- `js/image-tools.js`
- `js/measurements.js`
- `js/measurements-overview.js`
- `js/ausmass.js`
- `manifest.json` / `manifest.webmanifest` – PWA configuration
- `sw.js` – service worker
- `icon-192.png`, `icon-512.png` – PWA icons
- `sql/` – Supabase database migrations

The codebase has recently been split from the previous monolithic implementation into modules. Preserve this modular direction. Do not casually merge everything back into `index.html`.

The current app already contains, among other things:
- Login using username/password
- Regierapport
- Projects
- Global search
- Feedback
- Massaufnahme overview and editor
- Massaufnahme: Skizze/Foto
- Multiple sketches per measurement
- Photo capture and drawing tools
- Einlaufblech gerade
- Rinne Halbrund
- Einlaufblech konisch
- Freies Profil
- Ausmass
- Offerte erfassen
- Blitzschutzausmass
- Material catalogues
- Employee/rate settings
- Company settings
- Permissions
- Blechverbrauch / sheet-cut calculation
- PDF/print workflows
- CSV export in relevant areas

Do not remove existing functionality just to simplify implementation.

## 3. Product direction – this is the most important instruction

The long-term product is a **commercial web app/PWA for multiple independent companies**.

The architecture must therefore evolve from the current internal single-company prototype into a secure multi-tenant system.

Target model:

    Spengler-DIGITAL
        |
        +-- Company A
        |     +-- Admin
        |     +-- Employees
        |     +-- Projects
        |     +-- Measurements
        |     +-- Reports
        |     +-- Materials
        |
        +-- Company B
        |     +-- Admin
        |     +-- Employees
        |     +-- Projects
        |
        +-- Company C ...

A user must only be able to access data belonging to their company/tenant.

This separation must be enforced at the database/security level, not merely hidden in the UI.

## 4. Important architectural goals

### Multi-tenancy

Design data so that company ownership is explicit and consistent, normally via a stable `company_id` / tenant ID.

Relevant records should have an unambiguous company relationship, including:
- projects
- reports
- measurements
- employees/profiles
- company settings
- company-specific materials/rates where applicable
- uploaded files/photos
- feedback
- future documents/orders/etc.

Never rely on a client-side company code as the real security boundary.

### Users and roles

The planned product supports multiple employees per company and individual logins.

Future/target concepts:
- company administrator
- normal employee
- possibly additional roles later

Users should have stable IDs. Important records should retain who created/changed them where technically appropriate.

### Audit/history

The product should be prepared for:
- created by
- created at
- updated by
- updated at
- future change history / audit log

Do not destroy this information when refactoring data structures.

### Cloud data

Supabase is the planned central backend/database/storage solution.

Use Supabase for:
- authentication
- PostgreSQL data
- file storage
- secure access policies

Never put a Supabase `service_role` key in browser code.

The public/anon key may be present in a browser app only when the database/storage policies are correctly secured.

## 5. PWA / web-app direction

The main product is a web app.

It must work well on:
- Android tablets
- iPad
- smartphones
- desktop PCs/laptops

PWA support should be preserved and improved:
- HTTPS
- manifest
- icons
- service worker
- installability
- sensible caching
- app-like mobile UI

The app should eventually be accessible via a custom domain such as:
- `spengler-digital.ch` for the public website
- `app.spengler-digital.ch` for the application

Do not hard-code GitHub Pages URLs into application logic.

GitHub is the development/source-control platform; it is not the product identity.

## 6. UX principles

This is a professional tool for people working in the Spengler trade, often on a tablet and sometimes directly on site.

Priorities:
1. Fast data entry
2. Large, touch-friendly controls
3. Minimal unnecessary clicks
4. Clear German labels
5. Good tablet layout
6. Sensible smartphone behavior
7. Reliable calculations
8. Clear error messages
9. No destructive action without confirmation where appropriate

Do not introduce generic SaaS UI patterns that make the app slower for field work.

Keep existing terminology unless there is a strong reason to change it.

## 7. Existing domain functionality must be preserved

### Regierapport

The current report supports:
- project selection
- date/order/customer/object information
- work positions
- employees/functions/hours/rates
- material positions
- sheet consumption
- totals excluding/including VAT
- print/PDF
- saving

### Projects

Projects are central objects shared by employees of the same company.

Existing project concepts include:
- project name
- order number
- address/object
- customer
- archive state

### Massaufnahme

Current functions include:
- Skizze/Foto
- Einlaufblech gerade
- Rinne Halbrund
- Einlaufblech konisch
- Freies Profil

Multiple sketches per measurement are supported.

### Rinne Halbrund

Segments are individually entered.
Each segment is a separate straight gutter section.
Connections/fittings and dimensions are configurable.
Dilatation elements can be calculated automatically or entered manually.

### Einlaufblech

The calculations and existing settings are domain-specific and must not be casually rewritten.
If changing a calculation, first understand and preserve the existing intended behavior.

### Material import

A major future requirement is importing material lists from different companies/suppliers via Excel.
The import system should be generic rather than hard-coded to one supplier where possible.

Import functionality should eventually:
- validate the file
- show clear errors
- preview imported rows
- map required columns
- allow different suppliers/companies to use compatible material lists
- avoid silently corrupting existing material data

## 8. Development roadmap

Implement in roughly this order unless a concrete task requires otherwise:

### Phase 1 – Core application
- Stabilize existing functions
- Finish calculation correctness
- Improve project and measurement workflows
- Finish generic material import
- Improve tablet/mobile UX
- Preserve PWA behavior

### Phase 2 – Multi-company foundation
- Proper company/tenant model
- User/company relationships
- Secure tenant isolation
- Roles/permissions
- Company-specific settings
- Correct ownership of files/photos
- Created/updated metadata

### Phase 3 – PWA + product identity
- Custom domain support
- Public landing page
- Application domain
- Installable PWA
- Branding/logo/favicon

### Phase 4 – Security/data reliability
- RLS/security policies
- password/account management
- backups/recovery strategy
- data export
- deletion flows
- photo/file storage strategy
- file size/compression handling

### Phase 5 – Pilot companies
- Test with several real Spenglerbetriebe
- collect feedback
- fix workflow problems
- prioritize real-world value over feature count

### Phase 6 – Commercial product
- legal pages and terms
- privacy documentation
- support/contact
- pricing
- billing/subscriptions
- onboarding

### Phase 7 – Growth

Potential future areas:
- material ordering
- supplier catalogs
- quotations
- reports/documents
- deeper project workflow
- integrations
- advanced audit/history

Do not implement commercial billing prematurely unless explicitly requested.

## 9. Legal/business direction

The owner intends to start lean and does not need a GmbH immediately.
The application should be technically prepared for commercial B2B use, but legal/company formation work is a later product phase.

Do not hard-code legal assumptions into the application.
Keep privacy, terms, billing, and company information configurable where practical.

## 10. Security rules

Never:
- expose service-role secrets
- hard-code private credentials
- trust client-side company IDs without server/database enforcement
- allow one tenant to query another tenant's data
- assume hiding a button is a permission system
- store sensitive data unnecessarily in localStorage

Always:
- validate inputs
- use database policies/RLS where appropriate
- scope queries by authenticated company/user context
- validate file uploads
- avoid XSS through unescaped user content
- handle authentication errors cleanly

When changing Supabase schema/policies, update the appropriate SQL migration/documentation rather than relying only on manual dashboard changes.

## 11. Photos and files

Photos are important to the field workflow.

The system should support:
- camera capture
- multiple images where appropriate
- sketches
- image compression/quality settings
- storage linked to the correct company and project/measurement
- deletion
- future export

Storage costs must be considered.
Do not automatically keep huge camera originals unless there is a clear product reason.

## 12. Coding rules for Claude Code

Before making a significant change:
1. Inspect the existing code and data flow.
2. Identify which module owns the behavior.
3. Check existing Supabase tables/policies/migrations if relevant.
4. Preserve existing working functionality.
5. Make the smallest coherent change.
6. Test the affected workflow.

Prefer modular code over adding large blocks to `index.html`.

Do not create duplicate implementations of existing functionality.
Do not rename IDs, database columns, functions, or storage paths casually; existing UI and modules may depend on them.

When refactoring:
- preserve behavior first
- improve structure second
- do not change calculation formulas without verifying expected results

When adding a new database field:
- choose a clear stable name
- consider tenant ownership
- consider null/default behavior
- update SQL migration(s)
- update application reads/writes

When adding a feature that will eventually be multi-company:
- design it tenant-aware immediately
- do not build a single-company shortcut that must later be rewritten

## 13. Testing expectations

After changes, check at least:
- login/authentication
- project creation/selection
- saving/loading
- affected calculation
- affected mobile/tablet UI
- permissions if applicable
- no console errors

For calculation changes, use concrete example values and compare before/after results.

For security-sensitive changes, verify both:
- authorized user can access intended data
- unauthorized company/user cannot access it

## 14. Git workflow

The repository currently contains active refactoring work on:
`refactor/safe-split-v1-49`

Do not assume `main` contains the newest development state.
Always inspect the current branch/ref and recent commits before significant work.

Keep commits focused and descriptive.
Avoid destructive history rewrites.

## 15. Current priority

The immediate goal is NOT to build a native mobile app and NOT to rush into subscriptions.

The immediate goal is:

**Turn the existing Spengler-DIGITAL prototype into a stable, modular, tablet-friendly web app that can safely evolve into a multi-company SaaS/PWA.**

The most important architectural principle is:

> Build today's features so they do not block tomorrow's multi-company, cloud-based, commercial product.

## 16. Communication / implementation style

The project owner prefers direct execution over long explanations.
When asked to implement something, inspect the repo, make the change, test it, and report exactly what was changed.
Avoid unnecessary back-and-forth when the requirement is already clear.

If a requested change conflicts with existing architecture, explain the conflict briefly and choose the safest implementation that preserves the long-term product direction.
