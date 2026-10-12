# Roadmap-Abgleich mit dem Stand in `main` (v3.319 / v3.320)

Stand: 12.10.2026, Ausgangs-Commit b4781cf (v3.318). Grundlage ist der Code in `main` und die Live-Datenbank – nicht Berichte.

## Welche Quellen wirklich verfügbar waren

| Quelle | Verfügbar? |
|---|---|
| Original „Erweiterungsideen / Roadmap" (Abschnitte 11, 13, 25, 26) | **Nein** – weder im Repo noch in den hochgeladenen Dateien. |
| Original „Konzept Benachrichtigungszentrale / Workflow" | **Nein.** Vorhanden ist nur `Zusammenfassung_Auftrag_Benachrichtigungszentrale.txt` (eine Zusammenfassung). |
| `Zusammenfassung_Auftrag_Massaufnahme-Workflow.txt`, `Zusammenfassung_v3.290…`, `Zusammenfassung_v3.295…` | Ja (Zusammenfassungen, keine Originale). |
| `Spengler-Digital_Weiterentwicklung_Material_Projekt_Workflow.txt` (Upload) | Ja – Ideenliste Material/Projekt/Workflow (Artikelstruktur, Offerte→Materialbedarf, Material-Cockpit, Lager & Barcode, Lieferanten, Material→Zuschnitt→Werkstatt, Projektstatus, tatsächlicher Verbrauch). |
| Auftragsdatei dieses Auftrags | Ja. |

Es wurden keine Originale kopiert oder rekonstruiert. Wo die Themenliste des Auftrags nicht durch eine verfügbare Quelle belegt ist, steht unten „nicht belegbar" bezogen auf die **Idee**; der **Code-Stand** ist trotzdem geprüft.

## Vergleichstabelle

Status: vorhanden / teilweise / fehlt / nicht belegbar (= Idee nicht in verfügbarer Quelle genauer beschrieben).

| Idee | Status in main | Beleg | Lücke | Empfehlung |
|---|---|---|---|---|
| Massaufnahme-Vorlagen | vorhanden | `js/52-vorlagen.js` (v3.09), Tabelle `measurement_vorlagen`; Vorlage enthält bewusst nur Fachwerte, kein Projekt/Foto/Datum | Original-Anforderung nicht einsehbar | keine Änderung |
| Serienaufnahmen | vorhanden | `js/52-vorlagen.js` (gleiche Datei, „Vorlagen und Serienaufnahmen") | – | keine Änderung |
| Projektweite Materialübersicht | vorhanden | `js/48-projekt-material.js`: führt gespeicherte `data.ausmass`/`data.material`/Zuschnittplan zusammen, rechnet nichts neu | **Offerte→Materialbedarf** (Idee 2 der Weiterentwicklungsliste): kein Bedarf aus Offertenpositionen; nur aus Massaufnahmen. **Geprüft am 12.10.2026 (v3.332): nicht ableitbar, weil die Offertposition kein Material-Feld hat – siehe `ABSCHLUSSBERICHT_Offerte-Materialbedarf.txt`** | später prüfen, erst nach Klärung Artikelstruktur |
| Projektweiter Zuschnitt | vorhanden | `js/49-projekt-zuschnitt.js`: ein gemeinsamer Rollenblech-Plan aller Massaufnahmen, nutzt `ebaPackeInStreifen()` aus `js/29` (keine zweite Rechnung) | – | keine Änderung |
| Werkstatt / Rüstansicht | vorhanden | `js/51-werkstatt.js`; Kette FREIGEGEBEN → ZU RÜSTEN → GERÜSTET → ZU MONTIEREN → MONTIERT → ABGESCHLOSSEN, mehrere `pruefstand-werkstatt-*` | – | keine Änderung |
| Zuschnittstatus (Stück abhaken) | vorhanden | Tabelle `zuschnitt_erledigt`, `js/56-material-zuschnitt.js` Teil A, Offline-Warteschlange `js/43` kennt `zuschnitt_erledigt` | – | keine Änderung |
| Materialreservierung | vorhanden | `js/50-reservierung.js`, Tabelle `material_reservierungen`; Reststück nur nach ausdrücklichem „Für dieses Projekt reservieren" | – | keine Änderung |
| Reststücke ↔ Zuschnitt | vorhanden | `js/42-reste.js` (Reststücke-Lager, Tabelle `reststuecke`); `js/49` zieht passende Reste vorab ab (v3.27); Vorschläge ohne stille Einplanung | – | keine Änderung |
| Schnittfuge / Kerf | vorhanden | Einstellung `schnittfuge_mm` → `blechSchnittfuge` (`js/01`, `js/05`), eine Packrechnung `ebaSchnittfuge()` in `js/29`, UI in `js/42` | – | keine Änderung |
| Aufgaben-/Benachrichtigungszentrale + Workflow | teilweise | `js/45` (Aufgaben/Startseite), Workflow-RPCs `measurement_*`; laut Zusammenfassung bewusst **nicht** gebaut: Push-Benachrichtigungen, „Änderungen seit letztem Besuch" (keine zweite Historie), Glocke ohne Funktion | Originalkonzept nicht verfügbar → Umfang der Lücke nicht belegbar | Originalkonzept anfordern, dann entscheiden |
| Offerte → Massaufnahme inkl. Erkennung/Zuordnung | teilweise → mit v3.320 geschlossen | `js/63-angebote.js` `angMassaufnahmenDialog` (Worterkennung der Art, schon vorhandene nicht angehakt). Bis v3.319 stand die Herkunft nur in der Notiz; Verbindung Position↔Leistung↔Massaufnahme fehlte beim Ableiten | v3.320: Leistung je Position anlegen/wiederverwenden + Verknüpfung (idempotent) | Mike testet manuell |

## Projekt-Leistungs-Zuordnung (Teil B) – Befund

Existierte bereits: Tabelle `leistungen` (`angebot_id`, `angebot_position`), n:m `leistung_massaufnahmen` (Unique), RLS + `tenant_boundary_*`, UI in `js/65`. Nachweisbare Lücken und ihre Behebung siehe `ABSCHLUSSBERICHT_Projektleistungen_v3.319-320.txt`.

## Zusätzliche Ideen (nicht Teil dieses Auftrags, nicht umgesetzt)

Artikelstruktur/Lieferantenartikel, Offerte→Materialbedarf, Lager & Barcode, Lieferantenliste, tatsächlicher Verbrauch, Projektstatus-Ableitung – aus der Weiterentwicklungsliste, ohne Priorisierung durch Mike.
