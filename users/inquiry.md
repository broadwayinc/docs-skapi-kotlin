# Inquiries

[`sendInquiry()`](/api-reference/users#sendinquiry) sends a message to the project owner's e-mail. Anyone can send one, signed in or not:

```kotlin
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

All four arguments are required. `email` has to be a valid address.

The project owner can turn inquiries off in the project settings on [skapi.com](https://www.skapi.com). The call then fails with `ERROR` `Project does not allow inquiry.`
