# Indexes, Tags and Unique IDs

## Indexes

A record can carry one index: a `name` and a searchable `value`. Skapi also keeps the count, sum and average of the values under each index name.

```kotlin
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

| | Rules |
|---|---|
| `name` | 1 to 256 characters, no control characters, cannot start with `$`. `/ ! * # %` count as 3 each. |
| `value`, string | 0 to 256 characters, no control characters. |
| `value`, number | From -4503599627370496 to 4503599627370496 (plus or minus 2<sup>52</sup>). Decimals and negatives are fine. |
| `value`, boolean | `true` or `false`. |

A query only matches values of the same type: `"2"` and `2` are different values.

### Querying an index

```kotlin
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "condition" to ">"),
))
```

| `condition` | Numbers and booleans | Strings |
|---|---|---|
| `"="`, `"eq"` (default) | equal | equal |
| `">"`, `"gt"` / `"<"`, `"lt"` | greater / less | after / before, in character order |
| `">="`, `"gte"` | greater or equal | **starts with** |
| `"<="`, `"lte"` | less or equal | **ends with** |

An "ends with" search comes back ordered by the value read backwards, so sort the list yourself if you need it by value.

`range` reads every value from `value` to `range`, both included. It must be the same type as `value`, and it cannot be combined with `condition` (if both are given, `range` is dropped):

```kotlin
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "year", "value" to 1960, "range" to 1969),
))
```

### Special indexes

These names need no index on the record:

| name | value | |
|---|---|---|
| `"$uploaded"` | number (ms) | when the record was created |
| `"$updated"` | number (ms) | when it was last changed |
| `"$referenced_count"` | number | how many records reference it ("posts with the most comments") |
| `"$user_id"` | user ID | records uploaded by that user; no `condition` or `range` |

In Kotlin strings, write `$` as `"\$uploaded"`, or the compiler reads it as a template.

```kotlin
// albums uploaded after 2021-01-01
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "albums", "access_group" to "public"),
    "index" to jsonOf("name" to "\$uploaded", "value" to 1609459200000L, "condition" to ">"),
))
```

### Compound index names

Join parts of a name with dots, and you can query each level:

```kotlin
skapi.postRecord(
    jsonOf("title" to "Dukkha"),
    jsonOf(
        "table" to jsonOf("name" to "albums", "access_group" to "public"),
        "index" to jsonOf("name" to "Band.AsianSpiceHouse.year", "value" to 2023),
    ),
)
```

A name that **ends with a dot** queries the next part of the name as a string:

```kotlin
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

Levels cannot be skipped: `"Band.year"` does not find `"Band.AsianSpiceHouse.year"`.

## Tags

A record can carry any number of tags. Tags are 1 to 256 characters, with no control characters.

```kotlin
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

A tag query matches the tag exactly and needs a `table`. It can be combined with an `index`. Tags have no conditions; to find spellings, list them with [getTags](#gettags).

## Unique IDs

A `unique_id` is your own ID for a record, such as an order number. It is unique across the project, and works wherever a record ID does: in [getRecords](/database/fetch#by-record-id-or-unique-id), as `record_id` in an update, in `reference`, and in [deleteRecords](/database/update-delete#deleting-records).

```kotlin
skapi.postRecord(
    jsonOf("total" to 59.0),
    jsonOf(
        "table" to jsonOf("name" to "orders", "access_group" to "private"),
        "unique_id" to "order:1042",
    ),
)

val order = skapi.getRecords(jsonOf("unique_id" to "order:1042"))["list"]!!.jsonArray[0].jsonObject
```

Signed-out callers cannot set a unique ID.

Unique IDs that start with `src::` are reserved for records that describe files in your project's file storage, and those records are deleted when the file is. Do not use the prefix for your own IDs.

## Table, tag and index information

These listings answer anyone who knows the Project ID, signed in or not, and the Require Login setting does not apply. Tag, index and unique ID listings are **not** filtered by access group, so do not put anything secret in a table name, tag, index name or unique ID. Each takes the [paging options](/database/fetch#paging) (`FetchOptions`) as its second argument.

### getTables

```kotlin
skapi.getTables()                                                  // every table
skapi.getTables(jsonOf("table" to "posts"))                        // exactly "posts"
skapi.getTables(jsonOf("table" to "my_", "condition" to ">="))     // names starting with "my_"
skapi.getTables(jsonOf("table" to "_archive", "condition" to "<=")) // names ending with "_archive"
```

Each item: `table`, `number_of_records`, `size`, and `number_of_records_in_access_group_<group>` for the groups you may see (`public` for everyone, up to your own group when signed in).

### getTags

```kotlin
skapi.getTags()                                                         // every tag, most used first
skapi.getTags(jsonOf("table" to "albums"))                              // every tag in "albums"
skapi.getTags(jsonOf("tag" to "jazz"))                                  // "jazz" in every table
skapi.getTags(jsonOf("table" to "albums", "tag" to "jazz"))             // exactly "jazz" in "albums"
skapi.getTags(jsonOf("table" to "albums", "tag" to "ja", "condition" to ">=")) // starting with "ja"
```

Each item: `table`, `tag`, `number_of_records`.

### getIndexes

`table` is required.

```kotlin
skapi.getIndexes(jsonOf("table" to "albums"))                     // every index
skapi.getIndexes(jsonOf("table" to "albums", "index" to "year"))  // exactly "year"
skapi.getIndexes(jsonOf("table" to "albums", "index" to "Band.")) // the children of "Band."
```

Each item: `table`, `index`, `number_of_records`, `number_count`, `boolean_count`, `string_count`, `total_number`, `total_bool`, `average_number`, `average_bool`.

`order` sorts and filters by one of those numbers, or by name. With a compound name, give the parent (ending with a dot) in `index`:

```kotlin
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

`order.by` is one of `average_number`, `total_number`, `number_count`, `average_bool`, `total_bool`, `bool_count`, `string_count`, `index_name`, `number_of_records`. `order.condition` needs `order.value`; a `value` without `condition` matches exactly, and `by` alone returns everything sorted.

### getUniqueId

```kotlin
skapi.getUniqueId()                                                     // every unique ID
skapi.getUniqueId(jsonOf("unique_id" to "order:1042"))                  // exactly this one
skapi.getUniqueId(jsonOf("unique_id" to "order:", "condition" to ">=")) // starting with "order:"
```

Each item: `unique_id`, `record_id`.

For `getTables`, `getTags` and `getUniqueId`, `condition` is `"="` (default), `">"`, `">="` (starts with), `"<"`, `"<="` (ends with), `"!="`, or the word forms `eq`, `gt`, `gte`, `lt`, `lte`, `ne`.
