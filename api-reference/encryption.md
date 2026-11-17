# Encryption

Needs `Skapi("<Project ID>", encryption = EncryptionOptions(...))`. No extra dependency: it uses the platform's `javax.crypto`. See [Encrypting Private Data](/database/encryption). Every method that talks to the server is a `suspend` function and throws [`SkapiException`](/introduction/errors).

## EncryptionOptions

```kotlin
public class EncryptionOptions(
    public val iterations: Int = 600000,
    public val trustPolicy: String = "tofu",
    public val withheld: String = "null",
    public val recovery: String = "code",
    public val table: String = "__skapi__keyring",
    public val persistDevice: Boolean = true,
    public val deviceKeyStore: DeviceKeyStore? = null,
)
```

| property | default | |
|---|---|---|
| `iterations` | `600000` | PBKDF2 rounds for new password wraps; at least `100000` |
| `trustPolicy` | `"tofu"` | `"strict"`: only pinned keys are used for sharing |
| `withheld` | `"null"` | `"sentinel"`: undecryptable `data` is `{"__skapi_no_access__": true, "reason": ...}` |
| `recovery` | `"code"` | `"none"`: no encryption recovery codes |
| `table` | `"__skapi__keyring"` | the table that holds keyrings |
| `persistDevice` | `true` | keep the master key in `deviceKeyStore` (when one is given), so a restored session stays unlocked |
| `deviceKeyStore` | `null` | where to keep it; on Android, `AndroidKeystoreDeviceKeyStore(context)` from skapi-android. See [Remember this device](/database/encryption#remember-this-device). |

Any other value of `trustPolicy`, `withheld` or `recovery` is read as the default.

| code | message |
|---|---|
| `INVALID_PARAMETER` | `"encryption.iterations" must be at least 100000.` |

## DeviceKeyStore

```kotlin
public interface DeviceKeyStore {
    public fun save(entry: String, masterKey: ByteArray, keyringRecordId: String)
    public fun load(entry: String): DeviceKey?
    public fun delete(entry: String)
}

public class DeviceKey(public val masterKey: ByteArray, public val keyringRecordId: String)
```

A store for the encryption master key: "remember this device". Entries are named `"<service>/<owner>#<user_id>"`. The core library has none on purpose, since a plain file would put the key on disk in the clear; skapi-android provides `AndroidKeystoreDeviceKeyStore`, which seals it with a key that never leaves the Android Keystore. An exception thrown by `save` or `delete` is logged, not passed on.

## getEncryptionStatus

```kotlin
suspend fun getEncryptionStatus(): JsonObject
```

```json
{"status": "disabled"}
{"status": "locked", "reason": "NO_SESSION_KEY" | "OPENID_UNSUPPORTED", "user_id"?: ..., "fingerprint"?: ...}
{"status": "unlocked", "user_id": "...", "fingerprint": "..."}
```

`fingerprint` is the user's own public key fingerprint, for others to pin. A session restored from storage is first unlocked from the device key store, when there is one.

## unlockEncryption

```kotlin
suspend fun unlockEncryption(password: String): JsonObject
```

Opens the keyring with the password. Returns `{"status": "unlocked"}`. It never sets encryption up: that happens at the first login with the password, so an account that has never logged in with its password gets `NOT_EXISTS`. With a device key store, the key is kept there too.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Encryption is not enabled for this instance.` |
| `INVALID_REQUEST` | `User login is required.` |
| `INVALID_PARAMETER` | `"password" is required.` |
| `NOT_EXISTS` | `Encryption has not been set up for this account yet. It is set up at the first login with the password: log in with the password to start using it.` |
| `ENCRYPTION_BAD_PASSWORD` | `Incorrect password: the encryption keyring could not be opened.` |
| `ENCRYPTION_KEYRING_CORRUPT` | `The encryption keyring does not belong to this user.` / `The keyring has no password wrap.` |
| `ENCRYPTION_LOCKED` | `Encryption could not be unlocked: <reason>` |

## lockEncryption

```kotlin
suspend fun lockEncryption(forgetDevice: Boolean = false): JsonObject
```

Forgets the keys in memory. Returns `{"status": "locked"}`, or `{"status": "disabled"}`. An encryption recovery code not collected yet is kept: the next `getConnectionInfo()` still returns it, once.

| argument | |
|---|---|
| `forgetDevice` | `true` also removes the key kept by the `DeviceKeyStore`, so the next restored session stays locked until [unlockEncryption](#unlockencryption). Left `false`, the stored key stays and the next restored session unlocks again. |

[logout](/api-reference/authentication#logout) forgets the keys and removes the stored key as well.

## isWithheld

```kotlin
fun isWithheld(value: JsonElement?): Boolean
```

`true` for the `"sentinel"` placeholder of undecryptable data. Not a `suspend` function.

## Encryption recovery code

Shown once, in [getConnectionInfo](/api-reference/connection#getconnectioninfo) as `"encryption_recovery"`, after the first password login with encryption on. See [Encryption recovery codes](/database/encryption#encryption-recovery-codes).

## unlockEncryptionWithRecoveryCode

```kotlin
suspend fun unlockEncryptionWithRecoveryCode(code: String, password: String? = null): JsonObject
```

Unlocks encryption with the saved encryption recovery code, for a user signed in after a password reset. With `password`, the keyring opens with that password from now on. The code is replaced by a new one.

```json
{"status": "unlocked", "repaired": <boolean>, "encryptionRecoveryCode": "<new code>" | null}
```

| code | message |
|---|---|
| `INVALID_REQUEST` | `Encryption is not enabled for this instance.` |
| `INVALID_REQUEST` | `User login is required. Reset the password and log in first, then use the encryption recovery code.` |
| `INVALID_PARAMETER` | `"code" is required.` |
| `NOT_EXISTS` | `This account has no encryption keyring, so there is nothing to recover.` |
| `ENCRYPTION_BAD_RECOVERY_CODE` | `That does not look like an encryption recovery code: expected 28 characters, got <n>.` / `... "<c>" is not a valid character.` / `That encryption recovery code has a typo in it: the check characters do not match.` / `That encryption recovery code did not open the keyring. ...` |

## regenerateEncryptionRecoveryCode

```kotlin
suspend fun regenerateEncryptionRecoveryCode(): JsonObject
```

A new encryption recovery code, `{"encryptionRecoveryCode": "..."}`; the old one stops working. Needs encryption unlocked.

| code | message |
|---|---|
| `INVALID_REQUEST` | `Encryption is not enabled for this instance.` |
| `ENCRYPTION_LOCKED` | `Encryption must be unlocked to issue an encryption recovery code. ...` |
| `INVALID_REQUEST` | `Encryption recovery codes are turned off for this instance ("encryption.recovery" is "none").` |

## pinPeerKey

```kotlin
suspend fun pinPeerKey(userId: String, fingerprint: String): Unit
```

Trusts `fingerprint` as `userId`'s key for sharing, saved in the keyring. Throws `ENCRYPTION_LOCKED` (`Encryption is locked.`) when not unlocked.

## Errors from other methods

With encryption on, these can come from [postRecord](/api-reference/database#postrecord), [postRecords](/api-reference/database#postrecords), [getFile](/api-reference/database#getfile) (and the other download methods), [grantPrivateRecordAccess](/api-reference/database#grantprivaterecordaccess), [removePrivateRecordAccess](/api-reference/database#removeprivaterecordaccess) and [changePassword](/api-reference/authentication#changepassword):

| code | when |
|---|---|
| `ENCRYPTION_LOCKED` | writing a private record, changing the password, or opening an encrypted file while locked |
| `ENCRYPTION_NOT_RECORD_OWNER` | writing another user's encrypted record |
| `ENCRYPTION_CANNOT_REWRITE_WITHHELD` | writing back a withheld placeholder |
| `ENCRYPTED_DATA_TOO_LARGE` | the encrypted data is over 2 MB |
| `ENCRYPTION_GRANT_REQUIRES_OWNER` | sharing or removing access on a record you do not own |
| `ENCRYPTION_RECIPIENT_HAS_NO_KEY` | the user never signed in with encryption on |
| `ENCRYPTION_PEER_KEY_CHANGED` / `ENCRYPTION_PEER_NOT_PINNED` | see [Sharing](/database/encryption#sharing-a-record) |
| `ENCRYPTION_DATA_UNAVAILABLE` | the record's data could not be read while changing its sharing |
| `ENCRYPTION_FILE_CORRUPT` / `ENCRYPTION_FILE_STALE_KEY` | an encrypted file does not open with the record's key |
| `INVALID_PARAMETER` | `"__skapi_enc__" is a reserved key in record data.` / `"__skenc__" is reserved in an upload form key.` |
