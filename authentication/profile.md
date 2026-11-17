# User Profile

The signed-in user's profile is a `JsonObject`, available as `skapi.user` and from [`getProfile()`](/authentication/login#the-signed-in-user).

## Updating the profile

[`updateProfile()`](/api-reference/authentication#updateprofile) changes the signed-in user's own profile and returns the updated profile.

```kotlin
import com.skapi.Skapi
import com.skapi.SkapiException
import com.skapi.jsonOf
import kotlinx.serialization.json.jsonPrimitive

val skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

val user = skapi.updateProfile(jsonOf("name" to "Ana", "nickname" to "ana"))
println(user!!["name"]!!.jsonPrimitive.content)  // Ana
```

Pass only the fields you want to change. An empty string `""` clears a field:

```kotlin
skapi.updateProfile(jsonOf("nickname" to ""))
```

`email` cannot be cleared. A changed e-mail becomes unverified until the user [verifies](/authentication/email-verification) it.

Keys that are not profile fields are ignored. Anonymous accounts cannot edit their profile.

## Profile fields

Fields the user can set, at [signup](/authentication/signup) or with `updateProfile()`:

| field | value |
|---|---|
| `email` | the user's e-mail |
| `name`, `nickname`, `given_name`, `middle_name`, `family_name` | text |
| `gender` | text, for example `"female"` or `"male"` |
| `birthdate` | `"yyyy-mm-dd"` |
| `phone_number` | `"+"` and digits, for example `"+821012345678"` |
| `address` | text, or an object such as `jsonOf("formatted" to ..., "locality" to ..., "region" to ..., "postal_code" to ..., "country" to ...)` |
| `picture`, `profile`, `website` | a full URL |
| `misc` | any text for your own use; only the user and admins can read it |

Fields set by Skapi, which the user cannot change:

| field | value |
|---|---|
| `user_id` | the user's ID |
| `service`, `owner` | the project and its owner |
| `access_group` | the account's access level, a number |
| `approved` | `"{approver}:{approved or suspended}:{timestamp}"` |
| `locale` | country code where the user signed up |
| `log` | last login time, in seconds |
| `email_verified` | `true` when the e-mail is verified |
| `anonymous` | `true` on [anonymous accounts](/authentication/anonymous), absent otherwise |

## Public fields

`email`, `phone_number`, `address`, `gender` and `birthdate` are private by default. Set the matching `*_public` flag to `true` to let other users see that field when they [search users](/users/search).

```kotlin
skapi.updateProfile(jsonOf("gender" to "female", "gender_public" to true))
```

The flags are `email_public`, `phone_number_public`, `address_public`, `gender_public` and `birthdate_public`, and must be `true` or `false`. A flag appears in the profile only when its field is set. `"email_public" to true` needs a verified e-mail, or it throws `INVALID_REQUEST`.

## Disabling an account

A user who leaves your project can disable their own account with [`disableAccount()`](/api-reference/authentication#disableaccount). They are logged out at once, and all data of the account is deleted after 90 days.

```kotlin
println(skapi.disableAccount())  // "SUCCESS: account has been disabled."
```

## Recovering a disabled account

Within those 90 days, logging in to a disabled account throws `USER_IS_DISABLED`. Call [`recoverAccount()`](/api-reference/authentication#recoveraccount) on the same `Skapi` object to send the user an e-mail with a recovery link. Opening the link reactivates the account.

```kotlin
try {
    skapi.login("user@example.com", "password")
} catch (err: SkapiException) {
    if (err.code == "USER_IS_DISABLED") {
        println(skapi.recoverAccount())  // SUCCESS: Recovery e-mail has been sent.
    } else {
        throw err
    }
}
```

Pass a full URL, `recoverAccount("https://your.site/welcome-back")`, to have the link lead there after the recovery. The account can only be recovered when its e-mail is verified and the user knows their password.
