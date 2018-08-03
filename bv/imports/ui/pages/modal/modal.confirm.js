import './modal.confirm.html';
import { Modal } from './modal';



Template.modal_confirm.events({
  'click button[data-action="ok"]'(event, instance) {
    this.callback_ok();
    Modal.remove(instance);
  },
  'click button[data-action="cancel"]'(event, instance) {
    Modal.remove(instance);
  },
});


export const ModalConfirm = (params)=>{
  return Modal.create({
    data: params,
    template: 'modal_confirm',
  });
};
