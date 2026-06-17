Use Cases - FinSecure Bank / Events Method Samples
===================================================

Company Overview
----------------

**FinSecure Bank** is a regulated financial institution using **Freshdesk** for customer disputes and **Freshservice** for internal service requests. Compliance requires an audit trail of agent actions on tickets, guardrails before destructive actions, and CTI integration that reacts when agents click phone numbers — without polling REST APIs or custom browser extensions.

* * * * *

Use Case Scenarios
------------------

### 1\. Agent Action Audit Trail on Every Ticket Page

**Scenario**: Regulators ask for evidence that agents opened reply, forward, note, timer, and navigation actions on dispute tickets. Server-side product webhooks alone miss UI-only clicks that never reach an API.

**Use Case**: FinSecure Compliance registers 14 click listeners — including `ticket.replyClick`, `ticket.sendReply`, `ticket.addNote`, and `ticket.propertiesUpdated` — in **`ticket_background`**. The background placement runs even when the sidebar is collapsed, so capture never depends on the agent opening the app panel.

Each action resolves the active ticket via `client.data.get('ticket')`, appends a timestamped entry to `client.db` under `ticket:{id}:log`, and updates the cross-ticket index for supervisor review.

**Platform tie-in:** [Events method](https://developers.freshworks.com/docs/app-sdk/v3.0/common/client/events-method/) click events + [Data method](https://developers.freshworks.com/docs/app-sdk/v3.0/common/client/data-method/) `ticket` + [Key-value storage](https://developers.freshworks.com/docs/app-sdk/v3.0/common/client/db/).

* * * * *

### 2\. SOX Field-Change Logging with Old vs New Values

**Scenario**: When priority, status, group, assignee, or type changes on a fraud case, FinSecure must record the previous and new values for SOX reporting. Spreadsheet exports from ticket history are too slow for real-time coaching.

**Use Case**: `compliance-events.js` subscribes to five change events (`ticket.priorityChanged`, `ticket.statusChanged`, `ticket.groupChanged`, `ticket.agentChanged`, `ticket.typeChanged`). Handlers read `event.helper.getData()` for `{ old, new }`, format human-readable titles like `Priority: High → Urgent`, and persist them with variant `change`.

On the **new-ticket** surface, `new-ticket.js` renders the same events in a live table so agents see routing mistakes before submit. An HR coaching banner appears when group is set to a non-approved queue.

**Platform tie-in:** Change events and `event.helper.getData()` on ticket details and new-ticket placements.

* * * * *

### 3\. Prevent Accidental Ticket Close or Delete

**Scenario**: Tier-1 agents mistakenly close or delete high-value dispute tickets; recovery takes hours and triggers regulatory notice. FinSecure needs a client-side guardrail that blocks the action before the platform processes it.

**Use Case**: The app registers `ticket.closeTicketClick` and `ticket.deleteTicketClick` with `{ intercept: true }`. When guardrails are enabled (default), intercept handlers log a **blocked** entry, append to `ticket:{id}:blocked`, and call `client.interface.trigger('showNotify', { type: 'warning', … })` so the agent knows why the action failed.

Supervisors can disable protection via the sidebar **fw-toggle**; the setting persists in `settings:guardrails` across sessions.

**Platform tie-in:** Intercept option on `client.events.on` + Interface Method `showNotify`.

* * * * *

### 4\. CTI Click-to-Dial from Ticket Phone Numbers

**Scenario**: Contact-center agents use Freshdesk CTI. Clicking a customer phone number on a ticket should populate the softphone dialer with the correct E.164 number without copy-paste errors.

**Use Case**: The `cti_global_sidebar` placement hosts a minimal dialer panel. `client.events.on('cti.triggerDialer', …)` reads `event.helper.getData().number` and displays it with a **Ready** status label. Agents clear the display with **Clear** when moving to the next call.

This event **cannot** be received from `ticket_sidebar` or `ticket_background` — FinSecure documents that limitation by isolating CTI logic in `cti.html` rather than the ticket compliance dashboard.

**Platform tie-in:** `cti.triggerDialer` event — Freshdesk CTI global sidebar only.

* * * * *

### 5\. Cross-Ticket Supervisor Review in Compliance Center

**Scenario**: Compliance officers need a consolidated view of agent activity across tickets, not one ticket at a time in the sidebar. Monthly audits sample dozens of dispute tickets for anomalous close/delete attempts.

**Use Case**: The **Compliance Center** full-page app reads `audit:ticket-index` from `client.db` — up to 100 tickets with event and blocked counts. Supervisors click a row to drill into the full `ticket:{id}:log` for that ticket, mirroring what agents see in the sidebar but across the entire portfolio.

Background capture continuously feeds the index; no export job or REST polling is required during the business day.

**Platform tie-in:** `common.full_page_app` + shared `client.db` keys written by `ticket_background`.
