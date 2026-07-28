# Obsidian Gantt Timeline Plugin

Willkommen bei der Dokumentation des Gantt Timeline Plugins für Obsidian.
Dieses Plugin ermöglicht es dir, deine Notizen und Ereignisse übersichtlich in interaktiven
Zeitlinien darzustellen.

Beispiel:
![img.png](examples/img.png)

- Jeder der farbigen Punkte oder Balken in der oberen Hälfte des Screenshots entspricht einem Event.
  - Balken repräsentieren Zeitspannen.
  - Punkte oder Symbole repräsentieren Zeitpunkte.
- Jedes Event wird im FrontMatter einer Markdown-Datei definiert.
- Events können gruppiert werden.
- Beliebig viele von dir definierte Kalender können angezeigt werden.
- Sowohl Gruppen als auch Kalender lassen sich ein- und ausblenden.
- Sowohl Gruppen als auch Kalender lassen sich sortieren.
- Sowohl Zeitspannen als auch Zeitpunkte lassen sich ein- oder ausblenden.
- Zeitpunkte können mit einem icon deiner Wahl versehen werden. (QUELLE: https://lucide.dev)
- Metadaten der Events werden in einem Tooltip angezeigt.
- Ein Klick auf Events öffnet die entsprechende Quelldatei.
  - Oder einen von dir definierten Header der Datei.

> Wichtig: Das Plugin kann deine Daten nicht löschen.
> Es kann, wenn du das wünschst, Daten schreiben. Konkreter kann es einen Codeblock in eine Markdown-Datei einfügen.<br>
> Außerdem besteht keine Verbindung ins Netz.

# **Erste Schritte**

## *Gantt Chart / Zeitleiste erstellen*

Es gibt 2 Möglichkeiten dies zu erreichen.

1. Öffne eine Markdown-Datei und nutze das Ribbon Icon `'Gantt this: Open code block creator'` und lass dich vom Modal
   durch die Schritte führen.

- Du darfst angeben in welchem Ordner das Plugin nach Events suchen darf.
  - Standardwert ist: Der Ordner der gerade offenen Datei
- Du darfst angeben in welchem Ordner das Plugin nach Kalendern suchen darf.
  - Auch hier: Der Standardwert ist der Ordner der gerade offenen Datei
- Am unteren Ende des Popup kannst du deinen von dir definierten Codeblock sehen.
- Die 2 Buttons neben dem Codeblock lassen ihn dich entweder ..
  - .. kopieren und manuell an die Stelle deiner Wahl einfügen oder ..
  - .. direkt an die Stelle deines Cursors schreiben.

2. Oder kopiere dies in eine Datei:

````
```gantt-this
```
````

## *Gantt Chart / Zeitleiste mit Leben füllen*

Um eine oder mehrere Notizen als event in deiner Zeitleiste anzuzeigen,
füge einfach das entsprechende FrontMatter in deine Markdown-Datei ein:

```yaml
---
gantt-item: true           # Könnte eventuell bald wegfallen
gantt-start: 2026-01-01
gantt-end: 2026-01-05      # Optional, als Fallbackwert wird der Startwert ('gentt-start') genutzt 
gantt-name: "Mein Projekt" # Optional, als Fallbackwert wird der Dateiname angezogen
gantt-group: "Entwicklung" # Optional, als Fallbackwert wird 'general' genutzt
---
```

## *Weitere FrontMatter Optionen*

Die folgende Tabelle zeigt alle verfügbaren Eigenschaften, die du in deinen Notizen verwenden kannst:

| Eigenschaft        | Typ / Werte               | Optional? | Standardwert / Fallback                     | Beschreibung                                                             |
|--------------------|---------------------------|-----------|---------------------------------------------|--------------------------------------------------------------------------|
| gantt-item         | Boolean                   | Nein      | Keine (muss true sein)                      | Aktiviert die Erfassung der Notiz als Gantt-Ereignis.                    |
| gantt-start        | String                    | Nein      | Keine (Eintrag wird sonst ignoriert)        | Startdatum oder Startwert des Ereignisses.                               |
| gantt-end          | String                    | Ja        | Entspricht dem Startwert (gantt-start)      | Enddatum des Ereignisses. Bei identischem Wert wird ein Punkt angezeigt. |
| gantt-name         | String                    | Ja        | Dateiname ohne Endung (file.basename)       | Name des Ereignisses in der Zeitleiste und im Tooltip.                   |
| gantt-type         | String                    | Ja        | Standard-Kalender des Plugins               | Bestimmt den verwendeten Kalendertyp.                                    
| gantt-group        | String                    | Ja        | 'general'                                   | Gruppe für die Zeilenanordnung und Strukturierung.                       |
| gantt-color        | Hex-Code (z.B. #ff0000)   | Ja        | Gruppenfarbe → Kalenderfarbe → Standardwert | Überschreibt die Farbe des Balkens oder Punktes individuell.             |
| gantt-displayIcon  | String (Lucide-Icon)      | Ja        | Leer (kein Icon)                            | Zeigt ein Icon an (nur bei Punkt-Darstellung wirksam).                   |
| gantt-symbol       | bar, point, icon, diamond | Ja        | bar (Zeitspanne) bzw. point (Einzelpunkt)   | Legt die visuelle Darstellungsform fest.                                 |
| gantt-linkToHeader | String                    | Ja        | Leer (verlinkt an den Anfang)               | Verlinkt direkt auf eine spezifische Überschrift beim Klicken.           |

## *Benutzerdefinierte Kalender-Definitionen*

Wenn du eigene Zeitsysteme oder Kalender im Vault verwendest, kannst du diese über eine separate Notiz definieren:

| Eigenschaft           | Typ / Werte | Optional? | Standardwert / Fallback | Beschreibung                                                            |
|-----------------------|-------------|-----------|-------------------------|-------------------------------------------------------------------------|
| gantt-type-definition | String      | Nein      | Keine                   | Eindeutiger Identifikator des Kalenders für den Verweis via gantt-type. |



