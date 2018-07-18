import { Mongo } from 'meteor/mongo';

Counter = new Mongo.Collection('counter')


exports.incrementCounter = function (name){
  collection = Counter.rawCollection()
  doc = Meteor.wrapAsync(collection.findAndModify, collection)({_id: name}, null, {$inc: {seq: 1}}, {new: true, upsert: true});
  return doc.value.seq;
}
