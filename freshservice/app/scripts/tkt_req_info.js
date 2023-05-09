document.onreadystatechange = pageInteractive;

function pageInteractive() {
  if (document.readyState === 'interactive') render();

  async function render() {
    let [err, _client] = await to(app.initialized());
    if (err) console.error(`Unable to get client at runtime\nDetails:${err}`);
    window['client'] = _client;
    client.events.on('app.activated', eventsInTktDetailsPage);
  }

  function eventsInTktDetailsPage() {
    const spotlight = document.querySelector('.spotlight');

    let clickEvents = [
      'ticket.replyClick',
      'ticket.sendReply',
      'ticket.forwardClick',
      'ticket.conversationForward',
      'ticket.forward',
      'ticket.notesClick',
      'ticket.addNote',
      'ticket.closeTicketClick',
      'ticket.deleteTicketClick',
      'ticket.previousTicketClick',
      'ticket.nextTicketClick',
      'ticket.startTimer',
      'ticket.stopTimer',
      'ticket.updateTimer',
      'ticket.deleteTimer'
    ];

    clickEvents.forEach(function register(click) {
      client.events.on(click, function (event) {
        var event_data = event.helper.getData();
        const row = `<fw-label value="${click}" color="green"></fw-label>`;
        spotlight.insertAdjacentHTML('afterend', row);
        console.log("event data = " + event_data);
      });
    });
  }
}

function to(promise, opts) {
  return promise
    .then(function (data) {
      return [null, data];
    })
    .catch(function (err) {
      if (opts) {
        Object.assign(err, opts);
      }
      return [err, undefined];
    });
}
