import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { settings_validate } from './settings';


export const Game = new Mongo.Collection('game');


Game.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export const actions_default = [
  {ev: '', points: 1},
  {ev: 'se', points: -1, text: 'Serve error'},
  {ev: 'sa', points: 1, text: 'Serve ace'},
  {ev: 'ae', points: -1, text: 'Attack error'},
  {ev: 'ak', points: 1, text: 'Attack kill'},
  {ev: 'be', points: -1, text: 'Block error'},
  {ev: 'b', points: 1, text: 'Block'},
  {ev: 'e', points: -1, text: 'Error'},
];
Game.helpers({
  update_attr(attr) {
    Game.update(this._id, { $set: attr });
  },
  sets_result() {
    return this.sets_played().reduce((acc, v)=>{
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
    return this.sets.length >= this.settings.sets
  },
  _set_point_diff(advantage) {
    let set = this.sets.slice(-1)[0];
    let points_end = (this._set_is_last() ? this.settings.set_last_points : this.settings.set_points) - advantage;
    if (set[0] >= points_end || set[1] >= points_end) {
      if (!this.settings.advantage) {
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
  info() {
    let set_point = this._set_point();
    let set_last = this._set_is_last();
    let info = ['', ''];
    if (set_point !== false) {
      info[set_point] = set_last ? 'M' : 'S';
    }
    return info;
  },
  timeouts() {
    let timeouts_history = this.sets_history[this.sets.length - 1].filter((v)=>{ return v.action === 'T'});
    return [0, 1].map((team)=>{
      return timeouts_history.filter((v)=>{ return v.team[0] === team}).length;
    });
  },
  switches() {
    return this.sets_history[this.sets.length - 1].filter((v)=>{ return v.action === 'SW'}).length;
  },
  switch_highlight() {
    let history = this.sets_history[this.sets.length - 1];
    let history_switched = history && history.length > 0 && history[history.length-1].action === 'SW';
    let points = this.sets[this.sets.length - 1];
    let points_total = points[0] + points[1];
    let points_max = (this._set_is_last() ? this.settings.set_last_points : this.settings.set_points);
    if (this.settings.switch === 'set') {
      return this.sets.length > 1 && points_total === 0 && !history_switched;
    }
    if (points_total === 0) {
      return false;
    }
    if (this.settings.switch === 'sum 1/3' &&
      !(points_total % Math.ceil(points_max / 3) === 0)) {
      return false;
    }
    if (this.settings.switch === 'first 1/2' &&
      !(
        ( ( points[0] % Math.ceil(points_max / 2) === 0 ) && points[0] > points[1]) ||
        ( ( points[1] % Math.ceil(points_max / 2) === 0 ) && points[1] > points[0])
      ) ) {
      return false;
    }
    return !history_switched;
  },
  sets_update(params) {
    if (this.ended) {
      return;
    }
    let attr_update = {};
    let last_index = this.sets.length - 1;
    let team = params.team[0];
    let player = params.team[1];
    if (!(team === 0 || team === 1)) {
      return;
    }
    let opponent = (team + 1) % 2;
    if (player && !(player === 0 || player === 1)) {
      return;
    }
    if (actions_default.filter((v)=> v.ev === params.action).length === 0) {
      return;
    }
    if (this.sets[0][0] === 0 && this.sets[0][1] === 0) {
      attr_update.started = new Date();
    }
    let point = this._history_add([0, 1].indexOf(player) > -1 ? [team, player] : [team], params.action);
    if (point === 1) {
      this.sets[last_index][team]++;
    } else {
      this.sets[last_index][opponent]++;
    }
    if (this._set_end()) {
      if (this._set_is_last()) {
        attr_update.ended = new Date();
      } else {
        this.sets.push([0, 0]);
        this.sets_history.push([]);
      }
    }
    if ((point === 1 && team !== this.serve[0]) || (point === -1 && team === this.serve[0])) {
      attr_update = Object.assign(attr_update, this._serve_next());
    }
    this.update_attr(Object.assign({
      sets: this.sets,
      sets_history: this.sets_history,
    }, attr_update));
  },
  sets_update_timeout(params) {
    if (this.ended) {
      return;
    }
    let team = params.team;
    this._history_add([team], 'T');
    this.update_attr({
      sets_history: this.sets_history,
    });
  },
  sets_update_switch() {
    if (this.ended) {
      return;
    }
    let history = this.sets_history[this.sets.length - 1];
    if (history && history.length > 0 && history[history.length - 1].action === 'SW') {
      this.sets_history[this.sets.length - 1].pop();
    } else {
      this._history_add([], 'SW');
    }
    this.update_attr({
      'switch': !this.switch,
      sets_history: this.sets_history,
    });
  },
  sets_played() {
    return this.sets.slice(0, this.ended ? this.sets.length : this.sets.length - 1);
  },
  _history_add(team, action) {
    let point = 0;
    let action_attr = actions_default.filter((v)=> v.ev === action)[0];
    if (action_attr) {
      point = action_attr.points;
    }
    this.sets_history[this.sets.length - 1].push({
      team: team,
      serve: [this.serve[0], this.serve[1]],
      point: point,
      action: action,
      added: new Date(),
    });
    return point;
  },
  history_last() {
    let actions_default_ev = actions_default.map((v)=> v.ev);
    for (let i = this.sets.length - 1; i > -1; i--) {
      for (let j = this.sets_history[i].length - 1; j > -1; j--) {
        if (actions_default_ev.indexOf(this.sets_history[i][j].action) > -1) {
          return this.sets_history[i][j];
        }
      }
    }
  },
  history_last_counter(total = 4) {
    let collect = [];
    for (let i = this.sets.length - 1; i > -1; i--) {
      for (let j = this.sets_history[i].length - 1; j > -1; j--) {
        collect.push(this.sets_history[i][j]);
        if (collect.length >= total) {
          return collect;
        }
      }
      collect.push({action: 'SET'})
    }
    return collect;
  },
  history_all() {
    return this.sets.map((v, i)=> {
      return {
        result: v,
        history: this.sets_history[i],
      }
    });
  },
  history_stats() {
     return actions_default.filter((v)=> v.ev !== '').map((v)=>{
      v.stats = [[0, 0], [0, 0]];
      this.sets_history.forEach((set)=>{
        set.forEach((point)=>{
          if(v.ev === point.action && point.team.length === 2) {
            v.stats[point.team[0]][point.team[1]]++;
          }
        });
      });
      return v;
    }).filter((v)=> (v.stats[0][0] + v.stats[0][1] + v.stats[1][0] + v.stats[1][1]) > 0 );
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
  serve_player() {
    return this.serve[0] * 2 + this.serve[1];
  },
  edited() { return this.sets_history[0].length > 0 },
  undo() {
    if (!this.edited()) {
      return;
    }
    let attr_update = {};
    let last_index = this.sets.length - 1;
    let last_history = this.sets_history[last_index].pop();
    if (!last_history) {
      this.sets.pop();
      this.sets_history.pop();
      return this.undo();
    }
    let team = last_history.team[0];
    let opponent = (team + 1) % 2;
    if (last_history.point === 1) {
      this.sets[last_index][team]--;
    }
    if (last_history.point === -1) {
      this.sets[last_index][opponent]--;
    }
    if (last_history.action === 'SW') {
      attr_update.switch = !this.switch;
    }
    if (this.serve[0] !== last_history.serve[0]) {
      this.serve_order[opponent] = (this.serve_order[opponent] + 1) % 2;
    }
    if (this.ended) {
      attr_update.ended = null;
    }
    if (this.sets_history[0].length === 0) {
      attr_update.started = null;
    }
    this.update_attr(Object.assign({
      sets: this.sets,
      sets_history: this.sets_history,
      serve: [last_history.serve[0], last_history.serve[1]],
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
        let ob;
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
  Meteor.publish('game.public', function (id) {
    let params = {};
    if (id) {
      params.id = parseInt(id);
    }
    return Game.find(params, {sort: {id: -1}});
  });
  Meteor.publish('game.private', function (id) {
    let params = {owner: this.userId};
    if (id) {
      params.id = parseInt(id);
    }
    return Game.find(params, {sort: {id: -1}});
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
        started: null,
        ended: null,
        settings: settings_validate(Meteor.users.findOne(this.userId).settings),
      });
      return id;
    }),
  });
}
Meteor.methods({
  'game.update.settings': permissions.owner(Game, function (params, ob) {
    let settings = settings_validate(params.settings);
    ob.update_attr({settings: settings})
    Meteor.users.update(this.userId, {
      $set: {
        settings: settings
      }
    });
  }),
  'game.update.switch': permissions.owner(Game, function (_, ob) {
    ob.sets_update_switch();
  }),
  'game.update.point': permissions.owner(Game, function (params, ob) {
    ob.sets_update({team: params.team, action: params.action});
  }),
  'game.update.timeout': permissions.owner(Game, function (params, ob) {
    ob.sets_update_timeout({team: params.team});
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
