# Getting Started

skapi-kotlin is the Skapi API for Kotlin. It signs users in, keeps their sessions, and reads and writes your project's database, with the same queries, answers and error codes as [skapi-js](https://docs.skapi.com) and skapi-py. Use it in Android apps, Kotlin servers, desktop programs and command line tools.

It comes in two parts:

- **skapi-kotlin**: the library itself. Plain JVM code that runs anywhere Kotlin runs, Android included.
- **skapi-android**: small helpers for Android apps: a session store in SharedPreferences sealed by the Android Keystore, a device key store for record encryption, and lifecycle hooks. See [Android](/introduction/android).

## Requirements

- Kotlin on a JVM 8 or later, or an Android app with `minSdk 24` (Android 7.0) or later.
- A Skapi project. Create one on [skapi.com](https://www.skapi.com) and copy its **Project ID** from the project's **Settings** page.

skapi-kotlin brings in `kotlinx-coroutines-core`, `kotlinx-serialization-json` and OkHttp. You do not need the kotlinx serialization compiler plugin: the SDK only uses the JSON classes (`JsonObject`, `JsonElement`), which work without it.

## Install

In your module's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.skapi:skapi-kotlin:2.4.0")

    // Android apps, also:
    implementation("com.skapi:skapi-android:2.4.0")
}
```

An Android app needs the `INTERNET` permission in `AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

skapi-android already declares `INTERNET` and `ACCESS_NETWORK_STATE`, and Gradle merges them into your app's manifest. An app that uses skapi-kotlin alone must add `INTERNET` itself.

## Connect to your project

```kotlin
import com.skapi.Skapi
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.jsonPrimitive

fun main() = runBlocking {
    val skapi = Skapi("<Project ID>")

    val info = skapi.getConnectionInfo()
    println(info["service_name"]?.jsonPrimitive?.content)  // your project's name
}
```

One `Skapi` object works with one project. It connects on its first call, not when it is created. Every method that talks to the server is a `suspend` function, so call it from a coroutine: `runBlocking` in a JVM `main`, `lifecycleScope` or `viewModelScope` on Android.

## Your first records

```kotlin
import com.skapi.Skapi
import com.skapi.SkapiException
import com.skapi.jsonOf
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

fun main() = runBlocking {
    val skapi = Skapi("<Project ID>")

    // sign in (create the account first with skapi.signup(), see Signing Up Users)
    skapi.login("user@example.com", "password")

    // write a record
    val record = skapi.postRecord(
        jsonOf("title" to "Hello", "body" to "My first record"),
        jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")),
    )
    println(record["record_id"]?.jsonPrimitive?.content)

    // read records back
    val result = skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")))
    for (post in result["list"]!!.jsonArray) {
        val data = post.jsonObject["data"]!!.jsonObject
        println(data["title"]?.jsonPrimitive?.content)
    }
}
```

On Android, the same calls go in a coroutine tied to the screen:

```kotlin
class PostsActivity : AppCompatActivity() {
    private val skapi get() = (application as App).skapi

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            try {
                val result = skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")))
                showPosts(result["list"]!!.jsonArray)  // back on the main thread here
            } catch (err: SkapiException) {
                showError(err.message)
            }
        }
    }
}
```

The request itself runs on `Dispatchers.IO`, so calling it from the main thread does not block the screen. See [Android](/introduction/android) for the `App` class that holds the `Skapi` object.

## Names in Kotlin

Methods use the same camelCase names as skapi-js. Everything you pass in a `JsonObject` uses the same keys as skapi-js and skapi-py, so a query reads the same in all three:

| skapi-js | skapi-py | skapi-kotlin |
|---|---|---|
| `skapi.getRecords({ table: { name: 'posts', access_group: 'public' } })` | `skapi.get_records({"table": {"name": "posts", "access_group": "public"}})` | `skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")))` |
| `skapi.postRecord(data, config)` | `skapi.post_record(data, config)` | `skapi.postRecord(data, config)` |
| `skapi.login({ email, password })` | `skapi.login(email, password)` | `skapi.login(email, password)` |
| `skapi.getRecords(query, { limit: 10, fetchMore: true })` | `skapi.get_records(query, {"limit": 10, "fetchMore": True})` | `skapi.getRecords(query, FetchOptions(limit = 10, fetchMore = true))` |

Where Kotlin has a better shape, the arguments are plain Kotlin parameters instead of a JSON object:

