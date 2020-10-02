const admin = require('firebase-admin');

const serviceAccount = require("../admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://social-ape-a8ff8.firebaseio.com",
  storageBucket: "social-ape-a8ff8.appspot.com"
  });

const db = admin.firestore();

module.exports = { admin, db };