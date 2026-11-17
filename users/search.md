# Searching Users

Signed-in users can look up other users of your project with [`getUsers()`](/api-reference/users#getusers). Only the profile fields each user made public come back.

```kotlin
import com.skapi.jsonOf
import kotlinx.serialization.json.*  // jsonArray, jsonObject, jsonPrimitive, boolean

val result = skapi.getUsers()
for (u in result["list"]!!.jsonArray) {
    val user = u.jsonObject
    println("${user["user_id"]!!.jsonPrimitive.content} ${user["name"]?.jsonPrimitive?.content}")
}
```

Without parameters, `getUsers()` lists every user, newest sign-up first.

## Search by one field

Pass `searchFor` (the field), `value`, and optionally `condition` or `range`:

```kotlin
// names starting with "Baksa" (">=" on text means "starts with")
skapi.getUsers(jsonOf("searchFor" to "name", "condition" to ">=", "value" to "Baksa"))

// users who signed up before 2023-01-01 (timestamp in milliseconds)
skapi.getUsers(jsonOf("searchFor" to "timestamp", "condition" to "<", "value" to 1672531200000L))

// birthdays between 1985 and 1990
skapi.getUsers(jsonOf("searchFor" to "birthdate", "value" to "1985-01-01", "range" to "1990-12-31"))

// several users at once by their IDs (or e-mails)
skapi.getUsers(jsonOf("searchFor" to "user_id", "value" to listOf("<user id>", "<another user id>")))
```

| `searchFor` | value type |
|---|---|
| `user_id` | user ID string |
| `email`, `phone_number`, `name`, `address`, `gender`, `approved` | string |
| `birthdate` | `"YYYY-MM-DD"` |
| `locale` | country code, such as `"US"` |
| `timestamp` (sign-up time, ms), `subscribers`, `access_group` | number |

`condition` is one of `"="` (default), `">"`, `">="`, `"<"`, `"<="` (or `"gt"`, `"gte"`, `"eq"`, `"lt"`, `"lte"`). A `range` searches from `value` to `range` and cannot be combined with a condition. A list of values works only with `"="` and no range.

A field a user did not make public cannot be searched, and is not in their result.

## Paging

`getUsers()` takes the same paging options as [`getRecords()`](/database/fetch), as a [`FetchOptions`](/api-reference/connection#fetchoptions): `limit`, `fetchMore`, `ascending`.

```kotlin
import com.skapi.FetchOptions

val query = jsonOf("searchFor" to "timestamp", "condition" to ">", "value" to 0)
val options = FetchOptions(limit = 50, fetchMore = true)

while (true) {
    val page = skapi.getUsers(query, options)
    for (u in page["list"]!!.jsonArray) {
        println(u.jsonObject["user_id"]!!.jsonPrimitive.content)
    }
    if (page["endOfList"]!!.jsonPrimitive.boolean) break
}
```
