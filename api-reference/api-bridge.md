# API Bridge

Every method is a `suspend` function and throws [`SkapiException`](/introduction/errors) with a `code` and a `message`. Values that fail a check throw `INVALID_PARAMETER` before anything is sent. Any method can throw `NETWORK_ERROR` when no answer comes back, `TIMEOUT` when nothing moves for `timeoutSeconds` (or a `deadline` passes), `RATE_LIMITED` or `TOO_MANY_REQUESTS` when the server asks to slow down, and `SERVER_ERROR` for a fault on the server (a 5xx answer other than 501). A method that waits stops when its coroutine is cancelled; [forwardRequestPoll](#forwardrequestpoll) and [forwardRequestStream](#forwardrequeststream) do not stop for those failures, see below. See [Forwarding Requests](/api-bridge/forward-request).

A request is addressed by its `request_id`, or by its short `id` (`"<stamp>:<entropy>"`) together with the `url` and `method` it was sent with. A signed-out caller can only reach its own requests from the same IP address and User-Agent; any other caller gets `NOT_EXISTS` (`Request not found.`).

## forwardRequest

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequest(options: JsonObject, form: Map<String, Any?>? = null, onStream: ((String, Int) -> Unit)? = null): JsonElement
```

```java [Java]
CompletableFuture<Object> forwardRequest(Map<String, ?> options, Map<String, ?> form, BiConsumer<String, Integer> onStream)
// also forwardRequest(options) and forwardRequest(options, form)
// form values: plain Java values, byte[] or FileUpload
```

:::

Calls another API from Skapi's server.

| argument | |
|---|---|
| `options` | Required. Keys below. |
| `form` | Values: `JsonElement`, `String`, numbers, booleans, `null`, `ByteArray` or `FileUpload` (a list gives several). Merged into `data`, or into `params` for `GET`, `DELETE` and `HEAD`; an option's own key wins. With `multipart`, the multipart body. |
| `onStream` | `(text, seq)`, called with each relayed piece of a streamed request, in order, on a background thread. Exceptions it throws are logged and ignored. |

| option key | type | |
|---|---|---|
| `url` | string | Required. A full URL. |
| `method` | string | `"GET"`, `"POST"` (default), `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"`, any case. |
| `headers` | object | No name starting with `x-skapi-`. |
| `data` | object | The body: JSON when `Content-Type` is `application/json`, form-encoded otherwise. |
| `params` | object | The query string. |
| `secretName` | string | A client secret of the project. Its value replaces `"$CLIENT_SECRET"` in `url` and in every string of `headers`, `data` and `params`. Left out when `"$CLIENT_SECRET"` appears nowhere. |
| `skapiHeaders` | boolean or `{"user"?: <boolean>, "service"?: <boolean>}` | Sends `x-skapi-user` (the signed-in user's ID) and `x-skapi-service`. |
| `queue` | string | Queue the request on the server. No colons. |
| `poll` | number or boolean | Milliseconds between checks, 1000 or more (`true` = 1000; `0` does not poll); a shorter one is refused with `INVALID_PARAMETER`. Waits for the answer; makes a queue name when none is given. |
| `stream` | boolean | Relay the answer as it arrives. Queued and polled like `poll`. |
| `expires` | number | Seconds the request stays in the history after it settles. |
| `multipart` | boolean | Send `form` as `multipart/form-data`. Files are `FileUpload` values or `ByteArray`s. |
| `responseType` | `"json"` or `"text"` | Reshapes the answer. An envelope is returned unchanged. |
| `cref` | string | Your own reference for the request, 1 to 64 letters, digits, `_` or `-`. Stored on it and handed back by the reply, [forwardRequestHistory](#forwardrequesthistory), [forwardRequestStatus](#forwardrequeststatus) and [forwardRequestRead](#forwardrequestread), so a send whose reply was lost can be found instead of sent again. |
| `notify` | boolean | Status push for a queued request (signed-in users): each status change is sent to this user's realtime connections, and the poll reads at once when one names the request, otherwise once a minute while changes arrive. See [onRequestStatus](#onrequeststatus). |

`"$ACCESS_TOKEN"` anywhere in `url`, `headers`, `data` or `params` becomes the signed-in user's access token (empty when signed out). In Kotlin strings, write `"\$CLIENT_SECRET"` and `"\$ACCESS_TOKEN"`.

Returns:

- no `queue`, `poll` or `stream`: the destination's answer, parsed JSON or text, even when it looks like `{"status": "pending", "id": ...}`. Its status code is not returned.
- `queue` without `poll`: `{"id", "status": "pending", "queue_name", "in_queue", "request_id"}`, plus `"cref"` when you gave one and `"notify": true` when the server accepted `notify`.
- `poll` or `stream`: what [forwardRequestPoll](#forwardrequestpoll) returns once the request settles.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"apiKeyHeader" and "apiKeyScheme" are no longer supported. Store the key as a client secret, name it with "secretName", and put "$CLIENT_SECRET" where the key goes.` |
| `INVALID_PARAMETER` | `"url" should be type: <string>.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"method" should be one of "GET", "POST", "PUT", "PATCH", "DELETE" or "HEAD".` |
| `INVALID_PARAMETER` | `"headers" should be type: <object>.` / `"data" should be type: <object>.` / `"params" should be type: <object>.` |
| `INVALID_PARAMETER` | `"headers" cannot set "<name>": the "x-skapi-" prefix is reserved. Use "skapiHeaders" to tell the destination who the caller is.` |
| `INVALID_PARAMETER` | `"skapiHeaders" should be type: <boolean> or { user?: boolean; service?: boolean }.` |
| `INVALID_PARAMETER` | `<value> is invalid in "secretName". allowed type or value is: Type<string>.` (also `"queue"`; `Type<number>` for `"expires"`) |
| `INVALID_PARAMETER` | `"stream" should be type: <boolean>.` / `"multipart" should be type: <boolean>.` / `"notify" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `"cref" should be 1 to 64 characters of letters, digits, "_" or "-".` |
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` |
| `INVALID_PARAMETER` | `"responseType" should be either "json" or "text".` / `"responseType": "response" is not available here. ...` |
| `INVALID_PARAMETER` | `"data" cannot be sent with "multipart": true. The form itself is the body.` |
| `INVALID_PARAMETER` | `"multipart": true needs a form body in the first argument.` |
| `INVALID_PARAMETER` | `"<name>" needs a filename.` / `"<name>" cannot be read: <reason>.` (a `FileUpload` in a multipart form) |
| `INVALID_PARAMETER` | `Multipart body is too large: <n> bytes once base64 encoded, and the limit is 2031616. Upload the file first and send its url instead.` |
| `INVALID_REQUEST` | `Data should not exceed 2MB` (`form`) |
| `INVALID_REQUEST` | `Invalid clientSecretName.` / `No access to client secret.` (a locked secret and no signed-in user, or a lower access group) |
| `INVALID_REQUEST` | a URL the secret's destinations do not allow |
| `INVALID_REQUEST` | `Invalid queue name. Queue names cannot contain colons.` |
| `ERROR` | the destination could not be reached (inline request) |

An error answer from the destination is not thrown: inline it is returned as the answer, queued it is the `failed` result below.

## forwardRequestPoll

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestPoll(requestId: String, pollMillis: Long = 1000, url: String? = null, method: String? = null,
                               onStream: ((String, Int) -> Unit)? = null, service: String? = null, owner: String? = null,
                               notify: Boolean = false): JsonElement
```

```java [Java]
CompletableFuture<Object> forwardRequestPoll(String requestId, long pollMillis, String url, String method,
                                             BiConsumer<String, Integer> onStream, String service, String owner, boolean notify)
// leave out arguments from the right; forwardRequestPoll(requestId) checks every 1000 ms
```

:::

Waits for a queued request and returns its result. The first check goes out after `pollMillis` milliseconds (`0` means 1000). A value under 1000 is refused with `INVALID_PARAMETER`. It suspends until the request settles; there is no time limit, so cancel the coroutine to stop waiting. With `onStream`, new text of a streamed request is handed over as it arrives.

Failures on the way never end it: `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR`, `ABORTED`, or no sign-in token. It checks again later, waiting twice the interval after the second failure in a row, four times after the third, and so on up to 30 seconds. A 401 refreshes the sign-in token once per run of them. While the user is signed out it sends nothing and reads again once they sign in. Only the server's own answer settles it (a refusal such as `NOT_EXISTS` is thrown).

| argument | |
|---|---|
| `requestId` | The `request_id`, or the short `id` with `url` and `method`. |
| `pollMillis` | Milliseconds between checks, 1000 or more (`0` means 1000). |
| `url`, `method` | Needed with a short `id`. |
| `onStream` | `(text, seq)` for a streamed request. |
| `service`, `owner` | Another project's request; left out, this project's. |
| `notify` | The request was sent with `notify` and the reply said `"notify": true`: read at once when a status change names it, and otherwise once a minute while changes arrive. With no changes arriving it checks every `pollMillis` as usual. |

Returns:

| the request | returns |
|---|---|
| `resolved` | the destination's answer (or the finalized value of a streamed request) |
| `failed` | `{"status_code": <number>, "body": <string>, "truncated": ...}`, or another error object such as `{"message", ...}` |
| `cancelled` | the envelope, `"status": "cancelled"` |
| streamed, not finalized | the envelope: `{"id", "status", "queue_name", "in_queue", "executed"?, "responded"?}`, plus `"stream", "chunks", "last_seq", "more"` and, when failed, `"error"` with `onStream` |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` (an empty `requestId`) |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forwardRequestStream

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestStream(requestId: String, options: JsonObject? = null, onStream: ((String, Int) -> Unit)? = null): JsonElement
```

```java [Java]
CompletableFuture<Object> forwardRequestStream(String requestId, Map<String, ?> options, BiConsumer<String, Integer> onStream)
// also forwardRequestStream(requestId) and forwardRequestStream(requestId, options)
```

:::

Reads a streamed request, from the start or after `since`, and returns once it settles. The first read is immediate. Failures on the way, 401s and signing out are handled as in [forwardRequestPoll](#forwardrequestpoll). Running: hands new text to `onStream` until it settles, then returns the envelope. Settled, not finalized: hands over all the stored text, then returns the envelope. Finalized: returns the kept value. After three degraded reads in a row on a settled request it returns what it has.

| option key | type | |
|---|---|---|
| `url`, `method` | string | Needed with a short `id`. |
| `since` | number | Start after this `seq`. |
| `poll` | number | Milliseconds between reads while it runs, 1000 or more. Default 1000. |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a number of milliseconds, 1000 or more.` / `"since" should be a number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forwardRequestFinalize

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestFinalize(requestId: String, data: JsonElement? = null, options: JsonObject? = null): JsonElement
```

```java [Java]
CompletableFuture<Object> forwardRequestFinalize(String requestId, Object data, Map<String, ?> options)
// also forwardRequestFinalize(requestId) and forwardRequestFinalize(requestId, data)
```

:::

Stores `data` as a settled streamed request's answer and releases its pieces. Later polls return `data`; [forwardRequestHistory](#forwardrequesthistory) lists it as `response_body`. Calling it again replaces the value. Without `data`, `null` is stored.

| option key | type | |
|---|---|---|
| `url`, `method` | string | Needed with a short `id`. |
| `ifAbsent` | boolean | Store only when no result is stored yet. When one is, nothing changes and the answer is `{"finalized": false, "reason": "exists"}`, so two devices cannot replace a complete answer with a partial one. |

Returns `{"finalized": <boolean>, "message": <string>, "reason"?: <string>}`. These come back with `"finalized": false` instead of throwing:

| message | |
|---|---|
| `Finalized.` | done |
| `Request not found.` | no such request for this caller |
| `The request has not finished yet.` | it is still `pending` or `running` |
| `The request was not sent with stream, so its response is already stored.` | not a streamed request |
| `The request changed while it was being finalized. Try again.` | |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"ifAbsent" should be type: <boolean>.` |

## forwardRequestHistory

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestHistory(params: JsonObject, fetchOptions: FetchOptions? = null, signal: SkapiAbortSignal? = null): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> forwardRequestHistory(Map<String, ?> params, FetchOptions fetchOptions, SkapiAbortSignal signal)
// also forwardRequestHistory(params) and forwardRequestHistory(params, fetchOptions)
```

:::

Your forwarded requests to one URL and method. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`; see [Paging](/database/fetch#paging). The server sends up to 100 at a time.

| key | type | |
|---|---|---|
| `url` | string | Required, as it was sent. |
| `method` | string | Required, upper case: `"GET"`, `"POST"`, `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"`. |
| `status` | string | `"pending"`, `"running"`, `"resolved"` or `"failed"`. |
| `queue` | string | Requests in queues whose name starts with this. |
| `queue_exact` | boolean | Only the queue named in `queue` (without it, `"u1"` also matches `"u1-bg"`). The server then reads only that queue's rows. Requests queued before 2026-06-05 were stored under an older queue format and are not listed with it: list the queue without `queue_exact` to see those. |
| `queue_exclude` | string | Leave out this queue. Applied after the read, so a page can come back short while more rows remain: keep paging until `endOfList`. |
| `compact` | boolean | Leave the bodies out; give `request_text`, `response_text`, `response_complete_marker` and `"compact": true` instead. |
| `fields` | `"ids"` | A light listing: each row is only its id, status, times, queue and `cref`, no bodies. |
| `after` | string | Only rows newer than this short id (`"<stamp>:<entropy>"`). |
| `deadline` | number | Milliseconds the listing may take in all; past it, `TIMEOUT` (`No answer within <n> ms.`). |
| `fresh` | boolean | Accepted for skapi-js code; every read of skapi-kotlin is already fresh. |

`signal`: a [SkapiAbortSignal](#skapiabortsignal); aborting it fails the listing with `ABORTED`.

Each item has `id`, `status_code`, `response_body` and `request_id`; the other keys are there when the server stored them:

| key | |
|---|---|
| `id` | the short id |
| `status_code` | the destination's status code, or `null` |
| `response_body` | the answer as stored, text (not parsed), or `null` |
| `error` | the error of a failed request |
| `created`, `updated` | milliseconds |
| `executed` | when it began running, milliseconds |
| `responded` | when the answer finished arriving, milliseconds |
| `request_body` | the `data` or `params` sent |
| `expires` | when it leaves the history |
| `status` | `"pending"`, `"running"`, `"resolved"`, `"failed"` or `"cancelled"` |
| `queue_name` | |
| `cref` | the `cref` the request was sent with |
| `request_id` | for [forwardRequestPoll](#forwardrequestpoll) |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "url". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |
| `INVALID_PARAMETER` | `<value> is invalid in "status". allowed types or values are: "pending", "running", "resolved", "failed".` |
| `INVALID_PARAMETER` | `<value> is invalid in "compact". allowed type or value is: Type<boolean>.` (also `"queue_exact"`) |
| `INVALID_PARAMETER` | `<value> is invalid in "after". allowed type or value is: Type<string>.` (also `"queue"`, `"queue_exclude"`) |
| `INVALID_PARAMETER` | `"fields" should be "ids".` / `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` |
| `TIMEOUT` | `No answer within <n> ms.` (`deadline`) |
| `ABORTED` | `Aborted` (`signal`) |

## forwardRequestStatus

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestStatus(requests: List<JsonElement>, options: JsonObject? = null, signal: SkapiAbortSignal? = null): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> forwardRequestStatus(List<?> requests, Map<String, ?> options, SkapiAbortSignal signal)
// also forwardRequestStatus(requests) and forwardRequestStatus(requests, options)
```

:::

Where many forwarded requests stand, in one call per 100. Strongly consistent, so a request that just changed shows its new status. No bodies.

| argument | |
|---|---|
| `requests` | Full request ids (strings), or `{"id", "url", "method"}` objects with the short id. |
| `options` | `deadline` (milliseconds per call to the server, then `TIMEOUT`), `fresh` (accepted; every read is fresh), `service`, `owner`. |
| `signal` | A [SkapiAbortSignal](#skapiabortsignal). |

Returns `{"list"}` in the order asked (anything else the server reports beside it is kept). Each item:

| key | |
|---|---|
| `id` | the short id |
| `status` | `"pending"`, `"running"`, `"resolved"`, `"failed"`, `"cancelled"`, or `"missing"`: no such request for this caller (never sent, expired, deleted, or sent by someone else) |
| `queue` | |
| `stream` | `true` for a request sent with `stream` |
| `final_seq` | the last chunk's `seq`, written when a streamed request settles |
| `has_body` | a result is stored (read it with [forwardRequestRead](#forwardrequestread)) |
| `created`, `updated`, `executed`, `responded` | milliseconds |
| `cref` | |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"requests" should be an array of request ids or { id, url, method }.` |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` |
| `TIMEOUT` / `ABORTED` | `deadline` passed / `signal` aborted |

## forwardRequestQueueCounters

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestQueueCounters(queues: List<String>, options: JsonObject? = null, signal: SkapiAbortSignal? = null): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> forwardRequestQueueCounters(List<String> queues, Map<String, ?> options, SkapiAbortSignal signal)
// also forwardRequestQueueCounters(queues) and forwardRequestQueueCounters(queues, options)
```

:::

The counters of 1 to 20 queues: `{"queues": {name: {"cnt", "rct", "seq", "in_queue"}}}`. `rct` grows whenever a request on the queue finishes and `seq` whenever one is added, so read these on every check and the requests themselves ([forwardRequestStatus](#forwardrequeststatus)) only when one moved. A queue that never had a request is left out. `options` and `signal` as for [forwardRequestStatus](#forwardrequeststatus).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"queues" should be an array of 1 to 20 queue names.` (also a name that is empty or holds a colon) |
| `TIMEOUT` / `ABORTED` | `deadline` passed / `signal` aborted |

## forwardRequestRead

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestRead(params: JsonObject, signal: SkapiAbortSignal? = null): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> forwardRequestRead(Map<String, ?> params, SkapiAbortSignal signal)
// also forwardRequestRead(params)
```

:::

Reads one forwarded request in full, always in the same shape. Unlike a poll, a resolved request does not come back as its bare answer.

| key | type | |
|---|---|---|
| `id` | string | Required: the `request_id`, or the short id with `url` and `method`. |
| `url`, `method` | string | Needed with a short id. |
| `since` | number | A chunk `seq` (`0` for the beginning): a streamed request's text after it comes back too, including the text a failed stream got before it failed. |
| `service`, `owner` | string | Another project's request. |
| `deadline`, `fresh` | | As for [forwardRequestStatus](#forwardrequeststatus). |

Returns:

| key | |
|---|---|
| `id`, `status` | as in [forwardRequestStatus](#forwardrequeststatus), `"missing"` included |
| `body` | the stored result: the destination's answer, or what [forwardRequestFinalize](#forwardrequestfinalize) kept |
| `error` | why it failed |
| `body_unavailable` | `true`: a result is stored but could not be loaded this time; read again later |
| `stream`, `last_seq`, `final_seq` | stream position |
| `chunks` | `[{"seq", "txt"}]` after `since`, oldest first |
| `more` | more chunks are stored than this read returned: read again from the new cursor |
| `created`, `updated`, `executed`, `responded`, `cref` | |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"since" should be a number.` / `"requestId" should be type: <string>.` |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `INVALID_PARAMETER` | `"deadline" should be a number of milliseconds above 0.` / `"fresh" should be type: <boolean>.` |
| `TIMEOUT` / `ABORTED` | `deadline` passed / `signal` aborted |

## SkapiAbortSignal

::: code-group

```kotlin [Kotlin]
class SkapiAbortSignal {
    val aborted: Boolean
    fun abort()
}
```

```java [Java]
SkapiAbortSignal signal = new SkapiAbortSignal();
signal.abort();
boolean done = signal.getAborted();
```

:::

An abort handle for [forwardRequestStatus](#forwardrequeststatus), [forwardRequestQueueCounters](#forwardrequestqueuecounters), [forwardRequestRead](#forwardrequestread) and [forwardRequestHistory](#forwardrequesthistory). `abort()` fails every call it was given with `ABORTED` (`Aborted`) and takes them off the network. Once aborted it stays aborted: a call given an aborted signal fails at once. Safe from any thread.

## onRequestStatus

::: code-group

```kotlin [Kotlin]
fun onRequestStatus(callback: (JsonObject) -> Unit): () -> Unit
```

```java [Java]
Runnable onRequestStatus(Consumer<Map<String, Object>> callback)  // run() removes the listener
```

:::

Listens to status changes of this user's forwarded requests sent with `notify`, including ones this client holds no poll for (a request sent from another device, or a pass the server queued to continue one). Returns the function that removes the listener. `callback` runs on a background thread.

| event | |
|---|---|
| `{"type": "status", "id", "queue", "status", "previous", "updated", "executed"}` | a request changed status. `id` is the short id; `previous` is absent for a new request; `updated` and `executed` are milliseconds. A hint, not the outcome: read the request for that. |
| `{"type": "connected"}` | the listener is on an open realtime connection: the first time, after every reconnect, and at the planned renewal. Changes made while disconnected were not sent, so read again what you show. |
| `{"type": "disconnected"}` | the connection went away |

The realtime connection is kept open while a listener (or a `notify` poll) is registered: when the app has none and a user is signed in, one is opened. One opened this way is closed ten minutes after the last listener and poll let go, unless the app called [connectRealtime](/api-reference/realtime#connectrealtime) on it or joined a group. Status changes never reach the [connectRealtime](/api-reference/realtime#connectrealtime) callback.

## isRequestStatusLive

::: code-group

```kotlin [Kotlin]
fun isRequestStatusLive(): Boolean
```

```java [Java]
boolean isRequestStatusLive()
```

:::

`true` while status changes are arriving on this client: the server accepted `notify`, the realtime connection is open, and a change came in on it. Polls of `notify` requests slow down only while this is `true`.

## cancelForwardRequest

::: code-group

```kotlin [Kotlin]
suspend fun cancelForwardRequest(params: JsonObject): JsonElement
```

```java [Java]
CompletableFuture<Object> cancelForwardRequest(Map<String, ?> params)
```

:::

Cancels a request that is still `pending` or `running`; it stays in the history as `cancelled`. A streamed request's pieces are discarded. `params`: `url`, `method` (upper case) and `id` (the short id), all required.

Returns `{"removed": <boolean>, "message": <string>}`: `Cancelled.`, `Request not found.` or `The request has already been processed.`

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` / `Key "id" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |

## forwardRequestQueueCount

::: code-group

```kotlin [Kotlin]
suspend fun forwardRequestQueueCount(params: JsonObject): JsonElement
```

```java [Java]
CompletableFuture<Object> forwardRequestQueueCount(Map<String, ?> params)
```

:::

How many requests wait in one queue. Signed-in users only. `params`: `{"queue": <string>}`.

Returns `{"queue_name": <string>, "in_queue": <number>}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"queue" is required.` |
| `INVALID_REQUEST` | `User login is required.` |
