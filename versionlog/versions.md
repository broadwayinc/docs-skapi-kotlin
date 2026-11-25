# Version History

### Current version: 2.7.0

::: code-group

```kotlin [Kotlin]
implementation("com.skapi:skapi-kotlin:2.7.0")
```

```kotlin [Java]
implementation("com.skapi:skapi-java:2.7.0")
```

:::

**2.7.0**: aligned with skapi-js 2.7.0 (and the request status push of skapi-js 2.5.0), released for skapi-kotlin, skapi-android and skapi-java. There was no 2.5.0 or 2.6.0 release of skapi-kotlin: 2.7.0 is the first release with the record changes listed under 2.5.0 below.

New:

- **[forwardRequestStatus](/api-reference/api-bridge#forwardrequeststatus)** reads where many forwarded requests stand in one call (up to 100 per call to the server, more are sent 100 at a time): status, stream position, whether a result is stored (`has_body`), timestamps and `cref`, with no bodies. A request this caller cannot see comes back as `"missing"` instead of failing the call. See [Many requests at once](/api-bridge/forward-request#many-requests-at-once).
- **[forwardRequestQueueCounters](/api-reference/api-bridge#forwardrequestqueuecounters)** reads the counters of up to 20 queues (`cnt`, `rct`, `seq`, `in_queue`), so an app can check often and read the requests themselves only when a counter moved.
- **[forwardRequestRead](/api-reference/api-bridge#forwardrequestread)** reads one request and always answers `{"id", "status", "body"?, "error"?, "chunks"?, ...}`, so the status is there even for a resolved request, and a failed stream comes back with the text it got before it failed. See [Reading one request in full](/api-bridge/forward-request#reading-one-request-in-full).
- **`cref` on [forwardRequest](/api-reference/api-bridge#forwardrequest)**: your own reference for the request, stored on it and handed back by the reply, forwardRequestHistory, forwardRequestStatus and forwardRequestRead, so a send whose reply was lost can be found instead of sent twice. See [Finding a request again](/api-bridge/forward-request#finding-a-request-again).
- **[forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory)** takes `"fields" to "ids"` (only id, status, times, queue and `cref`, no bodies) and `"after"` (only requests newer than a short id), and its rows carry `cref`.
- **`"ifAbsent" to true` on [forwardRequestFinalize](/api-reference/api-bridge#forwardrequestfinalize)** stores the result only when none is stored yet, and otherwise answers `{"finalized": false, "reason": "exists"}`.
- **`deadline` and `signal` on the reads.** forwardRequestStatus, forwardRequestQueueCounters, forwardRequestRead and forwardRequestHistory take `"deadline"` (milliseconds the call may take in all, the wait for the connection, a sign-in token refresh and the waits after a `429` included, then `TIMEOUT`) and a [SkapiAbortSignal](/api-reference/api-bridge#skapiabortsignal) (`abort()` fails the call with `ABORTED` at once, at any stage, and takes it off the network). `"fresh"` is accepted for code shared with skapi-js; every skapi-kotlin read is already fresh. See [Deadlines and aborting](/api-bridge/forward-request#deadlines-and-aborting).
- **Request status push.** `"notify" to true` on a queued request has the server send each status change to the user's realtime connections. A poll of that request ([forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll) with `notify = true`, or `forwardRequest` with `poll`) then reads at once when a change names it, and otherwise once a minute while changes arrive. [onRequestStatus](/api-reference/api-bridge#onrequeststatus) listens to every change, and [isRequestStatusLive](/api-reference/api-bridge#isrequeststatuslive) says whether changes are arriving. See [Status push](/api-bridge/forward-request#status-push).
- `SKAPI_VERSION` reads `"2.7.0"`.

Fixes and changes:

- **A passing failure no longer says the project does not exist.** The first call of a Skapi object reads the project's endpoint list from the CDN, and any failed read of it threw `NOT_EXISTS` ("The project ID does not exist"), so a sign-in could fail once with `NOT_EXISTS` and work when tried again. Now only a missing list (the CDN answers 403 or 404) throws `NOT_EXISTS`; a server fault throws `SERVER_ERROR`, a rate limit `RATE_LIMITED`, a cut-off answer `NETWORK_ERROR`, and no answer in time `TIMEOUT`, all safe to try again.
- **Request status changes no longer reach the realtime callback.** The server sends a user's status changes (`"#code": "CSR_STATUS"`, a private message with no sender) to every realtime connection of that user, also when another client of the same user sent the request with `notify`. Before 2.7.0 they reached your [connectRealtime](/api-reference/realtime#connectrealtime) callback as `"private"` events with no `sender`; they are now left out, and go to onRequestStatus.
- **A poll ends only with the server's answer.** A read that failed on the way (no network, `TIMEOUT`, a `429`, a server fault, no sign-in token) used to end [forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll), [forwardRequestStream](/api-reference/api-bridge#forwardrequeststream) and a polling `forwardRequest` with that error at once, so a phone coming back from sleep turned requests that were still running into errors. It is now tried again later, waiting twice as long each time up to 30 seconds. A `401` refreshes the sign-in token once and the poll carries on; while signed out the poll waits for a sign in without sending. A refusal from the server still ends it.
- **New error codes for failures on the way.** A `5xx` answer (except `501`) now throws `SERVER_ERROR` (was the code in the body, or the status number), with the body in `details`. A `429` without `Retry-After` throws `RATE_LIMITED` (was `ERROR`); for a file upload it is `TOO_MANY_REQUESTS`, as in skapi-js. A `429` still answered after its retries keeps `TOO_MANY_REQUESTS`. The messages are the same words as before. See [Errors](/introduction/errors).
- **A sign-in token refresh gets 15 seconds in all.** A refresh whose connection stalled (after a sleep or a network change) used to hold every signed-in call for up to the connection timeout. Calls that need a refresh at the same time share one, and each waits for it at most 15 seconds: past that the call fails with `TIMEOUT` (`The sign-in token refresh did not answer within 15 seconds.`), the user stays signed in, and the next call tries the refresh again. A refresh the server refuses (a revoked or expired refresh token, a deleted user) still ends the session.
- **[connectRealtime](/api-reference/realtime#connectrealtime) waits for a connection the request status push is still opening.** It takes that connection over and returns once it is open; if it fails to open, the callback gets the `error` event and connectRealtime throws, as for a connection it opens itself.
- **`queue_exact` reads only the named queue on the server.** Requests queued before 2026-06-05 were stored under an older queue format and are not listed with `"queue_exact" to true`; list the queue without it to see those. See [forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory).

Not ported, because skapi-kotlin works differently: the realtime relay of streamed text and its end-of-stream signal (skapi-kotlin reads streams by polling), and the skapi-js poll registry changes (one poll per request, oldest-first order within a queue, aborting a stopped poll's read, a clock that cannot go back): in skapi-kotlin each poll is the call that waits for it, and cancelling its coroutine ends it.

**2.5.0**: the record changes of skapi-js 2.6.0 and skapi-py 2.5.0. Never released: they ship in 2.7.0, so install 2.7.0 to use them.

New:

- **`source.can_modify_referencing_records`.** A record posted with `"source" to jsonOf("can_modify_referencing_records" to true)` lets its uploader change the `data`, `tags` and `index` of other users' records that reference it, or unlink them with `"reference" to null`, by calling [postRecord](/api-reference/database#postrecord) with the record's `record_id`. Nothing else of such a record can be changed this way, and private and read-only records are refused. The uploader can set it only when the record is created and can turn it off at any time; only the project owner and admins in access group `99` can turn it on for an existing record. A value that is not a boolean throws `INVALID_PARAMETER` (`"source.can_modify_referencing_records" should be type: <boolean>.`). Every record now has `can_modify_referencing_records` in `source` (`false` unless set). See [Letting the parent's uploader change referencing records](/database/reference#letting-the-parent-s-uploader-change-referencing-records).
- **`updated_by` on a record**: the user ID of the user who last updated the record when that was not its uploader (the referenced record's uploader, the project owner or an admin). It is absent when the uploader made the last update, and is never listed in `source`. See [The record](/database/fetch#the-record).
- `SKAPI_VERSION` reads `"2.5.0"`.

Changes on the server, for every SDK version:

- **A record's IP address is returned only to its uploader, the project owner and admins in access group `99`.** Everyone else reads `ip` as `""`, or `"0.0.0.0"` for a record a signed-out user posted from an IPv4 address, so its `user_id` still starts with `anonymous:`; `readonly` and `unique_id` read as before. 2.5.0 also reads a missing `ip` as `""`.
- **`"reference" to null` no longer lets a record into a higher access group.** A user can post a record in an access group above their own only when the request references a record in that group (a reply). Unlinking with `"reference" to null`, or moving a record that keeps its reference to another access group, is refused with `User has no access to this group.` like any other post above the user's access group.
- **A record that stops referencing a record leaves its lists.** After its reference is removed or changed, [getRecords](/api-reference/database#getrecords) with the old `reference` (tag and private record reads included) and the old referenced record's uploader's feed no longer return it.
- **Record files of type HTML, SVG, XML or JavaScript are downloaded instead of opened as pages.** Files attached to records are served with headers that keep a browser from running them. Images, video, audio, PDFs and hosted sites are not affected, and [getFile](/api-reference/database#getfile) reads the bytes as before.

**2.4.4**: matches skapi-js 2.4.4 and skapi-py 2.4.4, released for skapi-kotlin, skapi-android and skapi-java. There was no 2.4.2 or 2.4.3 release.

- **A stalled file upload fails with `TIMEOUT` (`Upload timeout: ...`) instead of `NETWORK_ERROR`.** An upload was already limited by how long it goes with nothing moving, not by its total time, so a slow upload that keeps moving is never cut off. Once the whole file is written, its answer may now take 5 × `timeoutSeconds`, because the last megabytes can still be draining from the network buffers.
- **A request that stops moving fails with `TIMEOUT`.** When nothing is sent or received for `timeoutSeconds`, a call now throws `TIMEOUT` (`No response for 120 seconds.` with the default) instead of `NETWORK_ERROR`, so you can tell a dead connection from no connection. See [Errors](/introduction/errors).
- **Polling intervals under 1 second are refused.** The `poll` option of [`forwardRequest`](/api-reference/api-bridge#forwardrequest), the `pollMillis` of [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) and the `poll` option of [`forwardRequestStream`](/api-reference/api-bridge#forwardrequeststream) now throw `INVALID_PARAMETER` (`"poll" should be a number of milliseconds, 1000 or more.`) for a value under `1000`; before, any number of 0 or more was accepted. `poll: 0` on [`forwardRequest`](/api-reference/api-bridge#forwardrequest) still means "do not poll", and `0` on [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) still means the default, 1000. The same rule as skapi-js 2.4.4.
- `SKAPI_VERSION` reads `"2.4.4"`.

skapi-js 2.4.3 (signed-out reads no longer sign out) and the 2.4.4 request queue change need nothing here: skapi-kotlin never signed out on a read, and it sends each request on its own instead of through a page-wide queue.

**2.4.1**: Adds skapi-java (`com.skapi:skapi-java`), a layer for Java code on top of skapi-kotlin: every method returns a `CompletableFuture`, and JSON comes and goes as plain Java maps and lists. See [Using from Java](/introduction/java). There are no changes to skapi-kotlin or skapi-android behaviour; they are released as 2.4.1 together with skapi-java, and `SKAPI_VERSION` reads `"2.4.1"`.

**2.4.0**: First release of skapi-kotlin, the Kotlin and Android version of skapi-js 2.4.0 and skapi-py 2.4.0.
