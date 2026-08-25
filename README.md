# Spengler-Digital

Regierapport, Massaufnahme (Foto & Skizze) und mehr für Spenglerbetriebe.
Läuft als eine einzige Web-App (`index.html`) im Browser, speichert alle Daten
zentral bei [Supabase](https://supabase.com) (Login, Datenbank, Dateiablage),
sodass alle Mitarbeiter auf allen Geräten dieselben Daten sehen. Die App lässt
sich zusätzlich als "richtige" App auf Handy/Tablet/PC installieren (siehe
unten).

---

## 1. Supabase einrichten (einmalig)

1. Kostenloses Konto auf [supabase.com](https://supabase.com) erstellen, neues
   Projekt anlegen (Name frei wählbar, z. B. `spengler-digital`).
2. Im Projekt unter **SQL Editor** die Dateien aus dem Ordner [`sql/`](./sql)
   **der Reihe nach** (01 → 05) einfügen und jeweils auf **Run** klicken:
   - `01-setup.sql` – legt alle Tabellen, Zugriffsregeln und Grundwerte an
   - `02-materials-import.sql` – befüllt den Materialkatalog
   - `03-permissions-and-massaufnahme.sql` – Zugriffsbeschränkung Material/
     Stundenansätze + Massaufnahme-Tabelle und Datei-Ablage
   - `04-multi-sketch.sql` – ermöglicht mehrere Skizzen pro Massaufnahme
   - `05-app-settings.sql` – zentral änderbarer Firmenname
3. Unter **Authentication → Settings** die Option **"Confirm email"**
   deaktivieren (die App nutzt Vorname.Nachname statt echter E-Mail-Adressen –
   ohne diesen Schritt können sich neue Mitarbeiter nicht sofort anmelden).
4. Unter **Settings → API** die **Project URL** und den **anon public Key**
   kopieren (nicht den `service_role`-Key – der darf niemals in der App
   landen).

## 2. App mit den eigenen Zugangsdaten verbinden

In `index.html` ganz am Anfang des `<script>`-Bereichs:

```js
const SUPABASE_URL = "https://DEIN-PROJEKT.supabase.co";
const SUPABASE_ANON_KEY = "DEIN-ANON-KEY";
```

Ausserdem den Firmen-Code für die Mitarbeiter-Selbstregistrierung auf einen
eigenen Wert setzen (Suche nach `COMPANY_CODE` in `index.html`) und **nur
intern** (mündlich/Firmen-Chat) an die Mitarbeiter weitergeben.

## 3. Auf GitHub Pages veröffentlichen

1. Dieses Verzeichnis in ein **privates** GitHub-Repository hochladen (siehe
   Hinweis zu "privat" unten).
2. Im Repo unter **Settings → Pages**: "Deploy from a branch" auswählen,
   Branch `main`, Ordner `/ (root)` → Speichern.
3. Nach ein bis zwei Minuten ist die App unter der von GitHub angezeigten
   Adresse erreichbar (z. B. `https://DEIN-NUTZERNAME.github.io/DEIN-REPO/`).

> **Warum privates Repo?** Der Supabase-`anon`-Key steht im Klartext in
> `index.html`. Das ist so vorgesehen (dieser Key ist für den Einsatz im
> Browser gedacht und durch die Zugriffsregeln in den SQL-Dateien
> abgesichert) – trotzdem ist ein privates Repo die bessere Wahl, damit nicht
> jeder Aussenstehende auf Anhieb sieht, welches Supabase-Projekt dahinter
> steckt. GitHub Pages funktioniert auch mit privaten Repos (ggf. je nach
> GitHub-Plan als "GitHub Pages" mit eingeschränktem Zugriff, oder das Repo
> privat halten und nur die veröffentlichte Pages-URL selbst nicht
> öffentlich bewerben).

## 4. Als App installieren

Sobald die Seite über eine **https://**-Adresse läuft (lokales Öffnen per
Doppelklick reicht nicht):

- **Android/Chrome:** Seite öffnen → Menü (⋮) → "App installieren" bzw.
  "Zum Startbildschirm hinzufügen"
- **iPhone/iPad (Safari):** Seite öffnen → Teilen-Symbol → "Zum
  Home-Bildschirm"
- **Desktop (Chrome/Edge):** In der Adressleiste erscheint ein
  Installieren-Symbol, oder über das Browsermenü "App installieren"

Die App verhält sich danach wie eine normale App (eigenes Fenster, Icon auf
dem Homescreen) – die Daten kommen weiterhin live von Supabase, es wird also
immer eine Internetverbindung benötigt.

---

## Was diese Lösung NICHT abdeckt (bitte lesen)

- **Kein automatisches "Passwort vergessen".** Da keine echten
  E-Mail-Adressen verwendet werden, kann Supabase keine Passwort-Reset-Mail
  verschicken. Ein neues Passwort muss ein Administrator im
  Supabase-Dashboard unter Authentication → Users manuell vergeben.
- **Der Firmen-Code ist kein starker Schutz** – er steht im Quelltext.
  Er verhindert zufällige/automatisierte Registrierungen, nicht eine gezielte
  Attacke. Zusätzlich empfehlenswert: die URL nicht öffentlich bewerben.
- **Mitarbeiter-Konten lassen sich aus der App heraus nicht vollständig
  löschen** – nur das Profil. Das Login-Konto selbst muss ein Administrator
  im Supabase-Dashboard entfernen. Das ist Absicht (Schutz vor versehentlichem
  Selbst-Aussperren).
- **"Kein Sicherheitsrisiko" gibt es nicht** – auch mit dieser Lösung nicht.
  Was sie bietet: verschlüsselte Übertragung (HTTPS), sicher gehashte
  Passwörter, Zugriff nur für angemeldete Mitarbeiter, Material/
  Stundenansätze nur für Mike Ledermann änderbar. Das deckt die üblichen
  Risiken für ein internes Firmenwerkzeug ab, ist aber keine Garantie gegen
  jede denkbare Attacke.

## Projektstruktur

```
index.html      Die komplette App (HTML + CSS + JavaScript)
manifest.json   PWA-Manifest (macht die App installierbar)
sw.js           Service Worker (App-Hülle wird gecacht, Daten kommen live)
icons/          App-Icons (192px, 512px) – Platzhalter, gerne ersetzen
sql/            Datenbank-Migrationen, der Reihe nach auszuführen
```
