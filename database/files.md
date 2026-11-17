# Files

Files are attached to records. They follow the record's access group and are served through a CDN.

## Uploading with a record

Pass `files` to [postRecord](/api-reference/database#postrecord): a list of `FileUpload` values. Each one is made with a factory:

| factory | |
|---|---|
| `FileUpload.fromFile(name, file, filename?, contentType?)` | A `java.io.File`. `filename` defaults to the file's own name. |
| `FileUpload.fromBytes(name, bytes, filename, contentType?)` | A `ByteArray` in memory. |
| `FileUpload.fromStream(name, stream, filename, contentType?)` | An `InputStream`, read to its end and closed when the upload starts. On Android, `contentResolver.openInputStream(uri)`. |
| `FileUpload.fromText(name, text, filename, contentType?)` | A string, uploaded as UTF-8. |

| argument | |
|---|---|
| `name` | The key the file is listed under in the record's `bin`, like a form field name. Several files can share one name. |
| `filename` | The stored file name. |
| `contentType` | Defaults to a guess from the file name. |

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*
import java.io.File

val skapi = Skapi("<Project ID>")

val rec = skapi.postRecord(
    jsonOf("caption" to "Holiday"),
    jsonOf("table" to jsonOf("name" to "photos", "access_group" to "authorized")),
    files = listOf(
        FileUpload.fromFile("picture", File("beach.jpg")),
        FileUpload.fromBytes("picture", pngBytes, "sunset.png"),
        FileUpload.fromStream("document", File("trip.pdf").inputStream(), "trip.pdf"),
    ),
)
```

```java [Java]
import com.skapi.FileUpload;
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.io.File;
import java.io.FileInputStream;
import java.util.Arrays;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> rec = skapi.postRecord(
    SkapiJson.obj("caption", "Holiday"),
    SkapiJson.obj("table", SkapiJson.obj("name", "photos", "access_group", "authorized")),
    Arrays.asList(
        FileUpload.fromFile("picture", new File("beach.jpg"), null, null),
        FileUpload.fromBytes("picture", pngBytes, "sunset.png", null),
        FileUpload.fromStream("document", new FileInputStream("trip.pdf"), "trip.pdf", null)
    )
).get();
```

:::

In Java, the factories take every argument: pass `null` for a `filename` or `contentType` you leave to the default.

The files are read and checked before the record is created, so a bad entry throws `INVALID_PARAMETER` and nothing is saved. A file storage refuses afterwards does not fail `postRecord`; use [uploadFiles](#adding-files-to-an-existing-record) when you need to know about each file.

To attach files to an existing record of yours without changing anything else, use `postRecord(jsonOf("record_id" to ...), files = listOf(...))` or `uploadFiles`.

## Adding files to an existing record

[uploadFiles](/api-reference/database#uploadfiles) takes the same list and a record ID, and reports on each file:

::: code-group

```kotlin [Kotlin]
val result = skapi.uploadFiles(
    listOf(FileUpload.fromFile("picture", File("more.jpg"))),
    "<record id>",
)
```

```java [Java]
Map<String, Object> result = skapi.uploadFiles(
    Arrays.asList(FileUpload.fromFile("picture", new File("more.jpg"), null, null)),
    "<record id>"
).get();
```

:::

```json
{
    "completed": ["more.jpg"],
    "failed": [],
    "errors": [],
    "bin_endpoints": ["https://..."]
}
```

| key | |
|---|---|
| `completed` | file names stored |
| `failed` | file names not stored |
| `errors` | `{"file": filename, "name": key, "code", "message"}`, one per failed file |
| `bin_endpoints` | one per file, in order; `""` when no upload permit was given |

Files go up one after another, and a refused file does not stop the rest. With five files or more, the upload permits are asked for in batches of 100.

## Files on a record

```kotlin
val rec = skapi.getRecords(jsonOf("record_id" to "<record id>"))["list"]!!.jsonArray[0].jsonObject

for (f in rec["bin"]!!.jsonObject["picture"]!!.jsonArray) {
    val file = f.jsonObject
    println("${file["filename"]} ${file["size"]} ${file["url"]}")
}
```

Each file is a `JsonObject`:

```json
{
    "access_group": "authorized",
    "filename": "beach.jpg",
    "url": "https://...",
    "path": "...",
    "size": 482113,
    "uploaded": 1731600000000
}
```

`size` is in bytes and `uploaded` in milliseconds.

A file in a `"public"` record has a plain CDN link anyone can open. For other access groups, `url` already carries your sign-in token, so it works for a limited time. Use the [download methods](#downloading-files) to read the file or to get a fresh link.

## Downloading files

Each method takes a file's `url`:

```kotlin
val url = rec["bin"]!!.jsonObject["picture"]!!.jsonArray[0].jsonObject["url"]!!.jsonPrimitive.content

val content: ByteArray = skapi.getFile(url)                        // the bytes
val text: String = skapi.getFileText(url)                          // read as UTF-8
val link: String = skapi.getFileUrl(url)                           // a URL to open
val info: JsonObject = skapi.getFileInfo(url)                      // details, no download
val saved: File = skapi.downloadFile(url, File("beach.jpg"))       // writes the file, returns it
```

| method | returns |
|---|---|
| [getFile](/api-reference/database#getfile) | the content as a `ByteArray` |
| [getFileText](/api-reference/database#getfiletext) | the content as a `String`, read as UTF-8 |
| [getFileUrl](/api-reference/database#getfileurl) | a URL to open the file with |
| [getFileInfo](/api-reference/database#getfileinfo) | details read from the URL, without downloading |
| [downloadFile](/api-reference/database#downloadfile) | the `File` written (an existing file is overwritten); on Android, write under `context.filesDir` or `context.cacheDir` |

`getFileInfo` reads the details from the URL itself:

```json
{
    "url": "https://...",
    "filename": "beach.jpg",
    "fileKey": "picture",
    "access_group": "authorized",
    "uploader": "<user id>",
    "record_id": "<record id>",
    "filesize": 482113,
    "uploaded": 1731600000000
}
```

You need access to the record to read its files. Files of records that are not `"public"` need a signed-in user. For a [private](/database/private#private-files) file you were granted access to, skapi-kotlin fetches the access key for you.

### Links that work without sign-in

`expiresSeconds` makes a signed link that anyone can open until it expires, without signing in. Making it needs a signed-in user with access to the file.

```kotlin
val link = skapi.getFileUrl(url, expiresSeconds = 3600)
```

`downloadFile(url, destination, expiresSeconds)` downloads through such a link. A signed link passed back to any of these methods is opened as it is. `expiresSeconds` only works on Skapi file URLs (`INVALID_PARAMETER`: `Expires option can only be used on skapi cdn endpoints.`).

## Removing files

Update the record with `remove_bin`, a list of files from its `bin` or their `url`s:

```kotlin
val rec = skapi.getRecords(jsonOf("record_id" to "<record id>"))["list"]!!.jsonArray[0].jsonObject
val first = rec["bin"]!!.jsonObject["picture"]!!.jsonArray[0]

skapi.postRecord(jsonOf(
    "record_id" to rec["record_id"],
    "remove_bin" to listOf(first), // or listOf(first.jsonObject["url"])
))

// every file on the record
skapi.postRecord(jsonOf("record_id" to rec["record_id"], "remove_bin" to null))
```

An empty list removes nothing.

The files must belong to the record you update.

### Deleting files by URL

[deleteFiles](/api-reference/database#deletefiles) deletes files by URL without touching anything else on the records. It takes a list of up to 1000 URLs, from any records of yours, and returns the updated records. A link from `getFileUrl` works too, and so does the `url` of a file that is not public (it ends in `?t=...`): skapi-kotlin sends the file's stored address, for any file name, including names with spaces or non-English characters. `remove_bin` takes these URLs the same way.

One case is still read wrong: a name that itself holds an encoded sequence, such as `a%20b.pdf`, deleted through a saved `?t=` URL that this `Skapi` object did not hand out. For such names, remove the file with `remove_bin` and the file object from `bin`.

```kotlin
val urls = rec["bin"]!!.jsonObject["picture"]!!.jsonArray.map { it.jsonObject["url"]!!.jsonPrimitive.content }
val records = skapi.deleteFiles(urls)
```

The whole list is checked first: if any file is refused, none is deleted.

Deleting a record deletes its files too.
