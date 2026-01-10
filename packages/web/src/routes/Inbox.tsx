export function Inbox() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Inbox</h2>
      <p className="text-gray-600">Items waiting to be processed.</p>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No items in inbox
      </div>
    </div>
  );
}
