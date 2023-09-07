# Test für die Tourenseite:
- **Review durch Michael Brüggemann am 07.09.2023**

## Generell
+ Ist der Text auf der Seite sinnvoll?
    - bereits erl.
+ Ist die Seite responsive designed?
    - bereits erl.
+ Ist die Seite Benutzerfreundlich?
    - würde ich sagen, kann ich aber als Person die mitprogrammiert hat schlecht beurteilen
+ Kann man in Workflows "falsch klicken" und die Seite brechen?
    - nein, klappt

## "neue Tour anlegen" Modus
- ist das Vorgehen für den User intuitiv ersichtlich?
    - würde ich sagen, kann ich aber als Person die mitprogrammiert hat schlecht beurteilen
- können Stationen zu Touren verbunden werden?
    - klappt
- Was passiert, wenn zwei Stationen über 1000km voneinander entfernt sind (mit Landweg-Verbindung)?
    - Die Route kann nicht erstellt werden, es taucht auch das PopUp auf, sollte aber eigentlich klappen. 
    - Client-Fehler: "TypeError: tbody.rows[(table.tBodies[0].rows.length - 1)] is undefined" in "tours.js:565:17"
    - Server-Fehler: 413
- Was ist, wenn zwei Stationen nicht über Land verbunden sind?
    - Wenn ein Seeweg besteht, wird eine Tour über den Seeweg erstellt. Dies sollte nicht passieren.
- Was passiert, wenn zwei Stationen im Meer liegen?
    - Wenn Sie sich auf einem Seeweg befinden, so wird hier eine Tour berechnet und angelegt. Dies sollte nicht passieren.
- Was passiert wenn mehrere Stationen (3+) nacheinander zu einer immer längeren Tour verknüpft werden?
    - bis auf die Beschränkung des API-Keys passiert kein unerwartetes Verhalten. klappt.
- Was passiert, wenn ein der Stationen heftig ins nix (mitten in die Wüste) gesetzt wird?
    - Wenn kein Fahrradweg zur Verfügung steht, koommt eine entsprechende Fehlermeldung und es wird nichts gespeichert. klappt.

## Touren bearbeiten
- lassen sich Touren bearbeiten?
    - klappt
    - werden die Informationen entsprechend ergänzt (Infotext/auf der Karte)?
        - ja, klappt
- enthält die Tour-Information tatsächlich Daten der aktuell ausgewählten Tour?
    - klappt
- lassen sich Touren löschen?
    - ja, klappt 
- Funktioniert die Validierung der Eingabe?
    - erhält der User ein vernüftige Fehlernachricht, falls ein Fehler auftritt?
        - es ist noch möglich, einen leeren String anzugeben, das sollte nicht gehen
- lassen sich die Links der Stationen im Pop-Up anklicken?
    - ja, klappt
- Kann man eine Tour so bearbeiten, dass sie invalide wird ohne das ein Fehler auftritt?
    - ja, siehe Fehler bei der Validierung
- kann man einen Tournamen entfernen und die Tour dann speichern?
    - nein, klappt

### referentielle Integrität
- Das Popup mit der Warnung, das Touren gelöscht werden sollte auch eine Tour anzeigen, wenn diese keinen Namen hat. Das serverseitige Validieren sollte dies eigentlich verhindern, aber falls das nicht passiert, sollte die Warnnachricht z.B. "undefined" für Touren ohne Namen verwenden.
    - Bisher enthält die Warnnachricht keinen Solchen Hinweis. Das sollte noch passieren
- Werden Touren kaskadierend gelöscht, wenn eine Station aus der Tour gelöscht wird?
    - Bisher klappt dies nicht. Das ist noch falsch.
    - Client-Fehler: kein Fehler
    - Server-Fehler: 409
- Können Touren mit identischen Angaben nur ein Mal in die DB hinzugefügt werden?
    - Nein, bisher können auch exakte Duplikate in die DB hinzugefügt werden

### Routing
- führt die Route tatsächlich über Radwege/Fahrradstreifen an einer Straße?
    - ja, das Problem mit den Seewegen besteht aber weiterhin
- Ist der Centroid ein guter Punkt, wenn man zu einer großen Fläche navigieren will (man möchte ja nicht immer bis ins Zentrum eines Gebietes)?
    - man könnte überlegen, immer den nächstliegenden Punkt am Rand des Polygons zu wählen, ist aber vermutlich ziemlich aufwändig

## Tabelle
+ werden alle Touren angezeigt und die Tabelle bei Änderungen direkt mit aktualisiert?
    - ja, klappt
+ Wie sieht eine leere Tabelle aus?
    - gut, klappt