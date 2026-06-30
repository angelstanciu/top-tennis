# Onboarding pentru dezvoltatori

Acesta este ghidul practic de lucru pe proiectul Star Arena. Daca esti nou pe proiect, citeste-l o data de la cap la coada, apoi tine-l ca referinta.

## Ce este proiectul

Platforma de rezervari pentru baza sportiva Star Arena (tenis, padel, baschet, tenis de picior si altele). Backend in Java cu Spring Boot, frontend in React cu Vite. Totul intr-un singur repo.

## Repository

Repo activ, cel real, pe care se face deploy:

```
https://github.com/dragoscocs/star-arena-booking
```

Branch principal: `main`.

Mai exista un repo vechi, `github.com/angelstanciu/top-tennis`, tinut doar ca backup. Nu se foloseste pentru deploy si nu se lucreaza acolo.

## Cum se face deploy (automat)

Nu trebuie sa intri pe server pentru un deploy obisnuit. Tot ce faci este sa dai push pe branch-ul `main`. Un workflow GitHub Actions ruleaza pe un runner self-hosted chiar pe server si face automat, in ordine:

1. ia ultimul cod (`git pull` in `/home/star-arena/APLICATIE`)
2. build backend: `./mvnw clean package -DskipTests`
3. reporneste backend-ul: `pm2 restart star-arena-backend`
4. build frontend: `npm ci` si `npm run build` in `frontend-dragos`
5. copiaza frontend-ul in nginx (`/var/www/html`) si da `nginx -s reload`

Dureaza in jur de trei minute. Dupa aceea modificarea este live pe https://star-arena.ro.

Pasii exacti sunt in `.github/workflows/deploy.yml`.

## Rulare locala

Ai nevoie de Java 21, Maven (vine cu wrapper-ul `./mvnw`) si Node 18 sau mai nou.

Backend:

```
./mvnw spring-boot:run
```

Porneste pe http://localhost:8080. API-ul este sub `/api`.

Frontend:

```
cd frontend-dragos
npm install
npm run dev
```

Porneste pe http://localhost:5174 si trimite automat cererile `/api` catre backend-ul de pe 8080.

## Structura proiectului

- Backend: `src/main/java/com/toptennis`
  - REST controllers in `controller`
  - logica de business in `service`
  - modele JPA in `model`
  - configurari in `config`
  - partea de SMS in `sms`
- Migrari baza de date: `src/main/resources/db/migration` (`V1`, `V2`, `V3` ...)
- Configurare aplicatie: `src/main/resources/application.yml`
- Frontend: `frontend-dragos/src`
  - pagini in `pages`
  - componente in `components`
  - rutele sunt definite in `main.tsx`

## Baza de date

In productie se foloseste H2 file-based, salvata pe server in `./.localdb/tennisdb`. Nu este PostgreSQL, desi unele texte vechi spuneau asta. Acelasi motor se foloseste si local.

Consola web pentru baza de date este la `/h2-console` (cere autentificare de admin). La conectare lasi JDBC URL-ul pre-completat, user `sa`, parola goala.

Reguli cand atingi baza de date:

- Nu strica rezervarile existente. Asta este regula numarul unu.
- Pe tabela `booking` folosesti doar `UPDATE` cu un `WHERE` precis. Niciodata `DELETE`.
- Inainte de orice modificare manuala fa backup din consola H2:

  ```
  BACKUP TO './backup-AAAA-LL-ZZ.zip';
  ```

  apoi copiaza fisierul undeva in siguranta.

## Migrari Flyway

Migrarile sunt fisiere SQL numerotate in `src/main/resources/db/migration`. Reguli:

- O migrare deja aplicata nu se modifica niciodata. Daca ai nevoie de o schimbare, adaugi un fisier nou cu numarul urmator (de exemplu `V47__...`).
- Pe H2 foloseste `IN (subquery)`, nu `= (scalar subquery)`.
- Scrie `WHERE`-uri precise, mai ales pe tabela `booking`, ca sa nu atingi rezervari confirmate.
- Testeaza local inainte de push.

## Reguli de commit

- Comite doar fisiere sursa. Nu comite folderul `frontend-dragos/dist` (se genereaza la build) si nici `tsconfig.tsbuildinfo`.
- Pune in stage doar fisierele pe care chiar le-ai schimbat, nu `git add` pe tot.
- Mesaje de commit clare, la obiect.

## Serverul

Serverul este un laptop Linux, acces prin TeamViewer. Backend-ul ruleaza prin pm2 cu numele `star-arena-backend`.

Comenzi utile pe server:

```
pm2 status
pm2 logs star-arena-backend --lines 100
pm2 restart star-arena-backend
```

Pornirea automata dupa un reboot este configurata prin systemd (`pm2 startup` plus `pm2 save`). Dupa reboot, aplicatia revine singura.

## SMS

Notificarile prin SMS merg printr-un modem Huawei (stick USB) conectat la server.

Atentie la port. Trebuie folosita calea stabila:

```
/dev/serial/by-id/usb-HUAWEI_Technology_HUAWEI_Mobile-if00-port0
```

Nu folosi niciodata `/dev/ttyUSB0` sau alt numar `ttyUSB` direct. Numerele acelea se schimba la fiecare reboot sau reconectare a stick-ului, iar atunci SMS-urile pica cu eroarea `SMS port not found`.

Calea corecta este setata in pm2 (variabila `SMS_PORT`) si este si valoarea implicita din `application.yml`.

Daca SMS-urile nu mai pleaca, te uiti in loguri:

```
pm2 logs star-arena-backend --lines 150 --nostream | grep -iE "SMS|CMS ERROR|port not found|Timed out"
```

Codul din transcript spune cauza. Un cod `+CMS ERROR` arata o problema de SIM sau retea, `port not found` arata ca portul nu mai exista, `Timed out` arata ca modemul nu raspunde. Verifica si `ls -l /dev/serial/by-id/` ca sa vezi pe ce `ttyUSB` este modemul in acest moment.

## Acces admin

Userul si parola de admin vin din `application.yml` (`admin.username` si `admin.password`) si pot fi suprascrise cu variabilele de mediu `ADMIN_USERNAME` si `ADMIN_PASSWORD`. Cere credentialele curente de la echipa, nu le tine in cod sau in chat.

## Fluxul de lucru pe scurt

1. Iei ultimul cod: `git pull`
2. Faci modificarea si o testezi local (backend si frontend pornite)
3. Pui in stage doar fisierele sursa
4. Commit cu mesaj clar
5. Push pe `main`
6. Astepti vreo trei minute si verifici pe star-arena.ro
