import { Team } from '../../../api/team/model';
import { ModalObjects } from '../modal/modal.objects';
import { call } from '../methods';



export const ModalTeam = (params)=>{
  let disabled = !(Array.isArray(params.teams) && params.teams[0] && params.teams[1]);
  let disabled_text;
  if (disabled) {
    disabled_text = 'To create new team - ';
    if (!params.teams) {
      disabled_text += 'set 2 players';
    } else if (!Array.isArray(params.teams)) {
      disabled_text += 'choose another players';
    } else if (!params.teams[0]) {
      disabled_text += 'set 1st player';
    } else {
      disabled_text +=  'set 2nd player';
    }
  }
  return ModalObjects(Object.assign({
    name: 'team',
    disabled: disabled,
    disabled_text: disabled_text,
    callback(object){
      call('game.update.team', {
        _id: this._id,
        team_id: object,
        team: this.team,
      });
    },
    callback_new(name) {
      call('team.insert', {name: name, owner: params.owner, players: params.teams}, (err, id)=> {
        if (id) {
          call('game.update.team', {_id: this._id, team_id: id, team: this.team});
        }
      });
    },
    objects() {
      return Team.find({owner: params.owner}, {sort: {created: -1}});
    },
    onCreated: function () {
      this.autorun(() => {
        this.subscribe('team.private', params.owner);
      });
    },
  }, params));
};
