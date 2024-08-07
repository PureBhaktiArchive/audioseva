# Development

## Functions

### Local debug

1. Generate a private key for Firebase service account [here](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk) using “Generate new private key” button.
1. Save the private key JSON file as `credentials.json.local` in the root of the repository directory. This file is ignored by GIT.
1. Run `firebase functions:config:get > .runtimeconfig.json` in the `functions` folder once to get a copy of the config for the local functions shell. You can edit the JSON file if needed.
1. Run `npm run build:watch` to continuosly build the source code while the shell is running.
1. Run the `Firebase Emulators` task to emulate the functions locally.
1. Alternatively, run the `Functions Shell` task to enter the [Cloud Functions shell](https://firebase.google.com/docs/functions/local-emulator) and invoke your function interactively.

## Frontend

When hosted on Firebase Hosting, all Firebase configuration will be automatically obtained from the Hosting.

For local debugging add the following variables into your `.env.development.local` file:

- `VUE_APP_FIREBASE_PROJECT_ID`
- `VUE_APP_FIREBASE_API_KEY`
- `VUE_APP_FIREBASE_AUTH_DOMAIN`
- `VUE_APP_FIREBASE_DATABASE_URL`
- `VUE_APP_FIREBASE_STORAGE_BUCKET`

Values can be obtained from https://console.firebase.google.com/project/_/settings/general/

Also add other variables from the [Frontend environment variables](#frontend-environment-variables) section.

### Dependencies

- `webpack` is overriden to avoid having v5 installed.
- `css-loader` is overriden to v3 because later versions require `webpack@^5`.
- `terser-webpack-plugin` is overriden to v2 in order to use newer MD4 implementation (https://github.com/webpack-contrib/terser-webpack-plugin/releases/tag/v2.3.4). Naturally, `@vue/cli-service` requires v1 of `terser-webpack-plugin`. But it works fine with v2.
- `react-dom` is overriden to avoid resolution issue caused by `react-select`.

# Firebase project set up

1. [Create a Firebase project](https://console.firebase.google.com).
1. [Add a web app in the Firebase console](https://console.firebase.google.com/project/_/settings/general/). Also set up Firebase Hosting for this app during adding it.
1. [Connect custom domain `app.[base domain]` to the hosting](https://console.firebase.google.com/project/_/hosting/main).
1. [Enable Sign-in providers](https://console.firebase.google.com/project/_/authentication/providers).
1. [Add custom domain into Authorized domains](https://console.firebase.google.com/project/_/authentication/providers).
1. [Set up consent screen](https://console.developers.google.com/apis/credentials/consent).
1. [Create a database](https://console.firebase.google.com/project/_/database).
1. [Create a user with coordinator role in the database](https://console.firebase.google.com/project/_/database/_/data/users). See https://trello.com/c/6Y8W4LsR/51-authorization for details.
1. [Create storage buckets](https://console.firebase.google.com/project/_/storage/_/files): `original`, `te.uploads`, `edited`, `restored`.
1. [Enable Sheets API for the project](https://console.developers.google.com/apis/api/sheets.googleapis.com/overview).
1. [Enable Identity and Access Management (IAM) API for the project](https://console.developers.google.com/apis/api/iam.googleapis.com/overview).
1. Add “Service Account Token Creator” (needed for signing storage URLs according to https://stackoverflow.com/a/53354122/3082178) and “Storage Object Viewer” roles to the “App Engine default service account” in [IAM console](https://console.cloud.google.com/iam-admin/iam).
1. Add [App Engine default service account](https://console.developers.google.com/apis/api/sheets.googleapis.com/credentials) as editor to all the Google spreadsheets and allow it to edit protected ranges.
1. Deploy the project using the guidelies [below](#deployment).

# Deployment

1. [Set functions environment configuration](https://firebase.google.com/docs/functions/config-env), see all the configuration parameters described [below](#functions-environment-configuration).
1. [Set frontent environment variables](https://cli.vuejs.org/guide/mode-and-env.html) in the `.env.production.local` file, see all the variables described [below](#frontend-environment-variables).
1. [Set up deploy targets for Cloud Storage](https://firebase.google.com/docs/cli/targets#set-up-deploy-target-storage-database): `firebase target:apply storage uploads te.uploads.<project.domain>`.
1. Deploy: `firebase deploy`.

## Functions environment configuration

| Key                                       | Description                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `project.domain`                          | Root domain used for hosting and storage                                                          |
| `email.connection`                        | SMTP connection string                                                                            |
| `email.sender.address`                    | Email sender address                                                                              |
| `email.sender.name`                       | Email sender name                                                                                 |
| `coordinator.email_address`               | Coordinator email address                                                                         |
| `coordinator.timezone`                    | Coordinator timezone. For example, `Asia/Calcutta`                                                |
| `sqr.spreadsheet_id`                      | Sound Quality Reporting spreadsheet id                                                            |
| `registrations.spreadsheet_id`            | User registrations spreadsheet id                                                                 |
| `cr.submissions.spreadsheet.id`           | Content Reporting submissions spreadsheet id                                                      |
| `cr.processing.spreadsheet.id`            | Content Reporting Processing spreadsheet id                                                       |
| `cr.allotments.spreadsheet.id`            | Content Reporting allotments spreadsheet id                                                       |
| `donations.cash.spreadsheet.id`           | Donations spreadsheet id                                                                          |
| `donations.cash.spreadsheet.name`         | Donations sheet name                                                                              |
| `donations.contact.email_address`         | Email address used in donations communication                                                     |
| `te.spreadsheet.id`                       | Track Editing spreadsheet id                                                                      |
| `te.coordinator.email_address`            | Track Editing coordinator mailbox                                                                 |
| `fc.spreadsheet.id`                       | Fidelity Check spreadsheet id                                                                     |
| `directus.url`                            | An address of the Directus CMS                                                                    |
| `directus.token`                          | A token to access the Directus CMS                                                                |
| `final.publication.bucket`                | A bucket for publicly-accessible MP3 files                                                        |
| `final.publication.invokers`              | A list of comma-delimited identities that are allowed to invoke the `Final.publish` HTTP function |
| `transcription.spreadsheet.id`            | Transcription Spreadsheet                                                                         |
| `transcription.folder.id`                 | Id of the Drive folder where transcripts are stored                                               |
| `transcription.coordinator.email_address` | Transcription coordinator mailbox                                                                 |

## Frontend environment variables

| Variable                | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `VUE_APP_ASSIGNEES_URL` | URL for getting assignees in legacy allotment forms |
| `VUE_APP_CR_LISTS_URL`  | URL for getting CR lists                            |
| `VUE_APP_CR_FILES_URL`  | URL for getting CR files                            |
| `VUE_APP_CR_ALLOT_URL`  | URL for processing CR allotment                     |

## Maintenance mode

In order to deploy the frontend in maintenance mode replace `index.html` with `maintenance.html` in the `hosting/rewrites` section of the [firebase.json](firebase.json) file.
