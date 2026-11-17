# Realtime

See [Connecting to Realtime](/realtime/connecting) and [Groups and Messages](/realtime/groups). Every method that talks to the server is a `suspend` function and throws [`SkapiException`](/introduction/errors).

## connectRealtime

```kotlin
suspend fun connectRealtime(callback: (JsonObject) -> Unit): Unit
```

Opens the realtime connection and returns once it is open. `callback(event)` runs on a background thread for every event; see [Events](/realtime/connecting#events). On Android, post to the main thread before touching views. Called again while connected, it only swaps the callback. The connection reopens on its own after a drop.

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No access.` (not signed in) |
| `INVALID_REQUEST` | `WebSocket closed before it opened.` |

When opening fails, the callback also gets an `"error"` event: `Skapi: WebSocket connection failed.`

## closeRealtime

```kotlin
suspend fun closeRealtime(): Unit
```

Closes the connection. The callback gets `"close"`; the group gets `USER_DISCONNECTED` and `USER_LEFT`. Does nothing when no connection is open.

## onForeground, onNetworkAvailable and close

See [onForeground](/api-reference/connection#onforeground), [onNetworkAvailable](/api-reference/connection#onnetworkavailable) and [close](/api-reference/connection#close) on the Connection page: they also check and reconnect the realtime connection when the app returns, and close it.

## joinRealtime

```kotlin
suspend fun joinRealtime(group: String?): JsonObject
```

Joins a group, leaving the current one. `null` (or `""`) leaves the group.

```json
{"type": "success", "message": "Joined realtime message group: \"lobby\"."}
{"type": "success", "message": "Left realtime message group."}
```

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No realtime connection. Execute connectRealtime() before this method.` |

## postRealtime

```kotlin
suspend fun postRealtime(message: JsonElement, recipient: String, notification: JsonObject? = null): JsonObject
```

Sends any JSON value to a user (`recipient` is a user ID) or to the group you joined (`recipient` is its name). Returns `{"type": "success", "message": "Message sent."}`.

`notification`: `{"title": <string>, "body": <string>, "config"?: {"always": <boolean>}}`, a web push for recipients in a browser. See [Notifications](/realtime/groups#notifications).

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `No realtime connection. Execute connectRealtime() before this method.` |
| `INVALID_REQUEST` | `No recipient.` |
| `INVALID_REQUEST` | `User has not joined to the recipient group. Run joinRealtime("<group>")` |
| `INVALID_REQUEST` | `Realtime connection is not open. Try reconnecting with connectRealtime().` (the connection is down) |
| `INVALID_PARAMETER` | `Message is <n> bytes; a realtime message can be at most 32768 bytes including its headers.` |
| `INVALID_PARAMETER` | `Key "title" is required.` / `"title" should be type: <string>.` / `"config.always" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `Notification size exceeds 3kb.` |

## getRealtimeGroups

```kotlin
suspend fun getRealtimeGroups(params: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

Groups that have members now: `{"list": [{"group", "number_of_users"}], ...}`. Left out, `params` lists every group.

| key | |
|---|---|
| `searchFor` | `"group"` (default) or `"number_of_users"` |
| `value` | a string for `"group"`, a number for `"number_of_users"` |
| `condition` | `">"`, `">="`, `"="`, `"<"`, `"<="`, `"!="` (or `gt`, `gte`, `eq`, `lt`, `lte`, `ne`) |
| `range` | an upper bound of the same type as `value`; replaces `condition` |

`fetchOptions`: see [Paging](/database/fetch#paging).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"<value>" is invalid in "searchFor". allowed types or values are: "group", "number_of_users".` |
| `INVALID_PARAMETER` | `"<value>" is invalid in "condition". allowed types or values are: ...` |
| `INVALID_PARAMETER` | `"value" must be a number.` / `"value" must be a string.` / `"range" must be a number.` / `"range" must be a string.` |

## getRealtimeUsers

```kotlin
suspend fun getRealtimeUsers(params: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

Connections in a group: `{"list": [{"user_id", "cid"}], ...}`.

| key | |
|---|---|
| `group` | the group; left out, the one you joined |
| `user_id` | only this user's connections |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `No group has been joined. Otherwise "group" is required.` |
| `INVALID_PARAMETER` | `"<value>" is invalid in "group". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `User ID in "user_id" is empty.` / `User ID in "user_id" is invalid.` |
