(function () {
  const state = {
    client: null,
    initialized: false
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    state.client = await app.initialized();
    document.getElementById('clear-dialer').addEventListener('fwClick', resetDialer);
    state.client.events.on('app.activated', onActivated);
    try {
      await state.client.instance.resize({ height: '400px', width: '400px' });
    } catch (error) {
      console.warn('CTI resize not supported:', error);
    }
    await onActivated();
  }

  function onActivated() {
    if (state.initialized) {
      return;
    }
    state.initialized = true;

    state.client.events.on('cti.triggerDialer', (event) => {
      const { number } = event.helper.getData();
      if (!number) {
        return;
      }

      const card = document.getElementById('dialer-card');
      const phoneEl = document.getElementById('phone-number');
      const status = document.getElementById('dialer-status');

      phoneEl.textContent = number;
      status.setAttribute('value', 'Ready');
      status.setAttribute('color', 'green');
      card.classList.add('fs-card--active', 'dialer-display--active');
    });
  }

  function resetDialer() {
    const card = document.getElementById('dialer-card');
    document.getElementById('phone-number').textContent = '—';
    const status = document.getElementById('dialer-status');
    status.setAttribute('value', 'Idle');
    status.setAttribute('color', 'grey');
    card.classList.remove('fs-card--active', 'dialer-display--active');
  }
})();
