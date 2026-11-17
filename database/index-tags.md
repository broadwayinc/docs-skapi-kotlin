# Indexes, Tags and Unique IDs

## Indexes

A record can carry one index: a `name` and a searchable `value`. Skapi also keeps the count, sum and average of the values under each index name.

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

skapi.postRecord(
    jsonOf("title" to "Getz/Gilberto", "tracks" to 10),
    jsonOf(
        "table" to jsonOf("name" to "albums", "access_group" to "public"),
        "index" to jsonOf("name" to "year", "value" to 1964),
    ),
)
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;

SkapiJava skapi = new SkapiJava("<Project ID>");

skapi.postRecord(
    SkapiJson.obj("title", "Getz/Gilberto", "tracks", 10),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "albums", "access_group", "public"),
        "index", SkapiJson.obj("name", "year", "value", 1964)
    )
).get();
```

:::

| | Rules |
|---|---|
| `name` | 1 to 256 characters, no control characters, cannot start with `$`. `/ ! * # %` count as 3 each. |
| `value`, string | 0 to 256 characters, no control characters. |
| `value`, number | From -4503599627370496 to 4503599627370496 (plus or minus 2<sup>52</sup>). Decimals and negatives are fine. |
| `value`, boolean | `true` or `false`. |

A query only matches values of the same type: `"2"` and `2` are different values.

### Querying an index

::: code-group

```kotlin [Kotlin]
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "condition" to ">"),
))
```

```java [Java]
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "albums", "access_group", "public"),
    "index", SkapiJson.obj("name", "year", "value", 1960, "condition", ">")
)).get();
```

:::

| `condition` | Numbers and booleans | Strings |
|---|---|---|
| `"="`, `"eq"` (default) | equal | equal |
| `">"`, `"gt"` / `"<"`, `"lt"` | greater / less | after / before, in character order |
| `">="`, `"gte"` | greater or equal | **starts with** |
| `"<="`, `"lte"` | less or equal | **ends with** |

An "ends with" search comes back ordered by the value read backwards, so sort the list yourself if you need it by value.

`range` reads every value from `value` to `range`, both included. It must be the same type as `value`, and it cannot be combined with `condition` (if both are given, `range` is dropped):

::: code-group

```kotlin [Kotlin]
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "range" to 1969),
))
```

```java [Java]
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "albums", "access_group", "public"),
    "index", SkapiJson.obj("name", "year", "value", 1960, "range", 1969)
)).get();
```

:::

### Special indexes

These names need no index on the record:

| name | value | |
|---|---|---|
| `"$uploaded"` | number (ms) | when the record was created |
| `"$updated"` | number (ms) | when it was last changed |
| `"$referenced_count"` | number | how many records reference it ("posts with the most comments") |
| `"$user_id"` | user ID | records uploaded by that user; no `condition` or `range` |

In Kotlin strings, write `$` as `"\$uploaded"`, or the compiler reads it as a template.

::: code-group

```kotlin [Kotlin]
// albums uploaded after 2021-01-01
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "\$uploaded", "value" to 1609459200000L, "condition" to ">"),
))
```

```java [Java]
// albums uploaded after 2021-01-01
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "albums", "access_group", "public"),
    "index", SkapiJson.obj("name", "$uploaded", "value", 1609459200000L, "condition", ">")
)).get();
```

:::

### Compound index names

Join parts of a name with dots, and you can query each level:

::: code-group

```kotlin [Kotlin]
skapi.postRecord(
    jsonOf("title" to "Dukkha"),
    jsonOf(
        "table" to jsonOf("name" to "albums", "access_group" to "public"),
        "index" to jsonOf("name" to "Band.AsianSpiceHouse.year", "value" to 2023),
    ),
)
```

```java [Java]
skapi.postRecord(
    SkapiJson.obj("title", "Dukkha"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "albums", "access_group", "public"),
        "index", SkapiJson.obj("name", "Band.AsianSpiceHouse.year", "value", 2023)
    )
).get();
```

:::

A name that **ends with a dot** queries the next part of the name as a string:

::: code-group

```kotlin [Kotlin]
val table = jsonOf("name" to "albums", "access_group" to "public")

// every album by any "Band"
skapi.getRecords(jsonOf("table" to table, "index" to jsonOf("name" to "Band.", "value" to "", "condition" to ">")))

// bands whose name starts with "Asian"
skapi.getRecords(jsonOf("table" to table, "index" to jsonOf("name" to "Band.", "value" to "Asian", "condition" to ">=")))

// bands whose name ends with "House"
skapi.getRecords(jsonOf("table" to table, "index" to jsonOf("name" to "Band.", "value" to "House", "condition" to "<=")))

// the value itself needs the full name
skapi.getRecords(jsonOf("table" to table, "index" to jsonOf("name" to "Band.AsianSpiceHouse.year", "value" to 2010, "condition" to ">")))
```

