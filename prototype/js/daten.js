"use strict";
// ===========================================================================
// Spengler-DIGITAL 2.0 - PROTOTYP  ·  Beispieldaten
// ===========================================================================
// ALLES hier ist erfunden. Keine Zeile dieser Datei kommt aus der Datenbank,
// und der Prototyp schreibt nichts zurueck - er dient ausschliesslich dazu,
// die BEDIENUNG zu beurteilen.
//
// Die Beispiele sind trotzdem bewusst realistisch gewaehlt: echte
// Massaufnahme-Arten der App, Schweizer Adressen, Materialien mit Staerke
// und Rollenbreite, und Projekte in JEDER Phase des Ablaufs - sonst laesst
// sich nicht beurteilen, ob die Oberflaeche auch dann noch traegt, wenn
// etwas schiefsteht (verfallene Freigabe, fehlendes Material, Restarbeiten).
// ===========================================================================

// Die sechs Stationen des Ablaufs. Genau diese Kette steht im Projektkopf.
const P_ABLAUF=[
 {k:"offerte",     name:"Offerte"},
 // Weiches Trennzeichen: auf dem Handy teilen sich sechs Stationen die
 // Breite, und "Massaufnahme" bricht sonst mitten im Wort ("Massaufna/hme").
 {k:"massaufnahme",name:"Mass\u00ADaufnahme"},
 {k:"produktion",  name:"Produktion"},
 {k:"werkstatt",   name:"Werkstatt"},
 {k:"montage",     name:"Montage"},
 {k:"ausmass",     name:"Ausmass"}
];

const P_MITARBEITER=[
 {id:"ml",name:"Mike Ledermann",kurz:"ML",funktion:"Geschäftsführer",ich:true},
 {id:"bk",name:"Beat Krebs",    kurz:"BK",funktion:"Spengler"},
 {id:"as",name:"Andrea Studer", kurz:"AS",funktion:"Spenglerin"},
 {id:"lm",name:"Luca Meier",    kurz:"LM",funktion:"Lernender"}
];

// Teile = das, was wirklich produziert und montiert wird. Sie haengen an
// einer Massaufnahme und tragen das Material - daran zeigt sich im
// Werkstatt-Register, warum eine Sortierung nach Material etwas bringt.
function teil(nr,bez,stueck,fertig,material,staerke){
 return {nr,bez,stueck,fertig,material,staerke};
}

const P_PROJEKTE=[
 {
  id:1, nr:"2026-1042", name:"Dachsanierung Familie Muster",
  adresse:"Musterstrasse 12, 3098 Köniz", kunde:"Familie Muster",
  phase:"produktion", termin:"2026-09-28", leiter:"ml",
  hinweis:"", offertBetrag:18450,
  massaufnahmen:[
   {id:11,art:"Dachrinne",      titel:"Haupteingang", stand:"fertig",
    teile:[teil("1.1","Rinne halbrund 333, Stück 1",4,4,"Stahlblech svz",0.6),
           teil("1.2","Rinne halbrund 333, Stück 2",4,3,"Stahlblech svz",0.6)]},
   {id:12,art:"Lukarne Seitenverkleidung",titel:"Lukarne Ost",stand:"fertig",
    teile:[teil("2.1","Seitenblech links",1,1,"Stahlblech svz",0.6),
           teil("2.2","Seitenblech rechts",1,0,"Stahlblech svz",0.6),
           teil("2.3","Stirnblech",1,0,"Stahlblech svz",0.6)]},
   {id:13,art:"Ort- und Seitenbleche",titel:"Ortblech Nord",stand:"arbeit",
    teile:[teil("3.1","Ortblech Nord",6,2,"Titanzink",0.7)]},
   {id:14,art:"Dachfenstereinfassung",titel:"Dachfenster Süd",stand:"offen",teile:[]}
  ]
 },
 {
  id:2, nr:"2026-1051", name:"Neubau MFH Sonnenhalde",
  adresse:"Sonnenhaldeweg 4, 3006 Bern", kunde:"Sonnenhalde Immobilien AG",
  phase:"massaufnahme", termin:"2026-10-14", leiter:"as",
  hinweis:"Baustellenzufahrt nur bis 16:00 Uhr.", offertBetrag:64200,
  massaufnahmen:[
   {id:21,art:"Dachrinne",titel:"Südfassade",stand:"fertig",
    teile:[teil("1.1","Rinne halbrund 400",8,0,"Titanzink",0.7)]},
   {id:22,art:"Mauerabdeckung",titel:"Attika rundum",stand:"arbeit",teile:[]},
   {id:23,art:"Kamineinfassung",titel:"Kamin Ost",stand:"offen",teile:[]},
   {id:24,art:"Kehle",titel:"Kehle Nord",stand:"offen",teile:[]}
  ]
 },
 {
  id:3, nr:"2026-1038", name:"Kaminsanierung Bühler",
  adresse:"Dorfstrasse 8, 3110 Münsingen", kunde:"Ruth Bühler",
  phase:"werkstatt", termin:"2026-09-23", leiter:"bk",
  hinweis:"Massaufnahme „Kamin West“ wurde nach der Freigabe geändert – sie muss erneut freigegeben werden.",
  hinweisArt:"warnung", offertBetrag:4980,
  massaufnahmen:[
   {id:31,art:"Kamineinfassung",titel:"Kamin West",stand:"verfallen",
    teile:[teil("1.1","Einfassung Vorderteil",1,1,"Kupfer",0.6),
           teil("1.2","Einfassung Seitenteil links",1,1,"Kupfer",0.6),
           teil("1.3","Einfassung Seitenteil rechts",1,1,"Kupfer",0.6)]},
   {id:32,art:"Anschlussblech",titel:"Anschluss Kamin",stand:"fertig",
    teile:[teil("2.1","Anschlussblech",2,2,"Kupfer",0.6)]}
  ]
 },
 {
  id:4, nr:"2026-1029", name:"Umbau Scheune Rychiger",
  adresse:"Eichenweg 21, 3125 Toffen", kunde:"Hans Rychiger",
  phase:"montage", termin:"2026-09-22", leiter:"bk", hinweis:"",
  offertBetrag:12300,
  massaufnahmen:[
   {id:41,art:"Einlaufblech gerade",titel:"Scheunendach",stand:"fertig",
    teile:[teil("1.1","Einlaufblech",12,12,"Stahlblech svz",0.6)]},
   {id:42,art:"Dachrinne",titel:"Traufe Süd",stand:"fertig",
    teile:[teil("2.1","Rinne halbrund 333",6,6,"Stahlblech svz",0.6)]}
  ]
 },
 {
  id:5, nr:"2026-1055", name:"Reparatur Dachrinne Steiner",
  adresse:"Bahnhofstrasse 2, 3072 Ostermundigen", kunde:"Peter Steiner",
  phase:"offerte", termin:"", leiter:"ml",
  hinweis:"Offerte noch nicht verschickt.", offertBetrag:1240,
  massaufnahmen:[]
 },
 {
  id:6, nr:"2026-1012", name:"Attika Neubau Feldegg",
  adresse:"Feldeggstrasse 17, 3007 Bern", kunde:"Feldegg Bau GmbH",
  phase:"ausmass", termin:"2026-09-19", leiter:"as", hinweis:"",
  offertBetrag:28900,
  massaufnahmen:[
   {id:61,art:"Mauerabdeckung",titel:"Attika Nord",stand:"fertig",
    teile:[teil("1.1","Abdeckung 420 mm",14,14,"Aluminium",1.0)]},
   {id:62,art:"Mauerabdeckung",titel:"Attika Süd",stand:"fertig",
    teile:[teil("2.1","Abdeckung 420 mm",11,11,"Aluminium",1.0)]}
  ]
 }
];

