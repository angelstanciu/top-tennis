Top Tennis — Agent Context

Purpose
- Capture a fast, structured context for future agent sessions.
- Summarize architecture, key files, run workflows, and change points.

Stack Overview
- Backend: Java 21, Spring Boot 3.5.x, Maven, Spring Data JPA, Flyway, Spring Security, Validation
- DB: H2 (dev, file-based at `./.localdb`), PostgreSQL (prod)
- Frontend: React 18 + TypeScript + Vite, Tailwind CSS

Repo Structure
- Backend (Spring Boot)
  - `src/main/java/com/toptennis/TopTennisApplication.java` — app entrypoint
  - Controllers
    - `src/main/java/com/toptennis/controller/CourtController.java` — `/api/courts`
    - `src/main/java/com/toptennis/controller/AvailabilityController.java` — `/api/availability`
    - `src/main/java/com/toptennis/controller/BookingController.java` — `/api/bookings`
    - `src/main/java/com/toptennis/controller/AdminController.java` — `/api/admin/**`
  - Services
    - `src/main/java/com/toptennis/service/CourtService.java`
    - `src/main/java/com/toptennis/service/AvailabilityService.java`
    - `src/main/java/com/toptennis/service/BookingService.java`
  - Persistence
    - `src/main/java/com/toptennis/model/*.java` — JPA entities and enums
    - `src/main/java/com/toptennis/repository/*.java` — Spring Data repositories
    - `src/main/resources/db/migration/` — Flyway migrations (`V1__init.sql`, `V2__seed_courts.sql`)
  - Config
    - `src/main/java/com/toptennis/config/SecurityConfig.java` — Basic auth for `/api/admin/**`, H2 console allowed, CSRF off
    - `src/main/java/com/toptennis/config/WebConfig.java` — CORS for `http://localhost:5173`
    - `src/main/resources/application.yml` — dev/prod profiles and DB config
- Frontend (Vite React)
  - `frontend/src/main.tsx` — routes
  - `frontend/src/App.tsx` — availability view + selection flow
  - `frontend/src/components/TimelineGrid.tsx` — time grid, selection rules, mobile/desktop
  - `frontend/src/pages/BookingPage.tsx` — booking form
  - `frontend/src/pages/AdminPage.tsx` — basic admin UI (confirm/cancel)
  - `frontend/src/api.ts` — API wrappers (`VITE_API_BASE_URL`)
  - `frontend/src/types.ts` — shared DTO types
  - `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`
- Scripts
  - `scripts/reset-dev-db.ps1` — wipes `./.localdb` and optionally starts backend
- Project docs
  - `README.md` — run instructions, endpoints, H2 console

Run/Develop
- Backend (Dev)
  - Windows: `mvnw.cmd spring-boot:run`
  - macOS/Linux: `./mvnw spring-boot:run`
  - URL: `http://localhost:8080`
  - H2 console: `http://localhost:8080/h2-console` (JDBC: `jdbc:h2:file:./.localdb/tennisdb;AUTO_SERVER=TRUE;MODE=PostgreSQL`)
- Frontend
  - `cd frontend && npm install && npm run dev`
  - URL: `http://localhost:5173`
  - Optional `frontend/.env`: `VITE_API_BASE_URL=http://localhost:8080/api`
- Reset dev DB
  - `./scripts/reset-dev-db.ps1` (PowerShell). Use `-Run` to start backend after reset.

API Map (selected)
- Public
  - `GET /api/courts`
  - `GET /api/courts/{id}`
  - `GET /api/availability?date=YYYY-MM-DD&sportType=TENNIS|...`
  - `POST /api/bookings` — body: `{ courtId, date, startTime, endTime, customerName, customerPhone, customerEmail? }`
  - `GET /api/bookings/{id}`
- Admin (Basic auth: admin/admin123 in dev)
  - `GET /api/admin/bookings?date=YYYY-MM-DD&sportType?=...`
  - `PATCH /api/admin/bookings/{id}/confirm`
  - `PATCH /api/admin/bookings/{id}/cancel`
  - `POST /api/admin/block-slot` — block a slot (creates BLOCKED booking)

Domain/Rules Overview
- Time slots are 30-minute aligned; minimum booking duration is 60 minutes.
- Backend prevents leaving a 30-minute gap adjacent to another booking on the same court.
  - See `BookingService.ensureNoThirtyMinuteGap(...)`.
