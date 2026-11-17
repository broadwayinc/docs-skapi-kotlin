# Fetching Records

[getRecords](/api-reference/database#getrecords) reads records. It takes a query and optional fetch options, and returns a `JsonObject`:

```kotlin
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

val result = skapi.getRecords(
    jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")),
    FetchOptions(limit = 20),
)

for (item in result["list"]!!.jsonArray) {
    val record = item.jsonObject
    println("${record["record_id"]!!.jsonPrimitive.content} ${record["data"]}")
}
```

```json
{
    "list": [record, ...],
    "startKey": {...},
    "endOfList": false,
    "startKeyHistory": [...]
}
```

`startKey` is `"end"` once there is nothing more to read.

## What a query needs

Each query reads by **one** of these:

| You give | `table` |
|---|---|
| `record_id` or `unique_id` | Not needed. Returns that one record. |
| `reference` to a record, signed in | Not needed: searches every table. Add a `table` to read one table and group. |
| `reference` to a user ID, signed in | Not needed for your own ID. Needed for another user's. |
| nothing else, `index` or `tag` | **Required**, with `name` and `access_group`. |

A `table` without `access_group` throws `INVALID_PARAMETER`: `"table.access_group" is required: ...`. A query that needs a table and has none throws `Key "table" is required.`

## By record ID or unique ID

```kotlin
val rec = skapi.getRecords(jsonOf("record_id" to "<record id>"))["list"]!!.jsonArray[0].jsonObject
val album = skapi.getRecords(jsonOf("unique_id" to "album:getz-gilberto"))["list"]!!.jsonArray[0].jsonObject
```

Every other key is ignored, and `record_id` wins when both are given. A missing record throws `NOT_EXISTS` (`Record does not exists.` or `Unique ID does not exists.`). A record you may not read throws `INVALID_REQUEST`: `No access to the record.`, or `User has no private access.` for a [private](/database/private) one.

## From a table

```kotlin
val result = skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "authorized")))
```

Access groups other than `"public"` need a signed-in user. See [Tables and Access Groups](/database/introduction).

## By index

```kotlin
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "condition" to ">="),
))

skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "range" to 1969),
))
```

`condition` is one of `"="` (default), `">"`, `">="`, `"<"`, `"<="` or `"eq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`. `range` reads from `value` to `range`, both included, and must be the same type as `value`. If both are given, `range` is dropped and `condition` is used. Strings, compound names and the special `$` indexes are in [Indexes](/database/index-tags#querying-an-index).

## By tag

```kotlin
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "tag" to "jazz",
))
```

The tag matches exactly. It can be combined with `index`. To read records with one tag **or** another, query each tag and merge the lists by `record_id`.

## By reference

```kotlin
// every record that references a post, in every table this user can read
skapi.getRecords(jsonOf("reference" to "<record id or unique id>"))

// only the comments, in one access group
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "comments", "access_group" to "public"),
    "reference" to "<record id or unique id>",
))

// records a user uploaded to a table
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "comments", "access_group" to "public"),
    "reference" to "<user id>",
))
```

`reference` can also be an object: `{"record_id": ...}`, `{"unique_id": ...}` or `{"user_id": ...}`. Signed-out callers always need `table`. Which records come back is in [References](/database/reference#fetching-references).

## Paging

The second argument, `FetchOptions`, controls paging:

| property | |
|---|---|
| `limit` | Records per call. Default 50, at most 1000. |
| `fetchMore` | `false` (default) always returns the first page. `true` returns the page after the last one this object fetched for the same query. |
| `ascending` | `true` (default) or `false` for the reverse order. |
| `startKey` | Start from this key, taken from an earlier result (`result["startKey"]`). `JsonPrimitive("start")` starts over. |

```kotlin
val query = jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public"))

var page = skapi.getRecords(query, FetchOptions(limit = 100))
handle(page["list"]!!.jsonArray)

while (!page["endOfList"]!!.jsonPrimitive.boolean) {
    page = skapi.getRecords(query, FetchOptions(limit = 100, fetchMore = true))
    handle(page["list"]!!.jsonArray)
}
```

`endOfList` is `true` on the last page, and `startKey` is then `"end"`. Asking for more after that returns an empty list. Fetch only what you need instead of walking a whole table.

The same options work on [getTables](/api-reference/database#gettables), [getTags](/api-reference/database#gettags), [getIndexes](/api-reference/database#getindexes), [getUniqueId](/api-reference/database#getuniqueid) and [listPrivateRecordAccess](/api-reference/database#listprivaterecordaccess).

## The record

Every record comes back as a `JsonObject`:

```json
{
    "record_id": "...",
    "user_id": "...",
    "unique_id": "album:getz-gilberto",
    "table": {"name": "albums", "access_group": "public", "subscription": {...}},
    "data": {...},
    "index": {"name": "year", "value": 1964},
    "tags": ["jazz"],
    "reference": "...",
    "source": {
        "referencing_limit": null,
        "prevent_multiple_referencing": false,
        "can_remove_referencing_records": false,
        "only_granted_can_reference": false
    },
    "referenced_count": 0,
    "readonly": false,
    "uploaded": 1731600000000,
    "updated": 1731600000000,
    "ip": "203.0.113.7",
    "bin": {"cover": [file, ...]}
}
```

| key | |
|---|---|
| `user_id` | the uploader |
| `unique_id` | only when set |
| `data` | what was posted |
| `index`, `tags` | only when set |
| `reference` | the record ID this record references, when set |
| `referenced_count` | how many records reference this one |
| `uploaded`, `updated` | milliseconds |
| `bin` | attached files, see [Files](/database/files) |

Each entry in `bin` is an object with `access_group`, `filename`, `url`, `path`, `size` and `uploaded`. See [Files](/database/files#files-on-a-record).
