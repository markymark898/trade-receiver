# Symbol Key — Trading Bot Guide Markup Language

This document defines every symbol used in the four guide segments. Feed this to your app so it knows how to parse, render, and style each block.

---

## Page Wrapper

[PAGE:n|Title]
...content...
[/PAGE]

- Marks the start and end of a full course page/segment
- n = page number (integer)
- Title = display title for the page tab or breadcrumb
- Everything between [PAGE] and [/PAGE] is the content of that screen
- Render as: full scrollable page with the Title shown in the header or breadcrumb

---

## Section Wrapper

[SECTION:Title]
...content...
[/SECTION]

- Groups related content within a page
- Title = section heading text
- Render as: a titled content block or card, optionally with a subtle divider above it
- The Title should be rendered as an H3 or H4 heading

---

## Step Block

[STEP:n|Title]
...content...
[/STEP]

- Marks a discrete instructional step within a section
- n = step number
- Title = step label shown next to the number
- Render as: a numbered step with a circle or badge showing n, the Title next to it, and the content indented below

---

## Copy Block

[COPY]
...text to copy...
[/COPY]

- A block of text the user needs to copy and paste somewhere (code, JSON, URLs, templates)
- Render as: a bordered box with a monospace font, a COPY button in the top-right corner, and a subtle background color (light gray or light orange tint)
- Clicking the copy button copies the entire inner text to clipboard
- Do NOT trim leading or trailing whitespace — preserve exact formatting

---

## Command Block

[CMD]
...shell command...
[/CMD]

- A terminal or shell command the user needs to run
- Render as: a dark-background terminal-style box (dark gray or black background, light text), with a COPY button
- Prefix the box with a small terminal icon or a $ symbol indicator

---

## Prompt Block

[PROMPT:Label]
...text to paste into an AI coding assistant...
[/PROMPT]

- A block of text meant to be pasted directly into an agentic coder (e.g. Replit Agent, Cursor, Claude Code)
- Label = a short name shown on the block header (e.g. "Project Scaffold", "Database Schema")
- Render as: a distinct, high-visibility box — larger than a COPY block, with a prominent header showing the Label, a robot or AI icon, and a large COPY button
- Use a different accent color from standard COPY blocks to visually separate "paste this into your AI" from "paste this into TradingView"
- Preserve all newlines and indentation exactly

---

## Note Block

[NOTE]
...informational content...
[/NOTE]

- A callout box with helpful context or explanation — not a warning, just useful information
- Render as: a blue or neutral-tinted box with an info icon (ℹ) on the left
- Text inside is regular prose

---

## Warning Block

[WARN]
...warning content...
[/WARN]

- A callout box highlighting something the user must not do, or a common mistake to avoid
- Render as: a yellow or orange-tinted box with a warning icon (⚠) on the left
- Use distinct color from NOTE to convey urgency

---

## Tip Block

[TIP]
...tip content...
[/TIP]

- A callout box with a recommendation or best practice
- Render as: a green-tinted box with a lightbulb or checkmark icon on the left
- Friendly in tone — not a warning

---

## Table Block

[TABLE]
| Col | Col |
|---|---|
| Row | Row |
[/TABLE]

- Wraps a standard Markdown table
- Render as: a styled HTML table with alternating row colors, a header row with a colored background (orange or gray), and full-width layout within its container
- Standard markdown pipe table syntax inside

---

## Inline Key Term

[KEY]term[/KEY]

- An inline code term, variable name, keyboard shortcut, or symbol that should be visually highlighted
- Render as: an inline monospace badge with a light background pill — similar to a <code> tag but styled
- Example: press [KEY]Alt+A[/KEY] renders as a keyboard-shortcut badge

---

## Image / Screenshot

[IMG:objectPath|Alt text]

