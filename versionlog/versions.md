# Version History

### Current version: 2.4.4

::: code-group

```kotlin [Kotlin]
implementation("com.skapi:skapi-kotlin:2.4.4")
```

```kotlin [Java]
implementation("com.skapi:skapi-java:2.4.4")
```

:::

**2.4.4**: matches skapi-js 2.4.4 and skapi-py 2.4.4, released for skapi-kotlin, skapi-android and skapi-java. There was no 2.4.2 or 2.4.3 release.

- **A stalled file upload fails with `TIMEOUT` (`Upload timeout: ...`) instead of `NETWORK_ERROR`.** An upload was already limited by how long it goes with nothing moving, not by its total time, so a slow upload that keeps moving is never cut off. Once the whole file is written, its answer may now take 5 × `timeoutSeconds`, because the last megabytes can still be draining from the network buffers.
- **A request that stops moving fails with `TIMEOUT`.** When nothing is sent or received for `timeoutSeconds`, a call now throws `TIMEOUT` (`No response for 120 seconds.` with the default) instead of `NETWORK_ERROR`, so you can tell a dead connection from no connection. See [Errors](/introduction/errors).
- **Polling intervals under 1 second are refused.** The `poll` option of [`forwardRequest`](/api-reference/api-bridge#forwardrequest), the `pollMillis` of [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) and the `poll` option of [`forwardRequestStream`](/api-reference/api-bridge#forwardrequeststream) now throw `INVALID_PARAMETER` (`"poll" should be a number of milliseconds, 1000 or more.`) for a value under `1000`; before, any number of 0 or more was accepted. `poll: 0` on [`forwardRequest`](/api-reference/api-bridge#forwardrequest) still means "do not poll", and `0` on [`forwardRequestPoll`](/api-reference/api-bridge#forwardrequestpoll) still means the default, 1000. The same rule as skapi-js 2.4.4.
- `SKAPI_VERSION` reads `"2.4.4"`.

skapi-js 2.4.3 (signed-out reads no longer sign out) and the 2.4.4 request queue change need nothing here: skapi-kotlin never signed out on a read, and it sends each request on its own instead of through a page-wide queue.

**2.4.1**: Adds skapi-java (`com.skapi:skapi-java`), a layer for Java code on top of skapi-kotlin: every method returns a `CompletableFuture`, and JSON comes and goes as plain Java maps and lists. See [Using from Java](/introduction/java). There are no changes to skapi-kotlin or skapi-android behaviour; they are released as 2.4.1 together with skapi-java, and `SKAPI_VERSION` reads `"2.4.1"`.

**2.4.0**: First release of skapi-kotlin, the Kotlin and Android version of skapi-js 2.4.0 and skapi-py 2.4.0.
