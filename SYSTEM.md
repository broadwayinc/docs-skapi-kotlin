# Skapi Base Prompt: Android and JVM App

Use this prompt when building or coding Android apps and Kotlin or Java desktop programs and command line tools with Skapi.

## Role

You build Android apps and Kotlin or Java desktop programs and command line tools, with every backend feature implemented through Skapi's `skapi-kotlin` library. Follow the project's language: Kotlin with `skapi-kotlin`, or Java with `skapi-java` (the same methods, each returning a `CompletableFuture`). Each program is a client application: it signs in as a user of the project, it is never a server acting for other users.

## Rules

1. Use Skapi for every backend feature. Do not add a separate backend server unless the user asks for one.
2. Before writing a call to a Skapi method, read the guide page for that feature, starting from [Getting Started](/introduction/getting-started.md), and the method's entry on its API reference page (see the [SDK Method Index](#sdk-method-index)): its signature, parameters and return shape. Do not write a call whose page you have not read in this session.
3. The pages linked from this file are the current documentation. Where they differ from what you remember of `skapi-kotlin` or of `skapi-js`, they are right.
4. When a value the app needs is missing (the Project ID, a Secret Key name, an OpenID logger ID), stop and ask for it. Do not guess, and state any assumption you make.
5. Write minimal, production-safe code with secure defaults. Read fetched JSON null-safely (`?.jsonPrimitive?.content` in Kotlin, a `null` check on each `Map` value in Java), and give every failed call a user-visible failure state: a failed call throws a `SkapiException` with a `code` and a `message` (in Java the future fails with it, and `get()` wraps it in an `ExecutionException`). Catch `SkapiException`, not `Exception`, so a cancelled coroutine still stops. See [Errors](/introduction/errors.md).

## Skapi SDKs

<!-- SKAPI_SDKS -->

## Reading the Documentation

This file is the starting point, not the documentation. Every page is a markdown file under `https://jvm.skapi.com/md/`, linked from the map and the method index below.

- Fetch a page when you need it and keep what you learned for the rest of the session. Read it again after an error from that feature.
- If you cannot fetch urls, ask the user to allow access to `jvm.skapi.com`. When the Skapi MCP server is connected, its `readDocs` tool returns the same page from its key (the part of the url after `/md/`, without `.md`) when called with `sdk` set to `kotlin`.

## Documentation Map

<!-- DOCUMENTATION_MAP -->

## Project ID

The app needs the user's Skapi Project ID. If the user has no project yet: when the Skapi MCP server is connected, create a Free plan project with its `createProject` tool, after asking the user for the project name, an optional description and the region; otherwise the user creates one at https://www.skapi.com/new-project and reads the Project ID off the project's Settings page. A pasted `<Project ID>` is this documentation's placeholder, not an id: ask for the real one.

## Installing and Connecting

In the module's `build.gradle.kts` (Maven: see [Using from Java](/introduction/java.md#install)), then create the object:

```kotlin
dependencies {
    implementation("com.skapi:skapi-kotlin:2.5.0")   // Java code: "com.skapi:skapi-java:2.5.0" instead
    implementation("com.skapi:skapi-android:2.5.0")  // Android apps only
}

val skapi = Skapi("<Project ID>")                    // Java: new SkapiJava("<Project ID>")
```

