# Version History

### Current version: 2.5.0

::: code-group

```kotlin [Kotlin]
implementation("com.skapi:skapi-kotlin:2.5.0")
```

```kotlin [Java]
implementation("com.skapi:skapi-java:2.5.0")
```

:::

**2.5.0**: the record changes of skapi-js 2.6.0 and skapi-py 2.5.0, released for skapi-kotlin, skapi-android and skapi-java.

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
