# Antwortbewertung im Grammatiktraining korrigiert

Basis: GitHub-Commit `35fb9c6082a02fe5ea5107e34fdccbb5f344b730`.

Die Bewertung unterscheidet jetzt den verlangten Antwortumfang. Wörter und Wortgruppen brauchen keinen künstlichen Satzanfang. Ganze Sätze und Fragen behalten ihre Formprüfung. Wochentage und Eigennamen werden anhand der jeweils passenden hinterlegten Antwort geprüft. Ein Formhinweis zählt weiterhin nicht als vollständig richtige Antwort.

Positive Kurzantworten dürfen nicht mit einer verkürzten positiven Hilfsverbform enden: `Yes, I'm.` wird als Fehler erkannt; `Yes, I am.` ist korrekt. Die Kurzform `'s got` wird als `has got` erkannt, während `'s` bei gewöhnlichen be-Konstruktionen `is` bleibt. Weitere have-Kurzformen und typografische Apostrophe werden unterstützt. Dadurch wird `She's got a brother.` akzeptiert, ohne `She is got a brother.` freizugeben.

Die Eingabehinweise und Platzhalter passen nun zu Wort, Wortgruppe, Satz oder Frage. Die Versionskennung wird auf 5 erhöht, damit eine bereits geöffnete Aufgabe oder ein laufender Lerncheck nicht mit veraltetem Bewertungsstatus weiterläuft. Themenwahl, Wiederholungsliste, Notizen außerhalb dieser Seite und bisherige Zähler werden nicht gelöscht. Frühere Gesamtergebnisse können mangels gespeicherter Einzelantworten nicht nachträglich neu bewertet werden.

## Aktuelle Verifikation

`node tests/grammatiktraining-answer.dom.cjs` prüft die aktuelle öffentliche Schnittstelle `GrammarTraining.DATA`, `pool`, `diagnose` und `makeExam` sowie Eingaben und Auswertung über die tatsächlichen DOM-Steuerelemente.

- 704 erfolgreiche Assertions.
- Alle 652 hinterlegten Musterantworten aus 448 Aufgaben akzeptiert: 336 allgemeine Aufgaben und 112 Vergleichsaufgaben.
- Gezielte Gegenproben für falsche Kurzantworten, verwechslungsgefährdete Kurzformen, Großschreibung und Satzzeichen.
- Durchgängige Prüfung einer Lückenantwort im Training und einer falschen Kurzantwort im Lerncheck.
- Alle sechs Kombinationen aus Lernweg und Aufgabenart erzeugen zwölf unterschiedliche Aufgaben.
- Keine JavaScript-Laufzeitfehler im DOM-Prüflauf.

Ausführung mit Node.js und `jsdom@26`:

```sh
npm install --no-save --package-lock=false jsdom@26
node tests/grammatiktraining-answer.dom.cjs
```

Die ältere Datei `tests/grammatiktraining.browser.cjs` und der Prüfbericht vom 28. Oktober beziehen sich auf eine frühere Trainingsschnittstelle (`TASKS`, `FREE_TASKS`, `diagnoseAnswer`). Ihre früheren Ergebnisse sind keine Verifikation der aktuellen Seite. Für die hier korrigierte Bewertungslogik ist der neue DOM-Prüflauf maßgeblich. Eine neue visuelle Browserprüfung wird nicht behauptet.
