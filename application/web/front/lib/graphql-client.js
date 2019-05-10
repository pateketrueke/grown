import FetchQL from 'fetchql';
import { session, conn } from '../shared/stores';

export default (url, options) => {
  const client = new FetchQL({
    url,
    onStart(x) { conn.set({ loading: x > 0 }); },
    onEnd(x) { conn.set({ loading: x > 0 }); },
    ...options,
  });

  function resp(result, callback) {
    const retval = typeof callback === 'function' && callback(result.data);

    if (!retval && result.data) {
      session.update(old => Object.assign(old, result.data));
    }

    return retval;
  }

  function query(gql, data, callback) {
    if (typeof data === 'function') {
      callback = data;
      data = undefined;
    }

    return client
      .query({ query: gql, variables: data })
      .then(result => resp(result, callback));
  }

  function mutation(gql, cb = done => done()) {
    return function call$(...args) { cb((data, callback) => query(gql, data, callback)).apply(this, args); };
  }

  return {
    client,
    query,
    mutation,
  };
};
