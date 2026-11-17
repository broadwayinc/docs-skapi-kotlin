# Not Included

skapi-kotlin is for the users of your app: it has the same user-side methods as skapi-js and skapi-py. A few skapi-js features are left out because they only make sense in a web browser, or because they belong to the project owner. This page lists them and what to do instead.

## Web push notifications

`subscribeNotification()`, `unsubscribeNotification()` and `vapidPublicKey()` are not included.

In skapi-js they register the browser for the Web Push API with a VAPID key, and Skapi delivers to the browser's push service. A native app does not have that API: it receives push messages through a vendor service, such as Firebase Cloud Messaging on Android, and the Skapi backend does not deliver to those services. skapi-kotlin also stays provider neutral and does not tie your app to one push vendor.

If your app needs push messages, send them from your own server through the push service you chose. The [realtime connection](/realtime/connecting) delivers messages to users while the app is open.

## Video and audio calls

`connectRTC()` and `closeRTC()` (WebRTC calls) are not included. A browser has WebRTC built in; an app would need a large native WebRTC library, which the SDK does not bring in.

Realtime messaging itself is included: [`connectRealtime()`](/realtime/connecting), [groups](/realtime/groups) and [`postRealtime()`](/api-reference/realtime#postrealtime).

## HTML form helpers

skapi-js methods can take an HTML `<form>` element or a submit event in place of their parameters, and `getFormResponse()` reads the answer after a form submit that redirected the page. There is no DOM in an app, so these are not included.

Pass `JsonObject` values for data, and [`FileUpload`](/database/files) values for files. `postRecord()` and `uploadFiles()` take a list of `FileUpload`, and [`forwardRequest()`](/api-bridge/forward-request) takes a `form` map whose values can be text, numbers, bytes or `FileUpload`.

## Stopping a forwarded request's polling

`stopForwardRequestPolling()` and `isPollStopped()` are not included. In skapi-kotlin, a method that waits for a queued or streamed answer is a `suspend` function: cancel the coroutine that waits and the polling stops.

::: code-group

```kotlin [Kotlin]
val job = lifecycleScope.launch {
    val answer = skapi.forwardRequestPoll(requestId)
    show(answer)
}

// later, to stop waiting:
job.cancel()
```

```java [Java]
CompletableFuture<Object> waiting = skapi.forwardRequestPoll(requestId);
waiting.thenAccept(answer -> runOnUiThread(() -> show(answer)));

// later, to stop waiting:
waiting.cancel(true);
```

:::

## Playground and test endpoints

`spellcast()`, `getspell()`, `dopamine()` and `mock()` are not included. They are playground and test endpoints of skapi-js, and are not part of skapi-py either.

## Owner and admin methods

Every method for the project owner and admins is left out, as in skapi-py: managing users, sending newsletters, project settings, hosting, client secrets and so on. skapi-kotlin is for the users of your app. Manage your project on [skapi.com](https://www.skapi.com).

## Added for apps

skapi-kotlin has a few things skapi-js does not need in a browser:

- **A device key store** for [record encryption](/database/encryption): `DeviceKeyStore`, and `AndroidKeystoreDeviceKeyStore` in skapi-android, keep the user's key on the device the way skapi-js keeps it in IndexedDB. See [Android](/introduction/android#remember-this-device-for-record-encryption).
- **Session storage**: `FileStorage` for JVM programs, and `SharedPreferencesStorage` in skapi-android, sealed by the Android Keystore. See [Keeping users signed in](/introduction/getting-started#keeping-users-signed-in-between-runs).
- **Lifecycle helpers**: `onForeground()`, `onNetworkAvailable()` and skapi-android's `SkapiLifecycle`, in place of the browser's visibility and online events. See [Android](/introduction/android#coming-back-to-the-foreground).
- **`FileUpload`**: files to upload made from a `File`, an `InputStream`, bytes or text, in place of the browser's `File` and `Blob`. See [Files](/database/files).
