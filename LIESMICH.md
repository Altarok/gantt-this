# Obsidian Gantt Timeline Plugin

Willkommen bei der Dokumentation des Gantt Timeline Plugins für Obsidian.
Dieses Plugin ermöglicht es dir, deine Notizen und Ereignisse übersichtlich in interaktiven
Zeitlinien darzustellen.

![Beispielansicht der Zeitleiste](examples/img.png)

### Features & Aufbau

- **Ereignisse (Events):** Jeder Punkt oder Balken in der Zeitleiste entspricht einem Event.
  - **Balken:** Repräsentieren Zeitspannen.
  - **Punkte / Symbole:** Repräsentieren Zeitpunkte oder Meilensteine.
- **Dezentral im FrontMatter:** Ereignisse werden direkt in den YAML-Eigenschaften deiner Markdown-Dateien definiert.
- **Strukturierung:** Events lassen sich nach Gruppen und benutzerdefinierten Kalendern organisieren, filtern und
  sortieren.
- **Flexible Sichtbarkeit:** Gruppen, Kalender, Zeitspannen und Einzelpunkte lassen sich unabhängig voneinander ein- und
  ausblenden.
- **Individuelles Styling:** Zeitpunkte können mit Icons von [Lucide](https://lucide.dev) versehen und farblich
  angepasst werden.
- **Interaktivität:**
  - Mouseover zeigt relevante Metadaten im Tooltip an (Desktop).
  - Ein Klick auf ein Event öffnet direkt die Quellnotiz – optional inklusive Sprung zu einer bestimmten Überschrift.
  - Volle Navigation via Drag & Zoom (Mausrad auf Desktop, Gestensteuerung auf Mobilgeräten).

> **Datensicherheit & Datenschutz:**
> Das Plugin liest deine Notizen aus und kann auf Wunsch einen Codeblock in deine aktuelle Datei einfügen. Es löscht
> niemals Daten in deinem Vault und stellt **keine** Netzverbindungen her.

# Erste Schritte

## Gantt Chart / Zeitleiste erstellen

Es gibt zwei einfache Wege, eine Zeitleiste in eine Notiz einzubetten:

### Weg 1: Über den Befehl / das Ribbon-Icon (Empfohlen)

1. Klicke auf das Ribbon-Icon oder nutze die Befehlspalette: `Gantt this: Open code block creator`.
2. Das Modal führt dich schrittweise durch die Konfiguration:

- **Ordner für Events:** Gib an, wo nach Notizen mit Event-Daten gesucht werden soll (inklusive Toggle für rekursive
  Suche in Unterordnern).
- **Ordner für Kalender:** Gib an, wo benutzerdefinierte Kalenderdefinitionen liegen.
- Standardmäßig wird jeweils der Ordner der aktuell geöffneten Datei vorgeschlagen.

3. Am Ende kannst du den generierten Codeblock kopieren oder direkt an deiner aktuellen Cursorposition einfügen lassen.

### Weg 2: Manuell im Editor

Füge einfach folgenden Codeblock in eine beliebige Markdown-Datei ein:

````markdown
```gantt-this
```
````

## *Gantt Chart / Zeitleiste mit Leben füllen*

Um eine Notiz als Ereignis in deiner Zeitleiste anzuzeigen, fügst du folgende Eigenschaften in den YAML-Frontmatter der
Notiz ein:

```yaml
---
gantt-item: true           # Markiert die Notiz als Event
gantt-start: 2026-01-01    # Startdatum / Zeitpunkt
gantt-end: 2026-01-05      # Optional: Enddatum (Fallback ist 'gantt-start')
gantt-name: "Mein Projekt" # Optional: Name (Fallback ist der Dateiname)
gantt-group: "Entwicklung" # Optional: Gruppe (Fallback ist 'general')
---
```

## *Weitere FrontMatter Optionen*

Die folgende Tabelle zeigt alle verfügbaren Eigenschaften, die du in deinen Notizen verwenden kannst:

| Eigenschaft            | Typ / Werte                                | Optional? | Standardwert / Fallback                        | Beschreibung                                                             |
|------------------------|--------------------------------------------|-----------|------------------------------------------------|--------------------------------------------------------------------------|
| gantt-item             | Boolean                                    | Nein      | `true`                                         | Markiert die Notiz als Erfassungsobjekt für das Plugin.                  |
| gantt-start            | String                                     | Nein      | *Keiner* (Notiz wird ohne Startwert ignoriert) | Startdatum oder Startwert des Ereignisses.                               |
| gantt-end              | String                                     | Ja        | Wert von `gantt-start`                         | Enddatum des Ereignisses. Bei identischem Wert wird ein Punkt angezeigt. |
| gantt-name             | String                                     | Ja        | Dateiname ohne Endung (`file.basename`)        | Name des Ereignisses in der Zeitleiste und im Tooltip.                   |
| gantt-type             | String                                     | Ja        | Standard-Kalender des Plugins                  | Bestimmt den zugewiesenen Kalendertyp.                                   |
| gantt-group            | String                                     | Ja        | `'general'`                                    | Gruppe für die Zeilenanordnung und Strukturierung.                       |
| gantt-color            | Farbe (z.B. `#ff0000`, `red`)              | Ja        | Gruppenfarbe → Kalenderfarbe → Standard        | Überschreibt die Hintergrundfarbe des Events individuell.                |
| gantt-displayIcon      | String ([Lucide Icon](https://lucide.dev)) | Ja        | *Keins*                                        | Zeigt ein Icon auf dem Event an.                                         |
| gantt-displayIconColor | Farbe (z.B. `#ff0000`, `red`)              | Ja        | Standard-Icon-Farbe                            | Legt die Farbe des Icons fest.                                           |
| gantt-symbol           | bar, point, icon, diamond                  | Ja        | `bar` (Zeitspanne) bzw. `point` (Zeitpunkt)    | Legt die visuelle Darstellungsform des Events fest.                      |
| gantt-linkToHeader     | String                                     | Ja        | *Keine* (Springt zum Dateianfang)              | Verlinkt beim Klicken direkt auf eine spezifische Überschrift.           |

## *Benutzerdefinierte Kalender-Definitionen*

Wenn du eigene Zeitsysteme oder fiktive Kalender in deinem Vault verwendest, kannst du diese über eine separate Notiz
definieren:

| Eigenschaft             | Typ / Werte | Optional? | Standardwert / Fallback | Beschreibung                                                              |
|:------------------------|:------------|:----------|:------------------------|:--------------------------------------------------------------------------|
| `gantt-type-definition` | String      | **Nein**  | *Keiner*                | Eindeutiger Identifikator des Kalenders für den Verweis via `gantt-type`. |
