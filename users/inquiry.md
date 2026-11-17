# Inquiries

[`sendInquiry()`](/api-reference/users#sendinquiry) sends a message to the project owner's e-mail. Anyone can send one, signed in or not:

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import com.skapi.SkapiException

val skapi = Skapi("<Project ID>")

try {
    val res = skapi.sendInquiry(
        name = "John Doe",
        email = "john@doe.com",
        subject = "Inquiry",
        message = "Hello, I have a question.",
    )
    println(res)  // SUCCESS: Inquiry has been sent.
} catch (err: SkapiException) {
    println("${err.code} ${err.message}")
}
```

```java [Java]
import com.skapi.SkapiException;
import com.skapi.java.SkapiJava;
import java.util.concurrent.ExecutionException;

SkapiJava skapi = new SkapiJava("<Project ID>");

try {
    String res = skapi.sendInquiry(
        "John Doe",                  // name
        "john@doe.com",              // email
        "Inquiry",                   // subject
        "Hello, I have a question."  // message
    ).get();
    System.out.println(res);  // SUCCESS: Inquiry has been sent.
} catch (ExecutionException e) {
    SkapiException err = (SkapiException) e.getCause();
    System.out.println(err.getCode() + " " + err.getMessage());
}
```

:::

All four arguments are required. `email` has to be a valid address.

The project owner can turn inquiries off in the project settings on [skapi.com](https://www.skapi.com). The call then fails with `ERROR` `Project does not allow inquiry.`
