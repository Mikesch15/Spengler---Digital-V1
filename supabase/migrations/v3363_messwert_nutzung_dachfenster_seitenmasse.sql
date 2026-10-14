-- v3.363: Die Sicht messwert_nutzung (Zählwerk) zählt für das Dachfenster jetzt auch die seitlichen Masse f (bis Deckmaterial)
-- und g (unter Deckmaterial). Damit kann die App bei einem Eintrag, der stark vom Üblichen abweicht (z. B. 60 statt 50), mit einem
-- roten Ausrufezeichen darauf hinweisen. Bereits per Migration "messwert_nutzung_dachfenster_seitenmasse" angewendet (diese Datei
-- dokumentiert sie im Repo). Geändert ist EINE Zeile gegenüber der bisherigen Sicht: ARRAY['a','d'] -> ARRAY['a','d','f','g'] im
-- Zweig dachfenstereinfassung. Spalten, Rechte und security_invoker=true bleiben (RLS von measurements/projects gilt weiter).
create or replace view public.messwert_nutzung with (security_invoker=true) as
 WITH roh AS (
         SELECT p.company_id, m.type AS art, 'gava_abstand'::text AS feld, (m.data -> 'gava'::text) ->> 'abstand_mm'::text AS wert, m.date AS tag
           FROM measurements m JOIN projects p ON p.id = m.project_id
          WHERE m.type = 'einlaufblech_gerade'::text
        UNION ALL
         SELECT p.company_id, m.type, 'halter_abstand'::text, (m.data -> 'halter'::text) ->> 'abstand_mm'::text, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id
          WHERE m.type = 'rinne_halbrund'::text
        UNION ALL
         SELECT p.company_id, m.type, 'ueberlappung'::text, s.value ->> 'ueberlappung'::text, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.data -> 'segmente'::text) = 'array'::text THEN m.data -> 'segmente'::text ELSE '[]'::jsonb END) s(value)
          WHERE m.type = 'kehle'::text
        UNION ALL
         SELECT p.company_id, m.type, 'profil_'::text || z.formular, (m.data -> 'profil'::text) ->> z.gespeichert, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL ( VALUES ('breite'::text,'breite'::text), ('gefaelle'::text,'gef'::text), ('hoeheLinks'::text,'hL'::text), ('hoeheRechts'::text,'hR'::text), ('umschlagLinks'::text,'umL'::text), ('umschlagRechts'::text,'umR'::text), ('biegeLinks'::text,'wL'::text), ('biegeRechts'::text,'wR'::text), ('saum'::text,'saum'::text)) z(formular, gespeichert)
          WHERE m.type = 'mauerabdeckung'::text
        UNION ALL
         SELECT p.company_id, m.type, f.f, m.data ->> f.f, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL unnest(ARRAY['achsabstand'::text, 'hilfsriss'::text, 'zugabeLaenge'::text, 'zugabeBreite'::text]) f(f)
          WHERE m.type = 'lukarne'::text
        UNION ALL
         SELECT p.company_id, m.type, 'lattenabstand'::text, m.data ->> 'lattenabstand'::text, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id
          WHERE m.type = ANY (ARRAY['kamineinfassung'::text, 'dachfenstereinfassung'::text, 'einfassung_rund'::text])
        UNION ALL
         SELECT p.company_id, m.type, f.f, e.value ->> f.f, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.data -> 'einfassungen'::text) = 'array'::text THEN m.data -> 'einfassungen'::text ELSE '[]'::jsonb END) e(value),
            LATERAL unnest(ARRAY['a'::text, 'b'::text, 'c'::text]) f(f)
          WHERE m.type = 'einfassung_rund'::text
        UNION ALL
         SELECT p.company_id, m.type, f.f, m.data ->> f.f, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL unnest(ARRAY['saum'::text, 'stossLaenge'::text, 'ueberlappung'::text, 'lattenabstand'::text, 'ortAufkantung'::text, 'ortOben'::text, 'ortStirn'::text, 'ortNase'::text, 'wandAufkantung'::text]) f(f)
          WHERE m.type = 'anschlussblech'::text
        UNION ALL
         SELECT p.company_id, m.type, 'masse_'::text || e.k, e.v, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL jsonb_each_text(m.data) e(k, v)
          WHERE m.type = 'anschlussblech'::text AND e.k ~ '^[a-e]$'::text
        UNION ALL
         SELECT p.company_id, m.type, f.f, m.data ->> f.f, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL unnest(ARRAY['ueberlappung'::text, 'e'::text, 'umschlagVorne'::text, 'umschlagHinten'::text, 'umschlagSeite'::text]) f(f)
          WHERE m.type = 'kamineinfassung'::text
        UNION ALL
         SELECT p.company_id, m.type, f.f, (m.data -> f.f) ->> s.s, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL unnest(ARRAY['a'::text, 'd'::text]) f(f),
            LATERAL unnest(ARRAY['l'::text, 'r'::text]) s(s)
          WHERE m.type = 'kamineinfassung'::text AND (s.s = 'l'::text OR (m.data ->> 'getrennt'::text) = 'true'::text)
        UNION ALL
         SELECT p.company_id, m.type, f.f, m.data ->> f.f, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL unnest(ARRAY['ueberlappung'::text, 'aufVorne'::text, 'aufHinten'::text, 'saumVorne'::text, 'breiteOben'::text, 'breiteUnten'::text, 'randAbstand'::text, 'randStrich'::text, 'e'::text, 'eUmschlag'::text, 'anreiff'::text, 'anreiffUmschlag'::text, 'umschlagVorne'::text, 'umschlagSeite'::text]) f(f)
          WHERE m.type = 'dachfenstereinfassung'::text
        UNION ALL
         SELECT p.company_id, m.type, f.f, (m.data -> f.f) ->> s.s, m.date
           FROM measurements m JOIN projects p ON p.id = m.project_id,
            LATERAL unnest(ARRAY['a'::text, 'd'::text, 'f'::text, 'g'::text]) f(f),
            LATERAL unnest(ARRAY['l'::text, 'r'::text]) s(s)
          WHERE m.type = 'dachfenstereinfassung'::text AND (s.s = 'l'::text OR (m.data ->> 'getrennt'::text) = 'true'::text)
        ), sauber AS (
         SELECT roh.company_id, roh.art, roh.feld,
            replace(btrim(roh.wert), ','::text, '.'::text)::numeric AS wert, roh.tag
           FROM roh
          WHERE btrim(COALESCE(roh.wert, ''::text)) <> ''::text AND replace(btrim(roh.wert), ','::text, '.'::text) ~ '^[0-9]+(\.[0-9]+)?$'::text AND replace(btrim(roh.wert), ','::text, '.'::text)::numeric > 0::numeric
        )
 SELECT company_id, art, feld, wert, count(*)::integer AS anzahl, max(tag) AS zuletzt
   FROM sauber
  GROUP BY company_id, art, feld, wert;
