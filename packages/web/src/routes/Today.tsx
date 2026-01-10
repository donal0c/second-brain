export function Today() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Today</h2>
      <p className="text-gray-600">Your daily digest and focus items.</p>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No digest available yet
      </div>
    </div>
  );
}
