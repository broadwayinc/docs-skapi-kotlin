# Groups and Messages

## Sending to a user

Pass a user ID as the recipient. The user receives a `"private"` event on any connection they have open, whatever group they are in:

::: code-group

```kotlin [Kotlin]
skapi.postRealtime(jsonOf("text" to "Hi!"), "<user id>")
```

```java [Java]
skapi.postRealtime(SkapiJson.obj("text", "Hi!"), "<user id>").get();
```

:::

The message is any JSON value (a `JsonElement`). With its headers it can be at most 32 KB (32768 bytes); a bigger one throws `INVALID_PARAMETER` without sending.

## Joining a group

::: code-group

```kotlin [Kotlin]
skapi.joinRealtime("lobby")
```

```java [Java]
skapi.joinRealtime("lobby").get();
```

:::

```json
{"type": "success", "message": "Joined realtime message group: \"lobby\"."}
```

A connection is in one group at a time: joining another group leaves the current one. The members get a `"notice"` with `USER_JOINED` when you join and `USER_LEFT` when you leave.

::: code-group

```kotlin [Kotlin]
skapi.joinRealtime(null) // leaves the group
```

```java [Java]
skapi.joinRealtime(null).get(); // leaves the group
```

:::

## Sending to the group

Pass the group's name as the recipient. Every member, you included, receives a `"message"` event:

::: code-group

```kotlin [Kotlin]
skapi.postRealtime(jsonOf("text" to "Hello everyone"), "lobby")
```

```java [Java]
skapi.postRealtime(SkapiJson.obj("text", "Hello everyone"), "lobby").get();
```

:::

You can only post to the group you joined; any other group name throws `INVALID_REQUEST`: `User has not joined to the recipient group. Run joinRealtime("<group>")`.

The first post right after joining waits, at most 3 seconds, until the server confirms the join, so the group does not miss it.

### Message order

Messages one sender posts to a group arrive in the order they were sent. Posts made less than 100 milliseconds apart are sent together in one frame and still arrive one by one, in order. A post 100 milliseconds or more after the one before goes at once.

### Notifications

A message can carry a push notification for recipients who use the project in a web browser:

::: code-group

```kotlin [Kotlin]
skapi.postRealtime(
    jsonOf("text" to "Dinner is ready"),
    "<user id>",
    jsonOf("title" to "New message", "body" to "Dinner is ready", "config" to jsonOf("always" to true)),
)
```

```java [Java]
skapi.postRealtime(
    SkapiJson.obj("text", "Dinner is ready"),
    "<user id>",
    SkapiJson.obj("title", "New message", "body", "Dinner is ready", "config", SkapiJson.obj("always", true))
).get();
```

:::

`title` and `body` are required strings, together at most 3 KB. By default the notification is sent only to recipients who are not connected; `"always" to true` sends it to everyone. A message with a notification is never sent together with other posts.

## Listing groups

[getRealtimeGroups](/api-reference/realtime#getrealtimegroups) lists the groups that have members right now:

::: code-group

```kotlin [Kotlin]
skapi.getRealtimeGroups()
// {"list": [{"group": "lobby", "number_of_users": 3}, ...], "startKey": ..., "endOfList": true}

skapi.getRealtimeGroups(jsonOf("searchFor" to "group", "value" to "lob", "condition" to ">="))
skapi.getRealtimeGroups(jsonOf("searchFor" to "number_of_users", "value" to 10, "condition" to ">="))
```

```java [Java]
skapi.getRealtimeGroups().get();
// {"list": [{"group": "lobby", "number_of_users": 3}, ...], "startKey": ..., "endOfList": true}

skapi.getRealtimeGroups(SkapiJson.obj("searchFor", "group", "value", "lob", "condition", ">=")).get();
skapi.getRealtimeGroups(SkapiJson.obj("searchFor", "number_of_users", "value", 10, "condition", ">=")).get();
```

:::

## Listing users in a group

[getRealtimeUsers](/api-reference/realtime#getrealtimeusers) lists the connections in a group, by default the one you joined:

::: code-group

```kotlin [Kotlin]
skapi.getRealtimeUsers()
// {"list": [{"user_id": "...", "cid": "cid:..."}, ...], ...}

skapi.getRealtimeUsers(jsonOf("group" to "lobby", "user_id" to "<user id>")) // one user's connections there
```

```java [Java]
skapi.getRealtimeUsers().get();
// {"list": [{"user_id": "...", "cid": "cid:..."}, ...], ...}

skapi.getRealtimeUsers(SkapiJson.obj("group", "lobby", "user_id", "<user id>")).get(); // one user's connections there
```

:::

A user with two devices connected appears twice, with two `cid`s.
