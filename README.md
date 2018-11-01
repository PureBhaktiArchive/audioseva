
# Configuring the environment!
The main credential are automatically set up for you, howver, the **databaseURL** & the **storageBucket** has to be set manually before deploying the functions.
Use the following command to set the **databaseURL** & the **storageBucket** URLs:
  
```sh
$ firebase functions:config:set database_url="THE DATABASE URL"
$ firebase functions:config:set storage_bucket="THE STORAGE BUCKET URL"
$ firebase functions:config:set send_in_blue.key="sendInBlue secret Key"
# Coordinator details
$ firebase functions:config:set coordinator.templateid=NUMBER
$ firebase functions:config:set coordinator.email='EMAIL'
$ firebase functions:config:set coordinator.name='NAME'
```

