# Database

Every method is a `suspend` function and throws [`SkapiException`](/introduction/errors) with a `code` and a `message`. Records are returned as `JsonObject`s; the shape is in [The record](/database/fetch#the-record).

## Common errors

These can come from any method below that takes the input or needs the state.

| code | message | when |
|---|---|---|
| `INVALID_REQUEST` | `User login is required.` | the method needs a signed-in user |
| `INVALID_PARAMETER` | `"<field>" should be type: <string>.` / `"<field>" is required.` | a name is missing or not a string |
| `INVALID_PARAMETER` | `"<field>" should be <= 256 characters.` | a table, index or tag name (or string value) is too long; `/ ! * # %` count as 3 each |
| `INVALID_PARAMETER` | `"<field>" cannot include control characters or unsupported sentinel characters.` | |
| `INVALID_PARAMETER` | `"<field>" cannot start with "$".` | a custom index name |
| `INVALID_PARAMETER` | `"<value>" is invalid in "condition". allowed types or values are: ...` | an unknown condition |
| `INVALID_PARAMETER` | `Number value should be within range -4503599627370496 ~ +4503599627370496` | an index number out of range |
| `INVALID_PARAMETER` | `"table.access_group" is invalid.` / `"table.access_group" should be type: <number \| string>.` / `"table.access_group" value should be within a range of 0 ~ 99.` | |
| `INVALID_PARAMETER` | `Unsigned users have no access to records with access group.` | signed out, with an access group other than `"public"` |
| `INVALID_PARAMETER` | `User ID is empty.` / `User ID should be type: string.` / `User ID is invalid.` | a user ID (the field name varies) |
| `INVALID_REQUEST` | `Fetch limit should be below 1000.` | `FetchOptions.limit` |
| `INVALID_PARAMETER` | `"<value>" is invalid startKey key.` | `FetchOptions.startKey` is not an object, `"start"` or `"end"` |
| `NETWORK_ERROR` | `Network error` | no answer came back |
| `TOO_MANY_REQUESTS` | `Too many requests: ...` | still refused after 6 automatic retries |

## FetchOptions

```kotlin
public class FetchOptions(
    public val limit: Int? = null,
    public val ascending: Boolean? = null,
    public val startKey: JsonElement? = null,
    public val fetchMore: Boolean = false,
)
```

| property | |
|---|---|
| `limit` | Items per page, up to 1000. The server's default is 50. |
| `ascending` | The sort direction. |
| `startKey` | Where to start: the `startKey` of an earlier answer, `JsonPrimitive("start")` to start over, or `JsonPrimitive("end")`. |
| `fetchMore` | `true` reads the next page of the same query, continuing from the last answer. |

See [Paging](/database/fetch#paging). Methods that take it return `{"list": [...], "startKey": ..., "endOfList": <boolean>, "startKeyHistory": [...]}`.

## FileUpload

```kotlin
FileUpload.fromFile(name: String, file: File, filename: String? = null, contentType: String? = null): FileUpload
FileUpload.fromBytes(name: String, bytes: ByteArray, filename: String, contentType: String? = null): FileUpload
FileUpload.fromStream(name: String, stream: InputStream, filename: String, contentType: String? = null): FileUpload
FileUpload.fromText(name: String, text: String, filename: String, contentType: String? = null): FileUpload
```

A file to attach to a record ([postRecord](#postrecord), [uploadFiles](#uploadfiles)) or to send in a multipart [forwardRequest](/api-reference/api-bridge#forwardrequest).

| argument | |
|---|---|
| `name` | The field name the file is listed under in the record's `bin`. |
| `file`, `bytes`, `stream`, `text` | The content. A stream is read to its end, and closed, when the upload starts. Text is uploaded as UTF-8. |
| `filename` | The file's name. `fromFile` defaults to the file's own name. |
| `contentType` | The media type; guessed from `filename` when left out. |

The content is read when the upload starts. See [Files](/database/files#uploading-with-a-record).

## postRecord

```kotlin
suspend fun postRecord(data: JsonElement?, config: JsonObject, files: List<FileUpload>? = null): JsonObject
suspend fun postRecord(config: JsonObject, files: List<FileUpload>? = null): JsonObject
```

Creates a record, or updates the one named by `config["record_id"]`. Returns the saved record. The second overload keeps the stored data: use it to update only the config or attach files. See [Creating Records](/database/create) and [Updating](/database/update-delete).

| argument | |
|---|---|
| `data` | Any JSON value, up to 2 MB. `JsonNull` or `null`: store null. `config["data"]`, when present, is used instead. |
| `config` | Required. Keys below. |
| `files` | `FileUpload` values. See [Files](/database/files). |

| config key | type | |
|---|---|---|
| `table` | object | `{"name", "access_group"}`. Required unless `record_id` is given. On create a left-out group is `"public"`; on update it keeps the record's group. |
| `record_id` | string | The record (or unique ID) to update. |
| `unique_id` | string or `null` | `null` removes it. |
| `readonly` | boolean | |
| `index` | object or `null` | `{"name": <string>, "value": <string, number or boolean>}`. `null` removes it. |
| `tags` | array of strings, or comma-separated string | `null` or `[]` removes them. |
| `reference` | string, `{"record_id"}`, `{"unique_id"}` or `null` | `null` removes it. |
| `source` | object | `referencing_limit` (number or `null`), `prevent_multiple_referencing`, `can_remove_referencing_records`, `only_granted_can_reference`, `allow_granted_to_grant_others` (booleans), `referencing_index_restrictions` (array of `{"name", "value"?, "condition"?}`). See [Reference rules](/database/reference#reference-rules). |
| `remove_bin` | array of urls or bin objects, or `null` | Files to remove. `null` removes every file; `[]` removes nothing. |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"table.name" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "table". allowed types or values are: Type<string>, Type<object>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "unique_id". allowed types or values are: Type<string>, null.` |
| `INVALID_PARAMETER` | `<value> is invalid in "readonly". allowed type or value is: Type<boolean>.` |
| `INVALID_PARAMETER` | `"index" should be type: <object \| null>.` |
| `INVALID_PARAMETER` | `"tag" should be type: <string \| string[]>.` |
| `INVALID_PARAMETER` | `"reference" should be type: <string \| object>.` / `"reference.unique_id" should be type: <string>.` |
| `INVALID_PARAMETER` | `"remove_bin" should be type: <string[] \| BinaryFile[] \| null>` |
| `INVALID_PARAMETER` | `"reference_limit" should be type: <number \| null>` / `"reference_limit" should be >= 0` |
| `INVALID_PARAMETER` | `"source.<key>" should be type: <boolean>.` |
| `INVALID_PARAMETER` | `Key "name" is required.` (an index restriction without `name`) |
| `INVALID_PARAMETER` | `Index restriction "range" type should match the type of "value".` (any restriction with `range`) |
| `INVALID_PARAMETER` | `"files[<i>]" should have a field name.` / `"files[<i>].filename" is required for bytes.` |
| `INVALID_PARAMETER` | `"files[<i>].file" cannot be read: <reason>.` (the file or stream could not be read) |
| `INVALID_REQUEST` | `Data should not exceed 2MB` |
| `INVALID_REQUEST` | `Public users can only post records to public tables.` / `Public users cannot update existing records.` / `Public users cannot set unique_id for records.` / `Public users cannot remove files from records.` |
| `INVALID_REQUEST` | `User has no access to update this record.` |
| `INVALID_REQUEST` | `Record is read only.` |
| `INVALID_REQUEST` | `Only the owner of a record can move it into or out of the private access group.` / `User has no access to change the private access of the record.` |
| `INVALID_REQUEST` | `"__data__/__json__.json" is a reserved file name.` (a file named `__json__.json` under the name `__data__`) |

A file that storage refuses after the record is saved throws nothing.

## postRecords

```kotlin
suspend fun postRecords(items: List<JsonObject>): JsonObject
```

Saves many records, 100 to a request. Each item is `{"data"?: ..., "config": {...}}` with the keys of [postRecord](#postrecord); files are not supported. Returns:

```json
{"list": [record, ...], "failed": [{"index": <number>, "code": <string>, "message": <string>}, ...]}
```

A refused item is listed in `failed` with the error `postRecord` would have thrown, and does not stop the others. A failed request (network, sign-in, server) throws, and records saved before it stay saved. See [Many records at once](/database/create#many-records-at-once).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"items" should be a non-empty array.` |
| in `failed` | `"items[<i>].config" is required.` |
| in `failed`, `INVALID_REQUEST` | `This encrypted update is over 256 KB once sealed; save it with postRecord().` |
| in `failed`, `ERROR` | `The server answered nothing for this record.` / `The record was not saved.` |

## getRecords

```kotlin
suspend fun getRecords(query: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

Returns `{"list": [record, ...], "startKey", "endOfList", "startKeyHistory"}`. See [Fetching Records](/database/fetch).

| query key | type | |
|---|---|---|
| `record_id` | string | One record. Every other key is ignored. |
| `unique_id` | string | One record by unique ID. Ignored when `record_id` is given. |
| `table` | object | `{"name", "access_group"}`, both required. Needed except with `record_id`, `unique_id` or (signed in) `reference`. |
| `reference` | string, or `{"record_id"}`, `{"unique_id"}`, `{"user_id"}` | Records that reference this record, or records this user uploaded. |
| `index` | object | `{"name", "value", "condition"?, "range"?}`. `name` may be `"$uploaded"`, `"$updated"`, `"$referenced_count"` (number values) or `"$user_id"` (a user ID). `condition`: `"="`, `">"`, `">="`, `"<"`, `"<="`, `"eq"`, `"gt"`, `"gte"`, `"lt"`, `"lte"`. With both `condition` and `range`, `range` is dropped. See [Indexes](/database/index-tags#querying-an-index). |
| `tag` | string | Exact tag. |

### Errors

| code | message |
|---|---|
| `REQUIRE_LOGIN` | `This project requires users to sign in before reading its database, so "getRecords" is not available to a signed-out visitor.` |
| `INVALID_PARAMETER` | `"table.access_group" is required: a table is always { name, access_group }. To read what references a record in every table, send "reference" without "table".` |
| `INVALID_PARAMETER` | `Key "table" is required.` |
| `INVALID_PARAMETER` | `"record_id" should be type: <string>.` / `"record_id" should only contain alphanumeric characters.` / `"unique_id" should be type: <string>.` |
| `INVALID_PARAMETER` | `<value> is invalid in "table". allowed type or value is: Type<object>.` (also for `"index"`; `Type<string>` for `"reference"`) |
| `INVALID_PARAMETER` | `"index.value" should be type: number.` (a `$uploaded`, `$updated` or `$referenced_count` query) |
| `INVALID_PARAMETER` | `"index.value" is required.` / `"index.range" type should match the type of "index.value".` |
| `INVALID_PARAMETER` | `"tag" should be type: string.` |
| `NOT_EXISTS` | `Record does not exists.` / `Unique ID does not exists.` |
| `INVALID_REQUEST` | `No access to the record.` / `User has no private access.` |

A warning in the log (logger `skapi`), not an error: `table` written as a string. It means `{"name": ..., "access_group": "public"}`.

## deleteRecords

```kotlin
suspend fun deleteRecords(query: JsonObject, fetchOptions: FetchOptions? = null): JsonElement
```

Signed-in only. Deletes your records, and their files, by:

| query key | |
|---|---|
| `record_id` | string, or an array of up to 1000 |
| `unique_id` | string, or an array of up to 1000. Ignored when `record_id` is given. |
| `table`, `index`, `tag`, `reference` | a query, as in [getRecords](#getrecords); `table` is required, except with `{"reference": {"user_id": <your own ID>}}`. Deletes only your own records that are not read-only, in that one access group. |

Returns the server's message as a string, such as `SUCCESS: records are being deleted. please give some time to finish the process.`, or an object with the deleted records in `list` when the server answers with them. Admins can delete any record. See [Deleting records](/database/update-delete#deleting-records).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"record_id" is empty.` / `"unique_id" is empty.` (`""` or an empty array) |
| `INVALID_PARAMETER` | `"record_id" can hold at most 1000 ids.` |
| `INVALID_PARAMETER` | `"record_id[<i>]" should only contain alphanumeric characters.` / `"unique_id[<i>]" should be type: <string>.` |
| | the query errors of [getRecords](#getrecords) |

## getTables

```kotlin
suspend fun getTables(query: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

No sign-in needed. Lists tables. See [getTables](/database/index-tags#gettables).

| query key | |
|---|---|
| `table` | A table name. Left out: every table. |
| `condition` | Left out: exact name. `">="` starts with, `"<="` ends with, `">"`, `"<"`, `"="`, `"!="` and the word forms `gt`, `gte`, `lt`, `lte`, `eq`, `ne`. |

Each item: `{"table", "number_of_records", "size", "number_of_records_in_access_group_<group>"...}`, with only the group counters the caller may see.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"table" should not be empty.` / `"table" is required for condition.` |

## getTags

```kotlin
suspend fun getTags(query: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

No sign-in needed. Lists tags. See [getTags](/database/index-tags#gettags).

| query key | |
|---|---|
| `table` | Left out: every table. |
| `tag` | A tag. |
| `condition` | As in [getTables](#gettables). Left out: exact when both `table` and `tag` are given, otherwise starts with. |

With no query at all: every tag in the project, most used first. Each item: `{"table", "tag", "number_of_records"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"table" or "tag" is required for condition.` |

## getIndexes

```kotlin
suspend fun getIndexes(query: JsonObject, fetchOptions: FetchOptions? = null): JsonObject
```

No sign-in needed. Lists the indexes of a table. See [getIndexes](/database/index-tags#getindexes).

| query key | |
|---|---|
| `table` | Required. |
| `index` | Left out: every index. A name: that index exactly. A name ending with `.`: its children. |
| `order` | `{"by", "value"?, "condition"?}`. `by`: `average_number`, `total_number`, `number_count`, `average_bool`, `total_bool`, `bool_count`, `string_count`, `index_name`, `number_of_records`. `value` alone matches exactly; `condition` as in [getTables](#gettables). With `index_name`, `">="` is starts with and `"<="` ends with. |

Each item: `{"table", "index", "number_of_records", "number_count", "boolean_count", "string_count", "total_number", "total_bool", "average_number", "average_bool"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"table" is required.` |
| `INVALID_PARAMETER` | `<value> is invalid in "order". allowed type or value is: Type<object>.` |
| `INVALID_PARAMETER` | `"order.by" is required.` / `"<value>" is invalid in "by". allowed types or values are: ...` |
| `INVALID_PARAMETER` | `"value" is required for "condition".` |
| `INVALID_PARAMETER` | `"order.value" should be type: <string \| number \| boolean>.` |
| `INVALID_PARAMETER` | `"index" should be a parent index name of the compound index when using "order.by"` (an `index` not ending with `.`) |

## getUniqueId

```kotlin
suspend fun getUniqueId(query: JsonObject? = null, fetchOptions: FetchOptions? = null): JsonObject
```

No sign-in needed. Lists unique IDs. See [getUniqueId](/database/index-tags#getuniqueid).

| query key | |
|---|---|
| `unique_id` | Left out: every unique ID. |
| `condition` | As in [getTables](#gettables). Left out: exact. |

Each item: `{"unique_id", "record_id"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `<value> is invalid in "unique_id". allowed type or value is: Type<string>.` |
| `INVALID_PARAMETER` | `"unique_id" should not be empty.` / `"unique_id" is required for condition.` |

## uploadFiles

```kotlin
suspend fun uploadFiles(files: List<FileUpload>, recordId: String, service: String? = null): JsonObject
```

Attaches files to an existing record you can write. `files` is the same list as `files` on [postRecord](#postrecord). Returns:

```json
{
    "completed": [filename, ...],
    "failed": [filename, ...],
    "errors": [{"file": filename, "name": key, "code": <string>, "message": <string>}, ...],
    "bin_endpoints": [url_or_empty_string, ...]
}
```

Files go up one at a time; a refused file does not stop the rest. See [Adding files](/database/files#adding-files-to-an-existing-record).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"record_id" is required.` |
| `INVALID_PARAMETER` | the `files[<i>]` errors of [postRecord](#postrecord) |

## getFile

```kotlin
suspend fun getFile(url: String): ByteArray
```

Reads a record file by its `url` and returns its bytes. An encrypted attachment is opened when its record's key is at hand. See [Downloading files](/database/files#downloading-files).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"<url>" is an invalid url.` / `Invalid file url.` |
| `INVALID_REQUEST` | `User login is required.` (a file that is not public) |
| the storage's code, such as `AccessDenied` | an expired or refused signed link |

## getFileText

```kotlin
suspend fun getFileText(url: String): String
```

Reads a record file and returns it as UTF-8 text. Errors as [getFile](#getfile).

## getFileUrl

```kotlin
suspend fun getFileUrl(url: String, expiresSeconds: Long = 0): String
```

A URL to open the file with. With `expiresSeconds` above 0, a signed link that works without sign-in for that many seconds; making it needs a signed-in user with access to the file. A link that is already signed is returned as it is. See [Links that work without sign-in](/database/files#links-that-work-without-sign-in).

### Errors

| code | message |
|---|---|
| | the errors of [getFile](#getfile) |
| `INVALID_PARAMETER` | `Expires option can only be used on skapi cdn endpoints.` |
| `INVALID_PARAMETER` | `"config.expires" should be > 0. (seconds)` (a negative `expiresSeconds`) |
| `INVALID_REQUEST` | `User login is required.` (with `expiresSeconds`) |

## getFileInfo

```kotlin
suspend fun getFileInfo(url: String): JsonObject
```

What a file URL says, without downloading: `{"url", "filename", "fileKey", "access_group", "uploader", "record_id", "filesize", "uploaded"}`.

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"<url>" is an invalid url.` / `Invalid file url.` |

## downloadFile

```kotlin
suspend fun downloadFile(url: String, destination: File, expiresSeconds: Long = 0): File
```

Downloads a record file to `destination` (an existing file is overwritten) and returns it as an absolute `File`. With `expiresSeconds`, the file is downloaded through a signed link. Errors as [getFileUrl](#getfileurl).

## deleteFiles

```kotlin
suspend fun deleteFiles(endpoints: List<String>): JsonElement
```

Signed-in only. Deletes files by URL (up to 1000, from any records) and returns the updated records. A URL with a `?t=` token (a file that is not public, or a link from `getFileUrl`) is turned back into the file's stored address, so names with spaces or non-English characters work. If any file is refused, none is deleted. See [Deleting files by URL](/database/files#deleting-files-by-url).

### Errors

| code | message |
|---|---|
| `INVALID_REQUEST` | `The record should be owned by the user.` |
| `INVALID_REQUEST` | `Only the owner of a private record can delete its files.` |
| `NOT_EXISTS` | `Record "<record_id>" does not exists.` |
| `INVALID_REQUEST` | `Invalid endpoint` / `Cannot delete more than 1000 files at once.` |
| `INVALID_REQUEST` | `"__data__/__json__.json" is a reserved file name.` |

## grantPrivateRecordAccess

```kotlin
suspend fun grantPrivateRecordAccess(recordId: String, userIds: List<String>): JsonElement
```

Signed-in only. Lets up to 100 users read one of your private records. Returns the server's message. An [encrypted](/database/encryption#sharing-a-record) record gets a key wrap for each new user first. See [Granting access](/database/private#granting-access).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `User ID is required.` (an empty list) / `Cannot process more than 100 users at once.` |
| `INVALID_PARAMETER` | `User ID in "user_id" is invalid.` |
| `INVALID_REQUEST` | `Record should be owned by the user.` |
| `INVALID_REQUEST` | `Private access cannot be granted to service owners.` |

## removePrivateRecordAccess

```kotlin
suspend fun removePrivateRecordAccess(recordId: String, userIds: List<String>): JsonElement
```

Signed-in only. Same arguments and client errors as [grantPrivateRecordAccess](#grantprivaterecordaccess). Returns the server's message. The user cannot get a new private access key for the record after this, and a key they already hold stops working when it expires (within 1 hour).

On an [encrypted](/database/encryption#sharing-a-record) record, the record's key is replaced first and the access is removed after, so if replacing the key fails, the access stays as it was.

## listPrivateRecordAccess

```kotlin
suspend fun listPrivateRecordAccess(recordId: String? = null, userIds: List<String>? = null, fetchOptions: FetchOptions? = null): JsonObject
```

Signed-in only. Who can read a private record (`recordId`), or which private records users can read (`userIds`); at least one. Each item in `list` has `record_id` and `user_id`. See [Listing grants](/database/private#listing-grants).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Either record_id or user_id must be provided.` |
| `INVALID_PARAMETER` | `User ID is empty.` / `User ID is invalid.` |

## requestPrivateRecordAccessKey

```kotlin
suspend fun requestPrivateRecordAccessKey(recordId: String, referenceId: String? = null): String
```

Signed-in only. Returns the key that opens the record's private files, and keeps it on the object. The key is valid for 1 hour; the kept key is returned until it is within a minute of expiring, then a fresh one is requested. The download methods call this for you. `referenceId` is the record the private record references, when your access comes from that record. See [Private files](/database/private#private-files).

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Record ID is required.` |
| `INVALID_REQUEST` | `User's private access for record: "<record_id>" does not exist.` / `User's private access for reference: "<reference_id>" does not exist.` |
| `ERROR` | `Invalid private access key response.` |
