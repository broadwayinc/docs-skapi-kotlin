# Passwords

Passwords are 6 to 60 characters.

## Changing the password

A signed-in user changes their password with [`changePassword()`](/api-reference/authentication#changepassword), giving the current one and the new one.

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import com.skapi.SkapiException

val skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

try {
    println(skapi.changePassword("password", "new password"))  // SUCCESS: Password has been changed.
} catch (err: SkapiException) {
    if (err.code == "INVALID_REQUEST") {
        println(err.message)  // Incorrect password.
    } else {
        throw err
    }
}
```

```java [Java]
import com.skapi.SkapiException;
import com.skapi.java.SkapiJava;
import java.util.concurrent.ExecutionException;

SkapiJava skapi = new SkapiJava("<Project ID>");
skapi.login("user@example.com", "password").get();

try {
    System.out.println(skapi.changePassword("password", "new password").get());  // SUCCESS: Password has been changed.
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    if ("INVALID_REQUEST".equals(err.getCode())) {
        System.out.println(err.getMessage());  // Incorrect password.
    } else {
        throw err;
    }
}
```

:::

## Forgot password

A user who cannot log in resets the password in two steps. The reset code is always sent by e-mail, so a user whose e-mail is not [verified](/authentication/email-verification) may not receive it. Encourage users to verify their e-mail.

### Step 1: send the code

[`forgotPassword()`](/api-reference/authentication#forgotpassword) e-mails a reset code to the account.

::: code-group

```kotlin [Kotlin]
println(skapi.forgotPassword("user@example.com"))  // SUCCESS: Verification code has been sent.
```

```java [Java]
System.out.println(skapi.forgotPassword("user@example.com").get());  // SUCCESS: Verification code has been sent.
```

:::

To use one of your project's uploaded templates for this e-mail, pass its message ID: `forgotPassword("user@example.com", jsonOf("forgot_password" to "<message_id>"))`.

### Step 2: set the new password

[`resetPassword()`](/api-reference/authentication#resetpassword) takes the e-mail, the code from the e-mail, and the new password.

::: code-group

```kotlin [Kotlin]
println(skapi.resetPassword("user@example.com", "123456", "new password"))
// SUCCESS: New password has been set.
```

```java [Java]
System.out.println(skapi.resetPassword("user@example.com", "123456", "new password").get());
// SUCCESS: New password has been set.
```

:::

Resetting the password does not turn off [two-step login](/authentication/mfa#lost-phone). It does sign the account out on every other device: each one is signed out the next time it refreshes its login (within a day at most).
