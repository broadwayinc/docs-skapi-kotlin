# Authentication

Every method throws [`SkapiException`](/introduction/errors) with `code` and `message`. Methods that need a signed-in user throw `INVALID_REQUEST` (`User login is required.`) without one, and any method can throw `NETWORK_ERROR` when no answer comes back. All of them are `suspend` functions of `Skapi`.

Values that fail a check throw `INVALID_PARAMETER` before anything is sent. The common messages:

| field | message |
|---|---|
| `email` | `"email" is required.` / `"email" should be at least 5 characters.` / `"<value>" is an invalid email.` |
| `password` | `"password" is required.` / `"password" should be at least 6 characters.` / `"password" can be up to 60 characters max.` |
| `phone_number` | `"phone_number" is invalid. The format should be "+00123456789". Type: string.` |
| `birthdate` | `"birthdate" is invalid. The format should be "yyyy-mm-dd". Type: string.` |
| `picture`, `profile`, `website`, redirect URLs | `"<value>" is an invalid url.` (a full URL with scheme and host is required) |
| text fields | `<value> is invalid in "<field>". allowed type or value is: Type<string>.` |

## signup

::: code-group

```kotlin [Kotlin]
suspend fun signup(params: JsonObject, option: JsonObject? = null): JsonElement
```

```java [Java]
CompletableFuture<Object> signup(Map<String, ?> params, Map<String, ?> option)  // option can be left out
```

:::

Creates an account. Logs out the user signed in on this object first.

`params`:

| key | type | |
|---|---|---|
| `email` | string | required |
| `password` | string | required, 6 to 60 characters |
| `username` | string | optional permanent login ID; the e-mail logs in too once verified |
| `name`, `nickname`, `given_name`, `middle_name`, `family_name`, `gender`, `misc` | string | |
| `birthdate` | string | `"yyyy-mm-dd"` |
| `phone_number` | string | `"+"` and digits |
| `address` | string or object | |
| `picture`, `profile`, `website` | string | full URL |
| `email_public`, `phone_number_public`, `address_public`, `gender_public`, `birthdate_public` | boolean | default `false` |

`option`:

| key | type | |
|---|---|---|
| `signup_confirmation` | boolean or string | `true` sends a confirmation link the user must open before logging in. A full URL also does, and the link leads there after confirming. Default `false`. |
| `login` | boolean | log in right after signup and return the profile. Not with `signup_confirmation`. |
| `email_subscription` | boolean, `0`, `1` or a group name | subscribes the user to a newsletter once they confirm. Needs `signup_confirmation`. |
| `template` | object | `{"signup_confirmation": "<message_id>", "welcome": "<message_id>"}`: uploaded templates for this call |

