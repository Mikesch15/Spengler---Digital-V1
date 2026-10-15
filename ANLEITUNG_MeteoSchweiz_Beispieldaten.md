# Anleitung: Was Claude von dir für das MeteoSchweiz-Wetter braucht

Ziel: Das Wetter auf der Startseite soll von MeteoSchweiz kommen (kostenlos, auch für Betriebe erlaubt,
mit Quellenangabe). Die Postleitzahl nehme ich aus der **Firmenadresse in den Einstellungen** – dort ist sie bereits hinterlegt,
dafür musst du nichts tun.

Damit ich das Dateiformat nicht raten muss, brauche ich **drei kleine Textauszüge** aus den offenen Daten von MeteoSchweiz.
Du brauchst dafür **einen Computer** (Windows, Mac oder Linux), kein Handy. Es dauert etwa 10 Minuten.

---

## Was du am Ende schickst

Kleine Textdateien als Anhang in den Chat (Stand: Nr. 1 und 2 sind erledigt):

| Nr. | Name der Datei, die du mir schickst | Woher |
| --- | --- | --- |
| 1 | `parameter.csv` | Beschreibung der Messgrössen (Schritt 1) |
| 2 | `orte.csv` | Liste der Orte mit Postleitzahlen (Schritt 2) |
| 3 | `vorhersage.csv` | Auszug aus einer Vorhersage-Datei (Schritt 3) |

**Wichtig:** Schick nur die **ersten Zeilen**, nicht die ganzen Dateien. Einzelne Dateien sind sehr gross (bis rund 33 MB).

---

## Schritt 1 – Beschreibung der Messgrössen (`parameter.csv`)

1. Öffne im Browser diese Adresse:
   `https://data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting/ogd-local-forecasting_meta_parameters.csv`
2. Die Datei lädt herunter (oder zeigt Text an). Sie ist klein – schick sie **ganz** als `parameter.csv`.
   Wenn der Browser den Text anzeigt: alles markieren, kopieren und in einen Texteditor einfügen, als `parameter.csv` speichern.

*Falls die Adresse nicht funktioniert:* Sag mir kurz Bescheid, was angezeigt wird (z. B. „Seite nicht gefunden“) – die Adresse stammt
aus der MeteoSchweiz-Dokumentation und kann sich geändert haben. Dann gehen wir über Schritt 2 weiter.

---

## Schritt 2 – Die Dateiliste öffnen und die Ortsliste finden (`orte.csv`)

1. Öffne diese Seite (der „STAC-Browser“ von MeteoSchweiz/swisstopo):
   `https://data.geo.admin.ch/browser/#/collections/ch.meteoschweiz.ogd-local-forecasting`
   (Falls sie nicht öffnet: im Internet nach „MeteoSwiss Open Data local forecast STAC“ suchen und die Sammlung
   `ch.meteoschweiz.ogd-local-forecasting` wählen.)
2. Suche in der Liste der Dateien (**„Assets“**) eine Datei, die wie eine **Ortsliste** heisst – der Name enthält meist
   `meta` und `point` (also Orte/Punkte). Sie enthält pro Ort eine Nummer, den Namen und die **Postleitzahl**.
3. Lade sie herunter. Öffne sie in einem Texteditor und kopiere die **ersten 30 Zeilen** in eine neue Datei `orte.csv`.

*So kürzt du eine Datei auf die ersten 30 Zeilen:*
- **Windows (PowerShell):** `Get-Content "ORIGINAL.csv" -TotalCount 30 | Set-Content "orte.csv"`
- **Mac / Linux (Terminal):** `head -n 30 ORIGINAL.csv > orte.csv`
- **Oder** die Datei in einem Texteditor öffnen (Notepad++, TextEdit im Textmodus), alles ausser den ersten 30 Zeilen löschen und unter neuem Namen speichern.

---

## Schritt 3 (neu, einfacher) – Zwei kleine Dinge für die Vorhersage-Dateien

Schritt 1 und 2 sind erledigt (`parameter.csv` und `orte.csv` sind angekommen, danke). Für Schritt 3 musst du **nichts im
Dateibrowser suchen**. Die Vorhersage-Dateien für Tageswerte sind klein (höchstens rund 300 KB), du kannst sie also ganz schicken.

**3a – Die Dateiliste als Text kopieren**
1. Öffne im Browser diese Adresse (es erscheint nur Text, das ist richtig):
   `https://data.geo.admin.ch/api/stac/v1/collections/ch.meteoschweiz.ogd-local-forecasting/items?limit=1`
2. Alles markieren (Strg+A bzw. Cmd+A), kopieren (Strg+C) und in eine neue Nachricht an Claude einfügen.
   Wenn der Text sehr lang ist, ist das in Ordnung. Alternativ: Seite speichern (Strg+S) und die Datei als Anhang schicken.

   *Was ich daraus lese:* die Namen der Dateien und ihre Download-Adressen.

**3b – Zwei Tagesdateien herunterladen und ganz schicken**
1. In dem Text aus 3a stehen Adressen (`"href": "https://…"`). Suche die beiden, bei denen im Namen
   **`jp2000d0`** (Wettersymbol pro Tag) bzw. **`tre200px`** (Höchsttemperatur pro Tag) vorkommt.
2. Öffne die Adresse im Browser (oder rechtsklick, „Link speichern unter“) und speichere die Datei.
3. Schick beide Dateien **ganz** als Anhang (sie sind klein).

*Wenn dir das Suchen im Text zu mühsam ist:* Schick mir nur 3a, ich schreibe dir dann die zwei genauen Adressen auf.

## Schritt 4 – Schicken

Hänge `parameter.csv`, `orte.csv` und `vorhersage.csv` an deine nächste Nachricht im Chat und schreib dazu,
**welche Adresse im Browser** du für Schritt 2/3 benutzt hast, falls sie von meiner abweicht.

---

## Was danach passiert (zur Info)

1. Ich lese das Format aus deinen drei Dateien und schreibe den Leser **gegen die echten Beispiele**.
2. Ich baue einen kleinen **Zwischendienst** (Supabase Edge Function): Er holt die Dateien von MeteoSchweiz, liest nur den Ort deiner
   Postleitzahl heraus und liefert der App ein kleines Ergebnis. Das Ergebnis wird für ein paar Stunden zwischengespeichert, damit nicht
   jede Anzeige neu lädt. Dafür kommt eine kleine Zwischenspeicher-Tabelle dazu (ohne Zugriff von aussen, mit Firmengrenze).
3. In den Einstellungen bleibt der Schalter „Wetter auf der Startseite“. Die Postleitzahl liest die App aus der Firmenadresse. Steht dort
   keine vierstellige Postleitzahl, sagt die App das, statt zu raten.
4. Auf der Startseite steht „Quelle: MeteoSchweiz“.

## Was ich dabei **nicht** tun werde

- Keine Standortabfrage deines Handys.
- Kein Schlüssel im Frontend (es braucht bei MeteoSchweiz gar keinen).
- Nichts an der Firmenadresse ändern – ich lese sie nur.

## Wenn etwas hakt

- „Die Datei ist riesig / lädt ewig“: Abbrechen. Die Auszüge reichen, oder schick mir nur die Dateinamen (siehe Schritt 3).
- „Ich finde die Ortsliste nicht“: Schick mir die Liste aller Dateinamen aus der Sammlung (Copy und Paste), ich zeige dir die richtige.
- „Mehr als eine Postleitzahl / Standort in der Nähe“: Kein Problem, nimm die Postleitzahl aus der Firmenadresse; ich nehme den
  nächstgelegenen Ort der Liste.
