# Errors

Every error skapi-kotlin throws is a `SkapiException` with these fields:

- `code`: a short name you can check in code, such as `INVALID_PARAMETER`.
- `message`: what went wrong, in plain words.
- `cause`: the underlying exception, when there is one (for example the network error behind `NETWORK_ERROR`), or `null`.
- `details`: what the server sent with the error as a `JsonElement`, when it sent more than a message (a [ticket's error body](/tickets/tickets#when-a-consumption-fails), for example), or `null`.

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import com.skapi.SkapiException

val skapi = Skapi("<Project ID>")

try {
    skapi.login("user@example.com", "wrong password")
} catch (err: SkapiException) {
    println(err.code)     // INCORRECT_USERNAME_OR_PASSWORD
    println(err.message)  // Incorrect username or password.
}
```

```java [Java]
import com.skapi.SkapiException;
import com.skapi.java.SkapiJava;
import java.util.concurrent.ExecutionException;

SkapiJava skapi = new SkapiJava("<Project ID>");

try {
    skapi.login("user@example.com", "wrong password").get();
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    System.out.println(err.getCode());     // INCORRECT_USERNAME_OR_PASSWORD
    System.out.println(err.getMessage());  // Incorrect username or password.
}
```

:::

`err.toString()` gives both: `INCORRECT_USERNAME_OR_PASSWORD: Incorrect username or password.`

The codes are the same ones skapi-js and skapi-py use, so a check written for one works for the others. A `when` on the code reads well:

::: code-group

```kotlin [Kotlin]
try {
    skapi.login(email, password)
} catch (err: SkapiException) {
    when (err.code) {
        "INCORRECT_USERNAME_OR_PASSWORD" -> showError("Wrong e-mail or password.")
        "NETWORK_ERROR" -> showError("No connection. Try again.")
        else -> showError(err.message)
    }
}
```

```java [Java]
try {
    skapi.login(email, password).get();
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    switch (err.getCode()) {
        case "INCORRECT_USERNAME_OR_PASSWORD": showError("Wrong e-mail or password."); break;
        case "NETWORK_ERROR": showError("No connection. Try again."); break;
        default: showError(err.getMessage());
    }
}
```

:::

## Common codes

| code | meaning |
|---|---|
| `INVALID_PARAMETER` | A value you passed is missing, the wrong type, or out of range. The message names it. Nothing was sent. |
| `INVALID_REQUEST` | The call is not allowed in this state, for example `User login is required.` |
| `NOT_EXISTS` | The record, file, account or project does not exist. |
| `EXISTS` | It already exists, for example an account with that e-mail. |
| `INCORRECT_USERNAME_OR_PASSWORD` | Wrong e-mail, username or password. |
| `MFA_REQUIRED` | The password was right and the account has two-step login on: call `verifyMfa()` with the code. See [Two-Step Login](/authentication/mfa). |
| `INVALID_CODE` | Wrong authenticator code. Try the next one. |
| `SIGNUP_CONFIRMATION_NEEDED` | The user has not confirmed their signup yet. |
| `USER_IS_DISABLED` | The account is disabled. See [User Profile](/authentication/profile). |
| `REQUIRE_LOGIN` | The project only lets signed-in users read its database. |
| `REQUEST_EXCEED` | Too many attempts. Wait and try again. |
| `TOO_MANY_REQUESTS` | The server kept answering "too many requests" after 6 automatic retries, or a file upload was refused that way. |
| `RATE_LIMITED` | The server answered "too many requests" (`Too many requests`) without saying when to try again. Wait and try again. |
| `SERVER_ERROR` | A fault on the server (an answer with status 500 or above, other than 501), not a refusal: try again. The message is the server's, and `details` holds what it sent. |
| `NETWORK_ERROR` | No answer came back. The user stays signed in; try again when the network is back. |
| `TIMEOUT` | Nothing was sent or received for `timeoutSeconds` seconds (`No response for 120 seconds.` with the default), a file upload stalled (`Upload timeout: ...`), a call's `deadline` passed (`No answer within <n> ms.`), or the sign-in token refresh got no answer within 15 seconds (`The sign-in token refresh did not answer within 15 seconds.`: the user stays signed in, and the next call tries the refresh again). Try again. |
| `ABORTED` | You aborted the call with a [SkapiAbortSignal](/api-reference/api-bridge#skapiabortsignal) (`Aborted`). |
| `EXCEED_LIMIT` | The project is at a limit of its plan. On Trial and Standard, once the month's API requests are used up, every call is refused until the month ends with `This project has used its 500,000 API requests for this month. Requests are refused until the month ends. Consider upgrading your plan.` (the number is the plan's own limit). See [Plans and Limits](https://docs.skapi.com/introduction/plans.html#api-requests). |
| `ERROR` | Anything else. The message says what happened. |

## Cancellation is not an error

When the coroutine that made a call is cancelled, the call throws `CancellationException`, not `SkapiException`. Catch `SkapiException` (not `Exception`) around your calls so cancellation still reaches the coroutine and stops it.

## Retries

skapi-kotlin retries on its own when the server asks it to slow down (it waits as long as the server says, up to 6 times), and when a token refresh fails for lack of network (up to about 6 seconds; a refresh gets 15 seconds in all). A poll of a forwarded request ([forwardRequestPoll](/api-reference/api-bridge#forwardrequestpoll), [forwardRequestStream](/api-reference/api-bridge#forwardrequeststream), or `forwardRequest` with `poll` or `stream`) keeps trying through `NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR` and token failures, waiting longer each time up to 30 seconds. Other errors are thrown at once.

`NETWORK_ERROR`, `TIMEOUT`, `RATE_LIMITED`, `TOO_MANY_REQUESTS`, `SERVER_ERROR` and `ABORTED` say the request failed on the way, so trying again can work; any other code is the server's answer.
