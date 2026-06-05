interface Props {
  name:      string;
  onConfirm: () => Promise<void>;
  onClose:   () => void;
}

export default function DeleteModal({ name, onConfirm, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="dark:bg-dark-800 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="dark:text-dark-100 mb-2 text-lg font-semibold text-gray-800">Delete User</h2>
        <p className="dark:text-dark-300 mb-6 text-sm text-gray-500">
          Are you sure you want to delete <span className="font-medium text-gray-800 dark:text-dark-100">{name}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="dark:text-dark-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
