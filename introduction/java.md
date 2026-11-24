# Using from Java

skapi-java lets Java code use Skapi without Kotlin coroutines or kotlinx JSON. It is a thin layer on top of skapi-kotlin: the same methods with the same names, each returning a `CompletableFuture`, and plain Java maps and lists in place of `JsonObject`.

It works with Java 8 or later and on Android (`minSdk 24`).

## Install

Gradle (`build.gradle.kts`):

```kotlin
dependencies {
    implementation("com.skapi:skapi-java:2.5.0")

    // Android apps, also:
    implementation("com.skapi:skapi-android:2.5.0")
}
```

Gradle (`build.gradle`):

```groovy
dependencies {
    implementation 'com.skapi:skapi-java:2.5.0'
}
```

Maven (`pom.xml`):

```xml
<dependency>
    <groupId>com.skapi</groupId>
    <artifactId>skapi-java</artifactId>
    <version>2.5.0</version>
</dependency>
```

skapi-java brings in skapi-kotlin and the Kotlin standard library, so there is nothing else to add. You do not need the Kotlin compiler or the Kotlin Gradle plugin.

## Create a SkapiJava object

```java
import com.skapi.java.SkapiJava;

SkapiJava skapi = new SkapiJava("<Project ID>");
```

The constructor takes the same options as the Kotlin [`Skapi`](/introduction/getting-started#options) constructor, left to right. Leave out the ones at the end that you do not need:

```java
import com.skapi.FileStorage;
import com.skapi.java.SkapiJava;

SkapiJava skapi = new SkapiJava("<Project ID>", new FileStorage("~/.myapp/session.json"));
SkapiJava withTimeout = new SkapiJava("<Project ID>", new FileStorage("~/.myapp/session.json"), 30);
```

| constructor or method | |
|---|---|
| `new SkapiJava(projectId)` | one project, its connection and the signed-in user's session |
| `new SkapiJava(projectId, storage, timeoutSeconds, targetCdn, encryption)` | the same options as `Skapi(...)`; each one from the right can be left out |
| `new SkapiJava(skapi)` or `SkapiJava.wrap(skapi)` | a SkapiJava over a `Skapi` object you already have, for example one your Kotlin code made |
| `skapi.getSkapi()` | the `Skapi` object underneath |

For [record encryption](/database/encryption), build the options with `EncryptionOptionsBuilder`, which starts from the defaults:

```java
import com.skapi.java.EncryptionOptionsBuilder;

SkapiJava skapi = new SkapiJava("<Project ID>", new FileStorage("~/.myapp/session.json"), 120, null,
        new EncryptionOptionsBuilder().withheld("sentinel").build());
```

## How calls work

Every method that talks to the server returns a `CompletableFuture`. The request runs on a background thread, and the future completes when the answer arrives.

Wait for the answer with `get()` (the calling thread waits):

```java
Map<String, Object> info = skapi.getConnectionInfo().get();
System.out.println(info.get("service_name"));  // your project's name
```

Or give the future a callback, and the calling thread carries on:

```java
skapi.getConnectionInfo()
     .thenAccept(info -> System.out.println(info.get("service_name")))
     .exceptionally(err -> { System.out.println("failed: " + err.getCause()); return null; });
```

Chain calls that depend on each other with `thenCompose`:

```java
skapi.login("user@example.com", "password")
     .thenCompose(user -> skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"))))
     .thenAccept(page -> System.out.println(page.get("list")));
```

- **Threads.** Requests run on a shared pool of background threads. A callback such as `thenAccept` runs on the background thread that finished the call, or right away on your thread when the future was already done.
- **Android.** Never call `get()` on the main thread: it freezes the screen until the server answers. Use `thenAccept` and move to the main thread before you touch views, for example with `runOnUiThread(...)` or a `Handler` on the main looper.
- **Cancelling.** `future.cancel(true)` stops the request. A request the server already received may still have done its work, for example a record may have been written.
- **Many at once.** One object can run many calls at the same time. They share its session and its token refreshes.

```java
// Android: an Activity
skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public")))
     .thenAccept(page -> runOnUiThread(() -> showPosts((List<Object>) page.get("list"))));
```

## JSON as maps and lists

What the Kotlin pages show as `JsonObject` is a `Map<String, Object>` in Java, and a JSON array is a `List<Object>`.

Values you pass in can be:

| Java | JSON |
|---|---|
| `Map<String, ?>` | object (the keys keep their order with a `LinkedHashMap`) |
| `List<?>`, any `Iterable`, arrays | array |
| `String`, `Character` | string |
| `Integer`, `Long`, `Short`, `Byte`, `BigInteger` | whole number |
| `Double`, `Float`, `BigDecimal` | number (`NaN` and infinity become `null`) |
| `Boolean` | `true` / `false` |
| an `enum` value | its name, as a string |
| `null` | `null` |

Anything else (a `Date`, your own class) fails the call with `INVALID_PARAMETER`. Turn it into one of the types above first.

Answers come back as:

| JSON | Java |
|---|---|
| object | `Map<String, Object>` (a `LinkedHashMap`, in the server's order) |
| array | `List<Object>` |
| string | `String` |
| whole number | `Long` |
| other number | `Double` |
| `true` / `false` | `Boolean` |
| `null` | `null` |

Every map and list you get back is a new one, so you may change it. Numbers come back as `Long` even when you sent an `Integer`, so read them with `((Number) value).intValue()` or `longValue()`.

`SkapiJson` builds and converts values:

```java
import com.skapi.java.SkapiJson;

Map<String, Object> config = SkapiJson.obj(
    "table", SkapiJson.obj("name", "posts", "access_group", "public"),
    "tags", SkapiJson.list("news", "java"));

String text = SkapiJson.stringify(config);  // {"table":{"name":"posts","access_group":"public"},"tags":["news","java"]}
Object back = SkapiJson.parse(text);        // a Map<String, Object> again
```

| method | |
|---|---|
| `SkapiJson.obj(key, value, key, value, ...)` | a `Map<String, Object>` from keys and values in turn, in that order |
| `SkapiJson.list(a, b, ...)` | a `List<Object>` |
| `SkapiJson.stringify(value)` | compact JSON text |
| `SkapiJson.parse(text)` | JSON text as Java values |
| `SkapiJson.toJava(jsonElement)` | a kotlinx `JsonElement` as Java values (also `toJavaMap`, `toJavaList`) |
| `SkapiJson.fromJava(value)` | Java values as a kotlinx `JsonElement` (also `fromJavaMap`), for code that also calls the Kotlin `Skapi` |

`obj`, `list` and `fromJava` throw `IllegalArgumentException` for a value that is not JSON, and `parse` does for text that is not JSON. Your own `Map` and `List` objects work just as well as the ones `obj` and `list` make.

## Paging options

[`FetchOptions`](/api-reference/connection#fetchoptions) is built with `FetchOptionsBuilder`:

```java
import com.skapi.FetchOptions;
import com.skapi.java.FetchOptionsBuilder;

Map<String, Object> query = SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"));

Map<String, Object> page = skapi.getRecords(query, new FetchOptionsBuilder().limit(100).build()).get();
while (!Boolean.TRUE.equals(page.get("endOfList"))) {
    page = skapi.getRecords(query, new FetchOptionsBuilder().limit(100).fetchMore(true).build()).get();
}
```

The builder has `limit(int)`, `ascending(boolean)`, `startKey(Object)` and `fetchMore(boolean)`. They mean what they mean on the [Fetching Records](/database/fetch#paging) page.

## Errors

When a call fails, its future completes with the same [`SkapiException`](/introduction/errors) the Kotlin call throws, with the same `getCode()` and `getMessage()`.

`get()` wraps it in an `ExecutionException`. The `SkapiException` is its `getCause()`:

```java
import com.skapi.SkapiException;
import java.util.concurrent.ExecutionException;

try {
    skapi.login("user@example.com", "wrong password").get();
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    System.out.println(err.getCode());     // INCORRECT_USERNAME_OR_PASSWORD
    System.out.println(err.getMessage());  // Incorrect username or password.
}
```

In a callback, the error arrives as the `Throwable` of `exceptionally`, `handle` or `whenComplete`. A failure in an earlier stage of a chain reaches it wrapped in a `CompletionException`, so look at `getCause()` when the error is not a `SkapiException` itself:

```java
skapi.login("user@example.com", "password")
     .whenComplete((user, err) -> {
         if (err == null) { System.out.println(user.get("email")); return; }
         Throwable cause = err instanceof SkapiException ? err : err.getCause();
         if (cause instanceof SkapiException && "MFA_REQUIRED".equals(((SkapiException) cause).getCode())) {
             askForCode();  // then skapi.verifyMfa(code)
         }
     });
```

A parameter that is not a JSON value fails the future with code `INVALID_PARAMETER`. A cancelled future throws `CancellationException` from `get()`.

## Callbacks

Methods that take a callback in Kotlin take a `java.util.function` interface in Java:

| method | callback |
|---|---|
| [`connectRealtime(callback)`](/realtime/connecting) | `Consumer<Map<String, Object>>`, called with every message, notice and connection event |
| [`forwardRequest(options, form, onStream)`](/api-bridge/forward-request), `forwardRequestPoll(...)`, `forwardRequestStream(...)` | `BiConsumer<String, Integer>`, called with each piece of streamed text and its number |

```java
skapi.connectRealtime(event -> {
    if ("message".equals(event.get("type"))) {
        System.out.println(event.get("sender") + ": " + event.get("message"));
    }
}).get();

skapi.joinRealtime("lobby").get();
skapi.postRealtime(SkapiJson.obj("text", "Hello"), "lobby").get();
```

Callbacks run on a background thread. On Android, move to the main thread before you touch views.

## Files

Files to upload are the same [`FileUpload`](/database/files) values the Kotlin pages use. Their factories are static methods:

```java
import com.skapi.FileUpload;
import java.io.File;
import java.util.Arrays;

skapi.postRecord(
    SkapiJson.obj("caption", "Holiday"),
    SkapiJson.obj("table", SkapiJson.obj("name", "photos", "access_group", "authorized")),
    Arrays.asList(FileUpload.fromFile("picture", new File("beach.jpg"), null, null))
).get();
```

`getFile(url)` completes with a `byte[]`, `getFileText(url)` with a `String`, and `downloadFile(url, file)` with the `File` it wrote.

## close()

`close()` cancels the calls still running and closes the `Skapi` object underneath: its realtime connection, timers and network threads. A JVM program can then exit. The signed-in session stays saved in `storage`. Calls made after `close()` return a cancelled future.

`SkapiJava` is `AutoCloseable`, so a short program can use try-with-resources:

```java
public static void main(String[] args) throws Exception {
    try (SkapiJava skapi = new SkapiJava("<Project ID>")) {
        skapi.login("user@example.com", "password").get();
        System.out.println(skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public"))).get());
    }
}
```

An Android app keeps one object for as long as the app runs and does not need to close it.

## Reading the rest of these docs

Every code example in these docs has a **Kotlin** and a **Java** tab. The text and the tables around them use the Kotlin names. Every method has the same name and the same arguments, in the same order, on `SkapiJava`. Read the Kotlin names like this:

- Kotlin `skapi.getRecords(query)` is `skapi.getRecords(query)` on SkapiJava, returning a `CompletableFuture` of a `Map`.
- A `JsonObject` you pass is a `Map<String, Object>`; `jsonOf("name" to "posts")` is `SkapiJson.obj("name", "posts")`, and `listOf(...)` or `jsonArrayOf(...)` is `SkapiJson.list(...)` or any `List`.
- Kotlin's named and default arguments become Java overloads: leave out arguments from the right. `logout(globalLogout = true)` is `logout(true)`, and `login(email, password)` is `login(email, password)`. To give a later argument, pass `null` for the ones before it, as in `login(null, "password", "ana")` for a username.
- A `JsonObject` you get back is a `Map<String, Object>`: `result["list"]!!.jsonArray` is `(List<Object>) result.get("list")`.
- Kotlin properties are getters: `skapi.user` is `skapi.getUser()`, `skapi.session` is `skapi.getSession()`, `skapi.version` is `skapi.getVersion()`.
- A call that returns nothing in Kotlin (`pinPeerKey`, `connectRealtime`, `closeRealtime`) completes with `null`.
- `try { ... } catch (err: SkapiException)` around a Kotlin call is a catch of `ExecutionException` around `get()`, with the `SkapiException` as its cause.
