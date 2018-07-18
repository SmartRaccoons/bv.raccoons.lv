import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { settings } from './settings';


export const Game = new Mongo.Collection('game');

Game.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
// Game.helpers({
// })

permissions = {
  login: function (fn){
    return function () {
      if (! this.userId) {
        throw new Meteor.Error('not-authorized');
      }
      return fn.apply(this, arguments)
    }
  },
  owner: function (collection) {
    if (!(collection && collection.owner === this.userId)) {
      throw new Meteor.Error('not-authorized');
    }
  },
};

if (Meteor.isServer) {
  Meteor.publish('game.private', function () {
    return Game.find({owner: this.userId}, {sort: {id: -1}});
  });
  Meteor.publish('user', function () {
    return Meteor.users.find(this.userId);
  });
  import { incrementCounter } from '../counter/model';
  Meteor.methods({
    'game.insert': permissions.login(function() {
      id = incrementCounter('game');
      Game.insert({
        id: id,
        created: new Date(),
        owner: this.userId,
        serve: 0,
        'switch': false,
        teams: [null, null],
        sets: [[0, 0]],
      });
      return id;
    }),
    'user.update.settings': permissions.login(function (value) {
      Meteor.users.update(this.userId, {
        $set: {
          settings: settings(value)
        }
      });
    }),
  });
}
Meteor.methods({
  'game.remove': permissions.login(function(id){
    check(id, String);
    game = Game.findOne(id);
    permissions.owner.apply(this, [game]);
    Game.remove(id);
  }),
});