- Availability is computed per court for a date from booked ranges; frontend renders a 00:00–24:00 grid.
- Frontend mirrors rules:
  - Selection growth is contiguous and validated for min 60 minutes.
  - Warns when a 30-minute gap would be left (see `leavesThirtyMinuteGap` in `TimelineGrid.tsx`).

Security/CORS
- Dev H2 console enabled and frame options set to same-origin.
- Basic auth in-memory user: `admin/admin123` (dev only).
- CORS allows `http://localhost:5173` for `/api/**`.

Key Change Points (where to edit)
- Booking rules: `src/main/java/com/toptennis/service/BookingService.java`
- Availability assembly: `src/main/java/com/toptennis/service/AvailabilityService.java`
- API surface: `src/main/java/com/toptennis/controller/*.java`
- DB schema: `src/main/resources/db/migration/*.sql`
- Frontend grid/selection: `frontend/src/components/TimelineGrid.tsx`
- Frontend API base URL: `frontend/src/api.ts` (`VITE_API_BASE_URL`)

Agent Quick Tasks
- Add new sport type
  - Enum: `src/main/java/com/toptennis/model/SportType.java`
  - Seed/update data via a new Flyway migration.
  - Frontend: extend `SportType` in `frontend/src/types.ts` and picker labels in `frontend/src/components/SportPicker.tsx`.
- Change opening hours logic
  - Backend availability currently uses hardcoded full-day range in `AvailabilityService` (`00:00`–`23:59`). Consider switching to per-court `openTime`/`closeTime`.
  - Frontend already displays per-court open/close for clickability.
- Price calculation
  - See `BookingService.calculatePrice(...)` (proportional to duration, BigDecimal math).
- Production DB
  - Use `spring.profiles.active=prod` and set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

Known Gaps / TODOs
- AvailabilityService uses full-day range and does not respect each court’s `openTime/closeTime` when computing free slots; frontend guards clicks using court hours, but backend free list may show wider ranges.
- Authentication is basic and in-memory; replace with persistent users/roles for production.
- No pagination or rate limiting on admin endpoints.
- Basic error messages; consider standardized error codes/contracts.

High-Value Files To Preload (for future sessions)
- Backend
  - `pom.xml`
  - `src/main/resources/application.yml`
  - `src/main/java/com/toptennis/config/SecurityConfig.java`
  - `src/main/java/com/toptennis/config/WebConfig.java`
  - `src/main/java/com/toptennis/controller/*.java`
  - `src/main/java/com/toptennis/service/BookingService.java`
  - `src/main/java/com/toptennis/service/AvailabilityService.java`
  - `src/main/java/com/toptennis/repository/BookingRepository.java`
  - `src/main/resources/db/migration/*.sql`
- Frontend
  - `frontend/package.json`
  - `frontend/src/App.tsx`
  - `frontend/src/components/TimelineGrid.tsx`
  - `frontend/src/pages/BookingPage.tsx`
  - `frontend/src/pages/AdminPage.tsx`
  - `frontend/src/api.ts`
  - `frontend/src/types.ts`

Quick Commands (reference)
- Backend: `./mvnw spring-boot:run` (Linux/macOS) or `mvnw.cmd spring-boot:run` (Windows)
- Frontend: `cd frontend && npm install && npm run dev`
- Reset dev DB: `./scripts/reset-dev-db.ps1`

Context Preload Toolkit
- Manifest: `context-manifest.json` — lists the files to load first (groups: `common`, `backend`, `frontend`).
- Preview script: `scripts/show-context.ps1`
  - Examples:
    - `./scripts/show-context.ps1 -Group backend -Lines 60`
    - `./scripts/show-context.ps1 -Group frontend`
    - `./scripts/show-context.ps1 -ListOnly`
  - Defaults: prints first 80 lines of each file across all groups.

Notes for Future Agents
- The app uses local H2 file storage; if schema changes cause validation errors, run the reset script.
- If frontend dev server shows stale deps errors, Vite config forces re-optimization to mitigate.

Migration Versioning (Flyway)
- Always add new DB changes as a new migration file with an incremented version (last version + 1).
- Location: `src/main/resources/db/migration/` with filename pattern `V<NN>__<short_description>.sql`.
- Never reuse or duplicate an existing version number (Flyway will fail on duplicates).
- Do not edit historical migrations already applied in any environment; create a forward-only new migration instead.
- For dev H2, if needed, run `./scripts/reset-dev-db.ps1` to wipe `.localdb` and re-apply migrations.
