## TODO

- [ ] Check update script. Execute db query automatically.
- [ ] ~~Normalize the way the _ids_ are passed to the _GET_ and _POST_ methods. (Sometimes in _req.params_, sometimes in _req.body_)~~ **No se puede enviar en _req.body_ si es un método _GET_**
- [ ] Show an error message when the signup process fails.
- [ ] Links to users profiles by clicking on their names
- [ ] Allow password recovery.
- [ ] COMMENT CODE
- [ ] Refresh profile.
- [ ] Tamaño de imagenes.
- [ ] Esqueleto para agregar utilities.
- [ ] Enviar Errores verbose desde express al sing(up/in) para mostrarlos directamente en el mensaje de error.
- [ ] Limpiar el Gruntfile.js
- [ ] Arreglar los warning de deprecated
- [ ] Agregar CSS responsive
- [ ] Terminar de parametrizar los estilos en Sass
- [ ] Validación de formulario (que es una table por ahora) en el perfil al modificarlo.
- [x] Ver seguridad [acá](https://crackstation.net/hashing-security.htm)
- [ ] Agregar SSL entre localhost y BDD (pensar si es necesario, puede alguien identificarse remotamente como localhost y asi queryar a la BDD?).
- [ ] Agregar CAPTCHA (esto puede servir si hay riesgo de un ataque masivo, con el objetivo de embocarnos el server, evaluar la necesidad)
- [ ] Tecnicas de hasheado avanzadas, especificamente el slow hashing y hashing encriptado.
- [ ] Hashing en el navegador ?
- [ ] Politica de contrasenas dificiles
- [ ] Cambio de contrasena cada tanto tiempo
