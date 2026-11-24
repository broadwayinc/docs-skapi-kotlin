# Fetching Records

[getRecords](/api-reference/database#getrecords) reads records. It takes a query and optional fetch options, and returns a `JsonObject` (a `Map<String, Object>` in Java):

::: code-group

```kotlin [Kotlin]
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

```java [Java]
import com.skapi.java.FetchOptionsBuilder;
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.util.List;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> result = skapi.getRecords(
    SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public")),
    new FetchOptionsBuilder().limit(20).build()
).get();

for (Object item : (List<?>) result.get("list")) {
    Map<?, ?> record = (Map<?, ?>) item;
    System.out.println(record.get("record_id") + " " + record.get("data"));
}
```

:::

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

::: code-group

```kotlin [Kotlin]
val rec = skapi.getRecords(jsonOf("record_id" to "<record id>"))["list"]!!.jsonArray[0].jsonObject
val album = skapi.getRecords(jsonOf("unique_id" to "album:getz-gilberto"))["list"]!!.jsonArray[0].jsonObject
```

```java [Java]
Map<?, ?> rec = (Map<?, ?>) ((List<?>) skapi.getRecords(SkapiJson.obj("record_id", "<record id>")).get().get("list")).get(0);
Map<?, ?> album = (Map<?, ?>) ((List<?>) skapi.getRecords(SkapiJson.obj("unique_id", "album:getz-gilberto")).get().get("list")).get(0);
```

:::

Every other key is ignored, and `record_id` wins when both are given. A missing record throws `NOT_EXISTS` (`Record does not exists.` or `Unique ID does not exists.`). A record you may not read throws `INVALID_REQUEST`: `No access to the record.`, or `User has no private access.` for a [private](/database/private) one.

## From a table

::: code-group

```kotlin [Kotlin]
val result = skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "authorized")))
```

```java [Java]
Map<String, Object> result = skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "authorized"))).get();
```

:::

Access groups other than `"public"` need a signed-in user. See [Tables and Access Groups](/database/introduction).

## By index

::: code-group

```kotlin [Kotlin]
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "condition" to ">="),
))

skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "range" to 1969),
))
```

```java [Java]
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "albums", "access_group", "public"),
    "index", SkapiJson.obj("name", "year", "value", 1960, "condition", ">=")
)).get();

skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "albums", "access_group", "public"),
    "index", SkapiJson.obj("name", "year", "value", 1960, "range", 1969)
)).get();
```

:::

`condition` is one of `"="` (default), `">"`, `">="`, `"<"`, `"<="` or `"eq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`. `range` reads from `value` to `range`, both included, and must be the same type as `value`. If both are given, `range` is dropped and `condition` is used. Strings, compound names and the special `$` indexes are in [Indexes](/database/index-tags#querying-an-index).

## By tag

::: code-group

```kotlin [Kotlin]
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "tag" to "jazz",
))
```

```java [Java]
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "albums", "access_group", "public"),
    "tag", "jazz"
)).get();
```

:::

The tag matches exactly. It can be combined with `index`. To read records with one tag **or** another, query each tag and merge the lists by `record_id`.

## By reference

::: code-group

```kotlin [Kotlin]
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

```java [Java]
// every record that references a post, in every table this user can read
skapi.getRecords(SkapiJson.obj("reference", "<record id or unique id>")).get();

// only the comments, in one access group
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "comments", "access_group", "public"),
    "reference", "<record id or unique id>"
)).get();

// records a user uploaded to a table
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "comments", "access_group", "public"),
    "reference", "<user id>"
)).get();
```

:::

`reference` can also be an object: `{"record_id": ...}`, `{"unique_id": ...}` or `{"user_id": ...}`. Signed-out callers always need `table`. Which records come back is in [References](/database/reference#fetching-references).

## Paging

The second argument, `FetchOptions`, controls paging. In Java, build it with `new FetchOptionsBuilder().limit(100).fetchMore(true).build()`.

| property | |
|---|---|
| `limit` | Records per call. Default 50, at most 1000. |
| `fetchMore` | `false` (default) always returns the first page. `true` returns the page after the last one this object fetched for the same query. |
| `ascending` | `true` (default) or `false` for the reverse order. |
| `startKey` | Start from this key, taken from an earlier result (`result["startKey"]`). `JsonPrimitive("start")` starts over. |

::: code-group

```kotlin [Kotlin]
val query = jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public"))

var page = skapi.getRecords(query, FetchOptions(limit = 100))
handle(page["list"]!!.jsonArray)

while (!page["endOfList"]!!.jsonPrimitive.boolean) {
    page = skapi.getRecords(query, FetchOptions(limit = 100, fetchMore = true))
    handle(page["list"]!!.jsonArray)
}
```

```java [Java]
Map<String, Object> query = SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"));

Map<String, Object> page = skapi.getRecords(query, new FetchOptionsBuilder().limit(100).build()).get();
handle((List<?>) page.get("list"));

while (!Boolean.TRUE.equals(page.get("endOfList"))) {
    page = skapi.getRecords(query, new FetchOptionsBuilder().limit(100).fetchMore(true).build()).get();
    handle((List<?>) page.get("list"));
}
```

:::

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
        "can_modify_referencing_records": false,
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
| `updated_by` | only when someone other than the uploader made the last update (the referenced record's uploader through [`can_modify_referencing_records`](/database/reference#letting-the-parent-s-uploader-change-referencing-records), the project owner or an admin): that user's ID. Gone once the uploader updates the record again. |
| `ip` | the uploader's IP address, returned only to the uploader, the project owner and admins in access group `99`. Anyone else reads `""`, or `"0.0.0.0"` for a record a signed-out user posted from an IPv4 address (its `user_id` starts with `anonymous:`). One posted from an IPv6 address reads `""`, and its `user_id` has no `anonymous:` prefix, as before. |
| `bin` | attached files, see [Files](/database/files) |

Each entry in `bin` is an object with `access_group`, `filename`, `url`, `path`, `size` and `uploaded`. See [Files](/database/files#files-on-a-record).
