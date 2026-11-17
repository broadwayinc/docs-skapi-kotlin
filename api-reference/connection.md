# Connection

## Skapi

```kotlin
import com.skapi.Skapi

val skapi = Skapi(
    projectId: String,
    storage: SkapiStorage = MemoryStorage(),
    timeoutSeconds: Long = 120,
    targetCdn: String? = null,
    encryption: EncryptionOptions? = null,
)
```

| argument | |
|---|---|
| `projectId` | the Project ID from your project's Settings page on skapi.com |
| `storage` | where the signed-in session is kept: `MemoryStorage()` (this object only), `FileStorage(path)` (a JSON file created readable by you only), skapi-android's `SharedPreferencesStorage(context)`, or any [`SkapiStorage`](#skapistorage) |
| `timeoutSeconds` | seconds to wait for each request (connect, read and write) |
| `targetCdn` | advanced: the CDN host the SDK reads the project's endpoint list from. Leave it `null`. |
| `encryption` | `EncryptionOptions(...)`: encrypts the data of private records on the device before upload. See [Encryption](/api-reference/encryption). |

The constructor is a plain (not `suspend`) call and sends nothing. The object connects on its first call.

### Properties

| property | type | |
|---|---|---|
| `projectId` | `String` | the Project ID |
| `service` | `String` | the project's service ID, read from the Project ID |
| `owner` | `String` | the project owner's ID, read from the Project ID |
| `version` | `String` | `"2.4.1"` (also the constant `SKAPI_VERSION`) |
| `user` | `JsonObject?` | the signed-in profile (a copy), or `null`. See [user](/api-reference/authentication#user). |
| `session` | `SkapiSession?` | the signed-in session's tokens: `idToken`, `accessToken`, `refreshToken` (each a `String`), or `null` |

### Errors

| code | message |
|---|---|
| `INVALID_PARAMETER` | `Project ID is required.` / `Project ID is invalid.` (thrown by the constructor) |
| `INVALID_PARAMETER` | `"encryption.iterations" must be at least 100000.` (thrown by the constructor) |
| `NOT_EXISTS` | `The project ID does not exist. Create your project from skapi.com` (thrown by the first call) |

## getConnectionInfo

```kotlin
suspend fun getConnectionInfo(refresh: Boolean = false): JsonObject
```

The project's name and settings, and the caller as the server sees it. `refresh = true` asks the server again instead of using the answer from the first call.

```json
{
    "project_id": "...",
    "user_ip": "203.0.113.7",
    "user_agent": "okhttp/4.12.0",
    "user_location": "KR",
    "service_name": "My Project",
    "version": "2.4.1",
    "conf": {"prevent_signup": false, "require_login": false, "anonymous_login": false, "...": "..."},
    "encryption_recovery": {"code": null, "message": "..."}
}
```

`"encryption_recovery"` is there only with encryption on and a signed-in user. It holds the user's encryption recovery code on the first call after it was created (their first password login with encryption on), and `null` after that, with a `"message"` saying what to do. See [Encryption recovery codes](/database/encryption#encryption-recovery-codes).

## onForeground

```kotlin
fun onForeground()
```

Call when the app comes back to the foreground, as skapi-js does on the browser's `visibilitychange`. A [temporary account](/authentication/anonymous) is checked with the server at once (unless it was confirmed in the last minute) and signed out if it was deleted, and the [realtime connection](/realtime/connecting) is pinged, or reopened now if it dropped. Returns at once; the work runs in the background. skapi-android's [`SkapiLifecycle`](/introduction/android#coming-back-to-the-foreground) calls it for you.

## onNetworkAvailable

```kotlin
fun onNetworkAvailable()
```

Call when the network comes back, as skapi-js does on the browser's `online` event. The same checks as [onForeground](#onforeground). skapi-android's `SkapiLifecycle` calls it for you.

## close

```kotlin
fun close()
```

Closes the realtime connection, stops this object's background timers (the temporary account keep-alive, the realtime keep-alive and reconnects) and releases its network threads, so a JVM program can exit. The session stays saved in `storage`. Do not use the object after `close()`; make a new one.

## FetchOptions

```kotlin
FetchOptions(
    limit: Int? = null,
    ascending: Boolean? = null,
    startKey: JsonElement? = null,
    fetchMore: Boolean = false,
)
```

Paging options for every method that returns a list (`getRecords()`, `getUsers()`, `getSubscriptions()`, `getTickets()` and the others). See [Paging](/database/fetch#paging).

| option | |
|---|---|
| `limit` | items per page, up to 1000. The server's default is 50 unless the method says otherwise. |
| `ascending` | the sort direction |
| `startKey` | where to start: the `startKey` of an earlier answer, `JsonPrimitive("start")` to start over, or `JsonPrimitive("end")` |
| `fetchMore` | `true` reads the next page of the same query, continuing from the last answer |

A list answer is a `JsonObject` with `list`, `startKey`, `endOfList` and `startKeyHistory`.

## SkapiStorage

```kotlin
interface SkapiStorage {
    fun getItem(key: String): String?
    fun setItem(key: String, value: String)
    fun removeItem(key: String)
}
```

Where the signed-in session is kept. Keys and values are strings, the same keys skapi-js keeps in `localStorage`. The methods are called on background threads, sometimes from several at once.

| class | |
|---|---|
| `MemoryStorage()` | the default: kept for the life of the `Skapi` object |
| `FileStorage(path: String)` | one JSON file. `~/` is the home folder. Created readable by its owner only where the system has POSIX permissions. Writes go to a temporary file first, then replace the old one. |
| `SharedPreferencesStorage(context, name = "skapi-session", encrypt = true)` | skapi-android: the app's private preferences, each value sealed by the Android Keystore. See [Android](/introduction/android#sharedpreferencesstorage). |

## JSON helpers

```kotlin
fun jsonOf(vararg pairs: Pair<String, Any?>): JsonObject
fun jsonArrayOf(vararg items: Any?): JsonArray
fun Any?.toJsonElement(): JsonElement
fun JsonElement.toJsString(): String
```

| helper | |
|---|---|
| `jsonOf("key" to value, ...)` | a `JsonObject` from pairs |
| `jsonArrayOf(a, b, ...)` | a `JsonArray` from values |
| `toJsonElement()` | a `Map`, `List`, `Array`, `String`, number, `Boolean`, `null` or `JsonElement` as JSON. Anything else becomes its `toString()` text. |
| `toJsString()` | compact JSON text, as `JSON.stringify` writes it: whole numbers without `.0` |

See [JSON in and out](/introduction/getting-started#json-in-and-out).

## SkapiException

```kotlin
class SkapiException(
    override val message: String,
    val code: String = "ERROR",
    cause: Throwable? = null,
    val details: JsonElement? = null,
) : Exception
```

What every method throws. `code` is a short name such as `INVALID_PARAMETER`; `details` is what the server sent with the error, when it sent more than a message. See [Errors](/introduction/errors).
