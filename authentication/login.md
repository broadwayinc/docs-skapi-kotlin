# Login / Logout

## Login

[`login()`](/api-reference/authentication#login) signs a user in with their e-mail and password and returns their [profile](/authentication/profile#profile-fields) as a `JsonObject`.

```kotlin
import com.skapi.Skapi
import com.skapi.SkapiException
import kotlinx.serialization.json.jsonPrimitive

val skapi = Skapi("<Project ID>")

val user = skapi.login("user@example.com", "password")
println(user["email"]?.jsonPrimitive?.content)
```

The password is never sent. Sign-in proves it with a secure exchange, so only the proof travels over the network.

The e-mail is matched without regard to letter case. An account created with a `username` logs in with it: `login(username = "ana", password = "password")`. A first argument that is not an e-mail address is also read as a username.

### Handling login errors

```kotlin
val user = try {
    skapi.login("user@example.com", "password")
} catch (err: SkapiException) {
    when (err.code) {
        "INCORRECT_USERNAME_OR_PASSWORD" -> { showError("Wrong e-mail or password."); null }
        "SIGNUP_CONFIRMATION_NEEDED" -> { skapi.resendSignupConfirmation(); null }  // see Signing Up Users
        "USER_IS_DISABLED" -> { skapi.recoverAccount(); null }                       // see User Profile
        "MFA_REQUIRED" -> skapi.verifyMfa(askForCode())                               // see Two-Step Login
        else -> throw err
    }
}
```

- `SIGNUP_CONFIRMATION_NEEDED`: the user has not opened the [confirmation link](/authentication/signup#signup-confirmation) yet.
- `USER_IS_DISABLED`: the user disabled their account. See [recovering it](/authentication/profile#recovering-a-disabled-account).
- `MFA_REQUIRED`: the password was right and the account has [two-step login](/authentication/mfa) on.
- `REQUEST_EXCEED`: too many attempts. Wait and try again.

## The signed-in user

`skapi.user` is the signed-in user's profile as a `JsonObject`, or `null` when nobody is signed in. It is a copy: changing it changes nothing on the server.

```kotlin
if (skapi.getProfile() == null) {
    skapi.login("user@example.com", "password")
}
println(skapi.user!!["user_id"]!!.jsonPrimitive.content)
```

`skapi.user` does not read a session saved in [`storage`](#staying-signed-in-between-runs). [`getProfile()`](/api-reference/authentication#getprofile) does: the first call restores a saved sign-in, then returns the same thing as `skapi.user`. Call it once when your program or app starts.

`getProfile(refreshToken = true)` asks the server for fresh tokens first, so the profile shows changes made elsewhere, for example on another device or by an admin. It returns `null` if the refresh fails. When the saved tokens had already expired and were just refreshed while the session was restored, that refresh is used: the server is asked once, not twice.

skapi-kotlin refreshes the tokens on its own before a request when they have less than an hour left. One refresh runs at a time: other coroutines using the same object (and its realtime and keep-alive timers) wait for it and use the new tokens. If the network is down, the session stays and the request throws `NETWORK_ERROR`. The session ends only on logout, or when the server refuses the refresh (for example after a global logout).

## Staying signed in between runs

By default the session lives only as long as the `Skapi` object. Pass a `storage` to keep it between runs:

```kotlin
import com.skapi.FileStorage

val skapi = Skapi("<Project ID>", storage = FileStorage("~/.myapp/session.json"))

if (skapi.getProfile() == null) {  // signed in from the file when it holds a session
    skapi.login("user@example.com", "password")
}
```

On Android, use `SharedPreferencesStorage(context)` from skapi-android instead. See [Android](/introduction/android#sharedpreferencesstorage).

The file holds the user's tokens and is created readable by you only. Keep it out of version control. If the saved tokens have expired and the network is down when they are read, the object stays signed in with them: signed-in calls throw `NETWORK_ERROR`, and the first one after the network is back refreshes the tokens. `storage` can also be any `SkapiStorage` of your own, for example to keep sessions in your own database. See [Keeping users signed in](/introduction/getting-started#keeping-users-signed-in-between-runs). Logging out removes the tokens from storage.

## Logout

```kotlin
println(skapi.logout())  // SUCCESS: The user has been logged out.
```

`logout(globalLogout = true)` also ends every session of the account on every device.

A logout wins over a token refresh another coroutine is still running: the refresh does not sign the user back in, its tokens are removed from storage, and the call that waited for it throws `User login is required.`

On an [anonymous](/authentication/anonymous) session, `logout()` deletes the temporary account.

## Signing in with tokens

[`loginWithToken()`](/api-reference/authentication#loginwithtoken) takes over a session that started somewhere else, for example a web page using skapi-js that hands the user's tokens to your app or your Kotlin server.

```kotlin
val user = skapi.loginWithToken(idToken, accessToken, refreshToken)
```

All three tokens are required. The ID token must belong to this project and must not be expired. The object is then signed in as that user, and the tokens are saved to `storage`. `skapi.session` holds the current tokens (`idToken`, `accessToken`, `refreshToken`) if you need to pass them on.

::: warning
skapi-kotlin reads the profile from the ID token without checking its signature. The server checks the tokens on every request. Before trusting `skapi.user` in your own server code, make a signed-in call, for example `getProfile(refreshToken = true)`, which returns `null` for tokens the server refuses.
:::
