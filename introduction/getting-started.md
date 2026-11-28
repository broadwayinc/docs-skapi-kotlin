# Getting Started

skapi-kotlin is the Skapi API for Kotlin and Java. It signs users in, keeps their sessions, and reads and writes your project's database, with the same queries, answers and error codes as [skapi-js](https://docs.skapi.com) and skapi-py. Use it in client applications: Android apps, Kotlin and Java desktop programs and command line tools.

It comes in three parts:

- **skapi-kotlin**: the library itself. Plain JVM code that runs anywhere Kotlin runs, Android included.
- **skapi-android**: small helpers for Android apps: a session store in SharedPreferences sealed by the Android Keystore, a device key store for record encryption, and lifecycle hooks. See [Android](/introduction/android).
- **skapi-java**: the same methods for Java code, each returning a `CompletableFuture`, with plain Java maps and lists for JSON. See [Using from Java](/introduction/java).

Every code example in these docs has a **Kotlin** and a **Java** tab. The text around the examples uses the Kotlin names; [Using from Java](/introduction/java#reading-the-rest-of-these-docs) explains how to read them from Java.

## Requirements

- Kotlin or Java on a JVM 8 or later, or an Android app with `minSdk 24` (Android 7.0) or later.
- A Skapi project. Create one on [skapi.com](https://www.skapi.com) and copy its **Project ID** from the project's **Settings** page.

skapi-kotlin brings in `kotlinx-coroutines-core`, `kotlinx-serialization-json` and OkHttp. You do not need the kotlinx serialization compiler plugin: the SDK only uses the JSON classes (`JsonObject`, `JsonElement`), which work without it.

## Install

In your module's `build.gradle.kts`:

::: code-group

```kotlin [Kotlin]
dependencies {
    implementation("com.skapi:skapi-kotlin:2.7.0")

    // Android apps, also:
    implementation("com.skapi:skapi-android:2.7.0")
}
```

```kotlin [Java]
dependencies {
    implementation("com.skapi:skapi-java:2.7.0")

    // Android apps, also:
    implementation("com.skapi:skapi-android:2.7.0")
}
```

:::

skapi-java includes skapi-kotlin. For Maven, see [Using from Java](/introduction/java#install).

An Android app needs the `INTERNET` permission in `AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

skapi-android already declares `INTERNET` and `ACCESS_NETWORK_STATE`, and Gradle merges them into your app's manifest. An app that uses skapi-kotlin alone must add `INTERNET` itself.

## Connect to your project

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.jsonPrimitive

fun main() = runBlocking {
    val skapi = Skapi("<Project ID>")

    val info = skapi.getConnectionInfo()
    println(info["service_name"]?.jsonPrimitive?.content)  // your project's name
}
```

```java [Java]
import com.skapi.java.SkapiJava;
import java.util.Map;

public class Main {
    public static void main(String[] args) throws Exception {
        try (SkapiJava skapi = new SkapiJava("<Project ID>")) {
            Map<String, Object> info = skapi.getConnectionInfo().get();
            System.out.println(info.get("service_name"));  // your project's name
        }
    }
}
```

:::

One `Skapi` object works with one project. It connects on its first call, not when it is created. Every method that talks to the server is a `suspend` function, so call it from a coroutine: `runBlocking` in a JVM `main`, `lifecycleScope` or `viewModelScope` on Android.

In Java, `SkapiJava` is the same object with the same methods. Each one returns a `CompletableFuture`: `get()` waits for the answer, `thenAccept(...)` runs code when it arrives. See [How calls work](/introduction/java#how-calls-work).

## Your first records

::: code-group

```kotlin [Kotlin]
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

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;
import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) throws Exception {
        try (SkapiJava skapi = new SkapiJava("<Project ID>")) {
            // sign in (create the account first with skapi.signup(), see Signing Up Users)
            skapi.login("user@example.com", "password").get();

            // write a record
            Map<String, Object> record = skapi.postRecord(
                SkapiJson.obj("title", "Hello", "body", "My first record"),
                SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"))
            ).get();
            System.out.println(record.get("record_id"));

            // read records back
            Map<String, Object> result = skapi.getRecords(
                SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"))
            ).get();
            for (Object item : (List<?>) result.get("list")) {
                Map<?, ?> data = (Map<?, ?>) ((Map<?, ?>) item).get("data");
                System.out.println(data.get("title"));
            }
        }
    }
}
```

:::

On Android, the same calls go in a coroutine tied to the screen (in Java, a callback that moves back to the main thread):

::: code-group

```kotlin [Kotlin]
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

```java [Java]
public class PostsActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SkapiJava skapi = ((App) getApplication()).skapi;
        skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public")))
             .whenComplete((result, err) -> runOnUiThread(() -> {
                 if (err == null) showPosts((List<?>) result.get("list"));  // back on the main thread here
                 else showError(err.getMessage());
             }));
    }
}
```

:::

The request itself runs on `Dispatchers.IO`, so calling it from the main thread does not block the screen. In Java, never call `get()` on the main thread: it waits for the server and freezes the screen. See [Android](/introduction/android) for the `App` class that holds the `Skapi` object.

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

::: code-group

```kotlin [Kotlin]
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

```java [Java]
import com.skapi.java.SkapiJson;
import java.util.LinkedHashMap;
import java.util.Map;

Map<String, Object> config = SkapiJson.obj(
    "table", SkapiJson.obj("name", "posts", "access_group", "public"),
    "tags", SkapiJson.list("news", "java")
);

// a Map or List you already have is passed as it is
Map<String, Object> data = new LinkedHashMap<>();
data.put("title", "Hello");
data.put("views", 0);
data.put("draft", false);

System.out.println(SkapiJson.stringify(config));  // {"table":{"name":"posts","access_group":"public"},"tags":["news","java"]}
```

:::

| helper | |
|---|---|
| `jsonOf("key" to value, ...)` | a `JsonObject` from pairs |
| `jsonArrayOf(a, b, ...)` | a `JsonArray` from values |
| `value.toJsonElement()` | a `Map`, `List`, `Array`, `String`, number, `Boolean`, `null` or `JsonElement` as JSON |
| `element.toJsString()` | compact JSON text, as `JSON.stringify` writes it (whole numbers without `.0`) |

Values inside `jsonOf` and `jsonArrayOf` follow the same rules as `toJsonElement()`: maps, lists, strings, numbers, booleans, `null` and JSON values. Anything else is sent as its `toString()` text. kotlinx's own `buildJsonObject { put(...) }` and `Json.parseToJsonElement(text)` work as well.

Read answers with kotlinx's accessors:

::: code-group

```kotlin [Kotlin]
import kotlinx.serialization.json.*

val user = skapi.login("user@example.com", "password")
val email = user["email"]?.jsonPrimitive?.content
val verified = user["email_verified"]?.jsonPrimitive?.booleanOrNull ?: false

val page = skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")))
val records = page["list"]!!.jsonArray
val endOfList = page["endOfList"]!!.jsonPrimitive.boolean
```

```java [Java]
import java.util.List;
import java.util.Map;

Map<String, Object> user = skapi.login("user@example.com", "password").get();
String email = (String) user.get("email");
boolean verified = Boolean.TRUE.equals(user.get("email_verified"));

Map<String, Object> page = skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"))).get();
List<Object> records = (List<Object>) page.get("list");
boolean endOfList = Boolean.TRUE.equals(page.get("endOfList"));
```

:::

Whole numbers come back as integers (read them with `.long` or `.int`), the way skapi-js sees them. To store `null` as a record's data, pass `JsonNull`.

## Keeping users signed in between runs

By default the session lives as long as the `Skapi` object (`MemoryStorage`). To stay signed in when the program or app starts again, give `storage` a place to keep it:

::: code-group

```kotlin [Kotlin]
import com.skapi.FileStorage
import com.skapi.Skapi

val skapi = Skapi("<Project ID>", storage = FileStorage("~/.myapp/skapi-session.json"))

if (skapi.getProfile() == null) {  // restores the saved sign-in, if there is one
    skapi.login("user@example.com", "password")
}
```

```java [Java]
import com.skapi.FileStorage;
import com.skapi.java.SkapiJava;

SkapiJava skapi = new SkapiJava("<Project ID>", new FileStorage("~/.myapp/skapi-session.json"));

if (skapi.getProfile().get() == null) {  // restores the saved sign-in, if there is one
    skapi.login("user@example.com", "password").get();
}
```

:::

| storage | where | |
|---|---|---|
| `MemoryStorage()` | memory | the default: the session ends with the object |
| `FileStorage(path)` | one JSON file | JVM programs. `~/` is your home folder. Created readable by you only where the system has POSIX permissions. Keep it out of version control: it holds the user's tokens. |
| `SharedPreferencesStorage(context)` | the app's private preferences | Android, from skapi-android. Each value is sealed with a key kept in the Android Keystore. See [Android](/introduction/android#sharedpreferencesstorage). |

The saved session is read on the first call that needs it. [`skapi.user`](/api-reference/authentication#user) does not read it, so when the app starts, call [`getProfile()`](/api-reference/authentication#getprofile) once (or any signed-in method) before you look at `skapi.user`.

To keep sessions anywhere else, for example in your own database, implement `SkapiStorage`:

::: code-group

```kotlin [Kotlin]
import com.skapi.SkapiStorage

class MyStorage(private val db: MyKeyValueDb) : SkapiStorage {
    override fun getItem(key: String): String? = db.get(key)
    override fun setItem(key: String, value: String) { db.put(key, value) }
    override fun removeItem(key: String) { db.delete(key) }
}

val skapi = Skapi("<Project ID>", storage = MyStorage(db))
```

```java [Java]
import com.skapi.SkapiStorage;

public class MyStorage implements SkapiStorage {
    private final MyKeyValueDb db;

    public MyStorage(MyKeyValueDb db) { this.db = db; }

    @Override public String getItem(String key) { return db.get(key); }
    @Override public void setItem(String key, String value) { db.put(key, value); }
    @Override public void removeItem(String key) { db.delete(key); }
}

SkapiJava skapi = new SkapiJava("<Project ID>", new MyStorage(db));
```

:::

The three methods are plain (not `suspend`), are called on background threads, and may be called from more than one thread at once. Keys and values are strings: the same keys skapi-js keeps in `localStorage`.

## Options

::: code-group

```kotlin [Kotlin]
Skapi(
    projectId: String,
    storage: SkapiStorage = MemoryStorage(),
    timeoutSeconds: Long = 120,
    targetCdn: String? = null,
    encryption: EncryptionOptions? = null,
)
```

```java [Java]
new SkapiJava(
    String projectId,
    SkapiStorage storage,          // new MemoryStorage() when left out
    long timeoutSeconds,           // 120
    String targetCdn,              // null
    EncryptionOptions encryption   // null
)
```

:::

| option | default | what it does |
|---|---|---|
| `storage` | `MemoryStorage()` | where the signed-in session is kept: `MemoryStorage`, `FileStorage`, `SharedPreferencesStorage` or your own `SkapiStorage` |
| `timeoutSeconds` | `120` | seconds to wait for each request (connect, read and write) |
| `targetCdn` | `null` | advanced: the CDN host the SDK reads your project's endpoint list from. Leave it `null`. |
| `encryption` | `null` | `EncryptionOptions(...)` seals the data of private records on the device before upload. See [Encrypting Private Data](/database/encryption). |

## Threads and coroutines

- **Suspend functions on `Dispatchers.IO`.** Every method that talks to the server switches to `Dispatchers.IO` on its own. You can call it from any coroutine, the main thread's included.
- **Cancelling stops the request.** When the coroutine that called a method is cancelled (the screen closed, `job.cancel()`, a `withTimeout`), the request is stopped and the call throws `CancellationException`. A request the server already received may still have done its work, for example a record may have been written.
- **One `Skapi` object per signed-in user.** An object holds one signed-in user, and many coroutines can use it at once: they share its session and its token refreshes. A program that signs in more than one user at once uses one object per user, each with its own `storage`. On Android, keep a single object for the whole app (see [Android](/introduction/android#one-skapi-object-for-the-app)).
- **Background timers.** An object keeps a temporary account alive and keeps the realtime connection open on its own daemon threads. [`close()`](/api-reference/connection#close) stops them when you are done with the object; the session stays saved in `storage`.
- **Callbacks run on background threads.** The realtime callback and a forwarded request's `onStream` are called on a background thread. On Android, move to the main thread before you touch views.

## Building With Your AI Agent

An AI coding agent can write your skapi-kotlin app. Give it Skapi's base prompt for skapi-kotlin:

- **[SKAPI.md](https://jvm.skapi.com/SKAPI.md)** (<a href="/SKAPI.md" download="SKAPI.md">download</a>): the rules for building an Android, Kotlin or Java app, a map of this documentation and an index of every skapi-kotlin method. Each entry links to its page under `https://jvm.skapi.com/md/` (every page of this site as raw markdown), and the agent opens a page when it builds that feature, so it needs to be able to open public web pages.

To use it:

1. Download the file.
2. Save it in your project folder under the name your agent reads (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md` ...), or attach it to your chat.
3. Ask the agent to use it as its base prompt, with your Project ID:

```text
Use SKAPI.md as your base prompt.
My Skapi project ID is "<Project ID>".
Build me a [describe what you want].
```

With the [Skapi MCP server](https://mcp.skapi.com) connected, the agent can also create a project, register Secret Keys and Tickets, and read this documentation through its `readDocs` tool.

The Skapi MCP server's address is **https://mcp.skapi.com**. Add it to your AI app as a remote MCP server and sign in with your Skapi account. The steps for each AI app are in the [Skapi MCP guide](https://mcp.skapi.com/#connect).

## Next

- [Signing Up Users](/authentication/signup) and [Login / Logout](/authentication/login)
- [Tables and Access Groups](/database/introduction)
- [Android](/introduction/android)
- [Errors](/introduction/errors)
