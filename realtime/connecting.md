# Connecting to Realtime

The realtime connection sends JSON between signed-in users as it happens: chat, live updates, presence. One `Skapi` object holds one connection, and it can be in one group at a time.

## Opening the connection

The user must be signed in (an [anonymous login](/api-reference/authentication#anonymouslogin) works too). [connectRealtime](/api-reference/realtime#connectrealtime) takes a callback and returns once the connection is open:

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

skapi.connectRealtime { rt ->
    println("${rt["type"]} ${rt["sender"]} ${rt["message"]}")
}
```

```java [Java]
import com.skapi.java.SkapiJava;

SkapiJava skapi = new SkapiJava("<Project ID>");
skapi.login("user@example.com", "password").get();

skapi.connectRealtime(rt -> {
    System.out.println(rt.get("type") + " " + rt.get("sender") + " " + rt.get("message"));
}).get();
```

:::

The callback runs on a background thread, once for every event. It is a plain function, not a `suspend` one, so keep it short and hand longer work to a coroutine of your own.

**On Android**, views can only be touched on the main thread. Post to it from the callback:

::: code-group

```kotlin [Kotlin]
skapi.connectRealtime { rt ->
    runOnUiThread {
        messageView.text = rt["message"].toString()
    }
}
```

```java [Java]
skapi.connectRealtime(rt -> {
    runOnUiThread(() -> {
        messageView.setText(SkapiJson.stringify(rt.get("message")));
    });
});
```

:::

**On the JVM**, do not count on the connection's threads to keep your program alive (the reconnect and keep-alive timers are daemon threads). A program that only listens has to keep running itself:

::: code-group

```kotlin [Kotlin]
fun main() = runBlocking {
    val skapi = Skapi("<Project ID>")
    skapi.login("user@example.com", "password")
    skapi.connectRealtime { rt -> println(rt) }
    awaitCancellation()
}
```

```java [Java]
public static void main(String[] args) throws Exception {
    SkapiJava skapi = new SkapiJava("<Project ID>");
    skapi.login("user@example.com", "password").get();
    skapi.connectRealtime(rt -> System.out.println(rt)).get();
    Thread.currentThread().join();  // waits until the program is stopped
}
```

:::

Calling `connectRealtime` again while connected only swaps the callback. When the [request status push](/api-bridge/forward-request#status-push) opened the connection, connectRealtime takes it over; if that connection is still opening, it returns once it is open, or throws if it fails to open.

## Events

Every event is a `JsonObject`:

```json
{
    "type": "message" | "private" | "notice" | "success" | "error" | "reconnect" | "close",
    "message": ...,
    "sender": "...",
    "sender_cid": "...",
    "sender_rid": "...",
    "code": null | "USER_JOINED" | "USER_LEFT" | "USER_DISCONNECTED"
}
```

| key | |
|---|---|
| `message` | the JSON value that was sent, or a status text |
| `sender` | user ID of the sender (`message`, `private`, `notice`) |
| `sender_cid` | connection ID of the sender, `"cid:..."` |
| `sender_rid` | the group it came through |
| `code` | for notices |

| type | |
|---|---|
| `"message"` | a message posted to the group you are in |
| `"private"` | a message sent to you by user ID |
| `"notice"` | someone joined, left or was disconnected from your group; `sender` is that user. A disconnect comes as `USER_DISCONNECTED` followed by `USER_LEFT`. |
| `"success"` | the connection is open: the first time, and after each successful reconnect |
| `"error"` | the connection dropped (`"Skapi: WebSocket unexpected close."`), or could not reopen because the user signed out |
| `"reconnect"` | an attempt to reopen the connection follows, one event per attempt |
| `"close"` | you closed the connection |

Connection events (`success`, `error`, `reconnect`, `close`) carry only `type` and `message`.

The server also sends a user's connections the status changes of their forwarded requests sent with `notify`. skapi-kotlin keeps those away from your callback; listen to them with [onRequestStatus](/api-reference/api-bridge#onrequeststatus).

## Staying connected

A dropped connection is reopened by skapi-kotlin on its own: after 3 seconds, then 6, 12 and 24, then every 30 seconds, for as long as the user is signed in. The group you were in is joined again. The waits vary a little from client to client, so a service coming back from an outage is not hit by every client in the same second.

A connection that dies without closing is caught too. skapi-kotlin checks it once a minute; ten seconds without an answer after a check counts as a drop.

The server closes every connection two hours after it opened. A few minutes before that, skapi-kotlin opens a fresh one and switches to it, joining the group again, and your callback hears nothing about it.

A message posted while the connection is down is not queued: [postRealtime](/api-reference/realtime#postrealtime) throws `INVALID_REQUEST`, so keep the message until `"success"` comes back. After a reconnect the server gives the connection a new connection ID.

### When the app comes back

A phone may stop the app's network while it is in the background, and the connection can die there unnoticed. Call `skapi.onForeground()` when the app returns to the foreground and `skapi.onNetworkAvailable()` when the network comes back: each checks the connection at once and reopens it if it dropped, instead of waiting for the next check or reconnect. Both return at once; the work runs in the background.

On Android, skapi-android's `SkapiLifecycle.watch(application, skapi)` calls them for you. See [Android](/introduction/android).

## Closing the connection

::: code-group

```kotlin [Kotlin]
skapi.closeRealtime()
```

```java [Java]
skapi.closeRealtime().get();
```

:::

Your callback gets `"close"`, and the other members of your group get `USER_DISCONNECTED` and `USER_LEFT` for you. [logout](/api-reference/authentication#logout) closes the connection too, and so does `skapi.close()`.
