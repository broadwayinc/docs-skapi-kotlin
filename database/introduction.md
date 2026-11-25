# Tables and Access Groups

Every record lives in a **table**, in one **access group**. There is no schema to set up: a table is created by its first record and goes away when its last record is deleted.

A table is always written as a JSON object with its name and its access group:

::: code-group

```kotlin [Kotlin]
jsonOf("name" to "posts", "access_group" to "public")
```

```java [Java]
SkapiJson.obj("name", "posts", "access_group", "public")
```

:::

Table names are 1 to 256 characters long, with no control characters. `/`, `!`, `*`, `#` and `%` count as 3 characters each.

The examples on these pages build JSON with `jsonOf(...)` and read answers with the `kotlinx.serialization.json` accessors (`jsonPrimitive`, `jsonObject`, `jsonArray`). Every method that talks to the server is a `suspend` function, so call it from a coroutine (`runBlocking`, `lifecycleScope.launch`, and so on). See [Getting Started](/introduction/getting-started).

::: warning
Writing the table as a plain string, `"table" to "posts"`, is deprecated in [getRecords](/api-reference/database#getrecords) and [deleteRecords](/api-reference/database#deleterecords). It still means the `public` records of that table and logs a warning once (logger `skapi`). Always write `jsonOf("name" to ..., "access_group" to ...)`.
:::

## Access groups

| `access_group` | Same as | Who can read the records |
|---|---|---|
| `"public"` | `0` | Anyone, signed in or not. |
| `"authorized"` | `1` | Any signed-in user. |
| `2` to `98` | | Users whose own access group is that number or higher. |
| `"admin"` | `99` | Admins and the project owner. |
| `"private"` | `"*"` | The uploader, and the users they [grant access](/database/private) to. |

A user reads records in access groups up to their own, which is the `access_group` in their profile (`skapi.user?.get("access_group")`). The project owner sets it on skapi.com. Records come back with `"public"`, `"authorized"`, `"admin"`, `"private"` or the number.

One table can hold records in several access groups. A query reads one table in one access group at a time:

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

val publicNotes = skapi.getRecords(jsonOf("table" to jsonOf("name" to "notes", "access_group" to "public")))
val memberNotes = skapi.getRecords(jsonOf("table" to jsonOf("name" to "notes", "access_group" to "authorized")))
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> publicNotes = skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "notes", "access_group", "public"))).get();
Map<String, Object> memberNotes = skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "notes", "access_group", "authorized"))).get();
```

:::

## Who can write

**Signed-out callers** can create records in `"public"` only, and must write `"access_group" to "public"` (or `0`). Otherwise:

| They try to | code | message |
|---|---|---|
| name another access group | `INVALID_PARAMETER` | `Unsigned users have no access to records with access group.` |
| leave `access_group` out | `INVALID_REQUEST` | `Public users can only post records to public tables.` |
| update a record | `INVALID_REQUEST` | `Public users cannot update existing records.` |
| set a `unique_id` | `INVALID_REQUEST` | `Public users cannot set unique_id for records.` |
| remove files | `INVALID_REQUEST` | `Public users cannot remove files from records.` |

They cannot delete records either: [deleteRecords](/api-reference/database#deleterecords) needs a signed-in user. A record they create has a `user_id` that starts with `anonymous:`. It is temporary and names no user.

**Signed-in users** can post records to any access group up to their own, and to `"private"`. Above their own access group, a record must reference a record they were [granted private access](/database/private) to, and go no higher than that record's access group: see [References](/database/reference). They can update and delete only their own records, and not [read-only](/database/create#read-only-records) ones. Admins can delete any record.

## Reading while signed out

A signed-out caller can read only `"public"` records. Naming any other access group throws `INVALID_PARAMETER`: `Unsigned users have no access to records with access group.`

### Require Login

When the project's **Require Login** setting is on (in the project settings on skapi.com), [getRecords](/api-reference/database#getrecords) refuses signed-out callers before anything is sent:

::: code-group

```kotlin [Kotlin]
try {
    skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")))
} catch (err: SkapiException) {
    if (err.code == "REQUIRE_LOGIN") println("Sign in first")
}
```

```java [Java]
import com.skapi.SkapiException;
import java.util.concurrent.ExecutionException;

try {
    skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"))).get();
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    if ("REQUIRE_LOGIN".equals(err.getCode())) System.out.println("Sign in first");
}
```

:::

The message is `This project requires users to sign in before reading its database, so "getRecords" is not available to a signed-out visitor.` Signed-in users are not affected, and neither are [getTables, getTags, getIndexes and getUniqueId](/database/index-tags#table-tag-and-index-information). The setting is a guard in the SDK, not an access rule on the server: data that must stay hidden from signed-out callers belongs in an access group above `"public"`.

## Next

- [Creating Records](/database/create)
- [Fetching Records](/database/fetch)
- [Private Records](/database/private)
