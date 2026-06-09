const { getUserId, publicUser } = require('../auth/userService');

function buildUserReference(user) {
  return {
    id_usuario: getUserId(user),
    nombre: publicUser(user).name,
    email: user.email,
  };
}

module.exports = { buildUserReference };
