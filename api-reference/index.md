# API Reference

Every method of skapi-kotlin 2.5.0. Each one throws [`SkapiException`](/introduction/errors) on failure. Methods that talk to the server are `suspend` functions that run on `Dispatchers.IO`.

From Java, every method below has the same name on `SkapiJava` and returns a `CompletableFuture`. See [Using from Java](/introduction/java).

## [Connection](/api-reference/connection)

| method | |
|---|---|
| [`Skapi(projectId, storage = MemoryStorage(), timeoutSeconds = 120, targetCdn = null, encryption = null)`](/api-reference/connection#skapi) | connects to one project |
| [`getConnectionInfo(refresh = false)`](/api-reference/connection#getconnectioninfo) | project name and settings |
| [`onForeground()`](/api-reference/connection#onforeground) / [`onNetworkAvailable()`](/api-reference/connection#onnetworkavailable) | checks a temporary account and the realtime connection after a pause |
| [`close()`](/api-reference/connection#close) | stops the object's timers and realtime connection |
| [`FetchOptions(limit, ascending, startKey, fetchMore)`](/api-reference/connection#fetchoptions) | paging options |
| [`SkapiStorage`](/api-reference/connection#skapistorage) / `MemoryStorage` / `FileStorage` | where the session is kept |
| [`jsonOf`, `jsonArrayOf`, `toJsonElement`, `toJsString`](/api-reference/connection#json-helpers) | JSON helpers |

## [Authentication](/api-reference/authentication)

| method | |
|---|---|
| [`signup(params, option = null)`](/api-reference/authentication#signup) | creates an account |
| [`resendSignupConfirmation()`](/api-reference/authentication#resendsignupconfirmation) | sends the confirmation e-mail again |
| [`login(email, password, username = null)`](/api-reference/authentication#login) | signs in |
| [`verifyMfa(code)`](/api-reference/authentication#verifymfa) | finishes a login that needs an authenticator code |
| [`logout(globalLogout = false)`](/api-reference/authentication#logout) | signs out |
| [`getProfile(refreshToken = false)`](/api-reference/authentication#getprofile) | the signed-in user's profile; restores a saved sign-in |
| [`user`](/api-reference/authentication#user) / `session` | the signed-in profile and tokens |
| [`loginWithToken(idToken, accessToken, refreshToken)`](/api-reference/authentication#loginwithtoken) | adopts tokens from another sign-in |
| [`updateProfile(params)`](/api-reference/authentication#updateprofile) | changes the user's profile |
| [`changePassword(currentPassword, newPassword)`](/api-reference/authentication#changepassword) | changes the password |
| [`forgotPassword(email, template = null)`](/api-reference/authentication#forgotpassword) | sends a password reset code |
| [`resetPassword(email, code, newPassword)`](/api-reference/authentication#resetpassword) | sets a new password with the code |
| [`verifyEmail(code = null, template = null)`](/api-reference/authentication#verifyemail) | sends or checks an e-mail verification code |
| [`lastVerifiedEmail(revert = null)`](/api-reference/authentication#lastverifiedemail) | the last verified e-mail |
| [`disableAccount()`](/api-reference/authentication#disableaccount) | disables the user's own account |
| [`recoverAccount(redirect = null)`](/api-reference/authentication#recoveraccount) | sends the recovery e-mail to a disabled account |
| [`openIdLogin(token, id, merge = null, template = null)`](/api-reference/authentication#openidlogin) | signs in through an OpenID provider |
| [`anonymousLogin()`](/api-reference/authentication#anonymouslogin) | a temporary account without e-mail or password |
| [`verifyAnonymousSession()`](/api-reference/authentication#verifyanonymoussession) | checks a restored temporary account still exists |
| [`setupMfa()`](/api-reference/authentication#setupmfa) / [`enableMfa(code)`](/api-reference/authentication#enablemfa) / [`disableMfa()`](/api-reference/authentication#disablemfa) / [`getMfaStatus()`](/api-reference/authentication#getmfastatus) | two-step login with an authenticator app |

## [Database](/api-reference/database)

| method | |
|---|---|
| [`postRecord(data, config, files = null)`](/api-reference/database#postrecord) | creates or updates a record |
| [`postRecords(items)`](/api-reference/database#postrecords) | many records in few requests |
| [`getRecords(query = null, fetchOptions = null)`](/api-reference/database#getrecords) | reads records |
| [`deleteRecords(query, fetchOptions = null)`](/api-reference/database#deleterecords) | deletes records |
| [`getTables`](/api-reference/database#gettables) / [`getTags`](/api-reference/database#gettags) / [`getIndexes`](/api-reference/database#getindexes) / [`getUniqueId`](/api-reference/database#getuniqueid) | what the database holds |
| [`uploadFiles(files, recordId)`](/api-reference/database#uploadfiles) | attaches files to a record |
| [`getFile(url)`](/api-reference/database#getfile) / [`getFileText(url)`](/api-reference/database#getfiletext) / [`getFileUrl(url, expiresSeconds = 0)`](/api-reference/database#getfileurl) / [`getFileInfo(url)`](/api-reference/database#getfileinfo) / [`downloadFile(url, destination)`](/api-reference/database#downloadfile) | downloads a file, or makes a link to it |
| [`deleteFiles(endpoints)`](/api-reference/database#deletefiles) | removes files from records |
| [`grantPrivateRecordAccess`](/api-reference/database#grantprivaterecordaccess) / [`removePrivateRecordAccess`](/api-reference/database#removeprivaterecordaccess) / [`listPrivateRecordAccess`](/api-reference/database#listprivaterecordaccess) / [`requestPrivateRecordAccessKey`](/api-reference/database#requestprivaterecordaccesskey) | sharing private records |

## [Encryption](/api-reference/encryption)

| method | |
|---|---|
| [`getEncryptionStatus()`](/api-reference/encryption#getencryptionstatus) | locked, unlocked or disabled |
| [`unlockEncryption(password)`](/api-reference/encryption#unlockencryption) / [`lockEncryption(forgetDevice = false)`](/api-reference/encryption#lockencryption) | opens or forgets the user's keys |
| [`unlockEncryptionWithRecoveryCode(code, password = null)`](/api-reference/encryption#unlockencryptionwithrecoverycode) / [`regenerateEncryptionRecoveryCode()`](/api-reference/encryption#regenerateencryptionrecoverycode) | encryption recovery codes (the first one is shown once in `getConnectionInfo()`) |
| [`pinPeerKey(userId, fingerprint)`](/api-reference/encryption#pinpeerkey) | trusts another user's key for sharing |
| [`isWithheld(value)`](/api-reference/encryption#iswithheld) | tells the placeholder of undecryptable data apart |

## [Users](/api-reference/users)

| method | |
|---|---|
| [`getUsers(params = null, fetchOptions = null)`](/api-reference/users#getusers) | searches the project's users |
| [`subscribe(userId, getFeed, getNotified, getEmail)`](/api-reference/users#subscribe) / [`unsubscribe(userId)`](/api-reference/users#unsubscribe) | subscribes to another user |
| [`blockSubscriber(userId)`](/api-reference/users#blocksubscriber) / [`unblockSubscriber(userId)`](/api-reference/users#unblocksubscriber) | blocks a subscriber |
| [`getSubscriptions(subscriber, subscription, blocked, fetchOptions)`](/api-reference/users#getsubscriptions) | who subscribes to whom |
| [`getFeed(params = null, fetchOptions = null)`](/api-reference/users#getfeed) | records from the users you subscribe to |
| [`subscribeNewsletter(params)`](/api-reference/users#subscribenewsletter) / [`unsubscribeNewsletter(group)`](/api-reference/users#unsubscribenewsletter) | newsletter subscription |
| [`getNewsletters(params = null, fetchOptions = null)`](/api-reference/users#getnewsletters) / [`getNewsletterSubscription()`](/api-reference/users#getnewslettersubscription) | sent newsletters and the user's subscriptions |
| [`sendInquiry(name, email, subject, message)`](/api-reference/users#sendinquiry) | sends a message to the project owner |

## [Realtime](/api-reference/realtime)

| method | |
|---|---|
| [`connectRealtime(callback)`](/api-reference/realtime#connectrealtime) / [`closeRealtime()`](/api-reference/realtime#closerealtime) | opens or closes the realtime connection |
| [`joinRealtime(group)`](/api-reference/realtime#joinrealtime) | joins or leaves a group |
| [`postRealtime(message, recipient, notification = null)`](/api-reference/realtime#postrealtime) | sends to a user or to the group |
| [`getRealtimeGroups(params = null, fetchOptions = null)`](/api-reference/realtime#getrealtimegroups) / [`getRealtimeUsers(params = null, fetchOptions = null)`](/api-reference/realtime#getrealtimeusers) | who is connected where |

## [API Bridge](/api-reference/api-bridge)

| method | |
|---|---|
| [`forwardRequest(options, form = null, onStream = null)`](/api-reference/api-bridge#forwardrequest) | calls another API through Skapi, with your client secrets |
| [`forwardRequestPoll(requestId)`](/api-reference/api-bridge#forwardrequestpoll) / [`forwardRequestStream(requestId)`](/api-reference/api-bridge#forwardrequeststream) | waits for a queued or streamed answer |
| [`forwardRequestFinalize(requestId, data)`](/api-reference/api-bridge#forwardrequestfinalize) | stores a streamed request's final answer |
| [`forwardRequestHistory(params, fetchOptions = null)`](/api-reference/api-bridge#forwardrequesthistory) | past forwarded requests and their answers |
| [`cancelForwardRequest(params)`](/api-reference/api-bridge#cancelforwardrequest) / [`forwardRequestQueueCount(params)`](/api-reference/api-bridge#forwardrequestqueuecount) | queue control |

## [Tickets](/api-reference/tickets)

| method | |
|---|---|
| [`consumeTicket(ticketId, method = "POST", data = null, auth = false)`](/api-reference/tickets#consumeticket) | calls a ticket |
| [`getTickets(params = null, fetchOptions = null)`](/api-reference/tickets#gettickets) | the project's tickets |
| [`getConsumedTickets(params = null, fetchOptions = null)`](/api-reference/tickets#getconsumedtickets) | the user's own ticket calls |

## Android helpers (skapi-android)

| class | |
|---|---|
| [`SharedPreferencesStorage(context, name = "skapi-session", encrypt = true)`](/introduction/android#sharedpreferencesstorage) | keeps the session, sealed by the Android Keystore |
| [`AndroidKeystoreDeviceKeyStore(context, name = "skapi-enc")`](/introduction/android#remember-this-device-for-record-encryption) | "remember this device" for record encryption |
| [`SkapiLifecycle.watch(application, skapi)`](/introduction/android#coming-back-to-the-foreground) | calls `onForeground()` and `onNetworkAvailable()` for you |
