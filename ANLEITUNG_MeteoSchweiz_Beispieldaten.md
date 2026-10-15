# Anleitung: Was Claude von dir für das MeteoSchweiz-Wetter braucht

Ziel: Das Wetter auf der Startseite soll von MeteoSchweiz kommen (kostenlos, auch für Betriebe erlaubt,
mit Quellenangabe). Die Postleitzahl nehme ich aus der **Firmenadresse in den Einstellungen** – dort ist sie bereits hinterlegt,
dafür musst du nichts tun.

Damit ich das Dateiformat nicht raten muss, brauche ich **drei kleine Textauszüge** aus den offenen Daten von MeteoSchweiz.
Du brauchst dafür **einen Computer** (Windows, Mac oder Linux), kein Handy. Es dauert etwa 10 Minuten.

---

## Was du am Ende schickst

Drei kleine Textdateien (je nur die ersten ca. 30 Zeilen), als Anhang in den Chat:

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

## Schritt 3 – Auszug aus einer Vorhersage-Datei (`vorhersage.csv`)

1. Bleib im selben STAC-Browser. Öffne den **neuesten Eintrag** („Items“, oben in der Liste, mit dem aktuellen Datum und der Uhrzeit).
2. In diesem Eintrag stehen mehrere Dateien – **eine pro Messgrösse**. Die Messgrössen tragen Kürzel, z. B.:
   - `jp2000d0` – Wettersymbol pro Tag
   - `tre200h0` – Temperatur (stündlich)

   Lade **zuerst die Datei zum Wettersymbol pro Tag** (`jp2000d0`) herunter. Sie ist am kleinsten.
3. Kürze sie auf die ersten 30 Zeilen (wie oben beschrieben) und speichere sie als `vorhersage.csv`.

*Wenn du dir nicht sicher bist, welche Datei:* Schreib mir einfach die **Liste der Dateinamen**, die im neuesten Eintrag stehen
(Kopieren und Einfügen genügt). Dann sage ich dir genau, welche du holen sollst.

---

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
