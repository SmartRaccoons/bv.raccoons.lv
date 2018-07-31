var values = {
  'advantage': [true, false],
  'switch': ['sum 1/3', 'first 1/2', 'set'],
  'sets': {default: 3, range: [1, 5]},
  'set_points': {default: 21, range: [1, 51]},
  'set_last_points': {default: 15, range: [1, 51]},
};
var values_default = Object.keys(values).reduce(function (acc, value){
  if (Array.isArray(values[value])) {
    acc[value] = values[value][0];
  } else {
    acc[value] = values[value].default;
  }
  return acc;
}, {});
var values_callbacks = Object.keys(values).reduce(function (acc, value){
  if (Array.isArray(values[value])) {
    acc[value] = (function (array){
      return function (v) {
        if (array.indexOf(v) > -1) {
          return v;
        }
        return array[0];
      };
    })(values[value]);
  } else {
    acc[value] = (function (params){
      return function (v) {
        if ((params.range[0] <= v) && (params.range[1] >= v)) {
          return v;
        }
        return params.default;
      };
    })(values[value]);
  }
  return acc;
}, {});
exports.settings_values = values;
exports.settings_validate = function (v) {
  return Object.keys(values).reduce(function (acc, value){
    if (v && value in v) {
      acc[value] = values_callbacks[value](v[value]);
    } else {
      acc[value] = values_default[value];
    }
    return acc;
  }, {});
};
