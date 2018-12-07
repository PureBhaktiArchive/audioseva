
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

# Importing data from a Google spreadsheet
In order to be able to import files from Google Spreadsheet, you'll have to create a **service account** at 
https://console.cloud.google.com/apis/credentials .. a **json** file will be created for you, download it and and place it in the **functions** folder under the following name **creds.json**.

After that you'll have to open the **creds.json** and locate the **client_email** and **SHARE** the spreadsheet with this email.