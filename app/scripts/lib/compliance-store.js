/* Shared persistence for FinSecure Compliance (client.db + local dev mirror) */
window.FinSecureStore = (function () {
  const GUARDRAILS_KEY = 'settings:guardrails';
  const TICKET_INDEX_KEY = 'audit:ticket-index';
  const EVENTS_LOCK_KEY = 'settings:events-registered';
  const DEV_STORAGE_PREFIX = 'finsecure-compliance:';

  function ticketLogKey(ticketId) {
    return `ticket:${ticketId}:log`;
  }

  function ticketBlockedKey(ticketId) {
    return `ticket:${ticketId}:blocked`;
  }

  function isDevDbError(err) {
    return err && (err.status === 0 || err.status === '0');
  }

  function canUseLocalStorage() {
    try {
      const probe = '__finsecure_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  function devStorageGet(key) {
    if (!canUseLocalStorage()) {
      return null;
    }
    try {
      const raw = localStorage.getItem(DEV_STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.info('Dev storage read failed', error);
      return null;
    }
  }

  function devStorageSet(key, value) {
    if (!canUseLocalStorage()) {
      return;
    }
    try {
      localStorage.setItem(DEV_STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (error) {
      console.info('Dev storage write failed', error);
    }
  }

  function devStorageDelete(key) {
    if (!canUseLocalStorage()) {
      return;
    }
    try {
      localStorage.removeItem(DEV_STORAGE_PREFIX + key);
    } catch (error) {
      console.info('Dev storage delete failed', error);
    }
  }

  async function dbGet(client, key) {
    try {
      const value = await client.db.get(key);
      if (value !== undefined && value !== null) {
        return value;
      }
    } catch (err) {
      if (err.status === 404) {
        return devStorageGet(key);
      }
      if (!isDevDbError(err)) {
        throw err;
      }
    }
    return devStorageGet(key);
  }

  async function dbSet(client, key, value) {
    try {
      await client.db.set(key, value);
    } catch (err) {
      if (!isDevDbError(err)) {
        throw err;
      }
    }
    devStorageSet(key, value);
  }

  async function dbDelete(client, key) {
    try {
      await client.db.delete(key);
    } catch (err) {
      if (!isDevDbError(err)) {
        throw err;
      }
    }
    devStorageDelete(key);
  }

  async function acquireEventRegistration(client) {
    try {
      await client.db.set(EVENTS_LOCK_KEY, { registered: true }, { setIf: 'not_exist' });
      return true;
    } catch (err) {
      if (err.status === 409) {
        return false;
      }
      const existing = await dbGet(client, EVENTS_LOCK_KEY);
      if (existing && existing.registered) {
        return false;
      }
      await dbSet(client, EVENTS_LOCK_KEY, { registered: true });
      return true;
    }
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
    const existing = index.find(function (row) {
      return row.id === id;
    });
    const log = await getLog(client, id);
    const blocked = await getBlocked(client, id);
    const row = {
      id: id,
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
    acquireEventRegistration: acquireEventRegistration,
    getGuardrailsEnabled: getGuardrailsEnabled,
    setGuardrailsEnabled: setGuardrailsEnabled,
    appendLogEntry: appendLogEntry,
    appendBlockedEntry: appendBlockedEntry,
    getLog: getLog,
    getBlocked: getBlocked,
    clearLog: clearLog,
    getTicketIndex: getTicketIndex
  };
})();
