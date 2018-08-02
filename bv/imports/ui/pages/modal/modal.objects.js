import './modal.objects.html';
import { Modal } from './modal';


Template.modal_objects.onCreated(function () {
  this.data.onCreated.bind(this)()
});
Template.modal_objects.onRendered(function () {
  this.$('input').focus();
});

Template.modal_objects.events({
  'submit form'(event, instance) {
    event.preventDefault();
    let name = event.target.object.value;
    if (name === '') {
      return false;
    }
    this.callback_new(name);
    Modal.remove(instance);
  },
  'click li'(event, instance) {
    this.callback($(event.target).closest('[data-id]').attr('data-id'));
    Modal.remove(instance);
  },
});


export const ModalObjects = (params)=>{
  return Modal.create({
    data: params,
    template: 'modal_objects',
  });
};
