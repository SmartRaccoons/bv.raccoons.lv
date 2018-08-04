import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { settings_validate } from './settings';
import { permissions } from '../permissions'
import { Team, Player } from '../team/model';
import { Share } from '../share/model';


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

let check_team = function(team, length = 0) {
  if(Array.isArray(team)) {
    return team.length === length && team.filter((v)=> { !check_team(v) }).length === 0;
  }
  return (team === 0 || team === 1)
};

Game.helpers({
  update_attr(attr) {
    Game.update(this._id, { $set: attr });
  },
  link() {
    return ['/', this.id].join('');
  },
  link_stats(){
    return ['/', this.id, '/stats'].join('');
  },
  game_length() {
    let ended = this.ended ? this.ended : new Date();
    let diff = Math.floor( ( ended.getTime() - this.started.getTime() ) / 1000 );
    let hours = Math.floor(diff / (60 * 60));
    diff = diff - hours * 60 * 60
    let minutes = Math.floor(diff / (60));
    diff = diff - minutes * 60;
    return [hours, minutes, diff];
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
    let half = this.settings.sets / 2;
    return this.sets.reduce((acc, v)=> {
      if (v[0] > v[1]) {
        acc[0]++;
      } else {
        acc[1]++;
      }
      return acc;
    }, [0, 0]).filter((v)=> v > half).length > 0;
  },
  _set_points_max() {
    return (this.sets.length >= this.settings.sets ? this.settings.set_last_points : this.settings.set_points);
  },
  _set_point_diff(advantage) {
    let set = this.sets.slice(-1)[0];
    let points_end = this._set_points_max() - advantage;
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
    let points_max = this._set_points_max();
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
    if (!check_team(team)) {
      return;
    }
    let opponent = (team + 1) % 2;
    if (player && !check_team(player)) {
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
  history_last_timeout() {
    let history_last = this.history_last_counter(1)[0];
    let result = [false, false];
    if (!(history_last && history_last.action === 'T')) {
      return result;
    }
    result[history_last.team[0]] = true;
    return result;
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
  title() {
    return this.teams_named().map((team)=> {
      return team.name + ' ('  + team.players.join(', ') + ')';
    }).join(' VS ');
  },
  teams_named() {
    return [0, 1].map((team)=> {
      let result = {
        name: 'Team ' + (team + 1),
        players: [0, 1].map((player)=> {
          return 'Player ' + (team * 2 + player + 1);
        }),
      };
      if (!this.teams[team]) {
        return result;
      }
      if (Array.isArray(this.teams[team])) {
        this.teams[team].forEach((player, i)=>{
          if (player) {
            let player_ob = Player.findOne(player);
            if (player_ob) {
              result.players[i] = Player.findOne(player).name;
            }
          }
        });
        return result;
      }
      let team_ob = Team.findOne(this.teams[team]);
      if (!team_ob) {
        return result;
      }
      return Object.assign(result, {
        'name': team_ob.name,
        'players': team_ob.players_name(),
      });
    });
  },
  _player_partner(team_saved, player_id, partner) {
    if (!team_saved) {
      return null;
    }
    if(!Array.isArray(team_saved)) {
      let team = Team.findOne(team_saved);
      if (team.players[partner] !== player_id) {
        return team.players[partner];
      }
      return null;
    }
    if (team_saved[partner] !== player_id) {
      return team_saved[partner];
    }
    return null;
  },
  player_update(params) {
    if (!check_team(params.team, 2)) {
      return;
    }
    let partner = (params.team[1] + 1) % 2;
    let team = null;
    let partner_id = this._player_partner(this.teams[params.team[0]], params.player, partner);
    if (partner_id) {
      team = Team.findOne({
        $or:  [
          { players: {$eq: [partner_id, params.player ]} },
          { players: {$eq: [params.player, partner_id ]} },
        ],
      });
      if (team) {
        this.teams[params.team[0]] = team._id;
      } else {
        this.teams[params.team[0]] = [null, null];
        this.teams[params.team[0]][params.team[1]] = params.player;
        this.teams[params.team[0]][partner] = partner_id;
      }
    } else {
      this.teams[params.team[0]] = [null, null];
      this.teams[params.team[0]][params.team[1]] = params.player;
    }
    this.update_attr({teams: this.teams});
  },
  team_update(params) {
    if (!check_team(params.team)) {
      return;
    }
    let team = Team.findOne(params.team_id);
    if (!team) {
      return;
    }
    let opponnet = (params.team + 1) % 2;
    this.teams[params.team] = params.team_id;
    if (this.teams[opponnet] === this.teams[params.team]) {
      this.teams[opponnet] = null;
    }
    this.update_attr({teams: this.teams});
  },
});

if (Meteor.isServer) {
  import { publishComposite } from 'meteor/reywood:publish-composite';
  let publishComposite_fn = function (owner, limit = 10000) {
    return function(id, gt_id) {
      let params = {};
      if (owner) {
        params.owner = {$in: [this.userId].concat( permissions.shared_owners(this.userId) )};
      }
      if (id) {
        params.id = parseInt(id);
      }
      if (gt_id) {
        params.id = {$gt: parseInt(gt_id)};
      }
      return {
        find(){
          return Game.find(params, {sort: {created: -1}}, {limit: limit})
        },
        children: [
          {
            find(game) {
              let teams = game.teams.filter((team)=> !Array.isArray(team));
              if (teams.length === 0) {
                return null;
              }
              return Team.find({_id: { $in: teams }});
            },
            children: [
              {
                find(team) {
                  if (!team) {
                    return;
                  }
                  return Player.find({_id: { $in: team.players }});
                },
              },
            ],
          }, {
            find(game) {
              let players = [];
              game.teams.forEach((team)=>{
                if (Array.isArray(team)) {
                  players = players.concat(team.filter((player)=> !!player));
                }
              });
              if (players.length === 0) {
                return null;
              }
              return Player.find({_id: { $in: players }});
            }
          }, {
            find(game) {
              return Share.find({owner: game.owner});
            }
          },
        ]
      }
    };
  };
  publishComposite('game.private', publishComposite_fn(true));
  publishComposite('game.public', publishComposite_fn(false, 100));
  Meteor.publish('user', function () {
    return Meteor.users.find(this.userId);
  });
  import { incrementCounter } from '../counter/model';
  Meteor.methods({
    'game.insert': permissions.shared_check(false, function(params) {
      id = incrementCounter('game');
      Game.insert({
        id: id,
        created: new Date(),
        owner: (params && params.owner) ? params.owner : this.userId,
        tournament: null,
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
    'game.update.player': permissions.owner_shared(Game, function (params, ob) {
      ob.player_update({team: params.team, player: params.player});
    }),
    'game.update.team': permissions.owner_shared(Game, function (params, ob) {
      ob.team_update({team: params.team, team_id: params.team_id});
    }),
  });
}
Meteor.methods({
  'game.update.settings': permissions.owner_shared(Game, function (params, ob) {
    let settings = settings_validate(params.settings);
    ob.update_attr({settings: settings})
    Meteor.users.update(this.userId, {
      $set: {
        settings: settings
      }
    });
  }),
  'game.update.switch': permissions.owner_shared(Game, function (_, ob) {
    ob.sets_update_switch();
  }),
  'game.update.point': permissions.owner_shared(Game, function (params, ob) {
    ob.sets_update({team: params.team, action: params.action});
  }),
  'game.update.timeout': permissions.owner_shared(Game, function (params, ob) {
    ob.sets_update_timeout({team: params.team});
  }),
  'game.update.serve': permissions.owner_shared(Game, function (params, ob) {
    ob.serve_update({serve: params.serve});
  }),
  'game.update.undo': permissions.owner_shared(Game, function (params, ob) {
    ob.undo();
  }),
  'game.remove': permissions.owner(Game, function(_, ob) {
    Game.remove(ob._id);
  }),
});
