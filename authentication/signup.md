# Signing Up Users

[`signup()`](/api-reference/authentication#signup) creates an account in your project. `email` and `password` are required. The password must be 6 to 60 characters.

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import com.skapi.SkapiException
import com.skapi.jsonOf

val skapi = Skapi("<Project ID>")

val res = skapi.signup(jsonOf(
    "email" to "user@example.com",
    "password" to "password",
    "name" to "Ana",
))
println(res)  // "SUCCESS: The account has been created."
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;

SkapiJava skapi = new SkapiJava("<Project ID>");

Object res = skapi.signup(SkapiJson.obj(
    "email", "user@example.com",
    "password", "password",
    "name", "Ana"
)).get();
System.out.println(res);  // SUCCESS: The account has been created.
```

:::

You can pass any [profile field](/authentication/profile#profile-fields) in the same object. `signup()` first logs out the user signed in on this `Skapi` object, if any.

`signup()` returns a `JsonElement`: a string (a `JsonPrimitive`) with the message, or the profile with the `login` option below. Read the message with `res.jsonPrimitive.content`.

A user who never logs in within 7 days of signing up loses the signup and has to sign up again.

## Username

`username` is optional. When given, it becomes the account's permanent login ID and can never be changed. The e-mail logs the account in as well, but only once it is [verified](/authentication/email-verification). Without `username`, the e-mail is the login ID.

::: code-group

```kotlin [Kotlin]
skapi.signup(jsonOf("email" to "user@example.com", "password" to "password", "username" to "ana"))
skapi.login(username = "ana", password = "password")
```

```java [Java]
skapi.signup(SkapiJson.obj("email", "user@example.com", "password", "password", "username", "ana")).get();
skapi.login(null, "password", "ana").get();
```

:::

## Log in right after signup

Pass `jsonOf("login" to true)` as the second argument. `signup()` then returns the user's profile instead of a message.

::: code-group

```kotlin [Kotlin]
val user = skapi.signup(
    jsonOf("email" to "user@example.com", "password" to "password"),
    jsonOf("login" to true),
).jsonObject
println(user["user_id"]?.jsonPrimitive?.content)
```

```java [Java]
Map<String, Object> user = (Map<String, Object>) skapi.signup(
    SkapiJson.obj("email", "user@example.com", "password", "password"),
    SkapiJson.obj("login", true)
).get();
System.out.println(user.get("user_id"));
```

:::

`login` cannot be used together with `signup_confirmation`.

## Signup confirmation

With `signup_confirmation`, the user gets an e-mail with a confirmation link and cannot log in until they open it. This keeps fake accounts out. Once confirmed, the user's e-mail counts as verified.

::: code-group

```kotlin [Kotlin]
val res = skapi.signup(
    jsonOf("email" to "user@example.com", "password" to "password"),
    jsonOf("signup_confirmation" to true),
)
println(res)  // "SUCCESS: The account has been created. User's signup confirmation is required."
```

```java [Java]
Object res = skapi.signup(
    SkapiJson.obj("email", "user@example.com", "password", "password"),
    SkapiJson.obj("signup_confirmation", true)
).get();
System.out.println(res);  // SUCCESS: The account has been created. User's signup confirmation is required.
```

:::

Instead of `true` you can pass a full URL such as `"https://your.site/welcome"`. The confirmation link leads there once the signup is confirmed. A relative path throws `INVALID_PARAMETER`.

`"email_public" to true` at signup needs `signup_confirmation`. The `email_subscription` option subscribes the user to a newsletter once they confirm, and also needs `signup_confirmation`.

To use one of your project's uploaded e-mail templates for this call only, pass its message ID:

::: code-group

```kotlin [Kotlin]
jsonOf(
    "signup_confirmation" to true,
    "template" to jsonOf("signup_confirmation" to "<message_id>", "welcome" to "<message_id>"),
)
```

```java [Java]
SkapiJson.obj(
    "signup_confirmation", true,
    "template", SkapiJson.obj("signup_confirmation", "<message_id>", "welcome", "<message_id>")
)
```

:::

## Resending the confirmation e-mail

A user who has not confirmed yet gets `SIGNUP_CONFIRMATION_NEEDED` from [`login()`](/authentication/login). Call [`resendSignupConfirmation()`](/api-reference/authentication#resendsignupconfirmation) on the same `Skapi` object to send the link again.

::: code-group

```kotlin [Kotlin]
try {
    skapi.login("user@example.com", "password")
} catch (err: SkapiException) {
    if (err.code == "SIGNUP_CONFIRMATION_NEEDED") {
        println(skapi.resendSignupConfirmation())
    } else {
        throw err
    }
}
```

```java [Java]
import com.skapi.SkapiException;
import java.util.concurrent.ExecutionException;

try {
    skapi.login("user@example.com", "password").get();
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    if ("SIGNUP_CONFIRMATION_NEEDED".equals(err.getCode())) {
        System.out.println(skapi.resendSignupConfirmation().get());
    } else {
        throw err;
    }
}
```

:::

It also works right after a `signup()` with `signup_confirmation` on the same object. Without either, it throws `INVALID_REQUEST` (`Least one login attempt is required.`).

## Errors

| code | when |
|---|---|
| `EXISTS` | `The account already exists.` |
| `INVALID_PARAMETER` | a missing or invalid field or option; the message names it |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `CODE_DELIVERY_FAILURE` | `Failed to deliver verification code.` |

See [signup](/api-reference/authentication#signup) in the API reference for every option and error.
