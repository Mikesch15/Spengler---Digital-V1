# Google-Kalender anbinden – was du einmalig einrichten musst

Dauer ca. 15 Minuten, am Computer. Kostet nichts. Du brauchst ein Google-Konto (das mit dem Kalender, den du abgleichen willst).

## 1. Projekt anlegen
1. Öffne **console.cloud.google.com** und melde dich an.
2. Oben links bei «Projekt auswählen» → «Neues Projekt» → Name `Spengler-DIGITAL` → «Erstellen». Danach das neue Projekt oben auswählen.

## 2. Kalender-Schnittstelle einschalten
1. Menü «APIs und Dienste» → «Bibliothek».
2. «Google Calendar API» suchen → «Aktivieren».

## 3. Zustimmungsbildschirm einrichten
1. «APIs und Dienste» → «OAuth-Zustimmungsbildschirm» (bzw. «Google Auth Platform» → «Branding»).
2. Nutzertyp **Extern** → «Erstellen».
3. App-Name `Spengler-DIGITAL`, Support-E-Mail und Kontakt-E-Mail: deine E-Mail. Speichern.
4. Bei «Datenzugriff» (Scopes) hinzufügen: `.../auth/calendar.events`, `openid`, `.../auth/userinfo.email`. Speichern.
5. **Wichtig – Veröffentlichungsstatus:** Setze die App auf **«In Produktion» (Publish app)**. Bleibt sie im Status «Testing», **läuft die Anmeldung nach 7 Tagen ab** und müsste jede Woche neu gemacht werden. In Produktion zeigt Google beim Verbinden einmalig «Diese App wurde nicht überprüft» – dort **Erweitert → Weiter zu Spengler-DIGITAL** tippen. Für die interne Nutzung durch wenige Personen ist keine Google-Prüfung nötig (bis 100 Nutzer).

## 4. Zugangsdaten erstellen
1. «APIs und Dienste» → «Anmeldedaten» → «Anmeldedaten erstellen» → **OAuth-Client-ID**.
2. Anwendungstyp **Webanwendung**, Name `Spengler-DIGITAL`.
3. Bei «Autorisierte Weiterleitungs-URIs» genau diese Adresse eintragen:
   `https://nfgryuzkpwjfmdlmevuy.supabase.co/functions/v1/google-callback`
4. «Erstellen». Es erscheinen **Client-ID** und **Clientschlüssel**. Beide kopieren (den Schlüssel nie in den Chat schicken, keine Bildschirmfotos davon machen).

## 5. In Supabase eintragen
Supabase-Dashboard → Edge Functions → Secrets → «Add»:
- Name `GOOGLE_CLIENT_ID`, Wert: die Client-ID aus Schritt 4.
- Name `GOOGLE_CLIENT_SECRET`, Wert: der Clientschlüssel aus Schritt 4.

## 6. In der App verbinden
«Mehr → Termine → Google-Kalender → Einwilligung anhaken → Mit Google verbinden». Google fragt nach dem Konto und dem Kalender-Zugriff (**Häkchen beim Kalender lassen!**). Danach läuft der erste Abgleich.

Hinweis: Pro Person ist nur **ein** Kalender möglich – Outlook **oder** Google. Eine bestehende Outlook-Verbindung muss vorher getrennt werden.
