import './games.html';

import { Template } from 'meteor/templating';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { Game } from '../../../api/game/model';
import { Share } from '../../../api/share/model';
import { call } from '../methods';
import { ModalConfirm } from '../modal/modal.confirm';


Template.App_game.onCreated(function () {
  Meteor.subscribe('users.all');
  Meteor.subscribe('game.private');
  Meteor.subscribe('share.private');
});


Template.App_game.helpers({
  games() {
    return Game.find({}, {sort: {created: -1}});
  },
  share_owner() {
    return Share.find({owner: Meteor.userId()});
  },
  share_user() {
    return Share.find({user: Meteor.userId()});
  },
  settings_share() {
    return {
      position: 'top',
      limit: 10,
      rules: [
        {
          collection: Meteor.users,
          field: 'profile.name',
          template: Template.game_autocomplete,
          matchAll: true,
        }
      ]
    };
  },
});

Template.App_game.events({
  'click .create'(event){
    let owner = $(event.target).attr('data-id');
    call('game.insert', {owner: owner}, function (err, id){
      FlowRouter.go('App.game.edit', {id: id});
    });
  },
  'click .games-list-share button'(event) {
    call('share.remove', {
      _id: $(event.target).closest('[data-id]').attr('data-id')
    });
  },
});
Template.App_game.events({
  'autocompleteselect input': function(_, _, doc) {
    if (doc._id === Meteor.userId()) {
      return;
    }
    call('share.insert', {user: doc._id});
  },
});

Template.game.helpers({
  link_edit() {
    return FlowRouter.path('App.game.edit', {id: this.id});
  },
  owner_user() {
    return this.owner === Meteor.userId()
  },
});
Template.game.events({
  'click .delete'(event) {
    let _id = this._id;
    let delete_ob = ()=> call('game.remove', {_id: _id});
    if (!$(event.target).is('[data-edited]')) {
      return delete_ob();
    }
    ModalConfirm({
      text: 'This item has history, are You really want to delete?',
      callback_ok: delete_ob,
    })
  },
});
