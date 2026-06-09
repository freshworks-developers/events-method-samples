# Use Cases - FinSecure Bank

**App:** FinSecure Compliance  
**Repo:** [freshworks-developers/events-method-samples](https://github.com/freshworks-developers/events-method-samples)

## Company Overview

**FinSecure Bank** is a regulated financial institution using **Freshdesk** for customer disputes and **Freshservice** for internal service requests. Compliance requires an **audit trail** of agent actions on tickets, guardrails before destructive actions, and CTI integration that reacts when agents click phone numbers—without polling or custom browser extensions.

## Use Case Scenarios

### 1. Agent Action Audit Trail (Click Events)

**Scenario**: Regulators ask for evidence that agents opened reply, forward, note, timer, and navigation actions on dispute tickets. Server-side product events alone miss UI-only clicks.

**Use Case**: FinSecure Compliance registers click listeners such as `ticket.replyClick`, `ticket.sendReply`, `ticket.forwardClick`, `ticket.addNote`, and `ticket.startTimer`. Each action is logged in the sidebar action log with timestamp and ticket context from `client.data.get('ticket')`.

---

### 2. Compliance Logging on Field Changes (Change Events)

**Scenario**: When priority, status, group, or assignee changes on a fraud case, FinSecure must record old vs new values for SOX reporting.

**Use Case**: The new-ticket sidebar subscribes to `ticket.priorityChanged`, `ticket.statusChanged`, `ticket.groupChanged`, `ticket.agentChanged`, and `ticket.typeChanged`, using `event.helper.getData()` for `{ old, new }`. The compliance table mirrors what is sent to the audit warehouse.

---

### 3. Prevent Accidental Ticket Close or Delete (Intercept Events)

**Scenario**: Tier-1 agents mistakenly close or delete high-value dispute tickets; recovery takes hours and triggers regulatory notice.

**Use Case**: The app registers `ticket.closeTicketClick` and `ticket.deleteTicketClick` with `{ intercept: true }`. When guardrails are on (default), close and delete are blocked and the agent is notified. Supervisors can disable protection from the Guardrails tab when authorized.

---

### 4. CTI Click-to-Dial from Ticket Phone Numbers

**Scenario**: Contact-center agents use Freshdesk CTI; clicking a customer phone number should populate the softphone dialer with the correct E.164 number.

**Use Case**: In the CTI global sidebar, `client.events.on('cti.triggerDialer', ...)` reads `event.helper.getData().number` and displays it in the dialer panel with a ready-to-dial status.

---

### 5. Freshservice New-Ticket Workflow Guardrails

**Scenario**: Internal IT uses Freshservice for HR and IT requests; HR tickets must not be assigned to the wrong group during creation.

**Use Case**: The same change-event tracker runs on Freshservice `new_ticket_sidebar`. When `ticket.groupChanged` selects a non-HR queue, a coaching banner warns the agent before submit.

---

## Surfaces

| Surface | File |
|---------|------|
| Ticket background (always-on) | `app/scripts/background.js` + `lib/compliance-events.js` |
| Ticket sidebar (per-ticket UI) | `app/scripts/ticket-sidebar.js` |
| Compliance Center (full page) | `app/scripts/compliance-center.js` |
| New ticket change tracker | `app/scripts/new-ticket.js` |
| CTI dialer (Freshdesk only) | `app/scripts/cti.js` |

```sh
fdk run
```
