import React from 'react';

const SimpleAlert = ({ message, type = 'info', onClose }) => {
  const color =
    type === 'success'
      ? 'bg-green-100 text-green-800 border-green-200'
      : type === 'error'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 border px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 ${color}`}
      role="alert"
    >
      <span className="font-semibold">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-lg font-bold focus:outline-none"
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SimpleAlert;
