(function () {
  function boot(client) {
    FinSecureEvents.registerTicketDetailEvents(client, FinSecureStore).catch(console.error);
  }

  app.initialized().then(function (client) {
    boot(client);
    client.events.on('app.activated', function () {
      boot(client);
    });
  }).catch(console.error);
})();
