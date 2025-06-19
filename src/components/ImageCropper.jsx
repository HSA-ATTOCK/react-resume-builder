import React, { useCallback, useState, useRef } from "react";
import PropTypes from "prop-types";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../utils/cropImage";
import "../styles/cropper.css";

function ImageCropper({ image, onCancel, onCropComplete }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const zoomSliderRef = useRef(null);

  const handleCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleDone = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsCropping(true);
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (error) {
      console.error("Cropping failed:", error);
      // Optional: Add user feedback here (e.g., toast notification)
    } finally {
      setIsCropping(false);
    }
  }, [croppedAreaPixels, image, onCropComplete]);

  const handleZoomChange = (e) => {
    setZoom(Number(e.target.value));
  };

  return (
    <div
      className="cropper-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropper-title"
    >
      <div className="cropper-popup">
        <h2 id="cropper-title" className="sr-only">
          Image Cropper
        </h2>

        {/* Cropper Preview */}
        <div className="cropper-container">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            cropShape="round" // For circular crops (optional)
            objectFit="contain"
          />
        </div>

        {/* Controls */}
        <div className="cropper-controls">
          <label htmlFor="zoom-slider" className="zoom-label">
            Zoom: {zoom.toFixed(1)}x
          </label>
          <input
            id="zoom-slider"
            ref={zoomSliderRef}
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={handleZoomChange}
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={zoom}
          />
        </div>

        {/* Buttons */}
        <div className="cropper-buttons">
          <button
            className="btn primary"
            onClick={handleDone}
            disabled={isCropping || !croppedAreaPixels}
            aria-busy={isCropping}
          >
            {isCropping ? "Processing..." : "Crop"}
          </button>
          <button
            className="btn cancel"
            onClick={onCancel}
            disabled={isCropping}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

ImageCropper.propTypes = {
  image: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  onCropComplete: PropTypes.func.isRequired,
};

export default ImageCropper;
