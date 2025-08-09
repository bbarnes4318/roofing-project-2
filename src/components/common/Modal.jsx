import React from 'react';
import { XCircleIcon } from './Icons';

const Modal = ({ isOpen, onClose, title, children, colorMode }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className={`modal-content ${colorMode ? 'bg-slate-800' : ''} max-w-lg max-h-full overflow-hidden my-4`}>
                <div className={`p-2 lg:p-3 border-b flex justify-between items-center sticky top-0 ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} z-10`}>
                    <h3 className={`text-sm lg:text-base font-bold truncate flex-1 mr-2 ${colorMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <button onClick={onClose} className="btn-ghost p-2 flex-shrink-0">
                        <XCircleIcon className="w-4 h-4 lg:w-5 lg:h-5"/>
                    </button>
                </div>
                <div className="p-2 lg:p-3 overflow-y-auto max-h-[calc(100vh-150px)]">{children}</div>
            </div>
        </div>
    );
};

export default Modal; 