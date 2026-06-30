<div align="center">
  <img src="frontend-dragos/public/favicon.png" alt="Star Arena Logo" width="100"/>
  <h1>🎾 Star Arena Booking Platform</h1>
  <p><strong>A Full-Stack B2B & B2C Sports Facility Management System</strong></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Styling-TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Backend-Java%20Spring%20Boot-6DB33F?style=for-the-badge&logo=spring&logoColor=white" alt="Spring" />
    <img src="https://img.shields.io/badge/Database-H2%20File--Based-07405E?style=for-the-badge" alt="H2" />
  </p>
</div>

---

## 📖 Overview

**Star Arena Booking Platform** is a complete, end-to-end web application developed to digitalize the booking process for a multi-sport facility (Tennis, Padel, Basketball, Foot-Tennis, etc.). 

Designed to replace manual pen-and-paper tracking, this system provides a **sleek, interactive, glassmorphism-inspired UI** for customers, coupled with a **powerful Admin Control Panel** capable of handling automated slot generation, clash prevention, and revenue tracking.

---

## ✨ Key Features

### B2C (Customer Facing)
- 🖥️ **Interactive Booking Grid:** Visual timeline matching real-world court availability.
- 📱 **Mobile-First Glassmorphism UI:** Premium aesthetic tailored for iOS and Android web.
- 🔐 **Secure Player Authentication:** Login via Google OAuth2, SMS OTP, or Email/Password.
- 📧 **Automated Notifications:** SMS and Email confirmations upon successful bookings.

### B2B (Admin Dashboard)
- 🛡️ **Role-Based Access Control (RBAC):** Distinct privileges separating Players from Admins.
- 📅 **Advanced Scheduling Engine:** Blocks overlapping reservations automatically. Granularity down to 30-minute intervals.
- 📊 **Financial & Usage Analytics:** Daily revenue reports and real-time court utilization metrics.
- 🎨 **Dynamic Poster Generator:** Automatically generates exportable, sport-specific images containing the day's "Free Positions" to be shared on WhatsApp/Social Media.
- 🔄 **Recurring Subscriptions:** Batch-applies long-term bookings for recurring clients.

---

## 🛠️ Tech Stack & Architecture

### **Frontend architecture**
Located in the `/frontend-dragos` workspace.
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI Primitives
- **State Management:** React Hooks & Context API
- **Design System:** Custom Dark/Glass Theme (inspired by Shadcn UI)

### **Backend architecture**
Built on a robust Java ecosystem.
- **Framework:** Java 21 LTS + Spring Boot 3.x
- **Data Layer:** Spring Data JPA + Hibernate
- **Database:** H2 file-based, stored at `./.localdb/tennisdb` (the same engine in both development and production)
- **Migrations:** Flyway (`V2__seed_courts.sql`)
- **Security:** JWT (JSON Web Tokens) & Spring Security
- **Integrations:** Zoho Mail SMTP, Custom SMS Gateway

---

## 🚀 Local Development Setup

Follow these steps to spin up the project locally.

### 1. Start the Java Backend
Prerequisites: **Java 21** & **Maven**.
By default, the backend runs a local `H2` file database at `./.localdb/tennisdb`, with Flyway migrations applied automatically on startup.

```bash
# macOS / Linux
./mvnw spring-boot:run

# Windows
mvnw.cmd spring-boot:run
```
> The API will be available at: `http://localhost:8080/api`

### 2. Start the React Frontend
Prerequisites: **Node.js 18+**.

```bash
cd frontend-dragos
npm install
npm run dev
```
> The Frontend UI will be available at: `http://localhost:5174`

### 3. Admin Access
The admin login is configured in `application.yml` through `admin.username` and `admin.password`, and can be overridden with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables. Ask the team for the current credentials rather than committing them to the repo.

---

## 🌐 Production Deployment

The application is built to be deployed on an on-premise Linux environment or cloud VPS:
1. **Application Server:** `PM2` daemonizes the compiled `.jar` file.
2. **Web Server:** `Nginx` acts as a load balancer and reverse proxy, serving the static `dist/` React bundle and forwarding `/api/` traffic to the underlying Java instance.
3. **Security:** Cloudflare Zero Trust (Tunnel) is utilized to securely expose the local port 80 to the public domain, mitigating DDoS attacks and providing automatic SSL bridging without complex port forwarding.
4. **Continuous Deployment:** A GitHub Actions workflow on a self-hosted runner rebuilds and restarts the app automatically on every push to `main`. For the full operational runbook (logs, SMS modem, database backups), see [`ONBOARDING.md`](ONBOARDING.md).

---

<div align="center">
  <i>Developed with ❤️ by <a href="https://github.com/dragoscocs">Dragoș C.</a></i>
</div>
