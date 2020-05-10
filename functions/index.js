const functions = require('firebase-functions');
var admin = require("firebase-admin");

admin.initializeApp();
admin.firestore().settings( { timestampsInSnapshots: true });
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
            let ids = [];
            //let today = new Date();
            //today.setDate(today.getDate() - 14);
            return collectionRef.get().then(collections => {
                collections.forEach(collection => {
                    console.log('Found subcollection with id:', collection.id);
                    ids.push(collection.id);
                });
                return ids;
            }).then((ids) => {
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


    exports.count_meetings = functions.firestore.document("users/{user_id}/meetings/{metuser_id}/meeetings/{meeting_added}").onCreate((snapshot, context) => {
        const user_id = context.params.user_id;
        const metuser_id = context.params.metuser_id;
        console.log("launching count_meetings");
        const ref = admin.firestore().collection("users/" + user_id + "/meetings").doc(metuser_id);
        console.log(ref.path);
    
        return ref.update({ total_meets: admin.firestore.FieldValue.increment(1) }).catch(error => {
            console.log("setting first entry fot the counter ");
            ref.set({ total_meets: admin.firestore.FieldValue.increment(1) });
        });
    
    });
    exports.count_duration = functions.firestore.document("users/{user_id}/meetings/{metuser_id}/meeetings/{meeting_updated}").onUpdate((change, context) => {
        const user_id = context.params.user_id;
        const metuser_id = context.params.metuser_id;
        console.log("launching count_duration");
        const ref =  admin.firestore().collection("users/" + user_id + "/meetings").doc(metuser_id);
        console.log(ref.path);
        console.log("timestamp : "+change.before.data().foundTimestamp.toDate());
        var foundTimestamp = change.before.data().foundTimestamp.toDate();
        var lostTimestamp = change.after.data().lostTimestamp.toDate();
        if (foundTimestamp === lostTimestamp || (foundTimestamp > lostTimestamp)) {
            console.log("lostTimestamp is equal or bigger than foundTimestamp ");
            return null;
        } else {
            var duration = Math.abs(lostTimestamp-foundTimestamp);
            return ref.update({ total_duration:  admin.firestore.FieldValue.increment(duration) }).catch(error => {
                console.log("setting first entry for the duration");
                ref.set({ total_meets:  admin.firestore.FieldValue.increment(duration) });
            });
        }    
    });