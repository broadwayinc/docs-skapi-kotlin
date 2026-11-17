# Forwarding Requests

[forwardRequest](/api-reference/api-bridge#forwardrequest) calls another API from Skapi's server instead of from your code. Use it when the call needs a key you do not want to ship with your app, when its answer should be kept and read again later, or when you want the answer streamed as it arrives.

Answers arrive by polling. A call that waits for an answer suspends until that answer is ready. To stop waiting, cancel the coroutine: the polling stops at once, and the request itself stays on the server (remove it with [cancelForwardRequest](#cancelling-and-counting) while it has not run).

## Sending a request

```kotlin
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
| `multipart` | `true` sends `form` as a multipart body, see below. |
| `responseType` | `"json"` parses a string answer (a string that does not parse comes back unchanged); `"text"` gives a string, turning anything else into JSON text. |

The second argument, `form`, is a `Map<String, Any?>` merged into `data` (or into `params` for `GET`, `DELETE` and `HEAD`). Its values can be `JsonElement`, `String`, numbers, booleans, `null`, `ByteArray` or `FileUpload`. Where `form` and the option hold the same key, the option wins.

```kotlin
skapi.forwardRequest(
    jsonOf("url" to "https://api.example.com/search", "method" to "GET"),
    mapOf("q" to "otter"),
)
```

The answer comes back as a `JsonElement`: parsed JSON, or a `JsonPrimitive` string for text.

Signing in is not required. A signed-out caller is known to the server by IP address and User-Agent only (see [Reading an answer later](#reading-an-answer-later)).

## Client secrets

Store the key on skapi.com as a client secret of your project, name it with `secretName`, and put `"$CLIENT_SECRET"` where the value goes: in `url`, or in any string value of `headers`, `data` or `params`, at any depth. In a Kotlin string, write it as `"\$CLIENT_SECRET"`, or the compiler reads it as a template.

```kotlin
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

```kotlin
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

`data` cannot be sent with `multipart`. Nothing is filled in inside a multipart body. The body is capped at 2,031,616 characters once base64 encoded, about 1.5 MB of file: upload bigger files first and send their URL.

## Three ways to get the answer

| you pass | what happens | `forwardRequest` returns |
|---|---|---|
| no `queue`, `poll` or `stream` | **inline**: the destination is called at once | its answer |
| `queue`, no `poll` | **queued**: the request waits its turn on the server | the envelope, at once |
| `poll` or `"stream" to true` | **queued**, then polled | the answer, when it is ready |

Inline answers come back as text or parsed JSON. The destination's status code is not returned, so an error answer comes back like any other; its status code is in [forwardRequestHistory](#request-history). Inline requests must be answered within about 29 seconds; queue anything slower.

## Queued requests

```kotlin
val env = skapi.forwardRequest(jsonOf(
    "secretName" to "openai",
    "url" to "https://api.openai.com/v1/images/generations",
    "headers" to jsonOf("Content-Type" to "application/json", "Authorization" to "Bearer \$CLIENT_SECRET"),
    "data" to jsonOf("model" to "gpt-image-1", "prompt" to "A sea otter", "n" to 1),
    "queue" to "images",
)).jsonObject
```

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

`poll` (milliseconds between checks, `true` for 1000) does the waiting for you. A queue name is made up when you give none.

```kotlin
val result = skapi.forwardRequest(jsonOf(
    "url" to "https://api.example.com/v1/slow-report",
    "data" to jsonOf("report" to "yearly"),
    "poll" to 2000,
))
```

The first check goes out after one interval. There is no time limit: the call returns when the request settles. Launch it in its own coroutine if you need to do other work meanwhile, and cancel that coroutine to stop waiting.

What a settled request returns:

- `resolved`: the destination's answer, as it is. An answer with a `"status"` key of its own (even `"pending"`) is returned, not waited on: only Skapi's envelope, which has `in_queue`, means the request is still waiting. The same goes for `"chunks"` or `"more"` in the answer: they are the destination's data, never handed to `onStream` as streamed text.
- `failed` with an error answer (status 400 or above): `{"status_code": <number>, "body": <string>, "truncated": ...}`. This is returned, not thrown.
- `cancelled`: the envelope with `"status": "cancelled"`.

## Reading an answer later

[forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll) waits for a queued request and returns the same values:

```kotlin
val requestId = env["request_id"]!!.jsonPrimitive.content
val result = skapi.forwardRequestPoll(requestId, pollMillis = 2000)

// or with the short id
val again = skapi.forwardRequestPoll(
    env["id"]!!.jsonPrimitive.content,
    url = "https://api.openai.com/v1/images/generations",
    method = "POST",
)
```

Only the caller who made a request can read it. A signed-in caller is the user, on any device. A signed-out caller is the IP address and User-Agent pair, so a request made signed out must be polled, cancelled and finalized from the same IP with the same User-Agent; otherwise it is `NOT_EXISTS` (`Request not found.`).

## Streamed requests

`"stream" to true` makes Skapi relay the destination's answer as it arrives, and `onStream(text, seq)` receives each piece in order, on a background thread. Pieces end wherever the destination paused, so buffer them until your own format says a unit is complete. An exception thrown in `onStream` is ignored (it is logged).

Ask the destination for a streamed answer too: that is part of your own `data`, and Skapi never reads it.

```kotlin
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

A streamed request settles with the envelope and no body, and with `onStream` the envelope also carries `stream`, `chunks`, `last_seq` and `more`. A failed one has `"status": "failed"` and an `error` object, and keeps the text that did arrive (without `onStream` you get the `error` object alone). It is not thrown.

### Reading a stream again

[forwardRequestStream](/api-reference/api-bridge#forwardrequeststream) reads a streamed request from the start, or after `since`: while it runs it hands new text to `onStream`; once it has settled it hands over all the stored text and returns the envelope; once it is finalized it returns the kept body.

```kotlin
skapi.forwardRequestStream(requestId, jsonOf("poll" to 1000), onStream = onStream)
```

### Keeping the answer

Until you finalize it, a streamed request keeps every piece and its history has no answer. [forwardRequestFinalize](/api-reference/api-bridge#forwardrequestfinalize) stores what you pass as its answer and releases the pieces; later polls return that value. Finalizing again replaces it. Calling it without `data` stores `null` and still releases the pieces.

```kotlin
skapi.forwardRequestFinalize(requestId, JsonPrimitive(answer.toString()))
// {"finalized": true, "message": "Finalized."}
```

Only a settled request can be finalized. After three failed reads of the pieces in a row on a settled request, the read gives up and returns what it has, so check your text is complete before you finalize it.

## Request history

[forwardRequestHistory](/api-reference/api-bridge#forwardrequesthistory) lists your requests to one `url` and `method` (upper case), with their answers:

```kotlin
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

`"compact" to true` leaves the bodies out and gives short `request_text` and `response_text` instead. The listing pages like [getRecords](/database/fetch#paging).

## Cancelling and counting

```kotlin
skapi.cancelForwardRequest(jsonOf(
    "url" to "https://api.openai.com/v1/images/generations",
    "method" to "POST",
    "id" to env["id"],
))
// {"removed": true, "message": "Cancelled."}

skapi.forwardRequestQueueCount(jsonOf("queue" to "images"))
// {"queue_name": "images", "in_queue": 3}   signed-in users only
```

Cancel takes the short `id`, and only reaches a request that is still `pending` or `running`. Cancelling a streamed request discards its pieces.
