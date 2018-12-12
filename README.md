
# Frontend

## Project setup

```
npm install
```

All env variables with FIREBASE in them are taken from the Firebase project.
Add the following variables into your `.env.development.local` file:

- `VUE_APP_FIREBASE_API_KEY`
- `VUE_APP_FIREBASE_AUTH_DOMAIN`
- `VUE_APP_FIREBASE_DATABASE_URL`
- `VUE_APP_FIREBASE_STORAGE_BUCKET`

### Compiles and hot-reloads for development

```
npm run serve
```

### Compiles and minifies for production

```
npm run build
```

### Lints and fixes files

```
npm run lint
```

### Run your unit tests

```
npm run test:unit
```

# Configuring the Firebase Cloud Functions environment!
The main credentials, **databaseURL** & the **storageBucket** are automatically set up for you, however, other variables have to be set manually before deploying the functions.
  
```sh
# each arg must have at least 2-part key (e.g foo.bar)
$ firebase functions:config:set website.base_url="Base url of the website"
$ firebase functions:config:set send_in_blue.key="sendInBlue secret Key"
# Coordinator details
$ firebase functions:config:set sqr.allotment.templateid='String | template name'
$ firebase functions:config:set coordinator.email_address='EMAIL'
$ firebase functions:config:set coordinator.timeZoneOffset=NUMBER of HOURs
#Importing a spreadsheet to the database variables
$ firebase functions:config:set sqr.spreadsheetId='Google Spreadsheet ID'
```

Firebase Cloud Functions is written in **TypeScript**, if you are uploading the functions for the first time make sure you're selecting the language used in the project as **TypeScript** instead of the default **JavaScript**.

# Deploying Firebase Cloud Functions!
Don't upload the functions manually as it needs first to be converted from **TypeScript** into **JavaScript**.


The following command will run a **predeploy** script to make the conversion and then upload the functions.


```sh
$ npm run deploy
```

# Deploying Firebase Storage Rules!
First we need to create **target names** using firebase CLI as follows:

```sh
$ firebase target:apply storage target-name resource-name
```

where:
1. **target-name**: is a unique identifier.
2. **resource-name**: is the name of the bucet on Firebase storage.
 
Then in the **firebase.json** add a new "storage" key with an array of target-names and their associated rule files like the following example:

```json
{
  "storage": [{
    "target": "se_uploads",
    "rules": "./functions/storage.sound-editing.uploads.rules"
  }]
}
```

Then to deploy the created storage rules, run the following:

```sh
$ firebase deploy --only storage:target-name
```

So far the created **target names** are [ se_uploads ], so to reproduce the current environment setup, run the following:

```sh
$ firebase target:apply storage se_uploads audio-seva-test-uploads
$ firebase deploy --only storage:se_uploads
```