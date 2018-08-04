import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Share } from './share/model';


export const permissions = {
  login: function (fn){
    return function () {
      if (!this.userId) {
        throw new Meteor.Error('not-authorized');
      }
      return fn.apply(this, arguments);
    }
  },
  _owner_check: function (Collection, params, owners) {
    let ob;
    if (params && params._id) {
      check(params._id, String);
      ob = Collection.findOne(params._id);
    } else if (params && params.id) {
      check(params.id, Match.Integer);
      ob = Collection.findOne({id: params.id});
    }
    if (!(ob && owners.indexOf(ob.owner) >= 0)) {
      throw new Meteor.Error('not-authorized');
    }
    return ob;
  },
  owner: function (Collection, fn) {
    return permissions.login(function (params) {
      let ob = permissions._owner_check(Collection, params, [this.userId]);
      return fn.apply(this, Array.from(arguments).concat([ob]));
    });
  },
  shared_check: function (strict, fn) {
    return permissions.login(function (params) {
      let shared;
      if (params && params.owner) {
        check(params.owner, String);
        if (params.owner === this.userId) {
          return fn.apply(this, arguments);
        }
        shared = Share.findOne({owner: params.owner, user: this.userId});
        if (!shared) {
          throw new Meteor.Error('not-authorized');
        }
      }
      if (!shared && strict) {
        throw new Meteor.Error('not-authorized');
      }
      return fn.apply(this, arguments);
    });
  },
  shared_owners: function (user) {
    return Share.find({user: user}).map((v)=> v.owner )
  },
  owner_shared: function (Collection, fn) {
    return permissions.login(function (params) {
      let owners = [this.userId].concat(permissions.shared_owners(this.userId));
      let ob = permissions._owner_check(Collection, params, owners);
      return fn.apply(this, Array.from(arguments).concat([ob]));
    });
  },
};
