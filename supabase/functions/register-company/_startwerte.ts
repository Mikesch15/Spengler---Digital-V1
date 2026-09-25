// ===========================================================================
// Startwerte fuer eine frisch registrierte Firma (v3.184)
//
// Eine neue Firma landete bisher in einer fertigen App, in der nichts stand:
// kein Material, keine Werkstoffe, keine Rollenbreiten, keine
// Rinne-Ansetztypen. Die Auswahlfelder waren da, sie hatten nur nichts zur
// Auswahl.
//
// WAS HIER MITGEGEBEN WIRD - UND WAS NICHT
// Mitgegeben wird nur, was fachlich ALLGEMEINGUELTIG ist: die Dehnungswerte
// der Werkstoffe sind Materialphysik, die Rollenbreiten und die
// Rinne-Ansetztypen sind Branchenstandard. Das sind keine Betriebsdaten.
//
// NICHT mitgegeben werden Preise. Die Beispiel-Katalogpositionen tragen
// ausdruecklich 0.00. Ein erfundener Preis, der unbemerkt in einen echten
// Regierapport laeuft, waere schlimmer als gar keiner - und niemand
// kontrolliert einen Wert, der schon dasteht.
//
// Die Katalogpositionen tragen demo=true und loesen sich auf, sobald die
// Firma ihre erste eigene Position anlegt oder eine Liste importiert
// (js/74-beispielkatalog.js). Sie zaehlen in der Einrichtungs-Checkliste
// (js/73) bewusst NICHT mit: ein Haken, den mitgelieferte Daten setzen,
// waere ein falscher Haken.
//
// SCHEITERT ETWAS HIER, BLEIBT DIE REGISTRIERUNG TROTZDEM GUELTIG.
// Der Aufrufer faengt jeden Fehler ab. Eine Firma ohne Startwerte ist genau
// das, was es bis v3.183 gab - unschoen, aber funktionsfaehig. Eine Firma,
// die wegen eines Startwerts gar nicht entsteht, waere der schlechtere
// Tausch.
// ===========================================================================

// Dehnungswerte: max. Abstand zweier Dilatationen und Abstand ab Fixpunkt.
export const WERKSTOFFE = [
  { name: "Aluminium (Aluman)", legacy_key: "aluminium",           max_abstand_mm: 4000, ab_fixpunkt_mm: 2000 },
  { name: "Titanzink",          legacy_key: "titanzink",           max_abstand_mm: 5000, ab_fixpunkt_mm: 2500 },
  { name: "Kupfer",             legacy_key: "kupfer",              max_abstand_mm: 6000, ab_fixpunkt_mm: 3000 },
  { name: "CrNi-Stahl",         legacy_key: "crni_stahl",          max_abstand_mm: 6000, ab_fixpunkt_mm: 3000 },
  { name: "Chromstahl, verzinnt", legacy_key: "chromstahl_verzinnt", max_abstand_mm: 6000, ab_fixpunkt_mm: 3000 },
  { name: "Stahl",              legacy_key: "stahl_verzinkt",      max_abstand_mm: 8000, ab_fixpunkt_mm: 4000 },
];

// Ansetztypen der Rinne. mass_mm ist die Zugabe bzw. der Abzug an der
// Abwicklung, ausmass_mass_mm dasselbe fuer das Ausmass.
export const RINNE_TYPEN = [
  { name: "Offenes Ende",    symbol: "offen", mass_mm: 0,    angle_deg: 0,   is_fixpunkt: false, is_schiebestutzen: false, ausmass_mass_mm: 0 },
  { name: "Aussenecke 90°",  symbol: "AE90",  mass_mm: -110, angle_deg: -90, is_fixpunkt: true,  is_schiebestutzen: false, ausmass_mass_mm: 150 },
  { name: "Innenecke 90°",   symbol: "IE90",  mass_mm: 0,    angle_deg: 90,  is_fixpunkt: true,  is_schiebestutzen: false, ausmass_mass_mm: 0 },
  { name: "Ablaufstutzen",   symbol: "ABL",   mass_mm: 0,    angle_deg: 0,   is_fixpunkt: true,  is_schiebestutzen: false, ausmass_mass_mm: 0 },
  { name: "Boden",           symbol: "BD",    mass_mm: 0,    angle_deg: 0,   is_fixpunkt: false, is_schiebestutzen: false, ausmass_mass_mm: 0 },
  { name: "Schiebestutzen",  symbol: "SS",    mass_mm: 40,   angle_deg: 0,   is_fixpunkt: false, is_schiebestutzen: true,  ausmass_mass_mm: 0 },
  { name: "Gehrschildwinkel",symbol: "GSW",   mass_mm: 0,    angle_deg: 80,  is_fixpunkt: false, is_schiebestutzen: false, ausmass_mass_mm: 150 },
];

// Beispiel-Positionen. Vier Bleche (damit sich der Zuschnitt sofort rechnen
// laesst) und vier Kleinteile fuer den Regierapport. PREIS IMMER 0 - siehe
// Kopfkommentar. werkstoff zeigt auf den legacy_key oben; die Id steht erst
// nach dem Einfuegen fest.
export const BEISPIEL_KATALOG = [
  { edv_nr: "101.01", name: "Kupferblech blank (Beispiel)",        dim: "0.6",  unit: "m²",  werkstoff: "kupfer",        staerke_mm: 0.6,  ausfuehrung: "blank",        form: "rolle" },
  { edv_nr: "101.02", name: "Titanzink vorbewittert (Beispiel)",   dim: "0.7",  unit: "m²",  werkstoff: "titanzink",     staerke_mm: 0.7,  ausfuehrung: "vorbewittert", form: "rolle" },
  { edv_nr: "101.03", name: "Alublech (Beispiel)",                 dim: "0.8",  unit: "m²",  werkstoff: "aluminium",     staerke_mm: 0.8,  ausfuehrung: "blank",        form: "rolle" },
  { edv_nr: "101.04", name: "Stahlblech verzinkt (Beispiel)",      dim: "0.63", unit: "m²",  werkstoff: "stahl_verzinkt",staerke_mm: 0.63, ausfuehrung: "verzinkt",     form: "rolle" },
  { edv_nr: "301.01", name: "Rinnenhalter (Beispiel)",             dim: "3x25", unit: "Stk.", werkstoff: null, staerke_mm: null, ausfuehrung: null, form: null },
  { edv_nr: "301.02", name: "Ablaufstutzen (Beispiel)",            dim: "",     unit: "Stk.", werkstoff: null, staerke_mm: null, ausfuehrung: null, form: null },
  { edv_nr: "501.01", name: "Dichtband (Beispiel)",                dim: "50mm", unit: "m1",  werkstoff: null, staerke_mm: null, ausfuehrung: null, form: null },
  { edv_nr: "601.01", name: "Blindniete (Beispiel)",               dim: "4x10", unit: "Stk.", werkstoff: null, staerke_mm: null, ausfuehrung: null, form: null },
];

// Rollenbreiten und MwSt gehen in die app_settings-Zeile, die ohnehin
// angelegt wird - dafuer braucht es keinen eigenen Schreibvorgang.
export const ROLLENBREITEN = [1000, 670, 330, 250];
export const MWST = "8.1 %";
