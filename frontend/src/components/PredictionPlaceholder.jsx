/**
 * PredictionPlaceholder — shown in the prediction chart area until the
 * AI service is integrated.
 * Previously a local function in Dashboard.jsx.
 */
export default function PredictionPlaceholder({ language }) {
  return (
    <div className="prediction-placeholder">
      <p className="prediction-placeholder-title">
        {language === "EN"
          ? "Prediction data is not available yet"
          : "Data prediksi belum tersedia"}
      </p>

      <p className="prediction-placeholder-text">
        {language === "EN"
          ? "This section will display AI prediction results after the AI service is integrated."
          : "Bagian ini akan menampilkan hasil prediksi AI setelah layanan AI terintegrasi."}
      </p>
    </div>
  );
}
