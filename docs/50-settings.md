---
title: Plugin Settings
order: 50
draft: true
---

# Plugin Settings

Global plugin settings allow you to configure default folders, set fallback colors, and manage custom calendar rules across your vault.

## General Configuration

- **Default Events Folder:** Specify the root folder where the plugin searches for event notes (e.g., `Events`). If left blank, the entire vault is scanned.
- **Search Sub-folders for Events:** Enable this toggle to recursively search all nested subdirectories inside the designated events folder.
- **Default Calendar Folder:** Define the folder path where custom calendar definitions are stored (e.g., `calendardefinitions`).
- **Search Sub-folders for Calendars:** Toggle whether subdirectories inside the calendar folder are scanned for YAML definitions.

## Calendar & Group Management

Manage active calendars, assign colors, and control lane order:

- **Active Calendars:** Add or remove calendars by their unique `id`. Toggle visibility to hide entire calendar systems without deleting definitions.
- **Default Group Options:** Pre-define groups to set default colors, toggle default visibility, and adjust lane sorting order on your charts.
- **Fallback Colors:** Set global default colors for timeline markers, bars, and icons when no specific event, group, or calendar color is defined.

> [!tip] Override Priority
> Settings act as vault-wide defaults. You can always override global colors, property names, or folder paths locally using specific code block parameters or Base view configurations.

## Property Names & Key Mappings

Customize the YAML frontmatter keys the plugin looks for in your Markdown notes:

- **Item Marker:** Default is `gantt-item`. Marks a note as an event target.
- **Start / End Dates:** Defaults are `gantt-start` and `gantt-end`.
- **Name & Group:** Defaults are `gantt-name` and `gantt-group`.
- **Calendar & Symbol:** Defaults are `gantt-calendar` and `gantt-symbol`.

*Renaming these properties in settings allows you to align the plugin with existing Dataview or frontmatter conventions in your vault.*
