# References

A record can **reference** one other record. Comments on a post, votes on a poll, items in an order: the child records reference the parent, and you fetch them by the parent's ID.

## Referencing a record

Put the parent's record ID or unique ID in `reference`:

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

val post = skapi.postRecord(
    jsonOf("text" to "What do you think of this?"),
    jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public"), "unique_id" to "post:1"),
)

skapi.postRecord(
    jsonOf("text" to "I like it"),
    jsonOf(
        "table" to jsonOf("name" to "comments", "access_group" to "public"),
        "reference" to post["record_id"], // or "post:1"
    ),
)
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> post = skapi.postRecord(
    SkapiJson.obj("text", "What do you think of this?"),
    SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"), "unique_id", "post:1")
).get();

skapi.postRecord(
    SkapiJson.obj("text", "I like it"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "comments", "access_group", "public"),
        "reference", post.get("record_id") // or "post:1"
    )
).get();
```

:::

`reference` also takes an object, `{"record_id": ...}` or `{"unique_id": ...}`. The saved record has the parent's record ID in `record["reference"]`, and the parent's `referenced_count` goes up by one.

To remove a reference, update the record with `"reference" to null`:

::: code-group

```kotlin [Kotlin]
skapi.postRecord(jsonOf("record_id" to "<comment id>", "reference" to null))
```

```java [Java]
skapi.postRecord(SkapiJson.obj("record_id", "<comment id>", "reference", null)).get();
```

:::

A user cannot reference a record in a higher access group than their own, or a private record, unless the uploader [granted them private access](/database/private) to it.

## Fetching references

::: code-group

```kotlin [Kotlin]
// the comments of a post, in one table and one access group
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "comments", "access_group" to "public"),
    "reference" to "post:1",
))

// every record that references the post, in every table (signed in only)
skapi.getRecords(jsonOf("reference" to "post:1"))
```

```java [Java]
// the comments of a post, in one table and one access group
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "comments", "access_group", "public"),
    "reference", "post:1"
)).get();

// every record that references the post, in every table (signed in only)
skapi.getRecords(SkapiJson.obj("reference", "post:1")).get();
```

:::

Without `table`, what comes back depends on who asks:

| The caller | The list holds |
|---|---|
| uploaded the referenced record, or was granted private access to it | **every** record that references it, in every access group, private ones included |
| anyone else | referencing records in access groups up to their own; no private records |

Signed-out callers always need `table`. One call without `table` replaces one call per table, so prefer it to looping over tables.

A user ID in `reference` returns that user's records: your own in every table, or another user's in the `table` you name.

::: code-group

```kotlin [Kotlin]
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "comments", "access_group" to "public"),
    "reference" to "<user id>",
))
```

```java [Java]
skapi.getRecords(SkapiJson.obj(
    "table", SkapiJson.obj("name", "comments", "access_group", "public"),
    "reference", "<user id>"
)).get();
```

:::

Sorting by the number of references, for example the posts with the most comments, uses the [`$referenced_count` index](/database/index-tags#special-indexes).

## Reference rules

`source` in the config of the **parent** sets rules for the records that reference it:

| key | |
|---|---|
| `referencing_limit` | How many records may reference this one. `null` (default) is no limit, `0` allows none. |
| `prevent_multiple_referencing` | `true`: each user may reference it only once. Good for votes. |
| `can_remove_referencing_records` | `true`: the uploader may delete records that reference it, and deleting it deletes them too. Good for a post owner removing comments. |
| `can_modify_referencing_records` | `true`: the uploader may change the `data`, `tags` and `index` of records that reference it, or unlink them. Set it when the record is created. See [Letting the parent's uploader change referencing records](#letting-the-parent-s-uploader-change-referencing-records). |
| `only_granted_can_reference` | `true`: only users with [private access](/database/private) may reference it. |
| `allow_granted_to_grant_others` | `true`: users with private access may grant it to others. |
| `referencing_index_restrictions` | A list of index rules the referencing records must meet, see below. |

### Index restrictions

Each rule is an object with `name` (required), and optionally `value` and `condition`. A referencing record must have an index with that name, of the same type as `value`, that meets the condition (`"="` when left out). The conditions are `"="`, `"!="`, `">"`, `">="`, `"<"`, `"<="` and the word forms `eq`, `ne`, `gt`, `gte`, `lt`, `lte`.

A review board where 10 people can each rate once, below 5:

::: code-group

```kotlin [Kotlin]
skapi.postRecord(
    jsonOf("title" to "Rate the album Getz/Gilberto"),
    jsonOf(
        "table" to jsonOf("name" to "reviews", "access_group" to "public"),
        "unique_id" to "reviews:getz-gilberto",
        "source" to jsonOf(
            "referencing_limit" to 10,
            "prevent_multiple_referencing" to true,
            "referencing_index_restrictions" to listOf(
                jsonOf("name" to "rating", "value" to 5, "condition" to "<"),
            ),
        ),
    ),
)

skapi.postRecord(
    jsonOf("comment" to "Wonderful"),
    jsonOf(
        "table" to jsonOf("name" to "reviews", "access_group" to "public"),
        "reference" to "reviews:getz-gilberto",
        "index" to jsonOf("name" to "rating", "value" to 4.5),
    ),
)
```

```java [Java]
skapi.postRecord(
    SkapiJson.obj("title", "Rate the album Getz/Gilberto"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "reviews", "access_group", "public"),
        "unique_id", "reviews:getz-gilberto",
        "source", SkapiJson.obj(
            "referencing_limit", 10,
            "prevent_multiple_referencing", true,
            "referencing_index_restrictions", SkapiJson.list(
                SkapiJson.obj("name", "rating", "value", 5, "condition", "<")
            )
        )
    )
).get();

