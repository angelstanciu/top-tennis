Sport Base Booking
===================

A full-stack booking app for a multi-sport base.

Backend
-------
- Java 21, Spring Boot 3.x, Maven
- Spring Data JPA, Flyway, Spring Security, Validation
- H2 for dev, PostgreSQL for prod
- CORS allows `http://localhost:5173`

Run (Dev):
- Prereqs: Java 21, Maven
- If your JDK is exposed as `JAVA_21_HOME` (Windows), the wrapper will use it automatically.
- `mvnw.cmd spring-boot:run` (Windows) or `./mvnw spring-boot:run` (macOS/Linux)
- App runs at `http://localhost:8080`

Profiles and DB:
- Dev (default): H2 in-memory with Flyway migrations
- Prod: set env vars `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` or edit `application.yml` prod section

Admin login (temporary):
- Username: `admin`
- Password: `admin123`
- Admin endpoints under `/api/admin/**`

Key endpoints (/api):
- `GET /courts` — list courts
- `GET /courts/{id}` — court details
- `GET /availability?date=YYYY-MM-DD&sportType=TENNIS` — daily availability per court
- `POST /bookings` — create booking (public)
  - Body: `{ courtId, date, startTime, endTime, customerName, customerPhone, customerEmail? }`
- `GET /bookings/{id}` — booking details
- Admin:
  - `PATCH /admin/bookings/{id}/confirm`
  - `PATCH /admin/bookings/{id}/cancel`
  - `POST /admin/block-slot` with `{ courtId, date, startTime, endTime, note }`

Frontend
--------
- React + TypeScript + Vite, Tailwind CSS
- Timeline grid inspired by provided snippet with sticky court column and horizontal time axis

Run:
- Prereqs: Node 18+
- `cd frontend`
- `npm install`
- `npm run dev`
- Opens `http://localhost:5173`

Config:
- Create `frontend/.env` (optional):
  - `VITE_API_BASE_URL=http://localhost:8080/api`

Usage
-----
1) Open frontend, choose sport and date.
2) Click a free slot to open booking form.
3) Submit basic contact info. Rezervarea se confirmă automat; clubul poate ulterior anula din panoul de administrare.

Notes
-----
- Time granularity is 30 minutes; minimum booking 1 hour.
- Price is calculated from court hourly price and duration.
- Seed courts are created via Flyway migration `V2__seed_courts.sql`.


H2 Console (Dev)
----------------
- URL: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./.localdb/tennisdb;AUTO_SERVER=TRUE;MODE=PostgreSQL`
- Username: `sa`
- Password: (leave blank)
- Notes:
  - H2 console is enabled only in dev.
  - Security allows same-origin frames and permits `/h2-console/**`.

API Examples
------------
- List courts
  - `curl http://localhost:8080/api/courts`
- Court details
  - `curl http://localhost:8080/api/courts/1`
- Availability (Tennis on a given date)
  - `curl "http://localhost:8080/api/availability?date=2025-11-19&sportType=TENNIS"`
- Create a booking (public)
  - `curl -X POST http://localhost:8080/api/bookings -H "Content-Type: application/json" -d "{\"courtId\":1,\"date\":\"2025-11-19\",\"startTime\":\"09:00\",\"endTime\":\"10:00\",\"customerName\":\"Jane Doe\",\"customerPhone\":\"+40123123123\",\"customerEmail\":\"jane@example.com\"}"`
- Get booking by id
  - `curl http://localhost:8080/api/bookings/1`
- Admin cancel booking (basic auth)
  - `curl -u admin:admin123 -X PATCH http://localhost:8080/api/admin/bookings/1/cancel`
- Admin block a slot (creates BLOCKED booking)
  - `curl -u admin:admin123 -X POST http://localhost:8080/api/admin/block-slot -H "Content-Type: application/json" -d "{\"courtId\":1,\"date\":\"2025-11-19\",\"startTime\":\"12:00\",\"endTime\":\"13:00\",\"note\":\"maintenance\"}"`

H2 Console: Useful Queries
--------------------------
- All courts: `SELECT id, name, sport_type, open_time, close_time, active FROM court ORDER BY id;`
- Today’s bookings: `SELECT * FROM booking WHERE booking_date = CURRENT_DATE ORDER BY court_id, start_time;`
- Bookings for a date: `SELECT * FROM booking WHERE booking_date = DATE '2025-11-19' ORDER BY court_id, start_time;`
- Bookings by status: `SELECT * FROM booking WHERE status = 'PENDING' ORDER BY created_at DESC;`

Reset Dev DB
------------
- Removes the local H2 file database (./.localdb) so Flyway re-applies all migrations on next start.
- Run from repo root (PowerShell):
  - `./scripts/reset-dev-db.ps1`
  - To reset and immediately start the backend: `./scripts/reset-dev-db.ps1 -Run`
- Notes:
  - Ensure the backend is stopped before running the reset.
  - The script sets JAVA_HOME from JAVA_21_HOME for this session when using `-Run`.
