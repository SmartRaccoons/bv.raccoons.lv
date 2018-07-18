import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';


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
  Meteor.publish('game', function () {
    return Game.find({owner: this.userId}, {sort: {id: -1}});
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
  });
}
Meteor.methods({
  // 'game.owned': function(owner) {
  //   console.info(owner);
  //   return [{id: 1}]
  //   // return Game.find({owner: owner}, {sort: {id: -1}});
  // },
  // 'game.insert': permissions.login(function() {
  //   id = incrementCounter('game');
  //   Game.insert({
  //     id: id,
  //     created: new Date(),
  //     owner: this.userId,
  //     serve: 0,
  //     'switch': false,
  //     teams: [null, null],
  //     sets: [[0, 0]],
  //   });
  //   return id;
  // }),
  'game.remove': permissions.login(function(id){
    check(id, String);
    game = Game.findOne(id);
    permissions.owner.apply(this, [game]);
    Game.remove(id);
  }),
});
