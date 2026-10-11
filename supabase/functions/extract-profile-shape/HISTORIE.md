# extract-profile-shape – Historie

Die Funktion erkennt aus einer Handskizze die Schenkel (Länge + Winkel) eines Blechprofils (Freies Profil, js/14).
Frühere Fassungen (bis v4, v2.70) stehen im Kopfkommentar von `Index.ts`. Die Datei heisst mit grossem «I»
(`Index.ts`) – so ist sie deployt (Einstiegspunkt `Index.ts`).

## Fassung 5 (11.10.2026, App v3.308) – Zugangsschutz (Plattform-Version 6)

**Befund:** der Client schickte als `Authorization: Bearer` den **öffentlichen** App-Schlüssel (`sb_publishable_…`), die
Funktion hatte `verify_jwt=true`, prüfte selbst aber nichts. Der Supabase-Gateway lässt diesen Schlüssel durch (an
`extract-offer-positions` am 11.10.2026 live gemessen: Aufruf mit dem Schlüssel erreichte die Funktion) – die Funktion war
also ohne Anmeldung aufrufbar, jeder Aufruf löste einen Gemini-Aufruf aus. Ein konkreter Missbrauch ist nicht belegt.
Fehlertexte von Google gingen roh (englisch) an den Client.

**Lösung (wie extract-offer-positions v26):** Client sendet das Token der angemeldeten Person (`erkennungsToken()`, js/17;
ohne Sitzung keine Anfrage); `pruefeZugang()` ruft `public.my_company_id()` per PostgREST mit genau diesem Token auf (anon
nicht ausführbar; null ohne Profil/aktive Firma): 401 / 403 / 503 (fail closed). Google-Fehler: deutscher Satz, Rohtext ohne
Schlüssel nur in `detail`. `verify_jwt` bleibt `true`. **Unverändert:** Prompt, Modell, Zeitgrenze, Prüfung der Schenkel,
Antwortformat, CORS.

Prüfstand: `pruefstaende/pruefstand-profil-erkennung-sicherheit-v3-308.js` (Funktionsdatei mit Attrappen + Client).
