export default function SensorCard({ title, value, unit }) {
  return (
    <div className="bg-white/90 backdrop-blur p-6 rounded-xl shadow-md hover:shadow-xl transition transform hover:-translate-y-1">
      <h2 className="text-gray-500 text-sm mb-2">{title}</h2>
      <p className="text-4xl font-bold text-gray-800">
        {value} {unit}
      </p>
    </div>
  );
}