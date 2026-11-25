# Forwarding Requests

[forwardRequest](/api-reference/api-bridge#forwardrequest) calls another API from Skapi's server instead of from your code. Use it when the call needs a key you do not want to ship with your app, when its answer should be kept and read again later, or when you want the answer streamed as it arrives.

Answers arrive by polling. A call that waits for an answer suspends until that answer is ready. To stop waiting, cancel the coroutine: the polling stops at once, and the request itself stays on the server (remove it with [cancelForwardRequest](#cancelling-and-counting) while it has not run).

## Sending a request

::: code-group

```kotlin [Kotlin]
import com.skapi.*
import kotlinx.serialization.json.*

val skapi = Skapi("<Project ID>")

val answer = skapi.forwardRequest(jsonOf(
    "url" to "https://api.example.com/v1/report",
    "method" to "POST",
    "headers" to jsonOf("Content-Type" to "application/json"),
    "data" to jsonOf("report" to "quarterly"),
))
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;

SkapiJava skapi = new SkapiJava("<Project ID>");

Object answer = skapi.forwardRequest(SkapiJson.obj(
    "url", "https://api.example.com/v1/report",
    "method", "POST",
    "headers", SkapiJson.obj("Content-Type", "application/json"),
    "data", SkapiJson.obj("report", "quarterly")
)).get();
```

:::

| option | |
|---|---|
| `url` | Required. A full URL. |
| `method` | `"GET"`, `"POST"` (default), `"PUT"`, `"PATCH"`, `"DELETE"` or `"HEAD"`, any case. |
| `headers` | object. A name starting with `x-skapi-` is refused. |
| `data` | object, the body. Sent as JSON only when your `Content-Type` header is `application/json`, otherwise form-encoded. |
| `params` | object, the query string. A `?query` in `url` is added to it. |
| `secretName` | A client secret to fill in, see below. |
| `skapiHeaders` | Tell the destination who is calling, see below. |
| `queue`, `poll`, `stream`, `expires` | See [Queued requests](#queued-requests) and [Streamed requests](#streamed-requests). |
| `cref` | Your own reference for the request, see [Finding a request again](#finding-a-request-again). |
| `notify` | Status push for a queued request, see [Status push](#status-push). |
| `multipart` | `true` sends `form` as a multipart body, see below. |
| `responseType` | `"json"` parses a string answer (a string that does not parse comes back unchanged); `"text"` gives a string, turning anything else into JSON text. |

The second argument, `form`, is a `Map<String, Any?>` merged into `data` (or into `params` for `GET`, `DELETE` and `HEAD`). Its values can be `JsonElement`, `String`, numbers, booleans, `null`, `ByteArray` or `FileUpload`. Where `form` and the option hold the same key, the option wins.

::: code-group

```kotlin [Kotlin]
skapi.forwardRequest(
    jsonOf("url" to "https://api.example.com/search", "method" to "GET"),
    mapOf("q" to "otter"),
)
```

```java [Java]
skapi.forwardRequest(
    SkapiJson.obj("url", "https://api.example.com/search", "method", "GET"),
    SkapiJson.obj("q", "otter")
).get();
```

:::

The answer comes back as a `JsonElement`: parsed JSON, or a `JsonPrimitive` string for text.

Signing in is not required. A signed-out caller is known to the server by IP address and User-Agent only (see [Reading an answer later](#reading-an-answer-later)).

## Client secrets

Store the key on skapi.com as a client secret of your project, name it with `secretName`, and put `"$CLIENT_SECRET"` where the value goes: in `url`, or in any string value of `headers`, `data` or `params`, at any depth. In a Kotlin string, write it as `"\$CLIENT_SECRET"`, or the compiler reads it as a template.

::: code-group

```kotlin [Kotlin]
val answer = skapi.forwardRequest(jsonOf(
    "secretName" to "my_secret",
    "url" to "https://api.example.com/v1/report",
    "headers" to jsonOf(
        "Content-Type" to "application/json",
        "Authorization" to "Bearer \$CLIENT_SECRET",
    ),
    "data" to jsonOf("report" to "quarterly"),
))
```

```java [Java]
Object answer = skapi.forwardRequest(SkapiJson.obj(
    "secretName", "my_secret",
    "url", "https://api.example.com/v1/report",
    "headers", SkapiJson.obj(
        "Content-Type", "application/json",
        "Authorization", "Bearer $CLIENT_SECRET"
    ),
    "data", SkapiJson.obj("report", "quarterly")
)).get();
```

:::

The value is filled in on the server, so it never reaches your code. A locked secret needs a signed-in user whose access group reaches the secret's, and a secret limited to some destinations refuses other URLs. When `"$CLIENT_SECRET"` appears nowhere, skapi-kotlin leaves `secretName` out and sends the request as written.

`"$ACCESS_TOKEN"` works the same way, without a secret: the server replaces it with the signed-in user's access token, or with nothing when signed out.

## Telling the destination who is calling

`skapiHeaders` is off by default.

| value | the destination receives |
|---|---|
| `true` | `x-skapi-user` and `x-skapi-service` |
| `{"user": true}` | `x-skapi-user`: the signed-in user's ID, left out when signed out |
| `{"service": true}` | `x-skapi-service`: the project's ID |

Skapi's server writes these from the verified caller, so the destination can trust them. That is why your own `x-skapi-` headers are refused.

## Multipart bodies

`"multipart" to true` sends `form` as a `multipart/form-data` body. A file is a `FileUpload`, as on [Files](/database/files#uploading-with-a-record); the form key is the part name, and the file's `filename` and `contentType` are sent with it. A `ByteArray` alone also becomes a file part, named after its key. A list gives one part per item; other values are sent as text (`null` as empty, `true` as `true`, objects and lists as JSON).

::: code-group

```kotlin [Kotlin]
skapi.forwardRequest(
    jsonOf(
        "secretName" to "my_secret",
        "url" to "https://api.example.com/v1/upload",
        "headers" to jsonOf("Authorization" to "Bearer \$CLIENT_SECRET"),
        "multipart" to true,
    ),
    mapOf(
        "title" to "Holiday",
        "photo" to FileUpload.fromFile("photo", File("beach.jpg")),
    ),
)
```

```java [Java]
import com.skapi.FileUpload;
import java.io.File;

skapi.forwardRequest(
    SkapiJson.obj(
        "secretName", "my_secret",
        "url", "https://api.example.com/v1/upload",
        "headers", SkapiJson.obj("Authorization", "Bearer $CLIENT_SECRET"),
        "multipart", true
    ),
    SkapiJson.obj(
        "title", "Holiday",
        "photo", FileUpload.fromFile("photo", new File("beach.jpg"), null, null)
    )
).get();
```

:::

`data` cannot be sent with `multipart`. Nothing is filled in inside a multipart body. The body is capped at 2,031,616 characters once base64 encoded, about 1.5 MB of file: upload bigger files first and send their URL.

## Three ways to get the answer

| you pass | what happens | `forwardRequest` returns |
|---|---|---|
| no `queue`, `poll` or `stream` | **inline**: the destination is called at once | its answer |
| `queue`, no `poll` | **queued**: the request waits its turn on the server | the envelope, at once |
| `poll` or `"stream" to true` | **queued**, then polled | the answer, when it is ready |

Inline answers come back as text or parsed JSON. The destination's status code is not returned, so an error answer comes back like any other; its status code is in [forwardRequestHistory](#request-history). Inline requests must be answered within about 29 seconds; queue anything slower.

## Queued requests

::: code-group

```kotlin [Kotlin]
val env = skapi.forwardRequest(jsonOf(
    "secretName" to "openai",
    "url" to "https://api.openai.com/v1/images/generations",
    "headers" to jsonOf("Content-Type" to "application/json", "Authorization" to "Bearer \$CLIENT_SECRET"),
    "data" to jsonOf("model" to "gpt-image-1", "prompt" to "A sea otter", "n" to 1),
    "queue" to "images",
)).jsonObject
```

```java [Java]
Map<String, Object> env = (Map<String, Object>) skapi.forwardRequest(SkapiJson.obj(
    "secretName", "openai",
    "url", "https://api.openai.com/v1/images/generations",
    "headers", SkapiJson.obj("Content-Type", "application/json", "Authorization", "Bearer $CLIENT_SECRET"),
    "data", SkapiJson.obj("model", "gpt-image-1", "prompt", "A sea otter", "n", 1),
    "queue", "images"
)).get();
```

:::

The envelope:

```json
{
    "id": "<stamp>:<entropy>",
    "status": "pending",
    "queue_name": "images",
    "in_queue": 1,
    "request_id": "[POST]https://api.openai.com/v1/images/generations#<project id>:<stamp>:<entropy>"
}
```

`id` is the short id. `in_queue` is the place in the queue, this request included (`1` is next).

Keep `request_id`: it is how you read the answer. Queue names cannot contain colons. `expires` (seconds) removes the request from the history that long after it settles.

`poll` (milliseconds between checks, 1000 or more; `true` for 1000) does the waiting for you. A queue name is made up when you give none.

::: code-group

```kotlin [Kotlin]
val result = skapi.forwardRequest(jsonOf(
    "url" to "https://api.example.com/v1/slow-report",
    "data" to jsonOf("report" to "yearly"),
    "poll" to 2000,
))
```

```java [Java]
Object result = skapi.forwardRequest(SkapiJson.obj(
    "url", "https://api.example.com/v1/slow-report",
    "data", SkapiJson.obj("report", "yearly"),
    "poll", 2000
)).get();
```

:::

The first check goes out after one interval. There is no time limit: the call returns when the request settles. Launch it in its own coroutine if you need to do other work meanwhile, and cancel that coroutine to stop waiting.

What a settled request returns:

- `resolved`: the destination's answer, as it is. An answer with a `"status"` key of its own (even `"pending"`) is returned, not waited on: only Skapi's envelope, which has `in_queue`, means the request is still waiting. The same goes for `"chunks"` or `"more"` in the answer: they are the destination's data, never handed to `onStream` as streamed text.
- `failed` with an error answer (status 400 or above): `{"status_code": <number>, "body": <string>, "truncated": ...}`. This is returned, not thrown.
- `cancelled`: the envelope with `"status": "cancelled"`.

## Reading an answer later

[forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll) waits for a queued request and returns the same values:

::: code-group

```kotlin [Kotlin]
val requestId = env["request_id"]!!.jsonPrimitive.content
val result = skapi.forwardRequestPoll(requestId, pollMillis = 2000)

// or with the short id
val again = skapi.forwardRequestPoll(
    env["id"]!!.jsonPrimitive.content,
    url = "https://api.openai.com/v1/images/generations",
    method = "POST",
)
```

```java [Java]
String requestId = (String) env.get("request_id");
Object result = skapi.forwardRequestPoll(requestId, 2000).get();

// or with the short id
Object again = skapi.forwardRequestPoll(
    (String) env.get("id"),
    1000,
    "https://api.openai.com/v1/images/generations",
    "POST"
).get();
```

:::

A poll is not ended by a failure on the way: no network, `TIMEOUT`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR`, or no sign-in token. It tries again on a later check, waiting twice as long after each failure in a row, up to 30 seconds, and only the server's own answer settles it. When the server refuses the sign-in token (401), the token is refreshed once and the poll carries on. While the user is signed out it waits without sending anything, and reads again once they sign in. A refusal such as `NOT_EXISTS` still ends it. [forwardRequestStream](/api-reference/api-bridge#forwardrequeststream) follows the same rules.

Only the caller who made a request can read it. A signed-in caller is the user, on any device. A signed-out caller is the IP address and User-Agent pair, so a request made signed out must be polled, cancelled and finalized from the same IP with the same User-Agent; otherwise it is `NOT_EXISTS` (`Request not found.`).

## Streamed requests

`"stream" to true` makes Skapi relay the destination's answer as it arrives, and `onStream(text, seq)` receives each piece in order, on a background thread. Pieces end wherever the destination paused, so buffer them until your own format says a unit is complete. An exception thrown in `onStream` is ignored (it is logged).

Ask the destination for a streamed answer too: that is part of your own `data`, and Skapi never reads it.

::: code-group

```kotlin [Kotlin]
val buffer = StringBuilder()
val answer = StringBuilder()

val env = skapi.forwardRequest(
    jsonOf(
        "secretName" to "openai",
        "url" to "https://api.openai.com/v1/chat/completions",
        "headers" to jsonOf("Content-Type" to "application/json", "Authorization" to "Bearer \$CLIENT_SECRET"),
        "data" to jsonOf(
            "model" to "gpt-4.1",
            "stream" to true,
            "messages" to listOf(jsonOf("role" to "user", "content" to "Hi")),
        ),
        "stream" to true, // Skapi's own flag
    ),
    onStream = { text, seq ->
        buffer.append(text)
        while (true) {
            val end = buffer.indexOf("\n\n")
            if (end < 0) break
            val frame = buffer.substring(0, end)
            buffer.delete(0, end + 2)
            for (line in frame.split("\n")) {
                if (line.startsWith("data: ") && line != "data: [DONE]") {
                    val chunk = Json.parseToJsonElement(line.substring(6)).jsonObject
                    val delta = chunk["choices"]!!.jsonArray[0].jsonObject["delta"]!!.jsonObject
                    answer.append(delta["content"]?.jsonPrimitive?.contentOrNull ?: "")
                }
            }
        }
    },
).jsonObject
println(env["status"]) // "resolved"
```

```java [Java]
StringBuilder buffer = new StringBuilder();
StringBuilder answer = new StringBuilder();

Map<String, Object> env = (Map<String, Object>) skapi.forwardRequest(
    SkapiJson.obj(
        "secretName", "openai",
        "url", "https://api.openai.com/v1/chat/completions",
        "headers", SkapiJson.obj("Content-Type", "application/json", "Authorization", "Bearer $CLIENT_SECRET"),
        "data", SkapiJson.obj(
            "model", "gpt-4.1",
            "stream", true,
            "messages", SkapiJson.list(SkapiJson.obj("role", "user", "content", "Hi"))
        ),
        "stream", true  // Skapi's own flag
    ),
    null,
    (text, seq) -> {
        buffer.append(text);
        while (true) {
            int end = buffer.indexOf("\n\n");
            if (end < 0) break;
            String frame = buffer.substring(0, end);
            buffer.delete(0, end + 2);
            for (String line : frame.split("\n")) {
                if (line.startsWith("data: ") && !line.equals("data: [DONE]")) {
                    Map<String, Object> chunk = (Map<String, Object>) SkapiJson.parse(line.substring(6));
                    Map<String, Object> choice = (Map<String, Object>) ((List<Object>) chunk.get("choices")).get(0);
                    Object content = ((Map<String, Object>) choice.get("delta")).get("content");
                    if (content != null) answer.append(content);
                }
            }
        }
    }
).get();
System.out.println(env.get("status")); // "resolved"
```

:::

A streamed request settles with the envelope and no body, and with `onStream` the envelope also carries `stream`, `chunks`, `last_seq` and `more`. A failed one has `"status": "failed"` and an `error` object, and keeps the text that did arrive (without `onStream` you get the `error` object alone). It is not thrown.

### Reading a stream again

[forwardRequestStream](/api-reference/api-bridge#forwardrequeststream) reads a streamed request from the start, or after `since`: while it runs it hands new text to `onStream`; once it has settled it hands over all the stored text and returns the envelope; once it is finalized it returns the kept body.

::: code-group

```kotlin [Kotlin]
skapi.forwardRequestStream(requestId, jsonOf("poll" to 1000), onStream = onStream)
```

```java [Java]
// onStream: a BiConsumer<String, Integer>
skapi.forwardRequestStream(requestId, SkapiJson.obj("poll", 1000), onStream).get();
```

:::

### Keeping the answer

Until you finalize it, a streamed request keeps every piece and its history has no answer. [forwardRequestFinalize](/api-reference/api-bridge#forwardrequestfinalize) stores what you pass as its answer and releases the pieces; later polls return that value. Finalizing again replaces it. Calling it without `data` stores `null` and still releases the pieces.

::: code-group

```kotlin [Kotlin]
skapi.forwardRequestFinalize(requestId, JsonPrimitive(answer.toString()))
// {"finalized": true, "message": "Finalized."}
```

```java [Java]
skapi.forwardRequestFinalize(requestId, answer.toString()).get();
// {"finalized": true, "message": "Finalized."}
```

:::

`"ifAbsent" to true` stores the value only when the request has no stored result yet. When it has one, nothing changes and the answer is `{"finalized": false, "reason": "exists"}`, so two devices settling the same request cannot replace a complete answer with a partial one.

::: code-group

```kotlin [Kotlin]
skapi.forwardRequestFinalize(requestId, JsonPrimitive(answer.toString()), jsonOf("ifAbsent" to true))
```

```java [Java]
skapi.forwardRequestFinalize(requestId, answer.toString(), SkapiJson.obj("ifAbsent", true)).get();
```

:::

Only a settled request can be finalized. After three failed reads of the pieces in a row on a settled request, the read gives up and returns what it has, so check your text is complete before you finalize it.

## Request history

[forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory) lists your requests to one `url` and `method` (upper case), with their answers. Only your own requests are listed, also when you name a queue: another user's requests on a queue with the same name never appear. For example:

::: code-group

```kotlin [Kotlin]
val history = skapi.forwardRequestHistory(jsonOf(
    "url" to "https://api.openai.com/v1/images/generations",
    "method" to "POST",
    "status" to "pending", // optional: "pending", "running", "resolved", "failed"
    "queue" to "images",   // optional, matches as a prefix; add "queue_exact" to true for this queue only
))

for (entry in history["list"]!!.jsonArray) {
    val item = entry.jsonObject
    val status = item["status"]?.jsonPrimitive?.content
    println("$status ${item["status_code"]} ${item["created"]}")
    if (status == "pending" || status == "running") {
        println(skapi.forwardRequestPoll(item["request_id"]!!.jsonPrimitive.content))
    }
}
```

```java [Java]
Map<String, Object> history = skapi.forwardRequestHistory(SkapiJson.obj(
    "url", "https://api.openai.com/v1/images/generations",
    "method", "POST",
    "status", "pending", // optional: "pending", "running", "resolved", "failed"
    "queue", "images"    // optional, matches as a prefix; add "queue_exact", true for this queue only
)).get();

for (Object entry : (List<Object>) history.get("list")) {
    Map<String, Object> item = (Map<String, Object>) entry;
    String status = (String) item.get("status");
    System.out.println(status + " " + item.get("status_code") + " " + item.get("created"));
    if ("pending".equals(status) || "running".equals(status)) {
        System.out.println(skapi.forwardRequestPoll((String) item.get("request_id")).get());
    }
}
```

:::

`"compact" to true` leaves the bodies out and gives short `request_text` and `response_text` instead. `"fields" to "ids"` is lighter still: each row is only its id, status, times, queue and `cref`, with no request or response bodies, so a page stays small however long the answers are. `"after"` to a request's short id lists only the rows newer than it: what appeared since the newest row you already have. The listing pages like [getRecords](/database/fetch#paging).

`queue` matches every queue whose name starts with it, so `"u1"` also lists `"u1-bg"`. `"queue_exact" to true` lists only the queue named in `queue`, and the server then reads only that queue's rows. Requests queued before 2026-06-05 were stored under an older queue format and are not listed with `queue_exact`: list the queue without it to see those. `"queue_exclude"` leaves one queue's rows out after the read, so a page can come back short while more rows remain; keep paging until `endOfList`.

## Finding a request again

`cref` is your own reference for a request: 1 to 64 letters, digits, `_` or `-`. It is stored on the request and handed back by the reply, [forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory), [forwardRequestStatus](/api-reference/api-bridge#forwardrequeststatus) and [forwardRequestRead](/api-reference/api-bridge#forwardrequestread). When the reply of a send is lost (the device slept, the network dropped), look the request up by its `cref` instead of sending it again. Make a new one per request.

::: code-group

```kotlin [Kotlin]
val cref = "msg-" + UUID.randomUUID().toString().replace("-", "")
try {
    skapi.forwardRequest(jsonOf("url" to url, "data" to body, "queue" to "chat", "cref" to cref))
} catch (err: SkapiException) {
    if (err.code != "NETWORK_ERROR" && err.code != "TIMEOUT") throw err
    // the send may have arrived: look for it before sending again
    val recent = skapi.forwardRequestHistory(jsonOf("url" to url, "method" to "POST", "queue" to "chat", "fields" to "ids"))
    val sent = recent["list"]!!.jsonArray.any { it.jsonObject["cref"]?.jsonPrimitive?.content == cref }
}
```

```java [Java]
String cref = "msg-" + UUID.randomUUID().toString().replace("-", "");
try {
    skapi.forwardRequest(SkapiJson.obj("url", url, "data", body, "queue", "chat", "cref", cref)).get();
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    if (!err.getCode().equals("NETWORK_ERROR") && !err.getCode().equals("TIMEOUT")) throw err;
    // the send may have arrived: look for it before sending again
    Map<String, Object> recent = skapi.forwardRequestHistory(SkapiJson.obj(
        "url", url, "method", "POST", "queue", "chat", "fields", "ids")).get();
    boolean sent = ((List<Object>) recent.get("list")).stream()
        .anyMatch(r -> cref.equals(((Map<String, Object>) r).get("cref")));
}
```

:::

A `cref` that is not 1 to 64 of those characters is refused with `INVALID_PARAMETER` before anything is sent.

## Many requests at once

An app that shows several unfinished requests (after the device slept, or when another device sent some) can ask where all of them stand in one call. [forwardRequestStatus](/api-reference/api-bridge#forwardrequeststatus) takes full request ids, or `{id, url, method}` objects with the short id, and returns `{"list"}` in the order asked: each item's `status` (`"missing"` for one this caller cannot see), `stream`, `final_seq`, `has_body`, timestamps and `cref`, with no bodies. More than 100 are asked 100 at a time.

::: code-group

```kotlin [Kotlin]
val res = skapi.forwardRequestStatus(listOf(
    JsonPrimitive(requestIdA),
    jsonOf("id" to shortIdB, "url" to "https://api.example.com/v1/chat", "method" to "POST"),
), jsonOf("deadline" to 15000))
for (item in res["list"]!!.jsonArray) println(item.jsonObject["status"])
```

```java [Java]
Map<String, Object> res = skapi.forwardRequestStatus(List.of(
    requestIdA,
    SkapiJson.obj("id", shortIdB, "url", "https://api.example.com/v1/chat", "method", "POST")
), SkapiJson.obj("deadline", 15000)).get();
for (Object item : (List<Object>) res.get("list")) System.out.println(((Map<String, Object>) item).get("status"));
```

:::

To watch many requests cheaply, read the counters of their queues on every check, and the requests themselves only when a counter moved. [forwardRequestQueueCounters](/api-reference/api-bridge#forwardrequestqueuecounters) takes up to 20 queue names and returns `{"queues": {name: {"cnt", "rct", "seq", "in_queue"}}}`: `rct` grows whenever a request on the queue finishes and `seq` whenever one is added. A queue that never had a request is left out.

::: code-group

```kotlin [Kotlin]
val counters = skapi.forwardRequestQueueCounters(listOf("chat", "chat-bg"))
```

```java [Java]
Map<String, Object> counters = skapi.forwardRequestQueueCounters(List.of("chat", "chat-bg")).get();
```

:::

## Reading one request in full

[forwardRequestRead](/api-reference/api-bridge#forwardrequestread) reads one request in the same shape whatever state it is in: `{"id", "status", "body"?, "error"?, "chunks"?, "last_seq"?, "final_seq"?, "more"?, ...}`. Unlike a poll, a resolved request does not come back as its bare answer, so the status is always there to read. With `since` (a chunk `seq`, `0` for the beginning) a streamed request's text after that point comes back too, including the text a failed stream got before it failed, with `"more": true` when there is more than one read returns. A stored answer that cannot be loaded right now comes back as `"body_unavailable": true` instead of failing the read.

::: code-group

```kotlin [Kotlin]
val env = skapi.forwardRequestRead(jsonOf(
    "id" to shortId, "url" to "https://api.example.com/v1/chat", "method" to "POST", "since" to 0,
))
```

```java [Java]
Map<String, Object> env = skapi.forwardRequestRead(SkapiJson.obj(
    "id", shortId, "url", "https://api.example.com/v1/chat", "method", "POST", "since", 0
)).get();
```

:::

## Deadlines and aborting

[forwardRequestStatus](/api-reference/api-bridge#forwardrequeststatus), [forwardRequestQueueCounters](/api-reference/api-bridge#forwardrequestqueuecounters), [forwardRequestRead](/api-reference/api-bridge#forwardrequestread) and [forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory) take two more settings:

- `"deadline"` in the options: milliseconds the call may take in all (per call to the server for forwardRequestStatus), counted from the call: the wait for the connection and for a sign-in token refresh, the waits after a `429`, and the network. Past it the call fails with `TIMEOUT` (`No answer within <n> ms.`) and is taken off the network.
- `signal`: a `SkapiAbortSignal`. `signal.abort()` fails the call with `ABORTED` at once, at any of those stages, and takes it off the network. One signal can be given to several calls; an already aborted signal fails a call at once.

`"fresh"` is accepted too, for code shared with skapi-js. Every read of skapi-kotlin is already fresh: it never joins another read in flight.

::: code-group

```kotlin [Kotlin]
val signal = SkapiAbortSignal()
val job = scope.launch {
    try {
        skapi.forwardRequestRead(jsonOf("id" to requestId, "deadline" to 10000), signal)
    } catch (err: SkapiException) {
        if (err.code == "ABORTED" || err.code == "TIMEOUT") return@launch
        throw err
    }
}
// later, when the screen closes
signal.abort()
```

```java [Java]
SkapiAbortSignal signal = new SkapiAbortSignal();
CompletableFuture<Map<String, Object>> read =
    skapi.forwardRequestRead(SkapiJson.obj("id", requestId, "deadline", 10000), signal);
// later, when the screen closes
signal.abort();
```

:::

## Status push

`"notify" to true` on a queued request (signed-in users) asks the server to tell this user's realtime connections each time the request's status changes: `pending`, `running`, `resolved`, `failed`, `cancelled`. The reply then says `"notify": true`, and a poll of the request (with `poll` on forwardRequest, or [forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll) with `notify = true`) reads it at once when a change names it, and otherwise only once a minute while changes are arriving. With no realtime connection, no changes arriving, or a server that does not support it, the poll runs at its normal interval: status push only ever saves reads, it never delays an answer.

[onRequestStatus](/api-reference/api-bridge#onrequeststatus) listens to every such change of this user's requests, including ones this client holds no poll for (a request sent from another device, or a pass the server queued to continue one). The realtime connection is kept open while a listener is registered: one is opened when the app has none, and it is closed again ten minutes after the last listener and poll let go, unless the app took it over with [connectRealtime](/api-reference/realtime#connectrealtime) or joined a group on it. These changes never reach your [connectRealtime](/api-reference/realtime#connectrealtime) callback.

::: code-group

```kotlin [Kotlin]
val stop = skapi.onRequestStatus { event ->
    when (event["type"]?.jsonPrimitive?.content) {
        "status" -> println("${event["id"]} is now ${event["status"]}")
        "connected" -> refreshList() // changes made while disconnected were not sent: read again
        "disconnected" -> {}
    }
}
// later
stop()
```

```java [Java]
Runnable stop = skapi.onRequestStatus(event -> {
    switch ((String) event.get("type")) {
        case "status": System.out.println(event.get("id") + " is now " + event.get("status")); break;
        case "connected": refreshList(); break; // changes made while disconnected were not sent: read again
        default: break;
    }
});
// later
stop.run();
```

:::

A `status` event is `{"type": "status", "id", "queue", "status", "previous", "updated", "executed"}`: `id` is the short id, `previous` is absent when the request was just created, and `updated` and `executed` are in milliseconds. It is a hint, not the outcome: read the request for its answer. `{"type": "connected"}` comes whenever the listener lands on an open connection (the first time, after every reconnect, and at the planned renewal), and `{"type": "disconnected"}` when it loses it. The callback runs on a background thread. [isRequestStatusLive](/api-reference/api-bridge#isrequeststatuslive) is `true` while changes are arriving.

## Cancelling and counting

::: code-group

```kotlin [Kotlin]
skapi.cancelForwardRequest(jsonOf(
    "url" to "https://api.openai.com/v1/images/generations",
    "method" to "POST",
    "id" to env["id"],
))
// {"removed": true, "message": "Cancelled."}

skapi.forwardRequestQueueCount(jsonOf("queue" to "images"))
// {"queue_name": "images", "in_queue": 3}   signed-in users only
```

```java [Java]
skapi.cancelForwardRequest(SkapiJson.obj(
    "url", "https://api.openai.com/v1/images/generations",
    "method", "POST",
    "id", env.get("id")
)).get();
// {"removed": true, "message": "Cancelled."}

skapi.forwardRequestQueueCount(SkapiJson.obj("queue", "images")).get();
// {"queue_name": "images", "in_queue": 3}   signed-in users only
```

:::

Cancel takes the short `id`, and only reaches a request that is still `pending` or `running`. Cancelling a streamed request discards its pieces.