```java [Java]
Map<String, Object> table = SkapiJson.obj("name", "albums", "access_group", "public");

// every album by any "Band"
skapi.getRecords(SkapiJson.obj("table", table, "index", SkapiJson.obj("name", "Band.", "value", "", "condition", ">"))).get();

// bands whose name starts with "Asian"
skapi.getRecords(SkapiJson.obj("table", table, "index", SkapiJson.obj("name", "Band.", "value", "Asian", "condition", ">="))).get();

// bands whose name ends with "House"
skapi.getRecords(SkapiJson.obj("table", table, "index", SkapiJson.obj("name", "Band.", "value", "House", "condition", "<="))).get();

// the value itself needs the full name
skapi.getRecords(SkapiJson.obj("table", table, "index", SkapiJson.obj("name", "Band.AsianSpiceHouse.year", "value", 2010, "condition", ">"))).get();
```

:::

Levels cannot be skipped: `"Band.year"` does not find `"Band.AsianSpiceHouse.year"`.

## Tags

A record can carry any number of tags. Tags are 1 to 256 characters, with no control characters.

::: code-group

```kotlin [Kotlin]
skapi.postRecord(
    jsonOf("title" to "Dukkha"),
    jsonOf(
        "table" to jsonOf("name" to "albums", "access_group" to "public"),
        "tags" to listOf("indie", "experimental"), // or "indie, experimental"
    ),
)

skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "tag" to "experimental",
))
```

```java [Java]
skapi.postRecord(
    SkapiJson.obj("title", "Dukkha"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "albums", "access_group", "public"),
        "tags", SkapiJson.list("indie", "experimental") // or "indie, experimental"
    )
).get();

skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "albums", "access_group", "public"),
    "tag", "experimental"
)).get();
```

:::

