import { Meteor } from 'meteor/meteor';


export const call = function() {
  var args = Array.prototype.slice.call(arguments);
  var callback = null;
  if (typeof args[args.length - 1] === 'function') {
    callback = args.pop()
  }
  args.push(function (err) {
    if (err) {
      console.info(err);
      alert(err.error);
    }
    if (callback) {
      callback.apply(this, arguments);
    }
  });
  Meteor.call.apply(Meteor, args);
};
