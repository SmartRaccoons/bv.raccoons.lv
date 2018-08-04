import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const Share = new Mongo.Collection('share');


Share.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Share.helpers({
  user_name() {
    let user = Meteor.users.findOne(this.user);
    return user ? user.profile.name : this.user;
  },
  owner_name() {
    let user = Meteor.users.findOne(this.owner);
    return user ? user.profile.name : this.user;
  },
});