A tag query matches the tag exactly and needs a `table`. It can be combined with an `index`. Tags have no conditions; to find spellings, list them with [getTags](#gettags).

## Unique IDs

A `unique_id` is your own ID for a record, such as an order number. It is unique across the project, and works wherever a record ID does: in [getRecords](/database/fetch#by-record-id-or-unique-id), as `record_id` in an update, in `reference`, and in [deleteRecords](/database/update-delete#deleting-records).

::: code-group

```kotlin [Kotlin]
skapi.postRecord(
    jsonOf("total" to 59.0),
    jsonOf(
        "table" to jsonOf("name" to "orders", "access_group" to "private"),
        "unique_id" to "order:1042",
    ),
)

val order = skapi.getRecords(jsonOf("unique_id" to "order:1042"))["list"]!!.jsonArray[0].jsonObject
```

```java [Java]
skapi.postRecord(
    SkapiJson.obj("total", 59.0),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "orders", "access_group", "private"),
        "unique_id", "order:1042"
    )
).get();

Map<?, ?> order = (Map<?, ?>) ((List<?>) skapi.getRecords(SkapiJson.obj("unique_id", "order:1042")).get().get("list")).get(0);
```

:::

Signed-out callers cannot set a unique ID.

Unique IDs that start with `src::` are reserved for records that describe files in your project's file storage, and those records are deleted when the file is. Do not use the prefix for your own IDs.

## Table, tag and index information

These listings answer anyone who knows the Project ID, signed in or not, and the Require Login setting does not apply. Tag, index and unique ID listings are **not** filtered by access group, so do not put anything secret in a table name, tag, index name or unique ID. Each takes the [paging options](/database/fetch#paging) (`FetchOptions`) as its second argument.

### getTables

::: code-group

```kotlin [Kotlin]
skapi.getTables()                                                  // every table
skapi.getTables(jsonOf("table" to "posts"))                        // exactly "posts"
skapi.getTables(jsonOf("table" to "my_", "condition" to ">="))     // names starting with "my_"
skapi.getTables(jsonOf("table" to "_archive", "condition" to "<=")) // names ending with "_archive"
```

```java [Java]
skapi.getTables().get();                                                          // every table
skapi.getTables(SkapiJson.obj("table", "posts")).get();                           // exactly "posts"
skapi.getTables(SkapiJson.obj("table", "my_", "condition", ">=")).get();          // names starting with "my_"
skapi.getTables(SkapiJson.obj("table", "_archive", "condition", "<=")).get();     // names ending with "_archive"
```

:::

Each item: `table`, `number_of_records`, `size`, and `number_of_records_in_access_group_<group>` for the groups you may see (`public` for everyone, up to your own group when signed in).

### getTags

::: code-group

```kotlin [Kotlin]
skapi.getTags()                                                         // every tag, most used first
skapi.getTags(jsonOf("table" to "albums"))                              // every tag in "albums"
skapi.getTags(jsonOf("tag" to "jazz"))                                  // "jazz" in every table
skapi.getTags(jsonOf("table" to "albums", "tag" to "jazz"))             // exactly "jazz" in "albums"
skapi.getTags(jsonOf("table" to "albums", "tag" to "ja", "condition" to ">=")) // starting with "ja"
```

```java [Java]
skapi.getTags().get();                                                                 // every tag, most used first
skapi.getTags(SkapiJson.obj("table", "albums")).get();                                 // every tag in "albums"
skapi.getTags(SkapiJson.obj("tag", "jazz")).get();                                     // "jazz" in every table
skapi.getTags(SkapiJson.obj("table", "albums", "tag", "jazz")).get();                  // exactly "jazz" in "albums"
skapi.getTags(SkapiJson.obj("table", "albums", "tag", "ja", "condition", ">=")).get(); // starting with "ja"
```

:::

Each item: `table`, `tag`, `number_of_records`.

### getIndexes

`table` is required.

::: code-group

```kotlin [Kotlin]
skapi.getIndexes(jsonOf("table" to "albums"))                     // every index
skapi.getIndexes(jsonOf("table" to "albums", "index" to "year"))  // exactly "year"
skapi.getIndexes(jsonOf("table" to "albums", "index" to "Band.")) // the children of "Band."
```

```java [Java]
skapi.getIndexes(SkapiJson.obj("table", "albums")).get();                     // every index
skapi.getIndexes(SkapiJson.obj("table", "albums", "index", "year")).get();     // exactly "year"
skapi.getIndexes(SkapiJson.obj("table", "albums", "index", "Band.")).get();    // the children of "Band."
```

:::

Each item: `table`, `index`, `number_of_records`, `number_count`, `boolean_count`, `string_count`, `total_number`, `total_bool`, `average_number`, `average_bool`.

`order` sorts and filters by one of those numbers, or by name. With a compound name, give the parent (ending with a dot) in `index`:

::: code-group

```kotlin [Kotlin]
// "Vote.Beer", "Vote.Wine", ... rated above 50%, best first
skapi.getIndexes(
    jsonOf(
        "table" to "votes",
        "index" to "Vote.",
        "order" to jsonOf("by" to "average_bool", "value" to 0.5, "condition" to ">"),
    ),
    FetchOptions(ascending = false),
)

// index names starting with "Vote"
skapi.getIndexes(jsonOf(
    "table" to "votes",
    "order" to jsonOf("by" to "index_name", "value" to "Vote", "condition" to ">="),
))
```

```java [Java]
// "Vote.Beer", "Vote.Wine", ... rated above 50%, best first
skapi.getIndexes(
    SkapiJson.obj(
        "table", "votes",
        "index", "Vote.",
        "order", SkapiJson.obj("by", "average_bool", "value", 0.5, "condition", ">")
    ),
    new FetchOptionsBuilder().ascending(false).build()
).get();

// index names starting with "Vote"
skapi.getIndexes(SkapiJson.obj(
    "table", "votes",
    "order", SkapiJson.obj("by", "index_name", "value", "Vote", "condition", ">=")
)).get();
```

:::

`order.by` is one of `average_number`, `total_number`, `number_count`, `average_bool`, `total_bool`, `bool_count`, `string_count`, `index_name`, `number_of_records`. `order.condition` needs `order.value`; a `value` without `condition` matches exactly, and `by` alone returns everything sorted.

### getUniqueId

::: code-group

```kotlin [Kotlin]
skapi.getUniqueId()                                                     // every unique ID
skapi.getUniqueId(jsonOf("unique_id" to "order:1042"))                  // exactly this one
skapi.getUniqueId(jsonOf("unique_id" to "order:", "condition" to ">=")) // starting with "order:"
```

```java [Java]
skapi.getUniqueId().get();                                                         // every unique ID
skapi.getUniqueId(SkapiJson.obj("unique_id", "order:1042")).get();                 // exactly this one
skapi.getUniqueId(SkapiJson.obj("unique_id", "order:", "condition", ">=")).get();  // starting with "order:"
```

:::

Each item: `unique_id`, `record_id`.

For `getTables`, `getTags` and `getUniqueId`, `condition` is `"="` (default), `">"`, `">="` (starts with), `"<"`, `"<="` (ends with), `"!="`, or the word forms `eq`, `gt`, `gte`, `lt`, `lte`, `ne`.
