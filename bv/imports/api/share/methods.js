import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { Share } from './model';
import { permissions } from '../permissions';


Meteor.publish('users.all', function () {
  return Meteor.users.find();
});
Meteor.publish('share.private', function () {
  return Share.find({$or: [
    {owner: this.userId},
    {user: this.userId},
  ]});
});

Meteor.methods({
  'share.insert': permissions.login(function(params) {
    if (!params) {
      throw new Meteor.Error('not-authorized');
    }
    check(params.user, String);
    if (params.user === this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    let user = Meteor.users.findOne(params.user);
    if (!user) {
      throw new Meteor.Error('not-authorized');
    }
    let share = Share.findOne({owner: this.userId, user: params.user});
    if (share) {
      return;
    }
    return Share.insert({
      owner: this.userId,
      user: user._id,
    });
  }),
  'share.remove': permissions.owner(Share, function(_, ob) {
    Share.remove(ob._id);
  }),
});
