const {
  UserNotVerifiedError,
  PasswordMismatchError,
} = require('~/api/errors');

module.exports = ({ Session, User }) => async function verifyAndCreate(email, password) {
  const user = await User.verify(email, password);

  if (!user.verified) {
    throw new UserNotVerifiedError('User not allowed');
  }

  let session;

  try {
    session = await Session.create({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    throw new PasswordMismatchError(err);
  }

  return {
    user,
    session,
  };
};