- Embeds an uploaded screenshot or image inline in the guide content
- objectPath = the object path returned when the image was uploaded, e.g. /objects/abc123-def456
- Alt text = descriptive label shown below the image and used as the HTML alt attribute
- Render as: a full-width (or max-width-constrained) image block with the alt text shown as a caption beneath it
- The image is served from: /api/storage/objects{objectPath}
  Full URL example: /api/storage/objects/objects/abc123-def456
- Images should be lazy-loaded and have a subtle border or shadow
- On click, open the full-resolution image in a lightbox or new tab
- Example usage in a guide file:
  [IMG:/objects/abc123|TradingView alert notification tab showing webhook URL field]

---

## Downloadable File

[DOWNLOAD:objectPath|Button label]

- Renders a prominent download button for a file that was uploaded to the guide assets library
- objectPath = the object path returned when the file was uploaded, e.g. /objects/abc123-def456
- Button label = text shown on the download button, e.g. "Download Starter Pine Script"
- Render as: a styled button or card with a download icon, the label text, and an href pointing to the file
- The file is served from: /api/storage/objects{objectPath}
  Full URL example: /api/storage/objects/objects/abc123-def456
- The link should use the HTML download attribute so the browser saves rather than navigates
- Optionally display the file size and type as secondary metadata if available
- Example usage in a guide file:
  [DOWNLOAD:/objects/abc123|Download Starter Pine Script (.pine)]

---

## Navigation Bar

[NAV:Prev Title|Next Title]

- A navigation row placed at the bottom of each page
- Prev Title = title of the previous segment, or the word none if this is the first page
- Next Title = title of the next segment, or the word none if this is the last page
- Render as: a bottom bar with a left arrow + "← Prev Title" button on the left and a "Next Title →" button on the right
- If either value is none, hide that button

---

## Standard Markdown

All standard markdown is also used within guide files:

- # ## ### for headings (H1, H2, H3)
- **bold** for emphasis
- `backtick inline code` for short code within prose
- --- for horizontal rule / section divider
- Numbered and bulleted lists for steps and options

Render all standard markdown normally. The custom symbol blocks above layer on top of standard markdown — they do not replace it.

---

## Summary Table

| Symbol | Purpose | Render Style |
|---|---|---|
| [PAGE:n\|Title] / [/PAGE] | Full course page | Scrollable screen, title in header |
| [SECTION:Title] / [/SECTION] | Content grouping | Titled block with H3/H4 heading |
| [STEP:n\|Title] / [/STEP] | Numbered instruction step | Circle badge + label + indented content |
| [COPY] / [/COPY] | Copyable text block | Light bordered box + COPY button |
| [CMD] / [/CMD] | Terminal command | Dark terminal box + COPY button |
| [PROMPT:Label] / [/PROMPT] | AI coder prompt | High-visibility box + AI icon + COPY button |
| [NOTE] / [/NOTE] | Informational callout | Blue/neutral box + ℹ icon |
| [WARN] / [/WARN] | Warning callout | Yellow/orange box + ⚠ icon |
| [TIP] / [/TIP] | Best practice callout | Green box + lightbulb icon |
| [TABLE] / [/TABLE] | Styled data table | Striped HTML table, colored header |
| [KEY]term[/KEY] | Inline code/key term | Monospace pill badge |
| [IMG:path\|alt] | Embedded screenshot or image | Full-width image + caption + lightbox |
| [DOWNLOAD:path\|label] | Downloadable file button | Download button/card + file icon |
| [NAV:Prev\|Next] | Page navigation | Bottom bar with prev/next buttons |

---

## How Paths Work

When a file or image is uploaded through the Guide Assets page, the server returns an objectPath like:

```
/objects/550e8400-e29b-41d4-a716-446655440000
```

To build the serving URL, prepend the storage endpoint:

```
/api/storage/objects/objects/550e8400-e29b-41d4-a716-446655440000
```

The Guide Assets page has a copy button next to every uploaded asset that copies the correct [IMG:...|...] or [DOWNLOAD:...|...] symbol for you automatically — you do not need to construct the path by hand.
