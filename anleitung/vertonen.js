// Vertont das von video.js aufgenommene Bildschirmvideo: baut aus den in
// AUS/sprachspuren.json notierten Sprach-Clips (Datei + Startzeitpunkt
// relativ zum Aufnahmebeginn) eine einzige Tonspur in Videolaenge und
// mischt sie unters Video - mit dem echten, systemweiten ffmpeg (nicht dem
// von Playwright mitgelieferten, das kann nur stumme WebM/VP8 kodieren).
// Ergebnis ist ein MP4 (H.264/AAC), das in jedem Player/Browser laeuft.
//
// Voraussetzung: video.js wurde bereits mit demselben AUS-Ordner ausgefuehrt
// (liefert *.webm + sprachspuren.json + sprache/*.wav).
//
// Aufruf:  AUS=anleitung/video-out node anleitung/vertonen.js
const fs=require("fs"),path=require("path");
const {execFileSync}=require("child_process");
const AUS=process.env.AUS||"anleitung/video-out";

const spurenPfad=path.join(AUS,"sprachspuren.json");
if(!fs.existsSync(spurenPfad)){
 console.error("Keine sprachspuren.json in "+AUS+" - zuerst video.js ausfuehren.");
 process.exit(1);
}
const spuren=JSON.parse(fs.readFileSync(spurenPfad,"utf8"));

const webmDatei=fs.readdirSync(AUS).find(f=>f.endsWith(".webm"));
if(!webmDatei){
 console.error("Kein *.webm in "+AUS+" gefunden.");
 process.exit(1);
}
const videoPfad=path.join(AUS,webmDatei);

function ffprobeDauerSek(datei){
 const s=execFileSync("ffprobe",
  ["-v","error","-show_entries","format=duration","-of","csv=p=0",datei]).toString().trim();
 return parseFloat(s)||0;
}
const videoDauerSek=ffprobeDauerSek(videoPfad);
console.log("Video: "+videoPfad+" ("+videoDauerSek.toFixed(2)+" s), "+spuren.length+" Sprach-Clips.");

// ffmpeg-Kommando bauen: ein Input je Clip, jeweils per adelay auf seinen
// Startzeitpunkt verschoben, dann amix zu einer Spur zusammengemischt und
// mit apad auf Videolaenge aufgefuellt.
const args=["-y"];
for(const s of spuren)args.push("-i",s.datei);
const teile=spuren.map((s,i)=>`[${i}:a]adelay=${Math.max(0,Math.round(s.start_ms))}:all=1[a${i}]`);
const mixEingaenge=spuren.map((_,i)=>`[a${i}]`).join("");
const filter=teile.join(";")
 +(spuren.length?";":"")
 +`${mixEingaenge}amix=inputs=${spuren.length}:duration=longest:normalize=0[amix];`
 +`[amix]apad=whole_dur=${videoDauerSek}[aout]`;

args.push("-i",videoPfad);
const videoInputIndex=spuren.length;
args.push("-filter_complex",filter);
args.push("-map",`${videoInputIndex}:v`);
args.push("-map","[aout]");
args.push("-t",String(videoDauerSek));
args.push("-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p");
args.push("-c:a","aac","-b:a","128k");
args.push("-movflags","+faststart");
const AUSGABE=path.join(AUS,"Spengler-DIGITAL-Videoanleitung.mp4");
args.push(AUSGABE);

console.log("ffmpeg wird "+spuren.length+" Sprach-Clips einmischen ...");
execFileSync("ffmpeg",args,{stdio:["ignore","pipe","pipe"]});
console.log("Fertig: "+AUSGABE);
