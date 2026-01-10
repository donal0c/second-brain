export function Capture() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Capture</h2>
      <p className="text-gray-600">Quick capture for thoughts, tasks, and ideas.</p>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <textarea
          className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          placeholder="What's on your mind?"
        />
        <div className="mt-3 flex justify-end">
          <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
