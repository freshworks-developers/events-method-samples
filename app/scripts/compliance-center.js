(function () {
  const state = { client: null, selectedId: null };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    state.client = await app.initialized();
    document.getElementById('refresh-index').addEventListener('fwClick', loadIndex);
    state.client.events.on('app.activated', loadIndex);
    await loadIndex();
  }

  async function loadIndex() {
    const index = await FinSecureStore.getTicketIndex(state.client);
    const tbody = document.getElementById('ticket-index');
    tbody.innerHTML = '';

    if (!index.length) {
      const row = document.createElement('tr');
      row.className = 'empty-row';
      row.innerHTML = '<td colspan="4">Open tickets and perform actions — activity will appear here.</td>';
      tbody.appendChild(row);
      return;
    }

    index.forEach((ticket) => {
      const row = document.createElement('tr');
      if (ticket.id === state.selectedId) {
        row.classList.add('is-selected');
      }
      row.innerHTML = `
        <td>#${ticket.id}</td>
        <td>${ticket.eventCount}</td>
        <td>${ticket.blockedCount}</td>
        <td>${formatDate(ticket.updatedAt)}</td>
      `;
      row.addEventListener('click', () => selectTicket(ticket.id, row));
      tbody.appendChild(row);
    });

    if (!state.selectedId && index[0]) {
      await selectTicket(index[0].id, tbody.querySelector('tr'));
    }
  }

  async function selectTicket(ticketId, row) {
    state.selectedId = ticketId;
    document.querySelectorAll('#ticket-index tr').forEach((tr) => tr.classList.remove('is-selected'));
    if (row) {
      row.classList.add('is-selected');
    }

    document.getElementById('detail-title').textContent = `Ticket #${ticketId}`;
    document.getElementById('detail-subtitle').textContent = 'Full audit log for this ticket';

    const log = await FinSecureStore.getLog(state.client, ticketId);
    const list = document.getElementById('detail-log');
    const empty = document.getElementById('detail-empty');
    list.innerHTML = '';

    log.forEach((item) => {
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
      li.querySelector('.fs-list__time').textContent = formatDate(item.time);
      list.appendChild(li);
    });

    empty.hidden = log.length > 0;
  }

  function formatDate(iso) {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
})();
