import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { settings } from './settings';


export const Game = new Mongo.Collection('game');


Game.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
Game.helpers({
  update_attr(attr) {
    Game.update(this._id, { $set: attr });
  },
  sets_total() {
    return [0, 1];
  },
  sets_last() {
    return this.sets[this.sets.length - 1];
  },
  set_end() {

  },
  sets_update(params) {
    var last_index = this.sets.length - 1;
    var team = params.team;
    this.sets[last_index][team]++;
    this.update_attr(Object.assign({
      sets: this.sets
    }, team !== this.serve[0] ? this._serve_next() : null));
  },
  _serve_next() {
    this.serve[0] = (this.serve[0] + 1) % 2;
    this.serve[1] = this.serve_order[this.serve[0]] = (this.serve_order[this.serve[0]] + 1) % 2;
    return {
      serve: this.serve,
      serve_order: this.serve_order,
    };
  },
  serve_update(params) {
    this.serve = [params.serve[0], params.serve[1]];
    this.serve_order[params.serve[0]] = params.serve[1];
    this.update_attr({
      serve: this.serve,
      serve_order: this.serve_order,
    });
  }
});

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
          check(params.id, Match.Integer);
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
        serve_order: [0, 0],
        serve: [0, 0],
        'switch': false,
        teams: [null, null],
        sets: [[0, 0]],
        sets_history: [],
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
  'game.update.point': permissions.owner(Game, function (params, ob) {
    ob.sets_update({team: params.team});
  }),
  'game.update.serve': permissions.owner(Game, function (params, ob) {
    ob.serve_update({serve: params.serve});
  }),
  'game.remove': permissions.owner(Game, function(_, ob) {
    Game.remove(ob._id);
  }),
});
