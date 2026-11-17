# E-Mail Verification

A verified e-mail lets the user:

- reset a [forgotten password](/authentication/password#forgot-password),
- [recover](/authentication/profile#recovering-a-disabled-account) a disabled account,
- make their e-mail [public](/authentication/profile#public-fields),
- log in with the e-mail, when the account was created with a `username`.

An e-mail confirmed through [signup confirmation](/authentication/signup#signup-confirmation) is already verified.

## Verifying the e-mail

[`verifyEmail()`](/api-reference/authentication#verifyemail) works in two calls. The user must be signed in.

1. Without arguments, it e-mails a verification code to the user.
2. With the code, it verifies the e-mail.

```kotlin
import com.skapi.Skapi
import kotlinx.serialization.json.jsonPrimitive

val skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

println(skapi.verifyEmail())      // SUCCESS: Verification code has been sent.
val code = askForCode()           // your screen: "Code from the e-mail"
println(skapi.verifyEmail(code))  // SUCCESS: "email" is verified.
println(skapi.user!!["email_verified"]!!.jsonPrimitive.content)  // true
```

When the e-mail is already verified, `verifyEmail()` returns `SUCCESS: "email" is verified.` and sends nothing.

To use one of your project's uploaded templates for the code e-mail, pass its message ID: `verifyEmail(template = jsonOf("verification" to "<message_id>"))`.

Changing the e-mail with [`updateProfile()`](/authentication/profile) makes it unverified again.

## Going back to the last verified e-mail

When a user changed their e-mail and has not verified the new one, [`lastVerifiedEmail()`](/api-reference/authentication#lastverifiedemail) returns their previous verified address. `lastVerifiedEmail(revert = true)` switches the account back to that address, verified, and returns the updated profile.

```kotlin
println(skapi.lastVerifiedEmail().jsonPrimitive.content)  // old@example.com
val user = skapi.lastVerifiedEmail(revert = true).jsonObject
println(user["email"]!!.jsonPrimitive.content)            // old@example.com
```

When the current e-mail is verified, it returns the current e-mail. When there is no earlier verified address, it throws `NOT_EXISTS`.
