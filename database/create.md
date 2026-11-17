# Creating Records

[postRecord](/api-reference/database#postrecord) creates a record, or [updates one](/database/update-delete) when the config has a `record_id`. It returns the saved record as a `JsonObject` (a `Map<String, Object>` in Java, see [The record](/database/fetch#the-record)).

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

val record = skapi.postRecord(
    jsonOf("title" to "Hello", "body" to "My first post"),                    // data
    jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")), // config
)
println(record["record_id"]!!.jsonPrimitive.content)
println(record["data"]!!.jsonObject["title"]!!.jsonPrimitive.content)
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> record = skapi.postRecord(
    SkapiJson.obj("title", "Hello", "body", "My first post"),                     // data
    SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public")) // config
).get();
System.out.println(record.get("record_id"));
System.out.println(((Map<?, ?>) record.get("data")).get("title"));
```

:::

## data

`data` is any JSON value (a `JsonElement`): an object, an array, a string, a number, a boolean, or `JsonNull`. In Java it is a `Map`, a `List`, a `String`, a number, a `Boolean` or `null` (see [JSON as maps and lists](/introduction/java#json-as-maps-and-lists)).

- **Left out**, the stored data is kept. This only matters on an update: `skapi.postRecord(config)`, the overload without `data`.
- **`JsonNull`** (or `null`) stores `null`.
- **Up to 2 MB** as JSON. More throws `INVALID_REQUEST`: `Data should not exceed 2MB`.

`jsonOf(...)`, `jsonArrayOf(...)` and `toJsonElement()` turn Kotlin maps, lists, strings, numbers, booleans and `null` into JSON. Any other value becomes its `toString()` text, so convert dates and your own classes yourself.

Data larger than 32 KB is kept in file storage instead of the database. You do not have to do anything about it: reading the record gives back the value you posted.

## config

| key | type | |
|---|---|---|
| `table` | object | `{"name", "access_group"}`. Required when creating. A left-out `access_group` means `"public"` when creating (signed-out callers must write it), and keeps the record's group when updating. See [access groups](/database/introduction#access-groups). |
| `record_id` | string | Update this record instead of creating one. A unique ID works too. |
| `unique_id` | string or `null` | Your own ID for the record, unique in the project. `null` removes it on an update. See [Unique IDs](/database/index-tags#unique-ids). |
| `readonly` | boolean | `true` makes the record unchangeable. |
| `index` | object or `null` | `{"name", "value"}`, one searchable value: a string, number or boolean. `null` removes it. See [Indexes](/database/index-tags). |
| `tags` | array of strings, or a comma-separated string | Labels to search by. `[]` removes them on an update. See [Tags](/database/index-tags#tags). |
| `reference` | string, object or `null` | The record ID or unique ID of a record this one refers to. `null` removes it. See [References](/database/reference). |
| `source` | object | Rules for records that reference this one. See [Reference rules](/database/reference#reference-rules). |
| `remove_bin` | array or `null` | Updates only: files to take off the record. See [Files](/database/files#removing-files). |

`files` (the third argument) attaches files. See [Files](/database/files).

## Read-only records

::: code-group

```kotlin [Kotlin]
val rec = skapi.postRecord(
    jsonOf("order" to 1042, "total" to 59.0),
    jsonOf("table" to jsonOf("name" to "orders", "access_group" to "private"), "readonly" to true),
)
```

```java [Java]
Map<String, Object> rec = skapi.postRecord(
    SkapiJson.obj("order", 1042, "total", 59.0),
    SkapiJson.obj("table", SkapiJson.obj("name", "orders", "access_group", "private"), "readonly", true)
).get();
```

:::

A read-only record cannot be updated or deleted by its uploader. An update throws `INVALID_REQUEST`: `Record is read only.`

## Tags, index and unique ID

::: code-group

```kotlin [Kotlin]
skapi.postRecord(
    jsonOf("title" to "Getz/Gilberto", "artist" to "Stan Getz, Joao Gilberto"),
    jsonOf(
        "table" to jsonOf("name" to "albums", "access_group" to "public"),
        "unique_id" to "album:getz-gilberto",
        "index" to jsonOf("name" to "year", "value" to 1964),
        "tags" to listOf("jazz", "bossa nova"),
    ),
)
```

```java [Java]
skapi.postRecord(
    SkapiJson.obj("title", "Getz/Gilberto", "artist", "Stan Getz, Joao Gilberto"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "albums", "access_group", "public"),
        "unique_id", "album:getz-gilberto",
        "index", SkapiJson.obj("name", "year", "value", 1964),
        "tags", SkapiJson.list("jazz", "bossa nova")
    )
).get();
```

:::

Each record has at most one index and any number of tags. How to query them is in [Indexes, Tags and Unique IDs](/database/index-tags).

## Reference and source

::: code-group

```kotlin [Kotlin]
val post = skapi.postRecord(
    jsonOf("text" to "What do you think?"),
    jsonOf(
        "table" to jsonOf("name" to "posts", "access_group" to "public"),
        "source" to jsonOf("prevent_multiple_referencing" to true),
    ),
)

skapi.postRecord(
    jsonOf("text" to "I like it"),
    jsonOf(
        "table" to jsonOf("name" to "comments", "access_group" to "public"),
        "reference" to post["record_id"],
    ),
)
```

```java [Java]
Map<String, Object> post = skapi.postRecord(
    SkapiJson.obj("text", "What do you think?"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "posts", "access_group", "public"),
        "source", SkapiJson.obj("prevent_multiple_referencing", true)
    )
).get();

skapi.postRecord(
    SkapiJson.obj("text", "I like it"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "comments", "access_group", "public"),
        "reference", post.get("record_id")
    )
).get();
```

:::

See [References](/database/reference).

## Many records at once

[postRecords](/api-reference/database#postrecords) takes a list of `{"data", "config"}` items and saves them 100 to a request. A thousand rows are ten requests instead of a thousand.

::: code-group

```kotlin [Kotlin]
val result = skapi.postRecords(rows.map { row ->
    jsonOf("data" to row, "config" to jsonOf("table" to jsonOf("name" to "imports", "access_group" to "public")))
})

println("${result["list"]!!.jsonArray.size} saved")
for (f in result["failed"]!!.jsonArray) {
    val failed = f.jsonObject
    println("${failed["index"]} ${failed["code"]} ${failed["message"]}")
}
```

```java [Java]
List<Map<String, Object>> items = new ArrayList<>();
for (Map<String, Object> row : rows) {
    items.add(SkapiJson.obj("data", row, "config", SkapiJson.obj("table", SkapiJson.obj("name", "imports", "access_group", "public"))));
}
Map<String, Object> result = skapi.postRecords(items).get();

System.out.println(((List<?>) result.get("list")).size() + " saved");
for (Object f : (List<?>) result.get("failed")) {
    Map<?, ?> failed = (Map<?, ?>) f;
    System.out.println(failed.get("index") + " " + failed.get("code") + " " + failed.get("message"));
}
```

:::

```json
{
    "list": [record, ...],
    "failed": [
        {"index": 7, "code": "INVALID_PARAMETER", "message": "..."}
    ]
}
```

`list` holds the saved records, in the order given; `failed` holds the items that were not saved, by position. Each item follows the rules of `postRecord`, with the same config keys. A refused item does not stop the others, and the size of `list` plus the size of `failed` is the number of items. Only a failed request (network, sign-in, a server error) throws; records saved by earlier requests stay saved. `postRecords` does not attach files: use [uploadFiles](/database/files#adding-files-to-an-existing-record) on the saved records.
