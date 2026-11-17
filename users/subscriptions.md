# Subscriptions and Feed

Users can subscribe to other users. A subscriber can read the records a user posts for subscribers, and get the ones posted to the feed in one list with [`getFeed()`](/api-reference/users#getfeed). Every method on this page needs a signed-in user.

## Subscribing

```kotlin
import com.skapi.Skapi
import com.skapi.SkapiException

val skapi = Skapi("<Project ID>")
skapi.login("b@example.com", "password")

val sub = skapi.subscribe("<user A id>", getFeed = true)
println(sub)  // {"subscriber":"<user B id>","subscription":"<user A id>","timestamp":...,"blocked":false,"get_feed":true,...}
```

| argument | |
|---|---|
| `getFeed` | `true` puts the user's feed records in your [`getFeed()`](#the-feed). Needed for the feed. |
| `getNotified` | Push notifications for the user's new records. The device registers for them in a browser with skapi-js; see [Not Included](/introduction/not-included#web-push-notifications). |
| `getEmail` | A preference saved with the subscription. `true` needs a verified e-mail, otherwise `User has no verified email address.` |

A new subscription starts with every option off. Calling `subscribe()` again for the same user changes only the options you pass and keeps the others.

You cannot subscribe to yourself. If the user blocked you, the call fails with `The subscription is blocked.`

```kotlin
skapi.unsubscribe("<user A id>")  // "SUCCESS: The user has unsubscribed."
```

## Blocking subscribers

A user can stop another user from reading their subscription records:

```kotlin
skapi.blockSubscriber("<user B id>")    // "SUCCESS: Blocked user ID \"<user B id>\"."
skapi.unblockSubscriber("<user B id>")  // "SUCCESS: Unblocked user ID \"<user B id>\"."
```

A user can be blocked before they ever subscribe. An unblocked subscriber gets their subscription back with the options they had; unblocking someone who never subscribed does not subscribe them. Blocking guards the subscription records only: files on those records are still reachable by their link unless the record is private or in a higher access group.

## Listing subscriptions

Pass `subscriber`, `subscription`, or both (user IDs):

```kotlin
// who user B subscribes to
skapi.getSubscriptions(subscriber = "<user B id>")

// who subscribes to user A
skapi.getSubscriptions(subscription = "<user A id>")

// is user B subscribed to user A? (one row, or an empty list)
skapi.getSubscriptions(subscriber = "<user B id>", subscription = "<user A id>")

// the users who blocked user B
skapi.getSubscriptions(subscriber = "<user B id>", blocked = true)
```

Each row is `{"subscriber", "subscription", "timestamp", "blocked"}`. With `subscriber` alone, `blocked = true` lists only the blocked rows and anything else lists only the active ones. With `subscription` alone, every subscriber comes back, blocked ones included, each with its `blocked` flag; `blocked = true` lists only the blocked ones.

Your own user ID as `subscription` lists your own subscribers:

```kotlin
val me = skapi.user!!["user_id"]!!.jsonPrimitive.content
val mySubscribers = skapi.getSubscriptions(subscription = me)
val blockedByMe = skapi.getSubscriptions(subscription = me, blocked = true)
```

Your subscriber count is `subscribers` in your [`getUsers()`](/users/search) result.

The paging options are the same as for [`getRecords()`](/database/fetch#paging): pass a `FetchOptions` as `fetchOptions`.

## Posting to subscribers

A record is for subscribers when it is posted with `table.subscription` in [`postRecord()`](/database/create):

```kotlin
skapi.postRecord(jsonOf("title" to "New post"), jsonOf(
    "table" to jsonOf(
        "name" to "Posts",
        "access_group" to "authorized",
        "subscription" to jsonOf(
            "is_subscription_record" to true,  // only subscribers can read it
            "upload_to_feed" to true,          // and it appears in their feed
        ),
    ),
))
```

- `is_subscription_record`: only the uploader's subscribers (not blocked) can read the record.
- `upload_to_feed`: the record goes to the feed of subscribers who set `get_feed`. Off unless set.

Both are independent. Signed-out users cannot post subscription records.

Subscribers read the subscription records of one user with `table.subscription` in [`getRecords()`](/database/fetch):

```kotlin
skapi.getRecords(jsonOf(
    "table" to jsonOf("name" to "Posts", "access_group" to "authorized", "subscription" to "<user A id>"),
))
```

## The feed

[`getFeed()`](/api-reference/users#getfeed) lists the feed records of every user you subscribe to with `getFeed = true`, newest first:

```kotlin
val feed = skapi.getFeed(jsonOf("access_group" to "authorized"))
for (r in feed["list"]!!.jsonArray) {
    val record = r.jsonObject
    println("${record["user_id"]} ${record["data"]}")
}
```

`access_group` picks which records: `"public"` (0), `"authorized"` (1, the default) or a higher number up to your own access group. Each row is a record, as [`getRecords()`](/database/fetch#the-record) returns it.

- A new record can take a few seconds to show in the feed.
- Records posted before you subscribed do not appear.
- After you unsubscribe, that user's records leave your feed, past ones included.
