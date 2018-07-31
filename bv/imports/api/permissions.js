import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';


export const permissions = {
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