Returns a string (a `JsonPrimitive`): `"SUCCESS: The account has been created."`, or `"SUCCESS: The account has been created. User's signup confirmation is required."` with `signup_confirmation`. With `login`, returns the [profile](/authentication/profile#profile-fields) as a `JsonObject`.

### Errors

| code | message |
|---|---|
| `EXISTS` | `The account already exists.` |
| `INVALID_PARAMETER` | `Key "email" is required.` / `Key "password" is required.` |
| `INVALID_PARAMETER` | `"address" should be type: <string \| dict>.` |
| `INVALID_PARAMETER` | `Invalid password. Password must be at least 6 characters.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" should be type: <string \| boolean>.` / `"email" is required for signup confirmation.` |
| `INVALID_PARAMETER` | `"login" is not allowed when "option.signup_confirmation" is true.` / `"option.login" should be type: boolean.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" should be true if "email_public" is set to true.` |
| `INVALID_PARAMETER` | `"option.email_subscription" takes 0 (public), 1 (authorized), true, false or the name of a newsletter group.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" is required for email subscription.` |
| `INVALID_PARAMETER` | `"option.signup_confirmation" is required when "option.template.signup_confirmation" is set.` |
| `INVALID_PARAMETER` | `"option.template" should be type: <object>.` / `"option.template.<key>" should be a non-empty <string> (template message_id).` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `CODE_DELIVERY_FAILURE` | `Failed to deliver verification code.` |
| `INVALID_REQUEST` | `Signup validation failed.` or the server's reason |

## resendSignupConfirmation

::: code-group

```kotlin [Kotlin]
suspend fun resendSignupConfirmation(): JsonElement
```

```java [Java]
CompletableFuture<Object> resendSignupConfirmation()
```

:::

Sends the signup confirmation e-mail again. Works after `login()` threw `SIGNUP_CONFIRMATION_NEEDED`, or after `signup()` with `signup_confirmation`, on the same object. Returns `"SUCCESS: Signup confirmation e-mail has been sent."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Least one login attempt is required.` |

## login

::: code-group

```kotlin [Kotlin]
suspend fun login(email: String? = null, password: String, username: String? = null): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> login(String email, String password, String username)  // username can be left out; email can be null
```

:::

Signs in and returns the [profile](/authentication/profile#profile-fields). The e-mail is matched without regard to case. An `email` that is not an e-mail address is read as a username; `login(username = "ana", password = "...")` names it outright. The password is never sent: sign-in proves it with a secure exchange. The session is saved to `storage`.

### Errors

| code | message |
|---|---|
| `INCORRECT_USERNAME_OR_PASSWORD` | `Incorrect username or password.` |
| `SIGNUP_CONFIRMATION_NEEDED` | `User's signup confirmation is required.` |
| `USER_IS_DISABLED` | `This account is disabled.` |
| `MFA_REQUIRED` | `A code from the authenticator app is required to sign in. Call verifyMfa() with the code.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `INVALID_PARAMETER` | `At least one of "username" or "email" is required.` |
| `INVALID_REQUEST` | `Sign-in codes by SMS are not supported.` / `The account must set up an authenticator app before signing in.` |

## verifyMfa

::: code-group

```kotlin [Kotlin]
suspend fun verifyMfa(code: String): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> verifyMfa(String code)
```

:::

Finishes a `login()` or `openIdLogin()` that threw `MFA_REQUIRED`, with the 6 digit code from the authenticator app (spaces are ignored). Call it on the same object within 3 minutes. Returns the profile. See [Two-Step Login](/authentication/mfa).

| code | message |
|---|---|
| `INVALID_CODE` | `Incorrect authenticator code.` / `This authenticator code was already used. Wait for the next code.` (retry with the next code) |
| `INVALID_REQUEST` | `No sign-in is waiting for an authenticator code. Call login() first.` |
| `INVALID_REQUEST` | `The sign-in has expired. Call login() again.` |
| `INVALID_PARAMETER` | `"code" should be the 6 digit code from the authenticator app.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |

## logout

::: code-group

```kotlin [Kotlin]
suspend fun logout(globalLogout: Boolean = false): String
```

```java [Java]
CompletableFuture<String> logout(boolean globalLogout)  // globalLogout can be left out (false)
```

:::

Signs out and removes the session from `storage` (and the user's entry from a [device key store](/introduction/android#remember-this-device-for-record-encryption)). `globalLogout = true` also ends every session of the account on every device. On an anonymous account it deletes the account. Returns `"SUCCESS: The user has been logged out."`

## getProfile

::: code-group

```kotlin [Kotlin]
suspend fun getProfile(refreshToken: Boolean = false): JsonObject?
```

```java [Java]
CompletableFuture<Map<String, Object>> getProfile(boolean refreshToken)  // refreshToken can be left out (false)
```

:::

The signed-in user's profile, or `null`. The first call restores a sign-in saved in `storage`. `refreshToken = true` gets fresh tokens from the server first and returns `null` if that fails.

## user

::: code-group

```kotlin [Kotlin]
val user: JsonObject?
```

```java [Java]
Map<String, Object> getUser()
```

:::

The signed-in user's profile as this object last saw it (a copy), or `null`. It does not read `storage`: after the app starts, call [getProfile](#getprofile) once to restore a saved sign-in. `skapi.session` holds the tokens: `idToken`, `accessToken`, `refreshToken`.

## loginWithToken

::: code-group

```kotlin [Kotlin]
suspend fun loginWithToken(idToken: String, accessToken: String, refreshToken: String): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> loginWithToken(String idToken, String accessToken, String refreshToken)
```

:::

Takes over the tokens of a sign-in made elsewhere (for example skapi-js on a web page) and returns the profile read from the ID token. All three tokens are required; the object is then signed in as that user and the tokens are saved to `storage`. The token's signature is not checked locally; the server checks it on each request.

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"id_token" is required.` / `"access_token" is required.` / `"refresh_token" is required.` |
| `INVALID_REQUEST` | `Token does not belong to this service.` / `Token has expired.` |

## updateProfile

::: code-group

```kotlin [Kotlin]
suspend fun updateProfile(params: JsonObject): JsonObject?
```

```java [Java]
CompletableFuture<Map<String, Object>> updateProfile(Map<String, ?> params)
```

:::

Changes the signed-in user's own profile and returns the updated profile. Takes the same profile keys as [signup](#signup) except `password` and `username`. `""` clears a field (not `email`). The `*_public` flags must be booleans. Other keys are ignored; with nothing to change, it returns the profile without a request. A changed `email` becomes unverified.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous accounts cannot edit their profile.` |
| `INVALID_REQUEST` | `User's e-mail should be verified to set "email_public" to true.` |
| `INVALID_PARAMETER` | `<value> is invalid in "<flag>". allowed type or value is: Type<boolean>.` |
| the server's code | the server's message, when it refuses the change |

## changePassword

::: code-group

```kotlin [Kotlin]
suspend fun changePassword(currentPassword: String, newPassword: String): String
```

```java [Java]
CompletableFuture<String> changePassword(String currentPassword, String newPassword)
```

:::

Returns `"SUCCESS: Password has been changed."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Incorrect password.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot change their password.` |
| `INVALID_PARAMETER` | `"current_password" is required to change password.` / `"new_password" is required to change password.` |
| `INVALID_PARAMETER` | `"new_password" should be at least 6 characters.` / `"new_password" can be up to 60 characters max.` (the same for `current_password`) |
| `INVALID_PARAMETER` | `Invalid password parameter.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |
| `ENCRYPTION_LOCKED` | with [encryption](/database/encryption) on and locked: `Encryption must be unlocked before changing the password, ...` Call `unlockEncryption(password)` first. |

## forgotPassword

::: code-group

```kotlin [Kotlin]
suspend fun forgotPassword(email: String, template: JsonObject? = null): String
```

```java [Java]
CompletableFuture<String> forgotPassword(String email, Map<String, ?> template)  // template can be left out
```

:::

E-mails a password reset code. `template = jsonOf("forgot_password" to "<message_id>")` uses an uploaded template for this call. Returns `"SUCCESS: Verification code has been sent."`

| code | message |
|---|---|
| `NOT_EXISTS` | the server's message |
| `INVALID_REQUEST` | the server's message, for example `User password cannot be reset in the current state.` |
| `REQUEST_EXCEED` | the server's message, for example `Attempt limit exceeded, please try after some time.` |
| `CODE_DELIVERY_FAILURE` | the server's message |
| `INVALID_PARAMETER` | `"template.forgot_password" should be a non-empty <string> (template message_id).` |
| `INVALID_PARAMETER` | `"template.verification" is not an option of forgotPassword(). Use "template.forgot_password" (template message_id).` |

## resetPassword

::: code-group

```kotlin [Kotlin]
suspend fun resetPassword(email: String, code: String, newPassword: String): String
```

```java [Java]
CompletableFuture<String> resetPassword(String email, String code, String newPassword)
```

:::

Sets a new password with the code from `forgotPassword()`. Returns `"SUCCESS: New password has been set."` A wrong or expired code throws the server's code and message, for example `CodeMismatchException`. The e-mail and the new password are checked like at [signup](#signup).

## verifyEmail

::: code-group

```kotlin [Kotlin]
suspend fun verifyEmail(code: String? = null, template: JsonObject? = null): String
```

```java [Java]
CompletableFuture<String> verifyEmail(String code, Map<String, ?> template)  // code and template can be left out
```

:::

Without `code`, e-mails a verification code and returns `"SUCCESS: Verification code has been sent."` With `code`, verifies the e-mail and returns `SUCCESS: "email" is verified.`, which is also returned at once when the e-mail is already verified. `template = jsonOf("verification" to "<message_id>")` uses an uploaded template for the code e-mail.

| code | message |
|---|---|
| `INVALID_REQUEST` | `The user has to be logged in.` / `No e-mail to verify` |
| `INVALID_REQUEST` | `Anonymous accounts cannot verify an e-mail.` |
| `INVALID_PARAMETER` | `"template.verification" should be a non-empty <string> (template message_id).` |
| `CodeMismatchException` | `Invalid verification code provided, please try again.` |
| `LimitExceededException` | `Attempt limit exceeded, please try after some time.` |

## lastVerifiedEmail

::: code-group

```kotlin [Kotlin]
suspend fun lastVerifiedEmail(revert: Boolean? = null): JsonElement
```

```java [Java]
CompletableFuture<Object> lastVerifiedEmail(Boolean revert)  // revert can be left out
```

:::

Returns the user's last verified e-mail as a string (the current one, if it is verified). `revert = true` switches the account back to that e-mail, verified, and returns the updated profile as a `JsonObject`.

| code | message |
|---|---|
| `NOT_EXISTS` | `User does not have a verified e-mail.` |
| `EXISTS` | `E-mail "<email>" is already a login ID in this project.` |
| `INVALID_REQUEST` | `Anonymous accounts cannot change their e-mail.` |

## disableAccount

::: code-group

```kotlin [Kotlin]
suspend fun disableAccount(): JsonElement
```

```java [Java]
CompletableFuture<Object> disableAccount()
```

:::

Disables the signed-in user's account and logs out. The account's data is deleted after 90 days unless it is recovered. Returns `"SUCCESS: account has been disabled."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous accounts cannot be disabled.` |

## recoverAccount

::: code-group

```kotlin [Kotlin]
suspend fun recoverAccount(redirect: String? = null): String
```

```java [Java]
CompletableFuture<String> recoverAccount(String redirect)  // redirect can be left out
```

:::

After `login()` threw `USER_IS_DISABLED` on this object, e-mails a recovery link to the account. A full URL in `redirect` is where the link leads after the recovery. Returns `"SUCCESS: Recovery e-mail has been sent."`

| code | message |
|---|---|
| `INVALID_REQUEST` | `Least one signin attempt of disabled account is required.` |
| `INVALID_PARAMETER` | `"<value>" is an invalid url.` |

## openIdLogin

::: code-group

```kotlin [Kotlin]
suspend fun openIdLogin(token: String, id: String, merge: JsonElement? = null, template: JsonObject? = null): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> openIdLogin(String token, String id, Object merge, Map<String, ?> template)  // merge (true, a name or a List of names) and template can be left out
```

:::

Signs in through the OpenID logger `id` with a token from the provider, creating the account on first use. `merge = JsonPrimitive(true)` merges into an existing account with the same login ID; a `JsonArray` of attribute names (or one name as a string) also copies those OpenID attributes. `template = jsonOf("welcome" to "<message_id>")` uses an uploaded template for the welcome e-mail.

Returns `{"userProfile": {...}, "openid": {...}}`. Can throw `MFA_REQUIRED`, `USER_IS_DISABLED` and `REQUEST_EXCEED` like [login](#login).

| code | message |
|---|---|
| `ACCOUNT_EXISTS` | `The account already exists.` (retry with `merge`) |
| `INVALID_REQUEST` | `The account needs to be confirmed.` |
| `EXISTS` | `The login ID of this OpenID account is already used by another account.` |
| `INVALID_PARAMETER` | `"merge" should be type: <boolean \| string[]>.` / `"merge" array items should be type: <string>.` |
| `INVALID_PARAMETER` | `"template.welcome" should be a non-empty <string> (template message_id).` |

## anonymousLogin

::: code-group

```kotlin [Kotlin]
suspend fun anonymousLogin(): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> anonymousLogin()
```

:::

Signs in with a temporary account (`"anonymous": true`, access group `1`) and returns its profile. Returns the current account when this object already holds an anonymous session. Sends a keep-alive every 10 minutes while the object lives; the account is deleted 30 minutes after the last one, or at once on `logout()`. See [Anonymous Login](/authentication/anonymous).

| code | message |
|---|---|
| `INVALID_REQUEST` | `Anonymous login is not enabled for this project.` |
| `INVALID_REQUEST` | `User limit exceeded.` |
| `INVALID_REQUEST` | `A user is already logged in. Log out first.` |

## verifyAnonymousSession

::: code-group

```kotlin [Kotlin]
suspend fun verifyAnonymousSession(): JsonObject?
```

```java [Java]
CompletableFuture<Map<String, Object>> verifyAnonymousSession()
```

:::

For a temporary account restored from `storage`: asks the server whether it still exists. Returns the profile, or `null` (after signing out) when the account was deleted. Any other signed-in user is returned as is, without a request; signed out returns `null`.

## setupMfa

::: code-group

```kotlin [Kotlin]
suspend fun setupMfa(issuer: String? = null, accountName: String? = null): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> setupMfa(String issuer, String accountName)  // issuer and accountName can be left out
```

:::

Starts two-step login setup. Returns `{"secret": "...", "uri": "..."}`: show `uri` (`otpauth://...`) as a QR code, or `secret` for typing in. `issuer` defaults to the project name, `accountName` to the user's e-mail. Follow with [enableMfa](#enablemfa).

## enableMfa

::: code-group

```kotlin [Kotlin]
suspend fun enableMfa(code: String): String
```

```java [Java]
CompletableFuture<String> enableMfa(String code)
```

:::

Checks a code from the app and turns two-step login on. Returns `"SUCCESS: MFA has been enabled."`

| code | message |
|---|---|
| `INVALID_CODE` | `Incorrect authenticator code.` (nothing changed) |
| `INVALID_REQUEST` | `Call setupMfa() first.` |
| `INVALID_PARAMETER` | `"code" should be the 6 digit code from the authenticator app.` |
| `REQUEST_EXCEED` | `Too many attempts. Please try again later.` |

## disableMfa

::: code-group

```kotlin [Kotlin]
suspend fun disableMfa(): String
```

```java [Java]
CompletableFuture<String> disableMfa()
```

:::

Turns two-step login off. Returns `"SUCCESS: MFA has been disabled."`

## getMfaStatus

::: code-group

```kotlin [Kotlin]
suspend fun getMfaStatus(): JsonObject
```

```java [Java]
CompletableFuture<Map<String, Object>> getMfaStatus()
```

:::

Returns `{"enabled": true}` or `{"enabled": false}`.

`setupMfa()`, `enableMfa()`, `disableMfa()` and `getMfaStatus()` need a signed-in user and throw `INVALID_REQUEST` with a message starting with `Anonymous accounts cannot` on an anonymous account.
