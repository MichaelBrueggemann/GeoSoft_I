# Test für die Tourenseite:

## Generell
+ Ist der Text auf der Seite sinnvoll?
+ Ist die Seite responsive designed?
+ Ist die Seite Benutzerfreundlich?
+ Kann man in Workflows "falsch klicken" und die Seite brechen?

## "neue Tour anlegen" Modus
- ist das Vorgehen für den User intuitiv ersichtlich?
- können Stationen zu Touren verbunden werden?
- Was passiert, wenn zwei Stationen über 1000km voneinander entfernt sind (mit Landweg-Verbindung)?
- Was ist, wenn zwei Stationen nicht über Land verbunden sind?
- Was passiert, wenn zwei Stationen im Meer liegen?
- Was passiert wenn mehrere Stationen (3+) nacheinander zu einer immer längeren Tour verknüpft werden?
- Was passiert, wenn ein der Stationen heftig ins nix (mitten in die Wüste) gesetzt wird?

## Touren bearbeiten
- lassen sich Touren bearbeiten?
    - werden die Informationen entsprechend ergänzt (Infotext/auf der Karte)?
- enthält die Tour-Information tatsächlich Daten der aktuell ausgewählten Tour?
- lassen sich Touren löschen?
- Funktioniert die Validierung der Eingabe?
    - erhält der User ein vernüftige Fehlernachricht, falls ein Fehler auftritt?
- lassen sich die Links der Stationen im Pop-Up anklicken?
- Kann man eine Tour so bearbeiten, dass sie invalide wird ohne das ein Fehler auftritt?
- kann man einen Tournamen entfernen und die Tour dann speichern?

### referentielle Integrität
- Das Popup mit der Warnung, das Touren gelöscht werden sollte auch eine Tour anzeigen, wenn diese keinen Namen hat. Das serverseitige Validieren sollte dies eigentlich verhindern, aber falls das nicht passiert, sollte die Warnnachricht z.B. "undefined" für Touren ohne Namen verwenden.
- Können Touren mit identischen Angaben nur ein Mal in die DB hinzugefügt werden?

### Routing
- führt die Route tatsächlich über Radwege/Fahrradstreifen an einer Straße?
- Ist der Centroid ein guter Punkt, wenn man zu einer großen Fläche navigieren will (man möchte ja nicht immer bis ins Zentrum eines Gebietes)?

## Tabelle
+ werden alle Touren angezeigt und die Tabelle bei Änderungen direkt mit aktualisiert?
+ Wie sieht eine leere Tabelle aus?