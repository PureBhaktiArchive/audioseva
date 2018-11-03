
# Configuring the environment!
The main credentials, **databaseURL** & the **storageBucket** are automatically set up for you, however, other variables has to be set manually before deploying the functions.
  
```sh
# each arg must have at least 2-part key (e.g foo.bar)
$ firebase functions:config:set send_in_blue.key="sendInBlue secret Key"
# Coordinator details
$ firebase functions:config:set sqr.allotment.templateid=NUMBER
$ firebase functions:config:set coordinator.email_address='EMAIL'
$ firebase functions:config:set coordinator.timeZoneOffset=NUMBER of HOURs

```

