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
  sets_result() {
    return this.sets.slice(0, this.ended ? this.sets.length : this.sets.length - 1).reduce((acc, v)=>{
      if (v[0] > v[1]) {
        acc[0]++;
      } else {
        acc[1]++;
      }
      return acc;
    }, [0, 0]);
  },
  sets_last() {
    return this.sets[this.sets.length - 1];
  },
  _set_is_last() {
    var settings = this._settings();
    return this.sets.length >= settings.sets
  },
  _set_point_diff(advantage) {
    var set = this.sets.slice(-1)[0];
    var settings = this._settings();
    var points_end = (this._set_is_last() ? settings.set_last_points : settings.set_points) - advantage;
    if (set[0] >= points_end || set[1] >= points_end) {
      if (!settings.advantage) {
        return set[0] > set[1] ? 0 : 1;
      }
      if (Math.abs(set[0] - set[1]) >= ( 2 - advantage)) {
        return set[0] > set[1] ? 0 : 1;
      }
    }
    return false;
  },
  _set_point() { return this._set_point_diff(1); },
  _set_end() { return this._set_point_diff(0) !== false; },
  _last_set_index() {
    this.sets.length - 1;
  },
  _settings(){
    return settings(Meteor.users.findOne(Meteor.userId()).settings);
  },
  sets_update(params) {
    if (this.ended) {
      return;
    }
    var attr_update = {};
    var last_index = this.sets.length - 1;
    var team = params.team;
    this.sets[last_index][team]++;
    this.sets_history[last_index].push({
      team: [team],
      serve: [this.serve[0], this.serve[1]],
      point: 1,
      // action: '',
    });
    if (this._set_end()) {
      if (this._set_is_last()) {
        attr_update.ended = new Date();
      } else {
        this.sets.push([0, 0]);
        this.sets_history.push([]);
      }
    }
    if (team !== this.serve[0]) {
      attr_update = Object.assign(attr_update, this._serve_next());
    }
    this.update_attr(Object.assign({
      sets: this.sets,
      sets_history: this.sets_history,
    }, attr_update));
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
  },
  edited() { return (!(this.sets[0][0] === 0 && this.sets[0][1] === 0))},
  undo() {
    if (!this.edited()) {
      return;
    }
    var attr_update = {};
    var last_index = this.sets.length - 1;
    var last_history_index = this.sets_history[last_index].length - 1;
    if (last_history_index < 0) {
      this.sets.pop();
      this.sets_history.pop();
      return this.undo();
    }
    var last_history = this.sets_history[last_index][last_history_index];
    var team = last_history.team[0];
    var opponent = (team + 1) % 2;
    this.sets[last_index][team]--;
    if (this.serve[0] !== last_history.serve[0]) {
      this.serve_order[opponent] = (this.serve_order[opponent] + 1) % 2;
    }
    if (this.ended) {
      attr_update.ended = null;
    }
    this.serve = [last_history.serve[0], last_history.serve[1]];
    this.sets_history[last_index].pop();
    this.update_attr(Object.assign({
      sets: this.sets,
      sets_history: this.sets_history,
      serve: this.serve,
      serve_order: this.serve_order,
    }, attr_update));
  },
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
        sets_history: [[]],
        ended: null,
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
  'game.update.undo': permissions.owner(Game, function (params, ob) {
    ob.undo();
  }),
  'game.remove': permissions.owner(Game, function(_, ob) {
    Game.remove(ob._id);
  }),
});
