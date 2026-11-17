# Android

skapi-kotlin runs on Android as it is. skapi-android adds what an app needs on top of it:

| | |
|---|---|
| [`SharedPreferencesStorage`](#sharedpreferencesstorage) | keeps the signed-in session in the app's private preferences, sealed by the Android Keystore |
| [`AndroidKeystoreDeviceKeyStore`](#remember-this-device-for-record-encryption) | "remember this device" for [record encryption](/database/encryption) |
| [`SkapiLifecycle`](#coming-back-to-the-foreground) | tells the `Skapi` object when the app returns to the foreground and when the network comes back |

::: code-group

```kotlin [Kotlin]
dependencies {
    implementation("com.skapi:skapi-kotlin:2.4.1")
    implementation("com.skapi:skapi-android:2.4.1")
}
```

```kotlin [Java]
dependencies {
    implementation("com.skapi:skapi-java:2.4.1")
    implementation("com.skapi:skapi-android:2.4.1")
}
```

:::

skapi-android needs `minSdk 24` and declares the `INTERNET` and `ACCESS_NETWORK_STATE` permissions for you.

## One Skapi object for the app

Make the `Skapi` object once, in your `Application` class, and use it from every screen. A single object shares one session, one token refresh and one realtime connection across the app.

::: code-group

```kotlin [Kotlin]
import android.app.Application
import com.skapi.Skapi
import com.skapi.android.SharedPreferencesStorage
import com.skapi.android.SkapiLifecycle

class App : Application() {
    lateinit var skapi: Skapi
        private set

    override fun onCreate() {
        super.onCreate()
        skapi = Skapi("<Project ID>", storage = SharedPreferencesStorage(this))
        SkapiLifecycle.watch(this, skapi)
    }
}
```

```java [Java]
import android.app.Application;
import com.skapi.android.SharedPreferencesStorage;
import com.skapi.android.SkapiLifecycle;
import com.skapi.java.SkapiJava;

public class App extends Application {
    public SkapiJava skapi;

    @Override
    public void onCreate() {
        super.onCreate();
        skapi = new SkapiJava("<Project ID>", new SharedPreferencesStorage(this));
        SkapiLifecycle.watch(this, skapi.getSkapi());
    }
}
```

:::

```xml
<application android:name=".App" ...>
```

Do not make a new `Skapi` object per Activity: each one would hold its own copy of the session and its own timers.

## Calling from screens

Every server method is a `suspend` function that runs on `Dispatchers.IO` by itself, so call it from the screen's coroutine scope and update views right after. When the screen goes away, the scope is cancelled and so is the request.

In an Activity or Fragment, with `lifecycleScope`:

::: code-group

```kotlin [Kotlin]
class LoginActivity : AppCompatActivity() {
    private val skapi get() = (application as App).skapi

    private fun onLoginClicked(email: String, password: String) {
        lifecycleScope.launch {
            try {
                val user = skapi.login(email, password)
                openHome(user["user_id"]!!.jsonPrimitive.content)
            } catch (err: SkapiException) {
                when (err.code) {
                    "MFA_REQUIRED" -> askForAuthenticatorCode()
                    "INCORRECT_USERNAME_OR_PASSWORD" -> showError("Wrong e-mail or password.")
                    else -> showError(err.message)
                }
            }
        }
    }
}
```

```java [Java]
public class LoginActivity extends AppCompatActivity {
    private SkapiJava skapi() { return ((App) getApplication()).skapi; }

    private void onLoginClicked(String email, String password) {
        skapi().login(email, password)
               .whenComplete((user, err) -> runOnUiThread(() -> {
                   if (err == null) {
                       openHome((String) user.get("user_id"));
                   } else if (err instanceof SkapiException) {
                       SkapiException e = (SkapiException) err;
                       switch (e.getCode()) {
                           case "MFA_REQUIRED": askForAuthenticatorCode(); break;
                           case "INCORRECT_USERNAME_OR_PASSWORD": showError("Wrong e-mail or password."); break;
                           default: showError(e.getMessage());
                       }
                   }
               }));
    }
}
```

:::

In a ViewModel, with `viewModelScope`:

::: code-group

```kotlin [Kotlin]
class PostsViewModel(app: Application) : AndroidViewModel(app) {
    private val skapi = (app as App).skapi
    val posts = MutableStateFlow<List<JsonObject>>(emptyList())

    fun load() {
        viewModelScope.launch {
            try {
                val page = skapi.getRecords(jsonOf("table" to jsonOf("name" to "posts", "access_group" to "public")))
                posts.value = page["list"]!!.jsonArray.map { it.jsonObject }
            } catch (err: SkapiException) {
                // show err.message
            }
        }
    }
}
```

```java [Java]
public class PostsViewModel extends AndroidViewModel {
    private final SkapiJava skapi;
    public final MutableLiveData<List<Object>> posts = new MutableLiveData<>(new ArrayList<>());

    public PostsViewModel(Application app) {
        super(app);
        skapi = ((App) app).skapi;
    }

    public void load() {
        skapi.getRecords(SkapiJson.obj("table", SkapiJson.obj("name", "posts", "access_group", "public")))
             .whenComplete((page, err) -> {
                 if (err == null) {
                     posts.postValue((List<Object>) page.get("list"));  // postValue works from any thread
                 } else {
                     // show err.getMessage()
                 }
             });
    }
}
```

:::

## Restoring the sign-in at start

The saved session is read on the first call that needs it. `skapi.user` alone does not read it, so on your first screen call [`getProfile()`](/api-reference/authentication#getprofile):

::: code-group

```kotlin [Kotlin]
lifecycleScope.launch {
    val user = skapi.getProfile()  // null when nobody is signed in
    if (user == null) openLogin() else openHome()
}
```

```java [Java]
skapi.getProfile().thenAccept(user -> runOnUiThread(() -> {
    if (user == null) openLogin(); else openHome();  // null when nobody is signed in
}));
```

:::

When the saved tokens have expired, `getProfile()` refreshes them first. Without network, the user stays signed in with the saved tokens and signed-in calls throw `NETWORK_ERROR` until the network is back.

## SharedPreferencesStorage

::: code-group

```kotlin [Kotlin]
SharedPreferencesStorage(context: Context, name: String = "skapi-session", encrypt: Boolean = true)
```

```java [Java]
new SharedPreferencesStorage(Context context)
new SharedPreferencesStorage(Context context, String name)
new SharedPreferencesStorage(Context context, String name, boolean encrypt)
```

:::

Keeps the session (the user's tokens) in the app's private SharedPreferences file `name`, so the user stays signed in when the app starts again.

- With `encrypt = true` (the default), each value is sealed with AES-256-GCM under a key kept in the Android Keystore. The key can be used by your app on this device but never read or copied out, so the tokens cannot be read from a copy of the app's files.
- A value that can no longer be opened reads as missing, which signs the user out instead of failing. This happens when the app's data is restored to another device (Android Auto Backup copies preferences, but not Keystore keys), or after the Keystore key was removed.
- `encrypt = false` stores the values as plain text in the private preferences file.

Use one `name` per `Skapi` object if your app keeps more than one.

## Remember this device for record encryption

With [record encryption](/database/encryption) on, the user's keys are opened with their password at login. A session restored at the next app start has no password, so its encrypted data stays locked until [`unlockEncryption(password)`](/api-reference/encryption#unlockencryption). skapi-js avoids asking again by keeping the key in the browser's IndexedDB. `AndroidKeystoreDeviceKeyStore` does the same on Android:

::: code-group

```kotlin [Kotlin]
import com.skapi.EncryptionOptions
import com.skapi.Skapi
import com.skapi.android.AndroidKeystoreDeviceKeyStore
import com.skapi.android.SharedPreferencesStorage

skapi = Skapi(
    "<Project ID>",
    storage = SharedPreferencesStorage(this),
    encryption = EncryptionOptions(deviceKeyStore = AndroidKeystoreDeviceKeyStore(this)),
)
```

```java [Java]
import com.skapi.android.AndroidKeystoreDeviceKeyStore;
import com.skapi.android.SharedPreferencesStorage;
import com.skapi.java.EncryptionOptionsBuilder;
import com.skapi.java.SkapiJava;

skapi = new SkapiJava(
    "<Project ID>",
    new SharedPreferencesStorage(this),
    120,
    null,
    new EncryptionOptionsBuilder().deviceKeyStore(new AndroidKeystoreDeviceKeyStore(this)).build()
);
```

:::

::: code-group

```kotlin [Kotlin]
AndroidKeystoreDeviceKeyStore(context: Context, name: String = "skapi-enc")
```

```java [Java]
new AndroidKeystoreDeviceKeyStore(Context context)
new AndroidKeystoreDeviceKeyStore(Context context, String name)
```

:::

- After a password login, the user's encryption master key is sealed with its own key in the Android Keystore and saved in the private preferences file `name`. A session restored later opens the user's encrypted data from it, without the password.
- [`logout()`](/api-reference/authentication#logout) removes the user's entry, and so does [`lockEncryption(forgetDevice = true)`](/api-reference/encryption#lockencryption). `lockEncryption()` alone only forgets the keys in memory.
- `EncryptionOptions(persistDevice = false)` turns the remembering off while keeping the store set.
- skapi-kotlin on its own has no device key store on purpose: a plain file would put the key on disk in the clear. On other platforms you can write your own `DeviceKeyStore` (`save`, `load`, `delete`) over a secure store you trust.

## Coming back to the foreground

A phone pauses apps in the background. Two things can go stale while it does:

- A [temporary account](/authentication/anonymous) is kept alive every 10 minutes and deleted by the server 30 minutes after the last keep-alive. A long pause can miss that window.
- The [realtime connection](/realtime/connecting) can drop without the app noticing.

skapi-js handles this when the browser tab becomes visible again and when the browser goes back online. `SkapiLifecycle.watch(application, skapi)` does the same for an app:

- **Back to the foreground** (the first Activity starts after all were stopped): it calls `skapi.onForeground()`.
- **Network back** (the default network becomes available again): it calls `skapi.onNetworkAvailable()`.

Both do the same checks, in the background, and return at once:

- A temporary account is checked with the server right away (unless the server confirmed it in the last minute). If it was deleted meanwhile, the object is signed out, so the app sees `skapi.user` become `null` instead of failing on the next call.
- An open realtime connection is pinged at once. One that already closed is reopened now instead of at the end of its reconnect wait.

Call `watch()` once, from `Application.onCreate()`. It returns the `SkapiLifecycle`; `stop()` stops watching. Without the `ACCESS_NETWORK_STATE` permission only the foreground check runs.

Without skapi-android (for example in a desktop app), call `skapi.onForeground()` and `skapi.onNetworkAvailable()` yourself from your own lifecycle and network events.

## Realtime and streaming callbacks

The [realtime](/realtime/connecting) callback and a [forwarded request](/api-bridge/forward-request)'s `onStream` run on a background thread. Hand the event to the main thread before touching views, for example through a `MutableStateFlow`, which can be set from any thread:

::: code-group

```kotlin [Kotlin]
val messages = MutableStateFlow<List<JsonObject>>(emptyList())

viewModelScope.launch {
    skapi.connectRealtime { event ->
        messages.update { it + event }  // collected on the main thread by the UI
    }
}
```

```java [Java]
MutableLiveData<List<Map<String, Object>>> messages = new MutableLiveData<>(new ArrayList<>());
Handler main = new Handler(Looper.getMainLooper());

skapi.connectRealtime(event -> main.post(() -> {
    List<Map<String, Object>> next = new ArrayList<>(messages.getValue());
    next.add(event);
    messages.setValue(next);  // observed on the main thread by the UI
}));
```

:::

## R8 and ProGuard

skapi-kotlin uses no reflection, so release builds with R8 need no keep rules for it. OkHttp and kotlinx.serialization ship their own rules, and Gradle applies them for you.
