/**
 * SectionTitle — shared section header used in Dashboard and Settings.
 * Previously duplicated as a local function in both pages.
 */
export default function SectionTitle({ title }) {
  return (
    <div className="section-title-container">
      <h2 className="section-title">{title}</h2>
      <div className="section-line"></div>
    </div>
  );
}
