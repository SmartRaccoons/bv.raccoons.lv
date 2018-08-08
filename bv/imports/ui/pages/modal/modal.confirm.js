import { Modal } from './modal';


export const ModalConfirm = (params)=>{
  return Modal.create({
    content: `<p>${params.text}</p>`,
    buttons: [
      {text: 'OK', callback: params.callback_ok},
      'Cancel',
    ],
  });
};