// Meine Aufgaben auf der Startseite. Jede zeigt auf ein Projekt - ein
// Eintrag ohne Ziel waere eine Sackgasse.
const P_AUFGABEN=[
 {id:"a1",art:"freigabe", text:"Massaufnahme „Kamin West“ erneut freigeben",
  projekt:3, dringend:true},
 {id:"a2",art:"ruesten",  text:"Ortblech Nord rüsten – 4 von 6 Stück offen",
  projekt:1, dringend:false},
 {id:"a3",art:"offerte",  text:"Offerte Reparatur Dachrinne Steiner verschicken",
  projekt:5, dringend:false},
 {id:"a4",art:"ausmass",  text:"Ausmass Attika Feldegg abschliessen",
  projekt:6, dringend:false}
];

const P_MONTAGE=[
 {projekt:4, datum:"2026-09-22", text:"Scheune Rychiger – Einlaufbleche und Rinne", wer:"bk"},
 {projekt:3, datum:"2026-09-23", text:"Kaminsanierung Bühler – Einfassung", wer:"bk"},
 {projekt:1, datum:"2026-09-28", text:"Familie Muster – Rinne Haupteingang", wer:"as"}
];

const P_LAGER=[
 {nr:"100.06",bez:"Stahlblech svz",       dim:"0,6 × 670 mm Rolle",einheit:"m",  bestand:84, reserviert:36, mind:40, barcode:"7610001000061"},
 {nr:"100.12",bez:"Titanzink",            dim:"0,7 × 670 mm Rolle",einheit:"m",  bestand:22, reserviert:18, mind:30, barcode:"7610001000122"},
 {nr:"100.21",bez:"Kupfer",               dim:"0,6 × 600 mm Rolle",einheit:"m",  bestand:47, reserviert:6,  mind:20, barcode:"7610001000214"},
 {nr:"100.34",bez:"Aluminium",            dim:"1,0 × 1000 mm Tafel",einheit:"Stk.",bestand:9,  reserviert:0,  mind:6,  barcode:"7610001000344"},
 {nr:"210.04",bez:"Rinnenhaken verzinkt", dim:"333 mm",            einheit:"Stk.",bestand:118,reserviert:24, mind:60, barcode:"7610002100041"},
 {nr:"310.02",bez:"Spenglerschrauben",    dim:"4,5 × 35 mm",       einheit:"Pkg.",bestand:3,  reserviert:1,  mind:5,  barcode:"7610003100029"}
];

const P_WARENEINGANG=[
 {datum:"2026-09-18",bez:"Titanzink 0,7 × 670",menge:"60 m",  lieferant:"Metall AG"},
 {datum:"2026-09-16",bez:"Rinnenhaken 333",    menge:"100 Stk.",lieferant:"Spengler-Bedarf"},
 {datum:"2026-09-11",bez:"Stahlblech svz 0,6", menge:"120 m", lieferant:"Metall AG"}
];

const P_VERLAUF=[
 {zeit:"heute 09:42", wer:"bk",text:"Kamin West nach der Freigabe geändert – Freigabe verfallen",projekt:3},
 {zeit:"heute 08:15", wer:"as",text:"Attika Süd: 11 Stück zugeschnitten",projekt:6},
 {zeit:"gestern 16:30",wer:"ml",text:"Offerte Sonnenhalde angenommen",projekt:2},
 {zeit:"gestern 14:02",wer:"bk",text:"Scheune Rychiger: Rüsten bestätigt",projekt:4}
];