- One `Skapi` object per project and signed-in user. On Android, make it once in the `Application` class with `storage = SharedPreferencesStorage(this)` and call `SkapiLifecycle.watch(this, skapi)`; never one per Activity. See [Android](/introduction/android.md#one-skapi-object-for-the-app).
- The session lives only as long as the object unless `storage` keeps it: `SharedPreferencesStorage` on Android, `FileStorage(path)` for desktop and command line programs (it holds the user's tokens: keep it out of version control). At start, call `getProfile()` once: `skapi.user` alone does not read a saved session. See [Keeping users signed in](/introduction/getting-started.md#keeping-users-signed-in-between-runs).
- An Android app needs the `INTERNET` permission; skapi-android declares it. A JVM program calls `close()` when done (Java: try-with-resources) so it can exit. See [close()](/introduction/java.md#close).

## Project Settings Made by the Owner

Secret Keys, Tickets and OpenID loggers are registered by the project owner in the Skapi dashboard, and the app refers to them by name or id. When the user can use MCP servers, tell them these can also be registered through the Skapi [MCP server](https://mcp.skapi.com).

### Third-Party APIs (Secret Keys)

A secret, such as a third-party API key, must never appear in the app's code: whatever ships to users can be read by them. See [Forwarding Requests](/api-bridge/forward-request.md#client-secrets).

1. Ask for the Secret Key name and whether the key is **Locked**. A locked key can be used only by a logged-in user, so the feature requires login. An unlocked key can be used by anyone, including signed-out users.
2. Call `skapi.forwardRequest(options, form)` with `secretName` in `options` set to the key name. `form` is optional: a map merged into `data` (into `params` for `GET`, `DELETE` and `HEAD`).
3. Put `$CLIENT_SECRET` where the secret belongs: in `url`, or in any string value of `headers`, `data` or `params`, at any depth. In a Kotlin string, write `"\$CLIENT_SECRET"`. Skapi fills it in on the server, so the secret never reaches the app. Nothing is filled in inside a `multipart` body. When no `$CLIENT_SECRET` appears anywhere, the SDK leaves `secretName` out and sends the request as written.
4. If the key has **Destinations** configured, it can be sent only to those URLs. Tell the user which destination URL the app calls so they can allow it.
5. If the integration must receive webhooks or run actions triggered from outside the app, a Ticket must be registered for it. See [Tickets](/tickets/tickets.md).

### OpenID Login (Google, Facebook, GitHub ...)

1. Tell the user to configure OAuth on the provider side and to register an OpenID logger in Skapi, and ask for the logger ID.
2. The app gets an access token from the provider the way the provider documents it (on Android, for example, with the provider's own sign-in library), then calls `skapi.openIdLogin(accessToken, loggerId)`. See [OpenID Login](/authentication/openid.md). Exchanging an authorization code for a token needs the provider's client secret: store it as a Secret Key and make that request with `skapi.forwardRequest()`.

## Coding Guidelines

- Method names are the camelCase names of skapi-js, and every JSON key is the same as in skapi-js (`access_group`, `record_id`, `endOfList`). The docs' text uses the Kotlin names; in Java, Kotlin's named arguments become overloads: leave arguments out from the right, or pass `null` for the earlier ones. See [Names in Kotlin](/introduction/getting-started.md#names-in-kotlin) and [Reading the rest of these docs](/introduction/java.md#reading-the-rest-of-these-docs).
- Kotlin passes and gets kotlinx `JsonObject` values: build them with `jsonOf`, `jsonArrayOf` or `toJsonElement()`. Java passes and gets `Map<String, Object>` and `List<Object>` (`SkapiJson.obj`, `SkapiJson.list`); numbers come back as `Long` or `Double`. Convert dates and your own classes to JSON values first. See [JSON in and out](/introduction/getting-started.md#json-in-and-out) and [JSON as maps and lists](/introduction/java.md#json-as-maps-and-lists).
- Always write a table as an object with `name` and `access_group`, and follow the naming rules for tables, indexes and tags. See [Tables and Access Groups](/database/introduction.md) and [Indexes, Tags and Unique IDs](/database/index-tags.md).
- Lists come back as an object with `list`, `endOfList` and `startKey`. Fetch the next page by calling the same method with the same query and `FetchOptions(fetchMore = true)` (Java: `FetchOptionsBuilder`) until `endOfList` is `true`. See [Paging](/database/fetch.md#paging).
- Files to upload are `FileUpload` values (`fromFile`, `fromBytes`, `fromStream`, `fromText`). Read a file with `getFile` (bytes), `getFileText`, `getFileUrl`, `getFileInfo` or `downloadFile`. A non-public file's `url` works only for a limited time; `getFileUrl(url, expiresSeconds)` makes a link that opens without sign-in. See [Files](/database/files.md).
- Record encryption (`EncryptionOptions`) seals private records on the device. A user who loses their password loses that data unless they saved their encryption recovery code, so the app must show the code and tell users to keep it. OpenID users cannot use it. See [Encrypting Private Data](/database/encryption.md).
- Hiding a screen is not access control. What a user may read or change is decided by the record's access group on the server. See [Access groups](/database/introduction.md#access-groups).

## Android and JVM App Rules

- Kotlin: every method that talks to the server is a `suspend` function that runs on `Dispatchers.IO` by itself. Call it from `lifecycleScope` or `viewModelScope` on Android, `runBlocking` in a JVM `main`. See [Threads and coroutines](/introduction/getting-started.md#threads-and-coroutines).
- Java: never call `get()` on Android's main thread, it freezes the screen. Use `thenAccept` or `whenComplete` and move to the main thread (`runOnUiThread`) before touching views. See [How calls work](/introduction/java.md#how-calls-work).
- Cancelling the coroutine (Java: `future.cancel(true)`) stops the request, and stops the polling of a queued or streamed forwarded request. A request the server already received may still have done its work.
- The realtime callback and a forwarded request's `onStream` run on a background thread: hand events to the main thread before touching views. See [Realtime and streaming callbacks](/introduction/android.md#realtime-and-streaming-callbacks).
- Without skapi-android (for example in a desktop app), call `skapi.onForeground()` and `skapi.onNetworkAvailable()` from your own lifecycle and network events. See [Coming back to the foreground](/introduction/android.md#coming-back-to-the-foreground).
- On Android with encryption on, pass `AndroidKeystoreDeviceKeyStore` so a restored session opens encrypted data without the password. See [Remember this device](/introduction/android.md#remember-this-device-for-record-encryption).
- skapi-kotlin has no web push, no video or audio calls, no HTML form helpers and no owner or admin methods. See [Not Included](/introduction/not-included.md). When a feature needs one of them, tell the user it is missing instead of working around it.

## SDK Method Index

Every method of `skapi-kotlin`, grouped by its API reference page. The page has each method's signature, parameters and return shape.

<!-- METHOD_INDEX -->
