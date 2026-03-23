# Top Tenis / Star Arena - Frontend V2 (React + Vite)

Acest modul (`frontend-v2`) reprezintă o versiune complet nouă și rescrisă a interfeței utilizatorului pentru platforma **Top Tenis / Star Arena**. Am ales să construim acest frontend "de la zero", în paralel cu soluția anterioară (`frontend`), pentru a putea implementa rapid un design complet modern, optimizat sever pentru experiența pe **dispozitive mobile**, păstrând însă legătura cu logica backend-ului de pe portul `8080`.

## 📌 De ce `frontend-v2`?
Avem nevoie de un design mult mai responsiv și estetic superior, conform cerințelor UI / UX actualurate. Am optat pentru React + Vite datorită ușurinței de testare, vitezei de dezvoltare și integrării excelente cu TailwindCSS.

### Funcționalități Majore Implementate:
1. **Design Mobile-First:** Un layout complet adaptat pentru ecrane înguste. Header-ul, grid-ul de timp și modurile de interacțiune sunt native ("tap", grid orizontal pentru PC și vertical pentru mobil).
2. **Logică Dinamică de Padel:** Implementat reguli complexe pentru terenurile sezoniere de Padel:
   - Terenul 1 (Cosmin Top Tenis) — Activ (Exterior)
   - Terenul 2 & 3 (Star Arena) — Activ (Interior)
   - Terenurile 4 & 5 (Cosmin Top Tenis) — Inactive (blocate sezonier până la 15 Aprilie).
3. **Timeline Grid Interactiv:**
   - Suprapunere automată de hașuri globale pentru orele deja trecute din ziua curentă, direct la nivel de grid.
   - Restilizarea butoanelor cu nuanțele de verde dorite de Angel (`bg-emerald-50`, `bg-emerald-300`).
   - Etichete optimizate: "Interior / Exterior" / "Int. / Ext."
4. **Selector Inteligent:** Sporturile care momentan nu au niciun teren activ apar cu *grayed-out* (dezactivate) direct din dropdown.
5. **Flux Finalizare:** Forma de preluare a contactului (`BookingPage`) adaptată complet vizual pentru experiențe "premium".

## 🚀 Cum rulez local?
Acest frontend comunică cu backend-ul Spring Boot care ar trebui creat sau rulat pe portul `8080` și care oferă endpoint-uri `/api/...`.

Pentru a rula framework-ul UI local:
```bash
cd frontend-v2
npm install
npm run dev
```

Acesta pornește implicit pe un port specificat de Vite (ex. `5174`), având proxy configurat în `vite.config.ts` pentru a redirecționa automat requesturile de API către `http://localhost:8080`.

## 📦 Ce urmează?
În acest moment API-urile apelate din Frontend returnează un mock sau sun setate pe URL-ul local. Pasul următor implică integrarea definitivă a acestor endpoint-uri API cu implementarea backend Spring Boot în curs de dezvoltare.
