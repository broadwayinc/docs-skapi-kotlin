# API Bridge

Every method is a `suspend` function and throws [`SkapiException`](/introduction/errors) with a `code` and a `message`. Values that fail a check throw `INVALID_PARAMETER` before anything is sent. Any method can throw `NETWORK_ERROR` when no answer comes back. A method that waits stops when its coroutine is cancelled. See [Forwarding Requests](/api-bridge/forward-request).

A request is addressed by its `request_id`, or by its short `id` (`"<stamp>:<entropy>"`) together with the `url` and `method` it was sent with. A signed-out caller can only reach its own requests from the same IP address and User-Agent; any other caller gets `NOT_EXISTS` (`Request not found.`).

## forwardRequest

```kotlin
suspend fun forwardRequest(options: JsonObject, form: Map<String, Any?>? = null, onStream: ((String, Int) -> Unit)? = null): JsonElement
```

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
| `poll` | number or boolean | Milliseconds between checks (`true` = 1000). Waits for the answer; makes a queue name when none is given. |
| `stream` | boolean | Relay the answer as it arrives. Queued and polled like `poll`. |
| `expires` | number | Seconds the request stays in the history after it settles. |
| `multipart` | boolean | Send `form` as `multipart/form-data`. Files are `FileUpload` values or `ByteArray`s. |
| `responseType` | `"json"` or `"text"` | Reshapes the answer. An envelope is returned unchanged. |

`"$ACCESS_TOKEN"` anywhere in `url`, `headers`, `data` or `params` becomes the signed-in user's access token (empty when signed out). In Kotlin strings, write `"\$CLIENT_SECRET"` and `"\$ACCESS_TOKEN"`.

Returns:

- no `queue`, `poll` or `stream`: the destination's answer, parsed JSON or text, even when it looks like `{"status": "pending", "id": ...}`. Its status code is not returned.
- `queue` without `poll`: `{"id", "status": "pending", "queue_name", "in_queue", "request_id"}`.
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
| `INVALID_PARAMETER` | `"stream" should be type: <boolean>.` / `"multipart" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `"poll" should be a non-negative number.` |
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

```kotlin
suspend fun forwardRequestPoll(requestId: String, pollMillis: Long = 1000, url: String? = null, method: String? = null,
                               onStream: ((String, Int) -> Unit)? = null, service: String? = null, owner: String? = null): JsonElement
```

Waits for a queued request and returns its result. The first check goes out after `pollMillis` milliseconds (`0` means 1000). It suspends until the request settles; there is no time limit, so cancel the coroutine to stop waiting. With `onStream`, new text of a streamed request is handed over as it arrives.

| argument | |
|---|---|
| `requestId` | The `request_id`, or the short `id` with `url` and `method`. |
| `pollMillis` | Milliseconds between checks. |
| `url`, `method` | Needed with a short `id`. |
| `onStream` | `(text, seq)` for a streamed request. |
| `service`, `owner` | Another project's request; left out, this project's. |

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
| `INVALID_PARAMETER` | `"poll" should be a non-negative number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` (an empty `requestId`) |
| `INVALID_PARAMETER` | `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forwardRequestStream

```kotlin
suspend fun forwardRequestStream(requestId: String, options: JsonObject? = null, onStream: ((String, Int) -> Unit)? = null): JsonElement
```

Reads a streamed request, from the start or after `since`, and returns once it settles. The first read is immediate. Running: hands new text to `onStream` until it settles, then returns the envelope. Settled, not finalized: hands over all the stored text, then returns the envelope. Finalized: returns the kept value. After three degraded reads in a row on a settled request it returns what it has.

| option key | type | |
|---|---|---|
| `url`, `method` | string | Needed with a short `id`. |
| `since` | number | Start after this `seq`. |
| `poll` | number | Milliseconds between reads while it runs. Default 1000. |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"poll" should be a non-negative number.` / `"since" should be a number.` |
| `INVALID_PARAMETER` | `"requestId" should be type: <string>.` / `"url" and "method" are required to address a request by its short id.` / `"<url>" is an invalid url.` |
| `NOT_EXISTS` | `Request not found.` |

## forwardRequestFinalize

```kotlin
suspend fun forwardRequestFinalize(requestId: String, data: JsonElement? = null, options: JsonObject? = null): JsonElement
```

Stores `data` as a settled streamed request's answer and releases its pieces. Later polls return `data`; [forwardRequestHistory](#forwardrequesthistory) lists it as `response_body`. Calling it again replaces the value. Without `data`, `null` is stored. `options`: `url` and `method`, needed with a short `id`.

Returns `{"finalized": <boolean>, "message": <string>}`. These come back with `"finalized": false` instead of throwing:

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

## forwardRequestHistory

```kotlin
suspend fun forwardRequestHistory(params: JsonObject, fetchOptions: FetchOptions? = null): JsonObject
```

Your forwarded requests to one URL and method. Returns `{"list", "startKey", "endOfList", "startKeyHistory"}`; see [Paging](/database/fetch#paging). The server sends up to 100 at a time.

| key | type | |
|---|---|---|
| `url` | string | Required, as it was sent. |
| `method` | string | Required, upper case: `"GET"`, `"POST"`, `"PUT"`, `"PATCH"`, `"DELETE"`, `"HEAD"`. |
| `status` | string | `"pending"`, `"running"`, `"resolved"` or `"failed"`. |
| `queue` | string | Requests in queues whose name starts with this. |
| `queue_exact` | boolean | Only the queue named in `queue`. |
| `queue_exclude` | string | Leave out this queue. |
| `compact` | boolean | Leave the bodies out; give `request_text`, `response_text`, `response_complete_marker` and `"compact": true` instead. |

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
| `request_id` | for [forwardRequestPoll](#forwardrequestpoll) |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "url". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |
| `INVALID_PARAMETER` | `<value> is invalid in "status". allowed types or values are: "pending", "running", "resolved", "failed".` |
| `INVALID_PARAMETER` | `<value> is invalid in "compact". allowed type or value is: Type<boolean>.` (also `"queue_exact"`) |

## cancelForwardRequest

```kotlin
suspend fun cancelForwardRequest(params: JsonObject): JsonElement
```

Cancels a request that is still `pending` or `running`; it stays in the history as `cancelled`. A streamed request's pieces are discarded. `params`: `url`, `method` (upper case) and `id` (the short id), all required.

Returns `{"removed": <boolean>, "message": <string>}`: `Cancelled.`, `Request not found.` or `The request has already been processed.`

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Key "url" is required.` / `Key "method" is required.` / `Key "id" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "method". allowed types or values are: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD".` |

## forwardRequestQueueCount

```kotlin
suspend fun forwardRequestQueueCount(params: JsonObject): JsonElement
```

How many requests wait in one queue. Signed-in users only. `params`: `{"queue": <string>}`.

Returns `{"queue_name": <string>, "in_queue": <number>}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"queue" is required.` |
| `INVALID_REQUEST` | `User login is required.` |
