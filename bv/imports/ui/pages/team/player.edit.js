import { Player } from '../../../api/team/model';
import { ModalObjects } from '../modal/modal.objects';
import { call } from '../methods';



export const ModalPlayer = (params)=>{
  return ModalObjects(Object.assign({
    name: 'player',
    callback(object){
      call('game.update.player', {
        _id: this._id,
        player: object,
        team: [this.team, this.player]
      });
    },
    callback_new(name) {
      call('player.insert', {name: name, owner: this.owner}, (err, id)=> {
        if (id) {
          call('game.update.player', {_id: this._id, player: id, team: [this.team, this.player]});
        }
      });
    },
    objects() {
      return Player.find({owner: params.owner}, {sort: {created: -1}});
    },
    onCreated: function () {
      this.autorun(() => {
        this.subscribe('player.private', params.owner);
      });
    },
  }, params));
};
