# FinSecure Compliance

Real-time compliance for regulated support teams on **Freshdesk** and **Freshservice**. FinSecure captures agent actions, blocks destructive ticket operations, logs field changes, and integrates Freshdesk click-to-dial — each feature runs on the Freshworks surface where the platform actually fires those events.

---

## Why the app is split across surfaces

Freshworks only exposes certain events on certain pages. FinSecure maps each capability to the right placeholder instead of cramming everything into a narrow requester-info strip.

| Surface | Product | What it does | Why it exists |
|---------|---------|--------------|---------------|
| **Ticket background** | Freshdesk, Freshservice | Invisible listener on every ticket page — captures clicks, field changes, and enforces guardrails | Events fire while agents work even if no UI is open |
| **Ticket sidebar** | Freshdesk, Freshservice | Per-ticket dashboard — guardrails toggle, readable action log, blocked attempts | Wide panel with room to review one ticket |
| **Compliance Center** | Freshdesk, Freshservice | Full-page cross-ticket audit review | Supervisors browse activity across tickets |
| **New ticket sidebar** | Freshdesk, Freshservice | SOX change tracker while creating a ticket | Change events only fire on the new-ticket page |
| **CTI dialer** | Freshdesk only | Click-to-dial number display | `cti.triggerDialer` only fires in the CTI global sidebar — not on ticket pages |

### Why is there a dialer?

The dialer is **not** part of ticket compliance. Contact-center agents use Freshdesk’s **CTI bar** (bottom-left phone widget). When they click a phone number anywhere in Freshdesk, the platform emits `cti.triggerDialer` **only** to apps in `cti_global_sidebar`. That event cannot be received from the ticket sidebar or full page — so the dialer is a separate, intentional surface for telephony integration.

---

## Features

### Always-on capture (ticket background)

Runs silently on every ticket you open:

- Logs replies, forwards, notes, timers, navigation, and property updates
- Logs priority, status, group, assignee, and type changes on the ticket details page
- Blocks close and delete when guardrails are enabled
- Persists everything to the platform key-value store per ticket ID

You do not need to keep the sidebar open for capture to work.

### Ticket sidebar — per-ticket dashboard

Open **FinSecure Compliance** in the ticket sidebar (wider than the old requester-info slot):

- **Guardrails** — toggle protect close & delete (synced with background enforcement)
- **Action log** — full-height scrollable list with timestamps
- **Blocked attempts** — every stopped close/delete on this ticket
- **Refresh** — pull latest entries from storage

### Compliance Center — full page

Open from the **Apps** menu in the left navigation:

- Table of all tickets with captured activity
- Click a ticket to read its complete audit log
- Feature map explaining where each capability lives

### New ticket change tracker

On the new-ticket page sidebar:

- Logs priority, status, group, assignee, and type changes with previous → current values
- HR queue coaching when group assignment may not match policy

### CTI dialer (Freshdesk)

In the CTI global sidebar:

- Shows the E.164 number when an agent clicks a phone number or call icon
- Clear control to reset between calls

---

## Architecture

```
Ticket page (always running)
  └── ticket_background     → capture + guardrails → client.db

Ticket page (agent opens sidebar)
  └── ticket_sidebar        → read/write db, guardrails toggle, logs

Apps menu (full page)
  └── full_page_app         → Compliance Center, cross-ticket index

New ticket page
  └── new_ticket_* sidebar  → change-event tracker

Freshdesk CTI bar
  └── cti_global_sidebar    → click-to-dial only
```

### How every feature stays active

| Feature | Ensured by |
|---------|------------|
| Action audit log | `ticket_background` registers click + change listeners on every ticket activation |
| Guardrails | `ticket_background` intercept handlers read guardrails setting from `client.db` |
| Per-ticket review | `ticket_sidebar` reads the same `client.db` keys for the open ticket |
| Cross-ticket review | `compliance-center` reads the ticket index + per-ticket logs from `client.db` |
| New-ticket SOX log | Dedicated `new-ticket.html` on new-ticket placeholders only |
| Click-to-dial | Dedicated `cti.html` on `cti_global_sidebar` only |

---

## Setup

```sh
git clone https://github.com/freshworks-developers/events-method-samples.git
cd events-method-samples
fdk run
```

Append `?dev=true` to your Freshdesk or Freshservice URL.

### Where to test

1. **Ticket details** → click the **FinSecure shield icon** in the **right sidebar apps** list (Freshservice requires this click; Freshdesk loads it with the conversation)
2. **Apps menu** (left nav) → **Compliance Center** full page
3. **New ticket** → change tracker in the new-ticket sidebar
4. **CTI dialer (Freshdesk only)** → see [Using the CTI dialer](#using-the-cti-dialer-freshdesk-only) below

### Sidebar size

The ticket sidebar height is expanded automatically to **700px** (platform maximum) via `client.instance.resize`. To widen the panel horizontally, drag the divider between the ticket body and the right sidebar in Freshdesk/Freshservice.

### Using the CTI dialer (Freshdesk only)

The dialer is **not** inside the ticket sidebar. It lives in the **CTI global sidebar** — the phone widget at the **bottom-left** of Freshdesk.

1. Run `fdk run` and open Freshdesk with `?dev=true`
2. Find the **app/phone icon** in the **bottom-left corner** of the screen
3. **Click the icon** to open the CTI panel (about 400×400px)
4. Open any ticket and click a **phone number** or **call icon** in Contact details
5. The number appears in the FinSecure Dialer panel

This is the only placeholder where Freshdesk fires `cti.triggerDialer`.

```sh
fdk validate
fdk pack
```

---

## Project structure

```
.
├── manifest.json
├── app/
│   ├── views/
│   │   ├── background.html          # Invisible ticket listener
│   │   ├── ticket-sidebar.html      # Per-ticket dashboard
│   │   ├── compliance-center.html   # Full-page audit review
│   │   ├── new-ticket.html          # New-ticket change tracker
│   │   └── cti.html                 # Freshdesk dialer
│   └── scripts/
│       ├── lib/
│       │   ├── compliance-store.js    # client.db persistence
│       │   └── compliance-events.js   # Event registration
│       ├── background.js
│       ├── ticket-sidebar.js
│       ├── compliance-center.js
│       ├── new-ticket.js
│       └── cti.js
├── README.md
└── USECASE.md
```

---

## Tech stack

- **Platform:** Freshworks Platform 3.0
- **Runtime:** Node.js 24.11.0 · FDK 10.1.2
- **Storage:** `client.db` key-value (per-ticket logs, guardrails setting, ticket index)
- **UI:** Crayons v4

---

## Resources

- [Events method](https://developers.freshworks.com/docs/app-sdk/v3.0/common/client/events-method/)
- [Data storage](https://developers.freshworks.com/docs/app-sdk/v3.0/common/client/db/)
- [USECASE.md](./USECASE.md)
