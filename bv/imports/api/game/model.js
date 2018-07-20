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
      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }
      return fn.apply(this, arguments)
    }
  },
  owner: function (Collection, fn) {
    return permissions.login(function (params) {
        var ob;
        if (params && params._id) {
          check(params._id, String);
          ob = Collection.findOne(params._id);
        } else if (params && params.id) {
          check(params.id, Number);
          ob = Collection.findOne({id: params.id});
        }
        if (!(ob && ob.owner === this.userId)) {
          throw new Meteor.Error('not-authorized');
        }
        return fn.apply(this, Array.from(arguments).concat([ob]));
    });
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
  'game.update.switch': permissions.owner(Game, function (_, ob) {
    Game.update(ob._id, { $set: { 'switch': !ob.switch } });
  }),
  'game.remove': permissions.owner(Game, function(_, ob) {
    Game.remove(ob._id);
  }),
});
