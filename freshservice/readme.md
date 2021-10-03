# Events Methods for Freshservice

### Description:

You can observe events that occur in the Freshservice UI and register a callback with events methods.
`client.events.on("<argument>", callback[,options])` - takes in a callback which will be invoked when desired event occured.

Events method can observe 3 types of events

1. Click Events
2. Change Events
3. Intercept Events

### Screenshots:

#### Events in Ticket Details Page

<article align="center">

![](./screenshots/1.png)

</article>

### Events in New Incident Create page

<article align="center">

![](./screenshots/2.png)

</article>

### Prerequisites:

1. Make sure you have [tools required to start building Freshworks Apps](https://community.developers.freshworks.com/t/tools-required-to-start-building-freshworks-apps/3585)
2. Ensure that you have the [Freshworks CLI](https://community.developers.freshworks.com/t/what-are-the-prerequisites-to-install-the-freshworks-cli/234) installed properly.
3. Get [Freshdesk API key](https://support.freshdesk.com/support/solutions/articles/215517). After you install the app, you'd notice contacts are being rendered in `ticket_conversation_editor` placeholder.

### Procedure to run the app:

```sh
# Run the app
> fdk run
# app runs on localhost:10001 and sample config page is rendered on /custom_configs
```
