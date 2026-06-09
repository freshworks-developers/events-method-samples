(function () {
  app
    .initialized()
    .then((client) => {
      FinSecureEvents.registerTicketDetailEvents(client, FinSecureStore);
    })
    .catch(console.error);
})();
