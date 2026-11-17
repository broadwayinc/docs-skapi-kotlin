# Version History

### Current version: 2.4.1

```kotlin
implementation("com.skapi:skapi-kotlin:2.4.1")

// Java:
implementation("com.skapi:skapi-java:2.4.1")
```

**2.4.1**: Adds skapi-java (`com.skapi:skapi-java`), a layer for Java code on top of skapi-kotlin: every method returns a `CompletableFuture`, and JSON comes and goes as plain Java maps and lists. See [Using from Java](/introduction/java). There are no changes to skapi-kotlin or skapi-android behaviour; they are released as 2.4.1 together with skapi-java, and `SKAPI_VERSION` reads `"2.4.1"`.

**2.4.0**: First release of skapi-kotlin, the Kotlin and Android version of skapi-js 2.4.0 and skapi-py 2.4.0.
