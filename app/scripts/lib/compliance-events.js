/* Event registration — used by ticket_background (always on) */
window.FinSecureEvents = (function () {
  const CLICK_EVENTS = [
    'ticket.replyClick',
    'ticket.sendReply',
    'ticket.forwardClick',
    'ticket.conversationForward',
    'ticket.forward',
    'ticket.notesClick',
    'ticket.addNote',
    'ticket.previousTicketClick',
    'ticket.nextTicketClick',
    'ticket.startTimer',
    'ticket.stopTimer',
    'ticket.updateTimer',
    'ticket.deleteTimer',
    'ticket.propertiesUpdated'
  ];

  const CHANGE_EVENTS = [
    'ticket.priorityChanged',
    'ticket.statusChanged',
    'ticket.groupChanged',
    'ticket.agentChanged',
    'ticket.typeChanged'
  ];

  const INTERCEPT_EVENTS = ['ticket.closeTicketClick', 'ticket.deleteTicketClick'];

  const EVENT_LABELS = {
    'ticket.replyClick': 'Opened reply editor',
    'ticket.sendReply': 'Sent reply',
    'ticket.forwardClick': 'Opened forward dialog',
    'ticket.conversationForward': 'Forwarded conversation',
    'ticket.forward': 'Forwarded ticket',
    'ticket.notesClick': 'Opened notes',
    'ticket.addNote': 'Added note',
    'ticket.closeTicketClick': 'Attempted to close ticket',
    'ticket.deleteTicketClick': 'Attempted to delete ticket',
    'ticket.previousTicketClick': 'Opened previous ticket',
    'ticket.nextTicketClick': 'Opened next ticket',
    'ticket.startTimer': 'Started timer',
    'ticket.stopTimer': 'Stopped timer',
    'ticket.updateTimer': 'Updated timer',
    'ticket.deleteTimer': 'Deleted timer entry',
    'ticket.propertiesUpdated': 'Updated ticket properties',
    'ticket.priorityChanged': 'Changed priority',
    'ticket.statusChanged': 'Changed status',
    'ticket.groupChanged': 'Changed group',
    'ticket.agentChanged': 'Changed assignee',
    'ticket.typeChanged': 'Changed type'
  };

  const FIELD_LABELS = {
    'ticket.priorityChanged': 'Priority',
    'ticket.statusChanged': 'Status',
    'ticket.groupChanged': 'Group',
    'ticket.agentChanged': 'Assignee',
    'ticket.typeChanged': 'Type'
  };

  let registered = false;

  async function getTicketId(client) {
    try {
      const { ticket } = await client.data.get('ticket');
      return ticket?.id ? String(ticket.id) : null;
    } catch {
      return null;
    }
  }

  function formatValue(value) {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'object') {
      return value.name || value.label || JSON.stringify(value);
    }
    return String(value);
  }

  async function registerTicketDetailEvents(client, store) {
    if (registered) {
      return;
    }

    const acquired = await store.acquireEventRegistration(client);
    if (!acquired) {
      return;
    }

    registered = true;

    CLICK_EVENTS.forEach((eventName) => {
      client.events.on(eventName, async () => {
        const ticketId = await getTicketId(client);
        if (!ticketId) {
          return;
        }
        await store.appendLogEntry(client, ticketId, {
          title: EVENT_LABELS[eventName] || eventName,
          variant: 'click',
          event: eventName
        });
      });
    });

    CHANGE_EVENTS.forEach((eventName) => {
      client.events.on(eventName, async (event) => {
        const ticketId = await getTicketId(client);
        if (!ticketId) {
          return;
        }
        const { old: previous, new: current } = event.helper.getData();
        await store.appendLogEntry(client, ticketId, {
          title: `${FIELD_LABELS[eventName] || 'Field'}: ${formatValue(previous)} → ${formatValue(current)}`,
          variant: 'change',
          event: eventName,
          previous: formatValue(previous),
          current: formatValue(current),
          field: FIELD_LABELS[eventName] || eventName
        });
      });
    });

    INTERCEPT_EVENTS.forEach((eventName) => {
      client.events.on(
        eventName,
        async () => {
          const ticketId = await getTicketId(client);
          const label = EVENT_LABELS[eventName] || eventName;
          const guardrailsEnabled = await store.getGuardrailsEnabled(client);

          if (ticketId) {
            await store.appendLogEntry(client, ticketId, {
              title: guardrailsEnabled ? `${label} — blocked` : label,
              variant: guardrailsEnabled ? 'blocked' : 'click',
              event: eventName
            });

            if (guardrailsEnabled) {
              await store.appendBlockedEntry(client, ticketId, { title: label });
              await client.interface.trigger('showNotify', {
                type: 'warning',
                title: 'FinSecure',
                message: 'Close and delete are protected on this ticket.'
              });
              return;
            }
          }
        },
        { intercept: true }
      );
    });
  }

  return {
    CLICK_EVENTS,
    CHANGE_EVENTS,
    INTERCEPT_EVENTS,
    EVENT_LABELS,
    FIELD_LABELS,
    registerTicketDetailEvents,
    formatValue
  };
})();
