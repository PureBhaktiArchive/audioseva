# Development

## Project setup

All env variables with FIREBASE in them are taken from the Firebase project.
Add the following variables into your `.env.development.local` file:

- `VUE_APP_FIREBASE_API_KEY`
- `VUE_APP_FIREBASE_AUTH_DOMAIN`
- `VUE_APP_FIREBASE_DATABASE_URL`
- `VUE_APP_FIREBASE_STORAGE_BUCKET`
- `VUE_APP_SOUND_EDITING_UPLOADS_BUCKET` - a Firebase bucket for storing sound engineers' uploads
- `VUE_APP_ASSIGNEES_URL` - Integromat URL for assignees
- `VUE_APP_CR_LISTS_URL` - URL for CR lists
- `VUE_APP_CR_FILES_URL` - Integromat URL for CR files
- `VUE_APP_CR_ALLOT_URL` - Integromat URL for CR allot

# Deployment

## Firebase project set up

1. [Create a Firebase project](https://console.firebase.google.com).
1. [Add a web app in the Firebase console](https://console.firebase.google.com/project/_/settings/general/). Also set up Firebase Hosting for this app during adding it.
1. [Connect custom domain `app.[base domain]` to the hosting](https://console.firebase.google.com/project/_/hosting/main).
1. [Enable Sign-in providers](https://console.firebase.google.com/project/_/authentication/providers).
1. [Add custom domain into Authorized domains](https://console.firebase.google.com/project/_/authentication/providers).
1. [Set up consent screen](https://console.developers.google.com/apis/credentials/consent).
1. [Create a database](https://console.firebase.google.com/project/_/database).
1. [Create a user with coordinator role in the database](https://console.firebase.google.com/project/_/database/_/data/users). See https://trello.com/c/6Y8W4LsR/51-authorization for details.
1. [Create storage buckets](https://console.firebase.google.com/project/_/storage/_/files): `original`, `te.uploads`, `edited`, `restored`.
1. [Set up deploy targets for Cloud Storage](https://firebase.google.com/docs/cli/targets#set-up-deploy-target-storage-database): `uploads`.
1. [Set functions environment configuration](https://firebase.google.com/docs/functions/config-env), see all the configuration parameters described below.
1. [Enable Sheets API for the project](https://console.developers.google.com/apis/api/sheets.googleapis.com/overview).
1. Add [App Engine default service account](https://console.developers.google.com/apis/api/sheets.googleapis.com/credentials) as editor to all the Google spreadsheets and allow it to edit protected ranges.
1. Deploy: `firebase deploy`.

## Environment configuration parameters

| Variable                          | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `project.domain`                  | Root domain used for hosting and storage           |
| `website.old.base_url`            | Base url of the old website                        |
| `send_in_blue.key`                | SendInBlue secret Key                              |
| `coordinator.email_address`       | Coordinator email address                          |
| `coordinator.timezone`            | Coordinator timezone. For example, `Asia/Calcutta` |
| `sqr.spreadsheetId`               | Sound Quality Reporting spreadsheet id             |
| `registrations.spreadsheet_id`    | User registrations spreadsheet id                  |
| `cr.submissions.spreadsheet.id`   | Content Reporting submissions spreadsheet id       |
| `cr.processing.spreadsheet.id`    | Content Reporting Processing spreadsheet id        |
| `cr.allotments.spreadsheet.id`    | Content Reporting allotments spreadsheet id        |
| `donations.cash.spreadsheet.id`   | Donations spreadsheet id                           |
| `donations.cash.spreadsheet.name` | Donations sheet name                               |
| `donations.contact.email_address` | Email address used in donations communication      |
| `te.allotments.spreadsheet.id`    | Track Editing Allotments spreadsheet id            |
| `te.tasks.spreadsheet.id`         | Track Editing Tasks Creation spreadsheet id        |

## Frontend

### Maintenance mode

In order to deploy the frontend in maintenance mode replace `index.html` with `maintenance.html` in the `hosting/rewrites` section of the [firebase.json](firebase.json) file.
