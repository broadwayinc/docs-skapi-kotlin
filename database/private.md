# Private Records

A record in the `"private"` access group (`"*"` for short) can be read only by its uploader and by the users the uploader grants access to.

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

val rec = skapi.postRecord(
    jsonOf("note" to "Only for me and my doctor"),
    jsonOf("table" to jsonOf("name" to "health", "access_group" to "private")),
)
val recordId = rec["record_id"]!!.jsonPrimitive.content
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> rec = skapi.postRecord(
    SkapiJson.obj("note", "Only for me and my doctor"),
    SkapiJson.obj("table", SkapiJson.obj("name", "health", "access_group", "private"))
).get();
String recordId = (String) rec.get("record_id");
```

:::

To keep its `data` unreadable to the server as well, see [Encrypting Private Data](/database/encryption).

Anyone else who fetches it gets `INVALID_REQUEST`: `User has no private access.` The project owner and admins read a private record only on the same terms as any other user.

A private record that **references** another record can also be read by the users with private access to that other record: its uploader and the users it was shared with. See [References](/database/reference#fetching-references).

## Granting access

[grantPrivateRecordAccess](/api-reference/database#grantprivaterecordaccess) shares one record with up to 100 users at a time. Only the record's uploader can grant, unless the record was posted with `"source" to jsonOf("allow_granted_to_grant_others" to true)`.

::: code-group

```kotlin [Kotlin]
skapi.grantPrivateRecordAccess(recordId, listOf("<user id 1>", "<user id 2>"))
```

```java [Java]
skapi.grantPrivateRecordAccess(recordId, Arrays.asList("<user id 1>", "<user id 2>")).get();
```

:::

A granted user can read the record, even when it is private or above their own access group, and every record that references it. They can also [reference](/database/reference) it. While the record is not private, a record that references it may go in an access group above their own, up to this record's access group; a private record lets no referencing record above their own access group.

## Removing access

::: code-group

```kotlin [Kotlin]
skapi.removePrivateRecordAccess(recordId, listOf("<user id>"))
```

```java [Java]
skapi.removePrivateRecordAccess(recordId, Arrays.asList("<user id>")).get();
```

:::

The user cannot get a new private access key for the record after this. A key they already hold keeps working until it expires, so they lose access to the record and its files **within 1 hour** at most (see [Private files](#private-files)).

## Listing grants

[listPrivateRecordAccess](/api-reference/database#listprivaterecordaccess) takes `recordId`, `userIds`, or both (at least one):

::: code-group

```kotlin [Kotlin]
// who can read this record
skapi.listPrivateRecordAccess(recordId = recordId)

// which records this user was granted
skapi.listPrivateRecordAccess(userIds = listOf("<user id>"))
```

```java [Java]
// who can read this record
skapi.listPrivateRecordAccess(recordId).get();

// which records this user was granted
skapi.listPrivateRecordAccess(null, Arrays.asList("<user id>")).get();
```

:::

```json
{"list": [{"record_id": "...", "user_id": "..."}, ...], "startKey": ..., "endOfList": true, ...}
```

It takes the [paging options](/database/fetch#paging) as `fetchOptions`.

Only users with access to the data can list. With `recordId`, the list is open to the record's uploader, the users it was shared with, the users with private access to the record it references, and the project owner and admins in access group `99`. With `userIds` alone, it is open to that user, the project owner and admins in access group `99`. Anyone else gets `INVALID_REQUEST`: `User has no access to list the private access of this record.` (or `... of this user.`), which does not say whether the record exists.

## Moving in and out of private

Moving a record into or out of `"private"` removes **every** grant on it, in either direction. Grant again afterwards if those users should keep access. Only the record's uploader can move it across that line.

::: code-group

```kotlin [Kotlin]
skapi.postRecord(jsonOf(
    "record_id" to recordId,
    "table" to jsonOf("name" to "health", "access_group" to "authorized"), // clears the grants
))
```

```java [Java]
skapi.postRecord(SkapiJson.obj(
    "record_id", recordId,
    "table", SkapiJson.obj("name", "health", "access_group", "authorized") // clears the grants
)).get();
```

:::

## Private files

Files on a private record are private too. Their uploader and granted users read them with [getFile and the other download methods](/database/files#downloading-files) as usual: skapi-kotlin asks the server for a private access key and adds it to the file request. The key is kept on the `Skapi` object and reused for that record.

A private access key is valid for **1 hour**. skapi-kotlin renews it on its own: a key that has expired, or will within a minute, is replaced with a fresh one the next time it is needed.

[requestPrivateRecordAccessKey](/api-reference/database#requestprivaterecordaccesskey) is that request on its own. You only need it to build file requests yourself:

::: code-group

```kotlin [Kotlin]
val key = skapi.requestPrivateRecordAccessKey(recordId)
```

```java [Java]
String key = skapi.requestPrivateRecordAccessKey(recordId).get();
```

:::

When your access comes from a record that the private record references, pass that record's ID as `referenceId`. The key is given only when the private record references that record directly (its own `reference`, one level) and you uploaded that record or were granted private access to it. A grant on the private record itself is enough too, with or without the reference. Otherwise it throws `INVALID_REQUEST` with `User's private access for reference: "<reference_id>" does not exist.`, also when the private record does not exist.

To hand a private file to someone without an account, make a [signed link](/database/files#links-that-work-without-sign-in) with `expiresSeconds`.
