# Newsletters

Your users can subscribe to the project's newsletters, read the ones already sent, and unsubscribe. Sending newsletters and managing newsletter groups is done by the project owner on [skapi.com](https://www.skapi.com).

## Groups

Every call names a newsletter group:

| `group` | |
|---|---|
| `0` or `"public"` | The public newsletter. Anyone can subscribe with an e-mail address. |
| `1` or `"authorized"` | Service Email, for signed-in users. |
| `2` to `99` | Signed-in users whose access group is that number or higher. |
| a group name, such as `"promo"` | A named group the project owner created. Who can subscribe is set by the owner. |

## Subscribing

Signed in, the user's own e-mail is subscribed. It has to be [verified](/authentication/email-verification) first:

::: code-group

```kotlin [Kotlin]
import com.skapi.Skapi
import com.skapi.SkapiException
import com.skapi.jsonOf

val skapi = Skapi("<Project ID>")
skapi.login("user@example.com", "password")

skapi.subscribeNewsletter(jsonOf("group" to "authorized"))
// "SUCCESS: User's email has been successfully subscribed to the newsletter."
```

```java [Java]
import com.skapi.java.SkapiJava;
import com.skapi.java.SkapiJson;

SkapiJava skapi = new SkapiJava("<Project ID>");
skapi.login("user@example.com", "password").get();

skapi.subscribeNewsletter(SkapiJson.obj("group", "authorized")).get();
// "SUCCESS: User's email has been successfully subscribed to the newsletter."
```

:::

An unverified e-mail fails with `INVALID_REQUEST` `User's email needs to be verified.` No confirmation mail is sent to a signed-in user.

Signed out, pass the `email` to subscribe. The address gets a confirmation mail first, and the subscription starts when the link in it is opened. Only the public newsletter and named groups open to anyone accept this:

::: code-group

```kotlin [Kotlin]
val skapi = Skapi("<Project ID>")
skapi.subscribeNewsletter(jsonOf(
    "email" to "visitor@example.com",
    "group" to "public",
    "redirect" to "https://your.domain.com/subscribed",  // optional: where the confirmation link lands
))
// "SUCCESS: Subscribe confirmation e-mail has been sent."
```

```java [Java]
SkapiJava skapi = new SkapiJava("<Project ID>");
skapi.subscribeNewsletter(SkapiJson.obj(
    "email", "visitor@example.com",
    "group", "public",
    "redirect", "https://your.domain.com/subscribed"  // optional: where the confirmation link lands
)).get();
// "SUCCESS: Subscribe confirmation e-mail has been sent."
```

:::

Anonymous accounts cannot subscribe. Every newsletter carries an unsubscribe link at the bottom.

## Unsubscribing

::: code-group

```kotlin [Kotlin]
skapi.unsubscribeNewsletter("authorized")       // one group by name
skapi.unsubscribeNewsletter(JsonPrimitive(5))   // one numeric group
skapi.unsubscribeNewsletter(null as String?)    // every group
```

```java [Java]
skapi.unsubscribeNewsletter("authorized").get();  // one group by name
skapi.unsubscribeNewsletter(5).get();             // one numeric group
skapi.unsubscribeNewsletter(null).get();          // every group
```

:::

`unsubscribeNewsletter()` takes the group as a `String` (`"public"`, `"authorized"` or a group name) or as a `JsonElement` (for a number). `null` unsubscribes from every group.

Needs a signed-in user. Returns, for example, `SUCCESS: user@example.com has been unsubscribed from group 01.`

## The user's subscriptions

::: code-group

```kotlin [Kotlin]
val subs = skapi.getNewsletterSubscription()
// [{"timestamp":...,"group":1,"subscribed_email":"user@example.com","active":true}, ...]

skapi.getNewsletterSubscription(jsonOf("group" to "promo"))  // one group
```

```java [Java]
List<Object> subs = (List<Object>) skapi.getNewsletterSubscription().get();
// [{"timestamp":...,"group":1,"subscribed_email":"user@example.com","active":true}, ...]

skapi.getNewsletterSubscription(SkapiJson.obj("group", "promo")).get();  // one group
```

:::

`group` is a number for numeric groups and the name for named groups. `active` is `false` while a subscription is inactive or unconfirmed.

## Reading sent newsletters

[`getNewsletters()`](/api-reference/users#getnewsletters) lists newsletters already sent. Without parameters it lists the public newsletter, newest first. Each row has a `url` to read the newsletter:

::: code-group

```kotlin [Kotlin]
for (n in skapi.getNewsletters()["list"]!!.jsonArray) {
    val nl = n.jsonObject
    println("${nl["subject"]} ${nl["timestamp"]} ${nl["url"]}")
}
```

```java [Java]
for (Object n : (List<Object>) skapi.getNewsletters().get().get("list")) {
    Map<String, Object> nl = (Map<String, Object>) n;
    System.out.println(nl.get("subject") + " " + nl.get("timestamp") + " " + nl.get("url"));
}
```

:::

To list another group, or search, pass `searchFor`, `value` and `group`:

::: code-group

```kotlin [Kotlin]
skapi.getNewsletters(
    jsonOf("searchFor" to "timestamp", "value" to System.currentTimeMillis(), "condition" to "<", "group" to "promo"),
    FetchOptions(ascending = false),
)

skapi.getNewsletters(jsonOf("searchFor" to "subject", "value" to "Spring menu", "group" to 1))  // exact subject
```

```java [Java]
skapi.getNewsletters(
    SkapiJson.obj("searchFor", "timestamp", "value", System.currentTimeMillis(), "condition", "<", "group", "promo"),
    new FetchOptionsBuilder().ascending(false).build()
).get();

skapi.getNewsletters(SkapiJson.obj("searchFor", "subject", "value", "Spring menu", "group", 1)).get();  // exact subject
```

:::

Group `0` is open to anyone. Groups `1` to `99` need a signed-in user whose access group is at least that number. Named groups follow the access the owner set.

Each row: `message_id`, `timestamp`, `subject`, `url`, `group`, and `complaint`, `read`, `bounced`, `delivered`, `dry`, which only the project owner sees filled in. The paging options are the same as for [`getRecords()`](/database/fetch#paging).
