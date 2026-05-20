import "../styles/devicedropdown.css";

const devices = [
  {
    id: "esp32_01",
    name: "Greenhouse Sensor 1",
  },
  {
    id: "esp32_02",
    name: "Greenhouse Sensor 2",
  },
];

export default function DeviceDropdown() {
  return (
    <div className="device-dropdown">

      <label className="device-dropdown-label">
        Select Device
      </label>

      <select className="device-dropdown-select">

        {devices.map((d) => (
          <option
            key={d.id}
            value={d.id}
          >
            {d.name} ({d.id})
          </option>
        ))}

      </select>

    </div>
  );
}