import './modal.html';


Template.modal.onCreated(function () {
  this.modal_remove = ()=>{ Blaze.remove(Template.instance().view) }
});


Template.modal.events({
  'click button[data-action="close"]'(_, instance) {
    Blaze.remove(instance.view);
  },
  'click button[data-call]'(event, instance) {
    let id = parseInt($(event.target).attr('data-call').split('-')[1]);
    if (this.buttons[id].callback) {
      this.buttons[id].callback();
    }
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
    if (params.buttons) {
      params.buttons = params.buttons.map((v, i)=> {
        if (typeof v === 'string') {
          v = {text: v};
        }
        return Object.assign({'event': 'ev-' + i}, v);
      });
    }
    var instance = Blaze.renderWithData(Template.modal, Object.assign({
      data: {},
      _modal_id: _id,
      parent: instance,
    }, params), $('body').get(0));
  },
};
