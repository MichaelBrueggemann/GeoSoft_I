# Tests für die Stationsseite:

## Generell
+ Ist der Text auf der Seite sinnvoll?
    - Ja
+ Ist die Seite responsive designed?
    - Ja
+ Ist die Seite Benutzerfreundlich?
    - Ja
+ Kann man in Workflows "falsch klicken" und die Seite brechen?
    - Ich denke nicht

## Hinzufügen von Stationen
### MediaWiki-API
+ Funktioniert der API-Call bei unterschiedlichen URLs?
    - Ja
+ Wird die Beschreibung korrekt ersetzt (add/update)?
    - **Wenn im ersten Satz ein Punkt zum bspl als Abkürzung oder für Daten genutzt wird funktioniert es noch nicht so schön** (https://de.wikipedia.org/wiki/G oder https://de.wikipedia.org/wiki/Alfred_Zesiger)


### Über die Karte
+ Ist der Helptext sinnvoll?
    - Ja
+ Punkt-Station hinzufügen
    - Ja
+ Polygon-Station hinzufügen
    - Ja
+ Stationen vor dem hinzufügen per Draw-Tool editieren
    - Klappt soweit, **aber wenn man das editieren nicht speichert, wird das "Über die Karte hinzufügen"-Segment nicht automatisch geschlossen**
+ Stationen vor dem Hinzufügen per Draw-Tool löschen
    - Klappt alles
+ ohne Karteninteraktion -> Fehlermeldung?
    - Ja
+ ohne Namen -> Fehler-Meldung?
    - Ja
+ ohne Beschreibung -> Fehler-Meldung?
    - Ja
+ mit und ohne URL versuchen
    - Ja
+ funktioniert das ersetzen der Beschreibung bei Wikipedia-Link?
    - Ja 
+ Funktioniert der Abbrechen-Knopf (wird Karte und Felder resetet)?
    - Ja

### Über Textfeld
+ Ist der Helptext sinnvoll?
    - Ja
+ Punkt-Station hinzufügen
    - Ja
+ Polygon-Station hinzufügen
    - Ja
+ entspricht das Beispiel einer Station die auf anderem Wege genauso in die Datenbank gelangen könnte?
    - Ja
+ ohne Namen -> Fehler-Meldung?
    - Ja
+ ohne Beschreibung -> Fehler-Meldung?
    - Ja
+ mit und ohne URL versuchen
    - Ja
+ funktioniert das ersetzen der Beschreibung bei Wikipedia-Link?
    - Ja
+ Falsche Koordinaten eingeben (478.23,-200.3)
    - Ja
+ Keine Koordinaten eingeben
    - Ja
+ Falsches Format/ Klammersetzung erkennen
    - Ja
+ Koordinaten bedingt nach Punkt oder Polygon unterscheiden können
    - Ja
+ Funktioniert der Abbrechen-Knopf (wird Karte und Felder resetet)?
    - Ja

### Über Datei-Upload
+ alle Punkte vom Textfeld s. o.
    - Klappt alles
+ Funktioniert es bei richtigem Format?
    - Ja
+ Falsches Format -> spezifische Fehlermeldung?
    - **Nein**, aber durch die Validierung kommen andere Fehlermeldungen (außer bei z.B. .txt-Datei mit korrekter GeoJSON drin, da gelangen die Daten bis zur Datenbank, aber ist das überhaupt schlimm?🤔)
+ Kann man immer nur eine Datei gleichzeitig uploaden bzw durch mehrere Uploads Fehler erzeugen?
    - Alles korrekt

## Tabelle
+ werden alle Stationen angezeigt und die Tabelle bei Änderungen direkt mit aktualisiert?
    - Ja
+ Wie sieht eine leere Tabelle aus?
    - Man sieht nur die Tabellenheader, aber ich denke das ist ok

### Bearbeiten
**FEHLER WERDEN ABGEFANGEN, ES GIBT ABER KEINE FEHLERMELDUNG!**
+ Wäre ein Helptext sinnvoll?
    - Ich glaube das sollte so auch klar sein
+ kann man bei einem punkt feature den typ zu polygon umbenennen ohne die coordinaten anzupassen?
    - Nein
+ ohne Namen -> Fehler-Meldung?
    - Ja
+ ohne Beschreibung -> Fehler-Meldung?
    - Ja
+ mit und ohne URL versuchen
    - Ja
+ funktioniert das ersetzen der Beschreibung bei Wikipedia-Link?
    - Ja
+ Falsche Koordinaten eingeben (478.23,-200.3)
    - Ja
+ Keine Koordinaten eingeben
    - Ja
+ Falsches Format/ Klammersetzung erkennen
    - Ja
+ Funktioniert die Abbrechen-Knöpfe
    - Ja

### Löschen
+ Funktioniert das Löschen?
    - Ja
+ Kaskadiert das Löschen?
    - Ja

### Auswählen
punkte jeweils für Punkte und Polygone überprüfen
+ Wird eine Station gehighligthed bei klick?
    - Ja
+ Kann man sie dehighlighten?
    - Ja
+ während einer gehighlighteten Station auf eine andere klicken
    - Ja
+ Wird passend auf die Stationen gezoomt?
    - Ja

## Sonstiges 
**was beim Testen sonst noch aufgefallen ist:**
## Bugs und unschönes
+ Beim Hinzufügen der Karte, kann es vorkommen, dass eine fehlerhafte URL (z.B. "s") zwischenzeitlich grün abgehakt wird, wenn andere Fehler zeitgleich vorkommen
    - Wenn man Client- und Serverseitig validiert, kommt es häufig zu solchen optischen Ungenauigkeiten, aber das ist in diesem Fall ok

## Was eig vllt noch coole Features wären
+ Theoretisch wäre cool wenn man die Description auch leer lassen könnte, sofern man einen gültigen Wikipedia Link angibt🤔
+ Ein "copy"-Button beim Textfeld-Bspl
+ Genauere Fehlermeldungen bei falschen Koordinaten
