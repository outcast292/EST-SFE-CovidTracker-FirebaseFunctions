const functions = require('firebase-functions');
var admin = require("firebase-admin");

admin.initializeApp();
admin.firestore().settings({ timestampsInSnapshots: true });
exports.sendPushNotification = functions.firestore
    .document('users/{userID}')
    .onUpdate((change, context) => {
        let status = change.after.data().status;
        let comp = (status !== "Contamined");
        const userID = context.params.userID;
        console.log(` comparison status : ${comp} `);
        if (comp) {
            console.log(` ${userID} not contamined : ${status} `);
            return "not contamined";
        } else {
            console.log(` ${userID} contamined : ${status} `);

            let collectionRef = admin.firestore().collection("users/" + userID + "/meetings");
            console.log(`Reference with name: ${collectionRef.path}`);
            let today = new Date();

            let getindexes = new Promise(function (resolve) {
                let ids = [];
                for (let index = 0; index < 14; index++) {
                    var tosearch = new Date();
                    tosearch.setDate(today.getDate() - index);
                    var dd = tosearch.getDate();
                    var mm = tosearch.getMonth() + 1;
                    var yyyy = tosearch.getFullYear();
                    if (dd < 10) {
                        dd = '0' + dd;
                    }

                    if (mm < 10) {
                        mm = '0' + mm;
                    }
                    tosearch = yyyy + "-" + mm + "-" + dd;

                    collectionRef.doc(tosearch).listCollections().then(cols => {
                        console.log(collectionRef.path + "/" + tosearch + " :  found");
                        cols.forEach(doc => {
                            console.log('Found subdoc with id:', collection.id);
                            ids.push(collection.id);
                        });
                        resolve([... new Set(ids)]);
                        return [... new Set(ids)];

                    }).catch(error => {
                        console.log(collectionRef.path + "/" + tosearch + " :  not found");

                    });
                }
            });

            return getindexes.then((ids) => {
                console.log("IDs: " + ids);
                return ids.forEach((e) => {
                    console.log("checking for user :" + e);
                    let usersRef = admin.firestore().collection('users');
                    let documentRef = usersRef.doc(e);
                    return documentRef.get().then(s => {
                        var token = s.data().token;
                        console.log("token: " + token);
                        var message = {
                            notification: {
                                title: 'TEST',
                                body: 'm testing if it works after collections'
                            },
                            data: {
                                id: userID,
                                oldStatus: change.before.data().status,
                                newStatus: change.after.data().status

                            },
                            token: token
                        };
                        return admin.messaging().send(message)
                            .then((response) => {
                                return console.log("Sent message to ", token);
                            })
                            .catch((error) => {
                                return console.log('Error sending message', error);
                            });
                    });
                });
            });
        }

    });

exports.count_meetings = functions.firestore.document('users/{user_id}/meetings/{date_meeting}/{metuser_id}/{meeting_added}').onCreate((snapshot, context) => {
    const user_id = context.params.user_id;
    const metuser_id = context.params.metuser_id;
    const date_meeting = context.params.date_meeting;
    const meeting_added = context.params.meeting_added;


    console.log("launching count_meetings");
    console.log("date = " + date_meeting);
    if (meeting_added === "meeting_info")
        return "just adding info";

    const ref = admin.firestore().collection("users/" + user_id + "/meetings/" + date_meeting + "/" + metuser_id).doc("meeting_info");
    console.log(ref.path);
    const ref2 = admin.firestore().collection("users/" + user_id + "/meetings").doc(date_meeting);
    console.log(ref2.path);

    return ref.update({ total_meets: admin.firestore.FieldValue.increment(1), meeting_date: date_meeting }).catch(error => {
        console.log("setting first entry fot the counter ");
        ref.set({ total_meets: admin.firestore.FieldValue.increment(1), meeting_date: new Date(date_meeting) });
    }).then(ref2.update({ total_meets: admin.firestore.FieldValue.increment(1) }).catch(error => {
        console.log("setting first entry fot the counter ");
        ref2.set({ total_meets: admin.firestore.FieldValue.increment(1) });

    }));

});
exports.count_duration = functions.firestore.document('users/{user_id}/meetings/{date_meeting}/{metuser_id}/{meeting_updated}').onUpdate((change, context) => {
    const user_id = context.params.user_id;
    const metuser_id = context.params.metuser_id;
    const date_meeting = context.params.date_meeting;
    const meeting_updated = context.params.meeting_updated;
    console.log("launching count_duration");
    if (meeting_updated === "meeting_info")
        return "just adding info";
    const ref = admin.firestore().collection("users/" + user_id + "/meetings/" + date_meeting + "/" + metuser_id).doc("meeting_info");
    const ref2 = admin.firestore().collection("users/" + user_id + "/meetings").doc(date_meeting);
    console.log(ref.path);
    console.log("timestamp : " + change.before.data().foundTimestamp.toDate());
    var foundTimestamp = change.before.data().foundTimestamp.toDate();
    var lostTimestamp = change.after.data().lostTimestamp.toDate();
    if (foundTimestamp === lostTimestamp || (foundTimestamp > lostTimestamp)) {
        console.log("lostTimestamp is equal or bigger than foundTimestamp ");
        return null;
    } else {
        var duration = Math.abs(lostTimestamp - foundTimestamp);
        return ref.update({ total_duration: admin.firestore.FieldValue.increment(duration) }).catch(error => {
            console.log("setting first entry for the duration");
            ref.set({ total_meets: admin.firestore.FieldValue.increment(duration) })

        }).then(ref2.update({ total_duration: admin.firestore.FieldValue.increment(duration) })
            .catch(error => {
                console.log("setting first entry for the duration");
                ref2.set({ total_duration: admin.firestore.FieldValue.increment(duration) });
            }));
    }
});