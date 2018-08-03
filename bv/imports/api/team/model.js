import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';

import { permissions } from '../permissions';

export const Player = new Mongo.Collection('player');

export const Team = new Mongo.Collection('team');


Team.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
Player.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

Team.helpers({
  players_name() {
    return this.players.map((player)=> {
      let player_ob = Player.findOne(player);
      if (!player_ob) {
        return '';
      }
      return player_ob.name;
    });
  }
})

if (Meteor.isServer) {

  Meteor.publish('team.private', function (owner) {
    check(owner, String)
    return Team.find({
      owner: owner,
    });
  });
  Meteor.publish('player.private', function (owner) {
    check(owner, String)
    return Player.find({
      owner: owner,
    });
  });

  Meteor.methods({
    'player.insert': permissions.shared_check(true, function(params) {
      if (!params) {
        throw new Meteor.Error('not-authorized');
      }
      check(params.name, String);
      return Player.insert({
        name: params.name,
        created: new Date(),
        owner: params.owner,
      });
    }),
  });

  Meteor.methods({
    'team.insert': permissions.shared_check(true, function(params) {
      if (!params) {
        throw new Meteor.Error('not-authorized');
      }
      check(params.name, String);
      check(params.players[0], String);
      check(params.players[1], String);
      if ( !(Player.findOne(params.players[0]) && Player.findOne(params.players[1])) ) {
        throw new Meteor.Error('not-authorized');
      }
      let team = Team.findOne({
        $or:  [
          { players: {$eq: [params.players[0], params.players[1] ]} },
          { players: {$eq: [params.players[1], params.players[0] ]} },
        ],
      });
      if (team) {
        return team;
      }
      return Team.insert({
        name: params.name,
        players: [params.players[0], params.players[1]],
        created: new Date(),
        owner: params.owner,
      });
    }),
  });
}
