# Two-Step Login (MFA)

Users can protect their account with an authenticator app. Once it is on, logging in takes the password and then a 6 digit code from the app. Someone who learns the password still cannot log in without the phone.

Each user turns it on for their own account. Any app that shows 6 digit codes changing every 30 seconds works. Codes are never sent by SMS.

`setupMfa()`, `enableMfa()`, `getMfaStatus()` and `disableMfa()` need a signed-in user (`INVALID_REQUEST`: `User login is required.`) and refuse [anonymous accounts](/authentication/anonymous).

## Turning it on

### Step 1: show the key

[`setupMfa()`](/api-reference/authentication#setupmfa) returns a `JsonObject` with:

- `uri`: an `otpauth://` link. Show it as a QR code (any QR code library can draw one, such as ZXing on Android) for the user to scan.
- `secret`: the same key as text, for users who type it into the app.

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import com.skapi.SkapiException
import kotlinx.serialization.json.jsonPrimitive

val skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

val mfa = skapi.setupMfa()
println(mfa["secret"]!!.jsonPrimitive.content)  // type this into the authenticator app
val uri = mfa["uri"]!!.jsonPrimitive.content     // show this as a QR code
```

```java [Java]
import com.skapi.java.SkapiJava;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");
skapi.login("user@example.com", "password").get();

Map<String, Object> mfa = skapi.setupMfa().get();
System.out.println(mfa.get("secret"));  // type this into the authenticator app
String uri = (String) mfa.get("uri");    // show this as a QR code
```

:::

The app lists the account under your project name and the user's e-mail. Pass `issuer` and `accountName` to show other names: `skapi.setupMfa(issuer = "My App", accountName = "ana")`.

On a phone, the user can also tap a link instead of scanning: opening `uri` with an `ACTION_VIEW` intent hands it to an installed authenticator app.

### Step 2: confirm a code

The user enters the code the app now shows. [`enableMfa()`](/api-reference/authentication#enablemfa) checks it and turns two-step login on.

::: code-group

```kotlin [Kotlin]
println(skapi.enableMfa("123456"))  // SUCCESS: MFA has been enabled.
```

```java [Java]
System.out.println(skapi.enableMfa("123456").get());  // SUCCESS: MFA has been enabled.
```

:::

A wrong code throws `INVALID_CODE` and changes nothing, so the user can try the next code. Calling `enableMfa()` before `setupMfa()` throws `INVALID_REQUEST` (`Call setupMfa() first.`).

## Logging in with a code

When two-step login is on, [`login()`](/api-reference/authentication#login) checks the password and throws `MFA_REQUIRED`. The user is not signed in yet. Pass the code to [`verifyMfa()`](/api-reference/authentication#verifymfa), which finishes the login and returns the profile like `login()` does.

::: code-group

```kotlin [Kotlin]
suspend fun logIn(email: String, password: String): JsonObject =
    try {
        skapi.login(email, password)
    } catch (err: SkapiException) {
        if (err.code != "MFA_REQUIRED") throw err
        val code = askForCode()  // your screen: "Code from your authenticator app"
        skapi.verifyMfa(code)
    }
```

```java [Java]
import com.skapi.SkapiException;
import java.util.Map;
import java.util.concurrent.ExecutionException;

Map<String, Object> logIn(String email, String password) throws Exception {
    try {
        return skapi.login(email, password).get();
    } catch (ExecutionException e) {
        SkapiException err = (SkapiException) e.getCause();
        if (!"MFA_REQUIRED".equals(err.getCode())) throw err;
        String code = askForCode();  // your screen: "Code from your authenticator app"
        return skapi.verifyMfa(code).get();
    }
}
```

:::

- **3 minutes.** Call `verifyMfa()` within 3 minutes of `login()`. After that it throws `INVALID_REQUEST` (`The sign-in has expired. Call login() again.`).
- **Same object.** The waiting login is kept in memory on this `Skapi` object only, never in `storage`. A new object, or an app process that was restarted, must call `login()` again.
- **Wrong code.** `INVALID_CODE` (`Incorrect authenticator code.`) can be retried with the next code. A code that was already used throws `INVALID_CODE` too: wait for the app to show a new one.
- [`openIdLogin()`](/authentication/openid) works the same way. `verifyMfa()` then returns the profile alone, without the `openid` values.

## Checking and turning it off

::: code-group

```kotlin [Kotlin]
println(skapi.getMfaStatus())  // {"enabled":true}
println(skapi.disableMfa())    // SUCCESS: MFA has been disabled.
```

```java [Java]
System.out.println(skapi.getMfaStatus().get());  // {enabled=true}
System.out.println(skapi.disableMfa().get());    // SUCCESS: MFA has been disabled.
```

:::

After [`disableMfa()`](/api-reference/authentication#disablemfa), the next login takes the password alone.

## Lost phone

[Resetting the password](/authentication/password#forgot-password) does not turn two-step login off, so a user who lost their phone cannot log in on their own. An admin of your project can turn it off for them. The user then logs in with their password and can set it up again.
