# Tickets

Every method throws [`SkapiException`](/introduction/errors) with a `code` and a `message`, and can throw `NETWORK_ERROR` when no answer comes back. All of them are `suspend` functions of `Skapi`. See [Tickets](/tickets/tickets).

## consumeTicket

```kotlin
suspend fun consumeTicket(ticketId: String, method: String = "POST", data: JsonElement? = null, auth: Boolean = false): JsonElement
```

Calls a ticket of the project, at `https://<first 4 characters of the service ID>.skapi.dev/`.

| argument | |
|---|---|
| `ticketId` | Letters, digits, `_` and `-`, up to 64 characters, starting with a letter or digit. |
| `method` | `"GET"` or `"POST"`, any case. `GET` sends `data` as the query string (`/tg/` route); `POST` sends it as the JSON body (`/tp/` route). |
| `data` | The request data, usually a `JsonObject`. Defaults to `{}`. |
| `auth` | `true` sends the call as the signed-in user (`POST /tpa/` route, with the user's token). POST only. |

Returns the receipt, or the body a Respond action of the ticket composed, as sent:

| key | |
|---|---|
| `ticket_id` | the ticket |
| `consume_id` | base62 of the time in milliseconds, then 4 random characters |
| `user_id` | the user with `auth = true`, else `"<ip>(<user agent>)"` |
| `is_test` | `false` |
| `timestamp` | milliseconds, read from `consume_id` |
| `hash` | proof string of the consumption |
| `queued` | `true` only when the call waits for a free slot; its actions run later |
| `position` | with `queued`: place in the line, 1 = next |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Ticket ID is required.` |
| `INVALID_PARAMETER` | `Invalid "ticket_id". Use letters, digits, "_" and "-" (up to 64 chars, starting with a letter or digit).` |
| `INVALID_PARAMETER` | `Method is required. Should be either "GET" or "POST"` |
| `INVALID_PARAMETER` | `Method should be either "GET" or "POST".` |
| `INVALID_PARAMETER` | `Signed-in consumption is POST only.` |
| `INVALID_REQUEST` | `User login is required.` (`auth = true`, signed out) |
| `TICKET_BUSY` | every slot of a ticket with a concurrency limit is taken. Nothing was consumed; try again later. `details` carries `{"concurrency", "running", "waiting", "self_calling"}`. |
| the ticket's code | the ticket's message. `details` is the whole error body: `{"code", "message", "stage", "action"?, "detail"?, "ticket_id"}`. Thrown whether the ticket answered 400 or 200. See [When a consumption fails](/tickets/tickets#when-a-consumption-fails). |

## getTickets

```kotlin
suspend fun getTickets(params: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

The project's tickets. Signed-in users only. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`, up to 100 a page; see [Paging](/database/fetch#paging).

| key | type | |
|---|---|---|
| `ticket_id` | string | Only this ticket. |

Each row:

| key | |
|---|---|
| `ticket_id` | |
| `description` | |
| `count` | consumptions left, when the ticket has a count |
| `time_to_live` | when it expires, milliseconds, when it has one |
| `timestamp` | when it was registered, milliseconds |

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_REQUEST` | `Invalid ticket id.` (`ticket_id` contains `#` or `@`) |

## getConsumedTickets

```kotlin
suspend fun getConsumedTickets(params: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

The signed-in user's own consumptions, the ones made with `auth = true`, oldest first. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`.

| key | type | |
|---|---|---|
| `ticket_id` | string | Only tickets whose ID starts with this. |

Each row:

| key | |
|---|---|
| `ticket_id`, `consume_id`, `timestamp` | as in the receipt |
| `user_id`, `reg` | the user's ID |
| `is_test` | `false` (dry runs are anonymous, so they never appear here) |
| `description` | the consumption log as JSON text, with `data`, `method`, `headers`, `ip`, `user_agent`, `timestamp` and `outcome` (`ok`, `actions`, `error`, ...) |
| `hash` | proof string of the consumption |

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `User login is required.` |
