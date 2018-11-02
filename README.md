
# Configuring the environment!
The main credential are automatically set up for you, howver, the **databaseURL** & the **storageBucket** has to be set manually before deploying the functions.
Use the following command to set the **databaseURL** & the **storageBucket** URLs:
  
```sh
# each arg must have a 2-part key (e.g foo.bar)
$ firebase functions:config:set sqr.database_url="THE DATABASE URL"
$ firebase functions:config:set sqr.storage_bucket="THE STORAGE BUCKET URL"
$ firebase functions:config:set send_in_blue.key="sendInBlue secret Key"
# Coordinator details
$ firebase functions:config:set sqr.allotment.templateid=NUMBER
$ firebase functions:config:set sqr.coordinator.email_address='EMAIL'
$ firebase functions:config:set sqr.coordinator.name='NAME'
```

