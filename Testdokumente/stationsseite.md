# Tests für die Stationsseite:

## Generell
+ Ist der Text auf der Seite sinnvoll?
+ Ist die Seite responsive designed?
+ Ist die Seite Benutzerfreundlich?
+ Kann man in Workflows "falsch klicken" und die Seite brechen?

## Hinzufügen von Stationen
### Über die Karte
+ Ist der Helptext sinnvoll?
+ Punkt-Station hinzufügen
+ Polygon-Station hinzufügen
+ Stationen vor dem hinzufügen per Draw-Tool editieren
+ Stationen vor dem Hinzufügen per Draw-Tool löschen
+ ohne Karteninteraktion -> Fehlermeldung?
+ ohne Namen -> Fehler-Meldung?
+ ohne Beschreibung -> Fehler-Meldung?
+ mit und ohne URL versuchen
+ funktioniert das ersetzen der Beschreibung bei Wikipedia-Link?
+ Funktioniert der Abbrechen-Knopf (wird Karte und Felder resetet)?

### Über Textfeld
+ Ist der Helptext sinnvoll?
+ Punkt-Station hinzufügen
+ Polygon-Station hinzufügen
+ entspricht das Beispiel einer Station die auf anderem Wege genauso in die Datenbank gelangen könnte?
+ ohne Namen -> Fehler-Meldung?
+ ohne Beschreibung -> Fehler-Meldung?
+ mit und ohne URL versuchen
+ funktioniert das ersetzen der Beschreibung bei Wikipedia-Link?
+ Falsche Koordinaten eingeben (478.23,-200.3)
+ Keine Koordinaten eingeben
+ Falsches Format/ Klammersetzung erkennen
+ Koordinaten bedingt nach Punkt oder Polygon unterscheiden können
+ Funktioniert der Abbrechen-Knopf (wird Karte und Felder resetet)?

### Über Datei-Upload
+ alle Punkte vom Textfeld s. o.
+ Funktioniert es bei richtigem Format?
+ Falsches Format -> Fehlermeldung?
+ Kann man immer nur eine Datei gleichzeitig uploaden bzw durch mehrere Uploads Fehler erzeugen?

## Tabelle
+ werden alle Stationen angezeigt und die Tabelle bei Änderungen direkt mit aktualisiert?
+ Wie sieht eine leere Tabelle aus?

### Bearbeiten
+ Wäre ein Helptext sinnvoll?
+ kann man bei einem punkt feature den typ zu polygon umbenennen ohne die coordinaten anzupassen?
+ ohne Namen -> Fehler-Meldung?
+ ohne Beschreibung -> Fehler-Meldung?
+ mit und ohne URL versuchen
+ funktioniert das ersetzen der Beschreibung bei Wikipedia-Link?
+ Falsche Koordinaten eingeben (478.23,-200.3)
+ Keine Koordinaten eingeben
+ Falsches Format/ Klammersetzung erkennen
+ Funktioniert die Abbrechen-Knöpfe

### Löschen
+ Funktioniert das Löschen?
+ Kaskadiert das Löschen?

### Auswählen
punkte jeweils für Punkte und Polygone überprüfen
+ Wird eine Station gehighligthed bei klick?
+ Kann man sie dehighlighten?
+ während einer gehighlighteten Station auf eine andere klicken
+ Wird passend auf die Stationen gezoomt?