- Paging options are a [`FetchOptions`](/api-reference/connection#fetchoptions) object.
- Methods that take one user, such as [`subscribe(userId, getFeed = true)`](/api-reference/users#subscribe), [`sendInquiry(name, email, subject, message)`](/api-reference/users#sendinquiry) and [`grantPrivateRecordAccess(recordId, userIds)`](/api-reference/database#grantprivaterecordaccess), take named arguments.
- Files to upload are [`FileUpload`](/database/files) values made from a `File`, an `InputStream`, bytes or text.
- `getFile()` of skapi-js is split by what you want back: [`getFile()`](/api-reference/database#getfile) (bytes), `getFileText()`, `getFileUrl()`, `getFileInfo()` and `downloadFile()`.

## JSON in and out

Data goes in and comes out as JSON values from kotlinx.serialization: `JsonObject`, `JsonArray` and `JsonElement`. Answers have the same keys skapi-js returns.

Build values with the helpers in `com.skapi`:

```kotlin
import com.skapi.jsonArrayOf
import com.skapi.jsonOf
import com.skapi.toJsString
import com.skapi.toJsonElement

val config = jsonOf(
    "table" to jsonOf("name" to "posts", "access_group" to "public"),
    "tags" to jsonArrayOf("news", "kotlin"),
)

// a Map or List you already have
val data = mapOf("title" to "Hello", "views" to 0, "draft" to false).toJsonElement()

println(config.toJsString())  // {"table":{"name":"posts","access_group":"public"},"tags":["news","kotlin"]}
```

| helper | |
|---|---|
| `jsonOf("key" to value, ...)` | a `JsonObject` from pairs |
| `jsonArrayOf(a, b, ...)` | a `JsonArray` from values |
| `value.toJsonElement()` | a `Map`, `List`, `Array`, `String`, number, `Boolean`, `null` or `JsonElement` as JSON |
| `element.toJsString()` | compact JSON text, as `JSON.stringify` writes it (whole numbers without `.0`) |

Values inside `jsonOf` and `jsonArrayOf` follow the same rules as `toJsonElement()`: maps, lists, strings, numbers, booleans, `null` and JSON values. Anything else is sent as its `toString()` text. kotlinx's own `buildJsonObject { put(...) }` and `Json.parseToJsonElement(text)` work as well.

Read answers with kotlinx's accessors:

```kotlin
import kotlinx.serialization.json.*

val user = skapi.login("user@example.com", "password")
val email = user["email"]?.jsonPrimitive?.content
val verified = user["email_verified"]?.jsonPrimitive?.booleanOrNull ?: false

val page = skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")))
val records = page["list"]!!.jsonArray
val endOfList = page["endOfList"]!!.jsonPrimitive.boolean
```

Whole numbers come back as integers (read them with `.long` or `.int`), the way skapi-js sees them. To store `null` as a record's data, pass `JsonNull`.

## Keeping users signed in between runs

By default the session lives as long as the `Skapi` object (`MemoryStorage`). To stay signed in when the program or app starts again, give `storage` a place to keep it:

```kotlin
import com.skapi.FileStorage
import com.skapi.Skapi

val skapi = Skapi("<Project ID>", storage = FileStorage("~/.myapp/skapi-session.json"))

if (skapi.getProfile() == null) {  // restores the saved sign-in, if there is one
    skapi.login("user@example.com", "password")
}
```

| storage | where | |
|---|---|---|
| `MemoryStorage()` | memory | the default: the session ends with the object |
| `FileStorage(path)` | one JSON file | JVM programs. `~/` is your home folder. Created readable by you only where the system has POSIX permissions. Keep it out of version control: it holds the user's tokens. |
| `SharedPreferencesStorage(context)` | the app's private preferences | Android, from skapi-android. Each value is sealed with a key kept in the Android Keystore. See [Android](/introduction/android#sharedpreferencesstorage). |

The saved session is read on the first call that needs it. [`skapi.user`](/api-reference/authentication#user) does not read it, so when the app starts, call [`getProfile()`](/api-reference/authentication#getprofile) once (or any signed-in method) before you look at `skapi.user`.

To keep sessions anywhere else, for example in your own database, implement `SkapiStorage`:

```kotlin
import com.skapi.SkapiStorage

class MyStorage(private val db: MyKeyValueDb) : SkapiStorage {
    override fun getItem(key: String): String? = db.get(key)
    override fun setItem(key: String, value: String) { db.put(key, value) }
    override fun removeItem(key: String) { db.delete(key) }
}

val skapi = Skapi("<Project ID>", storage = MyStorage(db))
```

The three methods are plain (not `suspend`), are called on background threads, and may be called from more than one thread at once. Keys and values are strings: the same keys skapi-js keeps in `localStorage`.

## Options

```kotlin
Skapi(
    projectId: String,
    storage: SkapiStorage = MemoryStorage(),
    timeoutSeconds: Long = 120,
    targetCdn: String? = null,
    encryption: EncryptionOptions? = null,
)
```

| option | default | what it does |
|---|---|---|
| `storage` | `MemoryStorage()` | where the signed-in session is kept: `MemoryStorage`, `FileStorage`, `SharedPreferencesStorage` or your own `SkapiStorage` |
| `timeoutSeconds` | `120` | seconds to wait for each request (connect, read and write) |
| `targetCdn` | `null` | advanced: the CDN host the SDK reads your project's endpoint list from. Leave it `null`. |
| `encryption` | `null` | `EncryptionOptions(...)` seals the data of private records on the device before upload. See [Encrypting Private Data](/database/encryption). |

## Threads and coroutines

- **Suspend functions on `Dispatchers.IO`.** Every method that talks to the server switches to `Dispatchers.IO` on its own. You can call it from any coroutine, the main thread's included.
- **Cancelling stops the request.** When the coroutine that called a method is cancelled (the screen closed, `job.cancel()`, a `withTimeout`), the request is stopped and the call throws `CancellationException`. A request the server already received may still have done its work, for example a record may have been written.
- **One `Skapi` object per signed-in user.** An object holds one signed-in user, and many coroutines can use it at once: they share its session and its token refreshes. A server that acts for many users at once uses one object per user, each with its own `storage`. On Android, keep a single object for the whole app (see [Android](/introduction/android#one-skapi-object-for-the-app)).
- **Background timers.** An object keeps a temporary account alive and keeps the realtime connection open on its own daemon threads. [`close()`](/api-reference/connection#close) stops them when you are done with the object; the session stays saved in `storage`.
- **Callbacks run on background threads.** The realtime callback and a forwarded request's `onStream` are called on a background thread. On Android, move to the main thread before you touch views.

## Next

- [Signing Up Users](/authentication/signup) and [Login / Logout](/authentication/login)
- [Tables and Access Groups](/database/introduction)
- [Android](/introduction/android)
- [Errors](/introduction/errors)
