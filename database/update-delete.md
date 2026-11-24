# Updating and Deleting

## Updating a record

Call [postRecord](/api-reference/database#postrecord) with the record's `record_id` in the config. Only the keys you send change; everything else on the record stays as it is. You must be signed in, and the record must be yours, with two exceptions:

- The uploader of a record posted with `source.can_modify_referencing_records` can change the `data`, `tags` and `index` of other users' records that reference it, or unlink them with `"reference" to null`. See [Letting the parent's uploader change referencing records](/database/reference#letting-the-parent-s-uploader-change-referencing-records).
- The project owner and admins in access group `99` can update other users' records (admins in access groups `90` to `98` only their subscription settings).

When someone other than its uploader last updated a record, the record has `updated_by`, that user's ID. It is removed when the uploader updates the record again.

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

val rec = skapi.postRecord(
    jsonOf("title" to "Hello again", "body" to "Edited"), // replaces the stored data
    jsonOf("record_id" to "<record id>"),
)
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> rec = skapi.postRecord(
    SkapiJson.obj("title", "Hello again", "body", "Edited"), // replaces the stored data
    SkapiJson.obj("record_id", "<record id>")
).get();
```

:::

`record_id` also takes the record's [unique ID](/database/index-tags#unique-ids).

### Keeping or replacing the data

| You pass | The stored data |
|---|---|
| a value | is replaced by it, whole. Keys you leave out of the new object are gone. |
| nothing (the `postRecord(config)` overload) | is kept. |
| `JsonNull` (or `null`) | becomes `null`. |

To change only the config, call the overload without `data`:

::: code-group

```kotlin [Kotlin]
skapi.postRecord(jsonOf(
    "record_id" to "<record id>",
    "tags" to listOf("featured"),
))
```

```java [Java]
skapi.postRecord(SkapiJson.obj(
    "record_id", "<record id>",
    "tags", SkapiJson.list("featured")
)).get();
```

:::

::: warning
`skapi.postRecord(JsonNull, jsonOf(...))` is not the same: it overwrites the data with `null`.
:::

### Removing things

| To remove | Send |
|---|---|
| the index | `"index" to null` |
| every tag | `"tags" to null` |
| the reference | `"reference" to null` |
| the unique ID | `"unique_id" to null` |
| some files | `"remove_bin" to listOf(file or url, ...)`, see [Files](/database/files#removing-files) |
| every file | `"remove_bin" to null` |

### Moving between access groups

A `table` without `access_group` keeps the record where it is. Name the group to move it:

::: code-group

```kotlin [Kotlin]
skapi.postRecord(jsonOf(
    "record_id" to "<record id>",
    "table" to jsonOf("name" to "notes", "access_group" to "authorized"),
))
```

```java [Java]
skapi.postRecord(SkapiJson.obj(
    "record_id", "<record id>",
    "table", SkapiJson.obj("name", "notes", "access_group", "authorized")
)).get();
```

:::

Moving a record into or out of `"private"` removes every [private access grant](/database/private) on it, and only the record's uploader can do it.

### Refusals

| code | message | when |
|---|---|---|
| `INVALID_REQUEST` | `User has no access to update this record.` | the record is someone else's |
| `INVALID_REQUEST` | `Record is read only.` | the record was created with `"readonly" to true` |
| `INVALID_REQUEST` | `Public users cannot update existing records.` | you are signed out |

## Deleting records

[deleteRecords](/api-reference/database#deleterecords) needs a signed-in user. Files attached to a deleted record are deleted with it.

::: code-group

```kotlin [Kotlin]
// one record
skapi.deleteRecords(jsonOf("record_id" to "<record id>"))

// up to 1000 at once
skapi.deleteRecords(jsonOf("record_id" to listOf("<id 1>", "<id 2>", "<id 3>")))

// by unique ID (also a list of up to 1000)
skapi.deleteRecords(jsonOf("unique_id" to "album:getz-gilberto"))

// every record you uploaded to the public group of "drafts"
skapi.deleteRecords(jsonOf("table" to jsonOf("name" to "drafts", "access_group" to "public")))
```

```java [Java]
// one record
skapi.deleteRecords(SkapiJson.obj("record_id", "<record id>")).get();

// up to 1000 at once
skapi.deleteRecords(SkapiJson.obj("record_id", SkapiJson.list("<id 1>", "<id 2>", "<id 3>"))).get();

// by unique ID (also a list of up to 1000)
skapi.deleteRecords(SkapiJson.obj("unique_id", "album:getz-gilberto")).get();

// every record you uploaded to the public group of "drafts"
skapi.deleteRecords(SkapiJson.obj("table", SkapiJson.obj("name", "drafts", "access_group", "public"))).get();
```

:::

A delete by query takes the same keys as [getRecords](/database/fetch): `table`, `index`, `tag`, `reference`. It deletes only your own records, skips read-only ones, and leaves the table's other access groups alone. It returns the server's message, such as `SUCCESS: records are being deleted. please give some time to finish the process.`, and a large delete can take a moment to show in later reads.

An empty `record_id` or `unique_id` (`""` or an empty list) throws `INVALID_PARAMETER`: `"record_id" is empty.` More than 1000 IDs throws `"record_id" can hold at most 1000 ids.`

::: danger
On a string index value, `"condition" to "<="` means **ends with**. Run the same query through `getRecords` first and check the list before you delete with it.
:::

Admins can delete any record, private and read-only ones included.
