'use strict';

function flattenArray(array, result) {
  result = result || [];

  for (let i = 0; i < array.length; i += 1) {
    if (Array.isArray(array[i])) {
      flattenArray(array[i], result);
    } else {
      result.push(array[i]);
    }
  }

  return result;
}

function extendValues(out) {
  out = out || {};

  Array.prototype.slice.call(arguments, 1)
    .forEach(source => {
      if (Object.prototype.toString.call(source) === '[object Object]') {
        Object.keys(source).forEach(key => {
          if (Object.prototype.toString.call(source[key]) === '[object Object]') {
            out[key] = extendValues(out[key], source[key]);
          } else {
            out[key] = source[key];
          }
        });
      }
    });

  return out;
}

function getProp(source, key, defvalue) {
  const keys = key.split('.');

  let obj = source;

  try {
    while (keys.length) {
      key = keys.shift();

      if (!key) {
        break;
      }

      obj = obj[key];
    }
  } catch (e) {
    // do nothing
  }

  if (typeof obj === 'undefined' && typeof defvalue === 'undefined') {
    throw new Error(`Missing property for: ${key}`);
  }

  if (typeof obj === 'undefined' && defvalue instanceof Error) {
    throw defvalue;
  }

  return typeof obj === 'undefined'
    ? defvalue
    : obj;
}

function setProp(target, key, value) {
  const keys = key.split('.');

  let obj = target;

  try {
    do {
      key = keys.shift();

      if (!keys.length) {
        break;
      }

      if (!obj[key]) {
        obj[key] = {};
      }

      obj = obj[key];
    } while (keys.length);

    obj[key] = value;
  } catch (e) {
    throw new Error(`Cannot set property '${key}'`);
  }
}

function resolveValues(obj, filter) {
  const target = {};

  /* istanbul ignore else */
  if (!obj || Array.isArray(obj) || typeof obj.pipe === 'function' || typeof obj !== 'object') {
    throw new Error(`Unsupported object to resolve, given: ${obj}`);
  }

  Object.keys(obj).forEach(key => {
    const value = typeof filter === 'function'
      ? filter(obj[key], key)
      : obj[key];

    /* istanbul ignore else */
    if (typeof value !== 'undefined' && value !== null) {
      target[key] = typeof value.pipe === 'function'
        ? new Promise((resolve, reject) => {
          const chunks = [];

          value.on('error', err => reject(err));
          value.on('data', msg => chunks.push(msg));
          value.on('end', () => resolve(Buffer.concat(chunks)));
        })
        : value;
    }
  });

  return Promise.all(Object.keys(target).map(key =>
    Promise.resolve(target[key]).then(value => {
      target[key] = value;
    })))
    .then(() => target);
}

module.exports = {
  resolveValues,
  extendValues,
  flattenArray,
  getProp,
  setProp,
};