skapi.postRecord(
    SkapiJson.obj("comment", "Wonderful"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "reviews", "access_group", "public"),
        "reference", "reviews:getz-gilberto",
        "index", SkapiJson.obj("name", "rating", "value", 4.5)
    )
).get();
```

:::

Use a number for the rating so [getIndexes](/database/index-tags#getindexes) can report the total and average.

`referencing_limit` must be a number from 0 up, or `null`. A rule with a `range` key is refused (`INVALID_PARAMETER`: `Index restriction "range" type should match the type of "value".`), so express ranges with `condition`.

::: warning
A user with private access to a record can read every record that references it, private ones included. If that is not what you want, do not let users post private records that reference other records.
:::

## Letting the parent's uploader change referencing records

By default only the user who uploaded a record can change it. Set `source.can_modify_referencing_records` to `true` when you post a record, and its uploader can also change the records other users post referencing it: a post's author moderating the comments, a support thread's author marking the answers, a form's author updating the status of each submission.

::: code-group

```kotlin [Kotlin]
// The post: its uploader may change the comments that reference it.
val post = skapi.postRecord(
    jsonOf("text" to "What do you think of this?"),
    jsonOf(
        "table" to jsonOf("name" to "posts", "access_group" to "public"),
        "source" to jsonOf("can_modify_referencing_records" to true),
    ),
)

// Later, signed in as the post's uploader: hide another user's comment.
val comment = skapi.postRecord(
    jsonOf("text" to "This comment was hidden by the author of the post."),
    jsonOf(
        "record_id" to "<comment record id>",
        "tags" to listOf("hidden"),
        "index" to jsonOf("name" to "status", "value" to "hidden"),
    ),
)
comment["user_id"]    // still the user who posted the comment
comment["updated_by"] // the post uploader's user ID
```

```java [Java]
// The post: its uploader may change the comments that reference it.
Map<String, Object> post = skapi.postRecord(
    SkapiJson.obj("text", "What do you think of this?"),
    SkapiJson.obj(
        "table", SkapiJson.obj("name", "posts", "access_group", "public"),
        "source", SkapiJson.obj("can_modify_referencing_records", true)
    )
).get();

// Later, signed in as the post's uploader: hide another user's comment.
Map<String, Object> comment = skapi.postRecord(
    SkapiJson.obj("text", "This comment was hidden by the author of the post."),
    SkapiJson.obj(
        "record_id", "<comment record id>",
        "tags", SkapiJson.list("hidden"),
        "index", SkapiJson.obj("name", "status", "value", "hidden")
    )
).get();
comment.get("user_id");    // still the user who posted the comment
comment.get("updated_by"); // the post uploader's user ID
```

:::

### What can be changed

On a record that references their post, the post's uploader can change only:

- `data`
- `tags`
- `index`. The post's [index restrictions](#index-restrictions) still apply to the new index while the record references the post.
- `reference` set to `null`, which unlinks the record from the post. Once unlinked, the post's uploader can no longer change it.

::: code-group

```kotlin [Kotlin]
skapi.postRecord(jsonOf("record_id" to "<comment record id>", "reference" to null))
```

```java [Java]
skapi.postRecord(SkapiJson.obj("record_id", "<comment record id>", "reference", null)).get();
```

:::

Everything else is refused with `INVALID_REQUEST`, and nothing is written:

- The table name, the access group, the subscription settings, `readonly`, `unique_id`, any `source` setting, and removing every file with `"remove_bin" to null`: `The referenced record's user can only change the data, tags and index of a record that references theirs, or unlink it (<field> differs).` A value sent as it is already stored is not a change.
- Removing files by URL with `remove_bin`: `The binary should be owned by the user.` The files belong to the user who posted the record.
- Pointing `reference` at any other record. Only `null` is allowed.
- A private record: `The referenced record's user cannot update a private record.`
- A read-only record: `Record is read only.`
- A record in an access group above the post uploader's own: `User has no access to this group.`

Files cannot be attached either, but `postRecord` does not throw for them: the record is saved first, then each file asks for an upload permit, and those permits are refused (`User has no access to update this record.`). So a request that passes `files` saves its `data`, `tags`, `index` or `reference` change, and returns without attaching the files. Do not pass `files` when changing another user's record.

The record keeps its owner: `user_id` stays the user who posted it, its files stay theirs, and that user can still update or delete it in full.

### When it can be turned on

The setting hands other users' records to the record's uploader, so the users who reference a record must be able to see it before they post. That is why the uploader can set it to `true` only when the record is **created**:

- On an update, the uploader can turn it off (`false`) at any time, but cannot turn it on: `"source.can_modify_referencing_records" can only be set when the record is created. Only the project owner and admins in access group 99 can turn it on for an existing record.`
- The project owner and admins in access group `99` can turn it on for an existing record. Admins in access groups `90` to `98` cannot.

The setting is read back in `record["source"]["can_modify_referencing_records"]`.

### Who changed a record: `updated_by`

When someone other than its uploader last updated a record (the parent's uploader through this setting, the project owner or an admin), the record has `updated_by`, that user's ID. It is removed when the record's uploader updates the record again, and a request cannot set it. See [The record](/database/fetch#the-record).

The record that [postRecord](/api-reference/database#postrecord) returns to the post's uploader after such an update has `ip` read as `""`, or `"0.0.0.0"` for a record posted by a signed-out user: a record's IP address is returned only to its uploader, the project owner and admins in access group `99`.
