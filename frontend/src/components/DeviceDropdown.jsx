const devices = [
  { id: "esp32_01", name: "Greenhouse Sensor 1" },
  { id: "esp32_02", name: "Greenhouse Sensor 2" },
];

export default function DeviceDropdown() {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-gray-500 mb-1">
        Select Device
      </label>

      <select className="border border-gray-300 p-2 rounded-lg bg-white shadow-sm">
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.id})
          </option>
        ))}
      </select>
    </div>
  );
}