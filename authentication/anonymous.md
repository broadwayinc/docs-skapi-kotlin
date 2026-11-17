# Anonymous Login

[`anonymousLogin()`](/api-reference/authentication#anonymouslogin) signs in with a **temporary account**: no e-mail, no password, created by the one call. Use it when a user needs an account for a short task, such as writing records, without signing up.

The project owner must turn on **Anonymous Login** in the project settings. While it is off, the call throws `INVALID_REQUEST` (`Anonymous login is not enabled for this project.`).

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import com.skapi.SkapiException
import kotlinx.serialization.json.jsonPrimitive

val skapi = Skapi("<Project ID>")

val user = skapi.anonymousLogin()
println(user["anonymous"]!!.jsonPrimitive.content)     // true
println(user["access_group"]!!.jsonPrimitive.content)  // 1
```

```java [Java]
import com.skapi.java.SkapiJava;
import java.util.Map;

SkapiJava skapi = new SkapiJava("<Project ID>");

Map<String, Object> user = skapi.anonymousLogin().get();
System.out.println(user.get("anonymous"));     // true
System.out.println(user.get("access_group"));  // 1
```

:::

From then on the object is signed in like any other user, with the limits below.

- If this object already holds an anonymous session, `anonymousLogin()` returns that account instead of making a new one.
- If another user is signed in, it throws `INVALID_REQUEST` (`A user is already logged in. Log out first.`).
- An anonymous account counts as a user of your project while it exists. At the plan's user limit, it throws `INVALID_REQUEST` (`User limit exceeded.`).

## How long the account lives

While the `Skapi` object lives, it sends a keep-alive every 10 minutes on a background timer. The account is deleted 30 minutes after the last keep-alive, so it goes away about half an hour after your program stops, or after [`close()`](/api-reference/connection#close). Everything it owns, such as its records and files, is deleted with it.

A temporary account restored from `storage` at the next start is checked with the server at once and then kept alive the same way. If the check finds the account already deleted, the object is signed out and `skapi.user` becomes `null`. The same happens when a later keep-alive finds it gone.

A phone pauses apps in the background, so the keep-alive can miss the 30 minute window. `onForeground()` and `onNetworkAvailable()` check the account again as soon as the app is back; skapi-android's `SkapiLifecycle` calls them for you. See [Android](/introduction/android#coming-back-to-the-foreground).

`logout()` deletes the account at once. So does `signup()`, which logs out first. `login()` and `openIdLogin()` replace the session; the anonymous account they leave behind is deleted 30 minutes later.

## What an anonymous account cannot do

A temporary account stays temporary. These methods throw `INVALID_REQUEST` with a message starting with `Anonymous accounts cannot`:

- [`updateProfile()`](/authentication/profile)
- [`changePassword()`](/authentication/password)
- [`verifyEmail()`](/authentication/email-verification) and [`lastVerifiedEmail()`](/authentication/email-verification#going-back-to-the-last-verified-e-mail)
- [`disableAccount()`](/authentication/profile#disabling-an-account)
- [`setupMfa()`, `enableMfa()`, `disableMfa()` and `getMfaStatus()`](/authentication/mfa)
- [`subscribeNewsletter()`, `unsubscribeNewsletter()` and `getNewsletterSubscription()`](/users/newsletters)

It has no e-mail or password, so it cannot reset a password or be recovered either.

To tell anonymous users apart, check `skapi.user?.get("anonymous")`: it is `true` on an anonymous account and absent on any other.

## Checking a restored session

With `storage`, a temporary account comes back on the next run. It may have been deleted in the meantime (30 minutes after the last keep-alive). [`verifyAnonymousSession()`](/api-reference/authentication#verifyanonymoussession) asks the server:

::: code-group

```kotlin [Kotlin]
val skapi = Skapi("<Project ID>", storage = FileStorage("session.json"))

if (skapi.verifyAnonymousSession() == null) {
    skapi.anonymousLogin()  // the old account is gone: start a new one
}
```

```java [Java]
SkapiJava skapi = new SkapiJava("<Project ID>", new FileStorage("session.json"));

if (skapi.verifyAnonymousSession().get() == null) {
    skapi.anonymousLogin().get();  // the old account is gone: start a new one
}
```

:::

It returns the profile, or `null` after signing out when the account no longer exists. For a regular account it returns the profile without a request.
