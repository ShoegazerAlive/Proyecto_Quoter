const { db } = require('../util/admin');

//Llamar todos los screams

exports.getAllScreams = (req, res) =>{
    db
    .collection('Screams')
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
        let Screams = [];
        data.forEach((doc) => {
            Screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt,
                commentCount: doc.data().commentCount,
                likeCount: doc.data().likeCount,
                userImage: doc.data().userImage,
            });
        });
        return res.json(Screams)
    })
    .catch((err) => console.error(err));
}

//Para publicar un scream

exports.postOneScream = (req, res) =>{
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'El body no puede estar vacío' });
    }

     const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
     };

     db
        .collection('Screams')
        .add(newScream)
        .then(doc => {
          const resScream = newScream;
          resScream.screamId = doc.id;
            res.json(resScream);
        })
        .catch(err => {
            res.status(500).json({ error: 'Algo salio mal'});
            console.error(err)
        })
}


//Para llamar un scream

exports.getScream = (req,res) => {
    let screamData = {};

    db.doc(`/Screams/${req.params.screamId}`).get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({ error: "No se encontró el Scream"})
            }
            screamData = doc.data();
            screamData.screamId = doc.id;
            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('screamid', '==', req.params.screamId)
                .get();
        })
        .then((data) => {
            screamData.comments = [];
            data.forEach((doc) =>{
                screamData.comments.push(doc.data())
            });
            return res.json(screamData);
        })
        .catch((err) =>{
            console.error(err);
            res.status(500).json({ error: err.code});
        })

}

//Para comentar en el scream

exports.commentOnScream = (req, res) => {
    if (req.body.body.trim() === '')
      return res.status(400).json({ comment: 'No debe etar vacío' });
  
    const newComment = {
      body: req.body.body,
      createdAt: new Date().toISOString(),
      screamId: req.params.screamId,
      userHandle: req.user.handle,
      userImage: req.user.imageUrl
    };
    console.log(newComment);
  
    db.doc(`/Screams/${req.params.screamId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'No se encontró el scream' });
        }
        return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
      })
      .then(() => {
        return db.collection('comments').add(newComment);
      })
      .then(() => {
        res.json(newComment);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).json({ error: 'Algo salió mal' });
      });
  };

  exports.likeScream =  (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
      .where('screamId', '==', req.params.screamId).limit(1);

    const screamDocument = db.doc(`/Screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
      .then((doc) =>{
        if(doc.exists){
          screamData = doc.data();
          screamData.screamId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'No se encontró el Scream'});
        }
      })
      .then((data) =>{
        if(data.empty){
          return db.collection('likes')
          .add({
            screamId: req.params.screamId,
            userHandle: req.user.handle
          })
          .then(() =>{
            screamData.likeCount++
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() =>{
            return res.json(screamData);
          })
        } else {
          return res.status(400).json({ error: 'Ya le diste me gusta'});
        }
      })
      .catch(err =>{
        console.error(err);
        res.status(500).json({ error: err.code})
      })
  };

  exports.unlikeScream = (req,res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
      .where('screamId', '==', req.params.screamId).limit(1);

    const screamDocument = db.doc(`/Screams/${req.params.screamId}`);

    let screamData = {};

    screamDocument.get()
      .then((doc) =>{
        if(doc.exists){
          screamData = doc.data();
          screamData.screamId = doc.id;
          return likeDocument.get();
        } else {
          return res.status(404).json({ error: 'No se encontró el Scream'});
        }
      })
      .then((data) =>{
        if(data.empty){
          return res.status(400).json({ error: 'No le has dado me gusta'});
        } else {
          return db.doc(`/likes/${data.docs[0].id}`).delete()
          .then(() => {
            screamData.likeCount--;
            return screamDocument.update({ likeCount: screamData.likeCount});
          })
          .then(() =>{
            res.json(screamData);
          })
        }
      })
      .catch(err =>{
        console.error(err);
        res.status(500).json({ error: err.code})
      })
  };

  exports.deleteScream = (req, res) =>{
    const document = db.doc(`/Screams/${req.params.screamId}`);
    document.get()
      .then(doc =>{
        if(!doc.exists){
          return res.status(404).json({ error: 'No se encontró el grito'});
        }
        if(doc.data().userHandle !== req.user.handle){
          return res.status(403).json({ error: 'Sin autorización'})
        } else {
          return document.delete();
        }
      })
      .then(() => {
        res.json({ message: 'Se ha borrado el grito exitosamente'});
      })
      .catch((err) =>{
        console.error(err);
        return res.status(500).json({ error: err.code});
      })
  }