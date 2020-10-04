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
        getAuthenticatedUser,
        getUserDetails,
        markNotificationsRead 
      } = require("./handlers/users");



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
app.get('/usuarios/:handle', getUserDetails);
app.post('/notifications', FBAuth,markNotificationsRead);


exports.api = functions.region('us-central1').https.onRequest(app);

//Notificaciones

exports.createNotificationOnLike = functions
  .region('us-central1')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
     return db.doc(`/Screams/${snapshot.data().screamId}`).get()
        .then(doc =>{
          if(doc.exists && 
            doc.data().userHandle !== snapshot.data().userHandle){
             return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'like',
                read: false,
                screamId: doc.id,
                        })
                      }
                })
                .then(() => {
                 //Aquí no tenemos que poner el return con más especificaciones, ya que se trata de un trigger de firebase y no un endpoint.
                  return;
                })
                .catch((err) =>
                  console.error(err));
        });

exports.deleteNotificationOnUnLike = functions
   .region('us-central1')
   .firestore.document('likes/{id}')
   .onDelete((snapshot) => {
        return db
        .doc(`/notifications/${snapshot.id}`)
        .delete()
        .catch((err) => {
            console.error(err);
            return;
        });
        });
exports.createNotificationOnComment = functions
        .region('us-central1')
        .firestore.document('comments/{id}')
        .onCreate((snapshot) => {
          return db
            .doc(`/Screams/${snapshot.data().screamId}`)
            .get()
            .then((doc) => {
              if (
                doc.exists &&
                doc.data().userHandle !== snapshot.data().userHandle
              ) {
                return db.doc(`/notifications/${snapshot.id}`).set({
                  createdAt: new Date().toISOString(),
                  recipient: doc.data().userHandle,
                  sender: snapshot.data().userHandle,
                  type: 'comment',
                  read: false,
                  screamId: doc.id
                });
              }
            })
            .catch((err) => {
              console.error(err);
              return;
            });
        });
  exports.onUserImageChange = functions
      .region('us-central1')
      .firestore.document('/usuarios/{userId}')
      .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());
        if (change.before.data().imageUrl !== change.after.data().imageUrl) {
          console.log('La imagen ha cambiado');
          const batch = db.batch();
          return db
            .collection('Screams')
            .where('userHandle', '==', change.before.data().handle)
            .get()
            .then((data) => {
              data.forEach((doc) => {
                const scream = db.doc(`/Screams/${doc.id}`);
                batch.update(scream, { userImage: change.after.data().imageUrl });
                });
                return batch.commit();
              });
          } else return true;
        });

  exports.onScreamDelete = functions.region('us-central1').firestore.document('/Screams/{screamsId}')
   .onDelete((snapshot, context) =>{
     const screamdId = context.params.screamId;
     const batch =  db.batch();
     return db.collection('comments').where('screamId', '==', screamId).get()
       .then((data) => {
         data.forEach(doc =>{
           batch.delete(db.doc(`/comments/${doc.id}`));
         })
         return db.collection('likes').where('screamId', '==', screamId).get();
       })
       .then((data) => {
        data.forEach(doc =>{
          batch.delete(db.doc(`/comments/${doc.id}`));
        })
        return db.collection('notifications').where('screamId', '==', screamId).get();
      })
      .then((data) => {
        data.forEach(doc =>{
          batch.delete(db.doc(`/notifications/${doc.id}`));
        })
        return batch.commit();
      })
      .catch(err =>{
        console.error(err);
        return res.status(500).json({error: err.code});
      })
       
   })
