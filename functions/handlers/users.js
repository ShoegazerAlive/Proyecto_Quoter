const { admin, db } = require('../util/admin');

const config = require('../util/config');

const firebase = require('firebase');

const { uuid } = require("uuidv4");

firebase.initializeApp(config)

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    const { valid, errors } = validateSignupData(newUser);

    if (!valid) return res.status(400).json(errors);

    const noImg = 'blank-profile.png'

let token, userId;
db.doc(`/usuarios/${newUser.handle}`)
        .get()
        .then((doc) => {
            if(doc.exists){
                return res.status(400),json({ handle: 'Este usuario ya ha sido tomado'});
            } else {
               return firebase
                .auth()
                .createUserWithEmailAndPassword(newUser.email, newUser.password) 
            }
        })
        .then((data) => { 
           userId = data.user.uid;
           return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                userId,
            };
            return db.doc(`/usuarios/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            console.error(err);
            if(err.code === "auth/email-already-in-use"){
                return res.status(400).json({ email: 'Este email ya ha sido registrado'}) 
            }else{
            return res.status(500).json({error: err.code});
            }
        });
};

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    const { valid, errors } = validateLoginData(newUser);

    if(!valid) return res.status(400),json(errors);


firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
        return data.user.getIdToken();
    }) 
    .then((token) =>{
        return res.json({token});   
    })
    .catch((err) =>{
        console.error(err);
        if(err.code === 'auth/wrong-password'){
            return res.status(403).json({general: 'Contraseña incorrecta, por favor, vuelva a intentarlo'});
        }else return res.status(500).json({error: err.code});
    })

}

exports.signup = (req, res) => {
    const newUser = {
      email: req.body.email,
      password: req.body.password,
      confirmPassword: req.body.confirmPassword,
      handle: req.body.handle,
    };
  
    const { valid, errors } = validateSignupData(newUser);
  
    if (!valid) return res.status(400).json(errors);
  
    const noImg = "no-img.png";
  
    let token, userId;
    db.doc(`/usuarios/${newUser.handle}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return res.status(400).json({ handle: "Este usuario ya ha sido tomado" });
        } else {
          return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
      })
      .then((data) => {
        userId = data.user.uid;
        return data.user.getIdToken();
      })
      .then((idToken) => {
        token = idToken;
        const userCredentials = {
          handle: newUser.handle,
          email: newUser.email,
          createdAt: new Date().toISOString(),
          //TODO Append token to imageUrl. Work around just add token from image in storage.
          imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
          userId,
        };
        return db.doc(`/usuarios/${newUser.handle}`).set(userCredentials);
      })
      .then(() => {
        return res.status(201).json({ token });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === "auth/email-already-in-use") {
          return res.status(400).json({ email: "Este correo ya está registrado" });
        } else {
          return res
            .status(500)
            .json({ general: "Algo salió mal, por favor vuelva a intentarlo" });
        }
      });
  };
  // Log user in
  exports.login = (req, res) => {
    const user = {
      email: req.body.email,
      password: req.body.password,
    };
  
    const { valid, errors } = validateLoginData(user);
  
    if (!valid) return res.status(400).json(errors);
  
    firebase
      .auth()
      .signInWithEmailAndPassword(user.email, user.password)
      .then((data) => {
        return data.user.getIdToken();
      })
      .then((token) => {
        return res.json({ token });
      })
      .catch((err) => {
        console.error(err);
        // auth/wrong-password
        // auth/user-not-user
        return res
          .status(403)
          .json({ general: "Credenciales incorrectas, por favor, vuelve a intentarlo" });
      });
  };

//Detalles de los usuarios

exports.addUserDetails = (req,res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/usuarios/${req.user.handle}`)
  .update(userDetails)
  .then(() => {
    return res.json({message: 'Información añadida exitosamente'});
  })
  .catch(err => {
    console.error(err)
    return res.status(500).json({error: err.code});
  })

}

// Traer detalles de cualquier usuario

exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/usuarios/${req.params.handle}`)
    .get()
    .then((doc) =>{
      if(doc.exists){
        userData.user = doc.data();
        return db.collection('Screams').where('userHandle', '==', req.params.handle)
        .orderBy('createdAt', 'desc')
        .get();
      }else{
        return res.status(404).json({error: 'Usuario no encontrado'});
      }
    })
    .then((data) =>{
      userData.screams = [];
      data.forEach((doc) =>{
        userData.screams.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          screamId: doc.id,
        })
      });
      return res.json(userData);
    })
    .catch(err =>{
      console.error(err);
      return res.status(500).json({error:err.code});
    })
}

// Traer detalles del usuario

exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/usuarios/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("recipient", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          screamId: doc.data().screamId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Subir imagen de usuario
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  // String for image token
  let generatedToken = uuid();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "El formato del achivo no es el adecuado" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/usuarios/${req.user.handle}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "La imagen se cargó correctamente" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "Algo malo pasó" });
      });
  });
  busboy.end(req.rawBody);
};

exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notificaciones leídas" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};



