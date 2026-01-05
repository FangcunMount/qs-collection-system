// 柯里化
function getType(type) {
  return function (v) {
    return Object.prototype.toString.call(v).slice(8, -1) === type;
  };
}

export const isArray = getType("Array");
export const isObject = getType("Object");
export const isString = getType("String");
export const isNumber = getType("Number");
export const isNull = getType("Null");
export const isUndefined = getType("Undefined");

export function isEmpty(v) {
  console.log('in isEmpty, v', v);
  if (isNull(v) || isUndefined(v)) {
    console.log('isEmpty, return true');
    return true;
  }

  let nv = v;
  if (isNumber(nv)) nv = String(nv);

  if (nv.length < 1) {
    console.log('isEmpty, return true');
    return true;
  }

  console.log('isEmpty, return false');
  return false;
}