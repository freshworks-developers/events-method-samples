(function () {
  const CHANGE_EVENTS = [
    'ticket.priorityChanged',
    'ticket.statusChanged',
    'ticket.groupChanged',
    'ticket.agentChanged',
    'ticket.typeChanged'
  ];

  const FIELD_LABELS = {
    'ticket.priorityChanged': 'Priority',
    'ticket.statusChanged': 'Status',
    'ticket.groupChanged': 'Group',
    'ticket.agentChanged': 'Assignee',
    'ticket.typeChanged': 'Type'
  };

  const APPROVED_GROUP_KEYWORDS = ['hr', 'human resources', 'people ops'];

  const state = {
    client: null,
    initialized: false
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    state.client = await app.initialized();
    state.client.events.on('app.activated', onActivated);
  }

  function onActivated() {
    if (state.initialized) {
      return;
    }
    state.initialized = true;
    registerChangeEvents();
  }

  function registerChangeEvents() {
    CHANGE_EVENTS.forEach((eventName) => {
      state.client.events.on(eventName, (event) => {
        const { old: previous, new: current } = event.helper.getData();
        appendChangeRow({
          previous: formatValue(previous),
          current: formatValue(current),
          field: FIELD_LABELS[eventName] || eventName.replace('ticket.', ''),
          time: formatTime(new Date())
        });

        if (eventName === 'ticket.groupChanged') {
          evaluateGroupCoaching(current);
        }
      });
    });
  }

  function appendChangeRow({ previous, current, field, time }) {
    const tbody = document.getElementById('change-log');
    const emptyRow = document.getElementById('empty-row');
    if (emptyRow) {
      emptyRow.remove();
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="prev"></td>
      <td class="current"></td>
      <td></td>
      <td></td>
    `;
    const cells = row.querySelectorAll('td');
    cells[0].textContent = previous;
    cells[1].textContent = current;
    cells[2].textContent = field;
    cells[3].textContent = time;

    tbody.prepend(row);
  }

  function evaluateGroupCoaching(groupValue) {
    const banner = document.getElementById('coaching-banner');
    const message = document.getElementById('coaching-message');
    const normalized = String(groupValue || '').toLowerCase();
    const isApproved = APPROVED_GROUP_KEYWORDS.some((keyword) => normalized.includes(keyword));

    if (!groupValue || isApproved) {
      banner.hidden = true;
      return;
    }

    banner.hidden = false;
    message.textContent = `"${groupValue}" may not be an HR queue. Internal HR requests should route to an HR-approved group before submit.`;
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

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
})();
