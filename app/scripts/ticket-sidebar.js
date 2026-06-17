(function () {
  const state = { client: null, ticketId: null, pollTimer: null };
  const MAX_SIDEBAR_HEIGHT = '700px';

  init();

  async function init() {
    try {
      state.client = await app.initialized();

      document.getElementById('guardrails-toggle').addEventListener('fwChange', onGuardrailsChange);
      document.getElementById('clear-log').addEventListener('fwClick', onClearLog);
      document.getElementById('refresh-log').addEventListener('fwClick', refresh);

      state.client.events.on('app.activated', onSidebarReady);
      state.client.events.on('ticket.updated', refresh);
      state.client.events.on('ticket.propertiesLoaded', refresh);

      await onSidebarReady();
    } catch (error) {
      console.error(error);
      showLoadError();
    }
  }

  async function onSidebarReady() {
    await resizeSidebar();
    await ensureCapture();
    await refresh();
    startPolling();
  }

  async function ensureCapture() {
    try {
      await FinSecureEvents.registerTicketDetailEvents(state.client, FinSecureStore);
    } catch (error) {
      console.info('Could not ensure capture listeners', error);
    }
  }

  async function resizeSidebar() {
    try {
      await state.client.instance.resize({ height: MAX_SIDEBAR_HEIGHT });
    } catch (error) {
      console.warn('Sidebar resize not supported:', error);
    }
  }

  function startPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
    }
    state.pollTimer = setInterval(refresh, 3000);
  }

  async function onGuardrailsChange(event) {
    await FinSecureStore.setGuardrailsEnabled(state.client, event.detail.checked);
    updateStatusPill(event.detail.checked);
  }

  async function onClearLog() {
    if (!state.ticketId) {
      return;
    }
    await FinSecureStore.clearLog(state.client, state.ticketId);
    await refresh();
  }

  async function refresh() {
    try {
      const { ticket } = await state.client.data.get('ticket');
      state.ticketId = ticket?.id ? String(ticket.id) : null;

      const meta = document.getElementById('ticket-meta');
      const gettingStarted = document.getElementById('getting-started');

      if (state.ticketId) {
        const subject = ticket.subject ? ` — ${truncate(ticket.subject, 48)}` : '';
        meta.textContent = `Ticket #${state.ticketId}${subject}`;
      } else {
        meta.textContent = 'Open a ticket to view its compliance log';
      }

      const guardrails = await FinSecureStore.getGuardrailsEnabled(state.client);
      const toggle = document.getElementById('guardrails-toggle');
      if (toggle) {
        toggle.checked = guardrails;
      }
      updateStatusPill(guardrails);

      if (!state.ticketId) {
        renderLog([]);
        renderBlocked([]);
        if (gettingStarted) {
          gettingStarted.hidden = false;
        }
        return;
      }

      const [log, blocked] = await Promise.all([
        FinSecureStore.getLog(state.client, state.ticketId),
        FinSecureStore.getBlocked(state.client, state.ticketId)
      ]);

      renderLog(log);
      renderBlocked(blocked);

      if (gettingStarted) {
        gettingStarted.hidden = log.length > 0;
      }
    } catch (error) {
      console.error(error);
      showLoadError();
    }
  }

  function renderLog(items) {
    const list = document.getElementById('audit-log');
    const empty = document.getElementById('empty-audit');
    list.innerHTML = '';

    items.forEach((item) => {
      const li = document.createElement('li');
      const variantClass =
        item.variant === 'blocked' ? ' fs-list__item--blocked' : item.variant === 'change' ? ' fs-list__item--change' : '';
      li.className = `fs-list__item${variantClass}`;
      li.innerHTML = `
        <span class="fs-list__dot"></span>
        <p class="fs-list__title"></p>
        <time class="fs-list__time"></time>
      `;
      li.querySelector('.fs-list__title').textContent = item.title;
      li.querySelector('.fs-list__time').textContent = formatTime(item.time);
      list.appendChild(li);
    });

    empty.hidden = items.length > 0;
    const count = document.getElementById('event-count');
    if (count) {
      count.textContent = `${items.length} event${items.length === 1 ? '' : 's'}`;
    }
  }

  function renderBlocked(items) {
    const list = document.getElementById('blocked-list');
    const empty = document.getElementById('empty-blocked');
    list.innerHTML = '';

    items.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'fs-list__item fs-list__item--blocked';
      li.innerHTML = `
        <span class="fs-list__dot"></span>
        <p class="fs-list__title"></p>
        <time class="fs-list__time"></time>
      `;
      li.querySelector('.fs-list__title').textContent = item.title;
      li.querySelector('.fs-list__time').textContent = formatTime(item.time);
      list.appendChild(li);
    });

    empty.hidden = items.length > 0;
  }

  function updateStatusPill(enabled) {
    const pill = document.getElementById('status-pill');
    pill.setAttribute('value', enabled ? 'Protected' : 'Unprotected');
    pill.setAttribute('color', enabled ? 'green' : 'yellow');
  }

  function showLoadError() {
    const meta = document.getElementById('ticket-meta');
    if (meta) {
      meta.textContent = 'Could not load ticket context — refresh the page';
    }
  }

  function formatTime(iso) {
    if (!iso) {
      return '';
    }
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function truncate(text, max) {
    if (!text || text.length <= max) {
      return text || '';
    }
    return `${text.slice(0, max - 1)}…`;
  }
})();
