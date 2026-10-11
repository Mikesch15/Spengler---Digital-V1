# resolve-login-email – Historie

## Fassung 2 (11.10.2026, App v3.311, Plattform-Version 2) – kein Nachschlagen mehr
Befund (Audit v3.310): öffentliche Abfrage E-Mail → interne Pseudo-Adresse (Konten-/Benutzernamen-Aufzählung), kein Limit.
Neu: `{login,password}` → Sitzung (`{ok:true,access_token,refresh_token}`) oder immer `401 {ok:false}`; Limit je IP 30 / je Eingabe 8 in 10 Min
(Tabelle `login_aufloesung_versuche`, nur Hashes), fail closed (503); CORS erlaubt `apikey` und `x-client-info`.
Client: `js/03-login.js` (`loginAnmelden`). Prüfstände: `pruefstand-login-aufloesung-v3-311.js`, `pruefstand-email-auth-v3-103.js`.

## Fassung 1 (v3.103)
Nachschlagen E-Mail → Auth-E-Mail (öffentlich, ohne Limit).
