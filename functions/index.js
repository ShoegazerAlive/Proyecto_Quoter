const functions = require('firebase-functions');

const app = require('express')();

const FBAuth = require('./util/fbAuth');

const { db } = require('./util/admin');

serviceAccount = require("./admin.json");

const { getAllScreams, 
        postOneScream, 
        getScream, 
        commentOnScream,
        likeScream,
        unlikeScream,
        deleteScream } = require('./handlers/screams');
const { signup, 
        login, 
        uploadImage, 
        addUserDetails, 
        getAuthenticatedUser } = require("./handlers/users");



//Rutas de los Gritos
app.get('/Screams', getAllScreams);
app.post('/Scream', FBAuth, postOneScream);
app.get('/Scream/:screamId', getScream);
app.post('/Scream/:screamId/comment', FBAuth, commentOnScream);
app.get('/Scream/:screamId/like', FBAuth, likeScream);
app.get('/Scream/:screamId/unlike', FBAuth, unlikeScream);
app.delete('/Scream/:screamId', FBAuth, deleteScream);

//Rutas para el inicio de sesión

app.post('/signup', signup);
app.post('/login', login);
app.post('/usuarios/image', FBAuth, uploadImage);
app.post('/usuarios', FBAuth, addUserDetails);
app.get('/usuarios', FBAuth, getAuthenticatedUser);



exports.api = functions.region('us-central1').https.onRequest(app);

//Notificaciones

exports.createNotificationOnLike = functions.region('us-central1').firestore.document('likes/{id')
        .onCreate((snapshot) => {
           db.doc(`/Screams/${snapshot.data().screamId}`).get()
                .then(doc =>{
                       if(doc.exists){
                        return db.doc(`/notifications/${snapshot.id}`).set({
                                createdAt: new Date().toISOString()
                        })
                      }
                })
        })


