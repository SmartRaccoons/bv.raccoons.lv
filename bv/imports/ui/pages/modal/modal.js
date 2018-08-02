import './modal.html';


Template.modal.onCreated(function () {
  this.modal_remove = ()=>{ Blaze.remove(Template.instance().view) }
});


Template.modal.events({
  'click button[data-action="close"]'(_, instance) {
    Blaze.remove(instance.view);
  },
});

let _id = 0;

export const Modal = {
  'view_get': (view, name)=> {
    while(view){
        if(view.name === 'Template.' + name){
            return view;
        }
        view = view.parentView;
    }
    return null;
  },
  'remove': (instance)=> {
    Blaze.remove(Modal.view_get(instance.view, 'modal'));
  },
  'create': (params)=>{
    _id++;
    var instance = Blaze.renderWithData(Template.modal, Object.assign({
      data: {},
      _modal_id: _id,
      parent: instance,
    }, params), $('body').get(0));
  },
};
