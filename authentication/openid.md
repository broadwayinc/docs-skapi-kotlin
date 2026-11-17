# OpenID Login

Users can sign in with an account they already have at an OpenID provider, such as Google, instead of a password for your project.

## How it works

1. The project owner registers an **OpenID logger** in the project settings on skapi.com. It tells Skapi which URL returns the user's profile for a token, and which profile attribute is the user's unique username. Each logger has an ID, for example `google`.
2. Your app gets an access token from the provider, the way the provider documents it (on Android, for example, with the provider's own sign-in library).
3. [`openIdLogin()`](/api-reference/authentication#openidlogin) sends the token and the logger ID. Skapi asks the provider for the profile, then signs the user in, creating the account on first use.

```kotlin
import com.skapi.Skapi
import com.skapi.SkapiException
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

val skapi = Skapi("<Project ID>")

val res = skapi.openIdLogin(accessToken, "google")
println(res["userProfile"]!!.jsonObject["user_id"]!!.jsonPrimitive.content)
println(res["openid"])  // the profile attributes the provider returned
```

It returns a `JsonObject` with `userProfile` (the user's [profile](/authentication/profile#profile-fields)) and `openid` (the attributes from the provider).

If the account has [two-step login](/authentication/mfa) on, `openIdLogin()` throws `MFA_REQUIRED` and [`verifyMfa()`](/api-reference/authentication#verifymfa) finishes the login.

To send one of your project's uploaded templates as the welcome e-mail for a new account, pass `template = jsonOf("welcome" to "<message_id>")`.

## Merging with an existing account

If the user already signed up with a password using the same login ID, `openIdLogin()` throws `ACCOUNT_EXISTS`. The user can merge the OpenID login into that account with `merge`:

- `merge = JsonPrimitive(true)` merges the accounts and copies no attributes.
- `merge = jsonArrayOf("name")` merges and also copies the listed OpenID attributes into the profile.

```kotlin
import com.skapi.jsonArrayOf
import kotlinx.serialization.json.JsonPrimitive

val res = try {
    skapi.openIdLogin(accessToken, "google")
} catch (err: SkapiException) {
    if (err.code != "ACCOUNT_EXISTS") throw err
    if (!askUser("An account already exists. Merge?")) return
    skapi.openIdLogin(accessToken, "google", merge = JsonPrimitive(true))
}
```

::: danger
After a merge, the user can no longer log in with a password. This cannot be undone.
:::

An existing account that has not confirmed its signup yet cannot be merged: `openIdLogin()` throws `INVALID_REQUEST` (`The account needs to be confirmed.`).
