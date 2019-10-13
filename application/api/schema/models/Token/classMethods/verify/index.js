const {
  TokenExpiredError,
} = require('~/api/errors');

module.exports = ({ Token }) => async function verify(token, type) {
  const query = {
    where: {
      token,
      type,
    },
  };

  const result = await Token.findOne(query);

  if (!result || (new Date() >= result.expirationDate)) {
    throw new TokenExpiredError('Given token has been expired');
  }

  return result;
};
