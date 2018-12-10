/////////////////////////////////////////////////
//          Import Registered Users from a Spreadsheet(Http Triggered)
//
//      1. Parses a google spreadsheet
//      2. Looks for two sheet --> Registrations
//      3. Loads their data into the equivalent Firebase database paths
/////////////////////////////////////////////////

// Imports
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';

const db = admin.database();

export const importUserRegistrationData = functions.https.onRequest(
    async (req, res) => {
        // Grab the SpreadSheet ID from the Query Parameters
        const spreadSheetId = req.query.spreadSheetId ? req.query.spreadSheetId : null;
        if (!spreadSheetId) {
            res.send({
                message:
                    'Please define the sheet id, e.g spreadSheetId={SpreadSheet ID}',
                status: false
            });
        } else {
            // Variables to populate later (used for sending back a detailed response to the user)
            let usersAdded = [];
            let usersAlreadyExist = [];
            const auth = await google.auth.getClient({
                scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
            });

            const spreadsheet = google.sheets({ version: 'v4', auth });
            spreadsheet.spreadsheets.values.get(
                { spreadsheetId: spreadSheetId, range: 'Registrations' },
                (err, response) => {
                    if (err) {
                        res.send({
                            status: 400,
                            res: {
                                status: false,
                                message: 'Sheet not found',
                                code: 'INVALID_SHEET_ID'
                            }
                        });
                    } else {

                        /* Convert Circular Object returned by Google Spreasheets API to a Object with Key-Value Pairs */
                        var cache = [];
                        var resp = JSON.parse(
                            JSON.stringify(response, function (key, value) {
                                if (typeof value === 'object' && value !== null) {
                                    if (cache.indexOf(value) !== -1) {
                                        // Duplicate reference found
                                        try {
                                            // If this value does not reference a parent it can be deduped
                                            return JSON.parse(
                                                JSON.stringify(value)
                                            );
                                        } catch (error) {
                                            // discard key if value cannot be deduped
                                            return;
                                        }
                                    }
                                    // Store value in our collection
                                    cache.push(value);
                                }
                                return value;
                            })
                        );

                        // Take Actual Values and Field Names apart
                        let sheetFields = resp.data.values[0];
                        let sheetRows = resp.data.values.slice(1);

                        // Filter out users, only allow those that have valid email addresses
                        const users = sheetRows.filter(
                            user =>
                                user[5] != '' &&
                                // Test the user Email using REGEX to disallow users with bogus emails addresses
                                /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                                    // The email of the user
                                    user[5]
                                )
                        );
                        // Store the users that were neglected because of invalid emails
                        const usersNeglected = sheetRows.filter(
                            user =>
                                user[5] == '' ||
                                !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                                    user[5]
                                )
                        );

                        if (!users) {
                            res.send({
                                status: 200,
                                res: {
                                    status: true,
                                    message:
                                        'No valid users found in the available users or fields such as email are invalid',
                                    usersNeglected
                                }
                            });
                        } else {
                            // Prepare to insert data in Firebase
                            users.map(async (user, index) => {
                                let newUser = {};

                                // Preparing the values for DB insertion
                                // Convert the String Date to UNIX Timestamp newCoordniator[2] is the Date's String Format
                                newUser['timestamp'] = user[2]
                                    ? new Date(user[2]).getTime()
                                    : Date.now();
                                // Convert Languages String to Array Type (Split by Commas)
                                newUser['languages'] = {};
                                const langArray = user[8]
                                    ? user[8].replace(' ', '').split(',')
                                    : [];
                                if (langArray) {
                                    langArray.map(langName => {
                                        newUser['languages'][langName] = true;
                                    });
                                }
                                // Map Details Column to notes
                                newUser['notes'] = user[0];

                                // Merge roles colums in to an array of booleans
                                newUser['roles'] = {};
                                const roleFieldArray = sheetFields.slice(10, 15);
                                const roleArray = user.slice(10, 15);
                                if (roleFieldArray) {
                                    roleFieldArray.map((roleFieldName, index) => {
                                        if (roleArray[index] == 'Yes')
                                            newUser['roles'][roleFieldName] = true;
                                    });
                                }

                                // Add other spreadsheet field values to newUser
                                newUser = {
                                    ...newUser,
                                    recommendedBy: user[18],
                                    services: user[9],
                                    isAvailableOnWhatsApp:
                                        user[7] == 'Yes' ? true : false,
                                    experience: user[16],
                                    influencer: user[17],
                                    phoneNumber: user[6],
                                    emailAddress: user[5],
                                    location: user[4],
                                    name: user[3],
                                    status: user[1],
                                    created: Date.now()
                                };

                                const response = () => {
                                    if (index == users.length - 1) {
                                        return {
                                            status: true,
                                            message: `Added ${
                                                usersAdded.length
                                                } users into Firebase and neglected ${usersNeglected.length +
                                                usersAlreadyExist.length} users`,
                                            usersNeglected,
                                            usersAdded,
                                            usersAlreadyExist
                                        };
                                    } else {
                                        return {};
                                    }
                                };
                                // Insert into DB (neglect the users that already exist)
                                await db
                                    .ref(`/users`)
                                    .orderByChild('emailAddress')
                                    .equalTo(newUser['emailAddress'])
                                    .once('value', snapshot => {
                                        if (!snapshot.exists()) {
                                            db.ref(`/users`).push(newUser, err => {
                                                if (!err) {
                                                    usersAdded.push(newUser);
                                                    if (index == users.length - 1) {
                                                        res.send(response());
                                                    }
                                                }
                                            });
                                        } else {
                                            usersAlreadyExist.push(newUser);
                                            res.send(response());
                                        }
                                    });
                            });
                        }
                    }
                }
            );
        }
    }
);

