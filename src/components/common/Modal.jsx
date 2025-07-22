import React from 'react';
import { XCircleIcon } from './Icons';

const Modal = ({ isOpen, onClose, title, children, colorMode }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-blue-900/30 backdrop-blur-sm z-[9999] flex justify-center items-center p-4 overflow-y-auto">
            <div className={`${colorMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-hidden my-4`}>
                <div className={`p-2 lg:p-3 border-b flex justify-between items-center sticky top-0 ${colorMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} z-10`}>
                    <h3 className={`text-sm lg:text-base font-bold truncate flex-1 mr-2 ${colorMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <button onClick={onClose} className={`${colorMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} flex-shrink-0`}>
                        <XCircleIcon className="w-4 h-4 lg:w-5 lg:h-5"/>
                    </button>
                </div>
                <div className="p-2 lg:p-3 overflow-y-auto max-h-[calc(100vh-150px)]">{children}</div>
            </div>
        </div>
    );
};

export default Modal; 