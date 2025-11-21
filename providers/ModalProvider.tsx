// providers/ModalProvider.tsx
import React, { createContext, useContext, useState, PropsWithChildren } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { PasscodeModal } from '../components/PasscodeModal';
import { QuantityModal } from '../components/QuantityModal';

interface ModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
}
// --- NEW: Options for the Passcode Modal ---
interface PasscodeModalOptions {
  title: string;
  message: string;
  onSubmit: (passcode: string) => void;
}

// --- NEW: Options for the Quantity Modal ---
interface QuantityModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onSubmit: (quantity: number) => void;
}

interface ModalContextType {
  showConfirmation: (options: ModalOptions) => void;
  showPasscodeModal: (options: PasscodeModalOptions) => void;
  showQuantityModal: (options: QuantityModalOptions) => void;
}

const ModalContext = createContext<ModalContextType>(null!);

export const ModalProvider = ({ children }: PropsWithChildren) => {
  const [confirmOptions, setConfirmOptions] = useState<ModalOptions | null>(null);
  const [passcodeOptions, setPasscodeOptions] = useState<PasscodeModalOptions | null>(null);
  const [quantityOptions, setQuantityOptions] = useState<QuantityModalOptions | null>(null);

  const showConfirmation = (opts: ModalOptions) => {
    setConfirmOptions(opts);
  };
  const handleConfirm = () => {
    if (confirmOptions) {
      confirmOptions.onConfirm();
      setConfirmOptions(null);
    }
  };
  const handleCancelConfirm = () => {
    setConfirmOptions(null);
  };

  // --- NEW: Logic for Passcode Modal ---
  const showPasscodeModal = (opts: PasscodeModalOptions) => {
    setPasscodeOptions(opts);
  };
  const handleSubmitPasscode = (passcode: string) => {
    if (passcodeOptions) {
      passcodeOptions.onSubmit(passcode);
      setPasscodeOptions(null);
    }
  };
  const handleCancelPasscode = () => {
    setPasscodeOptions(null);
  };

  // --- NEW: Logic for Quantity Modal ---
  const showQuantityModal = (opts: QuantityModalOptions) => {
    setQuantityOptions(opts);
  };
  const handleSubmitQuantity = (quantity: number) => {
    if (quantityOptions) {
      quantityOptions.onSubmit(quantity);
      setQuantityOptions(null);
    }
  };
  const handleCancelQuantity = () => {
    setQuantityOptions(null);
  };

  return (
    <ModalContext.Provider 
      value={{ showConfirmation, showPasscodeModal, showQuantityModal }}
    >
      {children}

      {/* Render Confirmation Modal */}
      {confirmOptions && (
        <ConfirmationModal
          visible={!!confirmOptions}
          title={confirmOptions.title}
          message={confirmOptions.message}
          confirmText={confirmOptions.confirmText || 'general.yes'}
          cancelText={confirmOptions.cancelText || 'general.cancel'}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          isDestructive={confirmOptions.isDestructive}
        />
      )}

      {/* Render Passcode Modal */}
      {passcodeOptions && (
        <PasscodeModal
          visible={!!passcodeOptions}
          title={passcodeOptions.title}
          message={passcodeOptions.message}
          onSubmit={handleSubmitPasscode}
          onCancel={handleCancelPasscode}
        />
      )}

      {/* Render Quantity Modal */}
      {quantityOptions && (
        <QuantityModal
          visible={!!quantityOptions}
          title={quantityOptions.title}
          message={quantityOptions.message}
          confirmText={quantityOptions.confirmText || 'general.submit'}
          cancelText={quantityOptions.cancelText || 'general.cancel'}
          onSubmit={handleSubmitQuantity}
          onCancel={handleCancelQuantity}
        />
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);