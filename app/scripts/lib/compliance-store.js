/* Shared persistence for FinSecure Compliance (client.db + in-memory dev fallback) */
window.FinSecureStore = (function () {
  const GUARDRAILS_KEY = 'settings:guardrails';
  const TICKET_INDEX_KEY = 'audit:ticket-index';
  const memory = new Map();

  function ticketLogKey(ticketId) {
    return `ticket:${ticketId}:log`;
  }

  function ticketBlockedKey(ticketId) {
    return `ticket:${ticketId}:blocked`;
  }

  function isDevDbError(err) {
    return err && (err.status === 0 || err.status === '0');
  }

  async function dbGet(client, key) {
    try {
      return await client.db.get(key);
    } catch (err) {
      if (err.status === 404) {
        return null;
      }
      if (isDevDbError(err) && memory.has(key)) {
        return memory.get(key);
      }
      if (isDevDbError(err)) {
        return null;
      }
      throw err;
    }
  }

  async function dbSet(client, key, value) {
    try {
      await client.db.set(key, value);
    } catch (err) {
      if (isDevDbError(err)) {
        memory.set(key, value);
        return;
      }
      throw err;
    }
    memory.set(key, value);
  }

  async function dbDelete(client, key) {
    try {
      await client.db.delete(key);
    } catch (err) {
      if (!isDevDbError(err)) {
        throw err;
      }
    }
    memory.delete(key);
  }

  async function getGuardrailsEnabled(client) {
    const data = await dbGet(client, GUARDRAILS_KEY);
    if (!data) {
      return true;
    }
    return data.value !== 'false';
  }

  async function setGuardrailsEnabled(client, enabled) {
    await dbSet(client, GUARDRAILS_KEY, { value: enabled ? 'true' : 'false' });
  }

  async function appendLogEntry(client, ticketId, entry) {
    const key = ticketLogKey(ticketId);
    const log = await getArray(client, key);
    log.unshift({ ...entry, time: entry.time || new Date().toISOString() });
    await dbSet(client, key, { items: log.slice(0, 200) });
    await trackTicket(client, ticketId);
  }

  async function appendBlockedEntry(client, ticketId, entry) {
    const key = ticketBlockedKey(ticketId);
    const items = await getArray(client, key);
    items.unshift({ ...entry, time: entry.time || new Date().toISOString() });
    await dbSet(client, key, { items: items.slice(0, 50) });
    await trackTicket(client, ticketId);
  }

  function getLog(client, ticketId) {
    return getArray(client, ticketLogKey(ticketId));
  }

  function getBlocked(client, ticketId) {
    return getArray(client, ticketBlockedKey(ticketId));
  }

  async function clearLog(client, ticketId) {
    await dbDelete(client, ticketLogKey(ticketId));
    await trackTicket(client, ticketId);
  }

  async function getTicketIndex(client) {
    const data = await dbGet(client, TICKET_INDEX_KEY);
    return data?.items || [];
  }

  async function trackTicket(client, ticketId) {
    const id = String(ticketId);
    const index = await getTicketIndex(client);
    const existing = index.find((row) => row.id === id);
    const log = await getLog(client, id);
    const blocked = await getBlocked(client, id);
    const row = {
      id,
      eventCount: log.length,
      blockedCount: blocked.length,
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      Object.assign(existing, row);
    } else {
      index.unshift(row);
    }

    await dbSet(client, TICKET_INDEX_KEY, { items: index.slice(0, 100) });
  }

  async function getArray(client, key) {
    const data = await dbGet(client, key);
    return data?.items || [];
  }

  return {
    getGuardrailsEnabled,
    setGuardrailsEnabled,
    appendLogEntry,
    appendBlockedEntry,
    getLog,
    getBlocked,
    clearLog,
    getTicketIndex
  };
})();
