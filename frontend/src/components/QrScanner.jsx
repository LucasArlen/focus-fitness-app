import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

const temBarcodeDetector = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

export default function QrScanner({ onScan, onClose }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const streamRef = useRef(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (!ativo) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (temBarcodeDetector()) {
          tickNativo();
        } else {
          tickJsQR();
        }
      } catch {
        setErro("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }

    /* ── BarcodeDetector (Chrome Android, hardware-accelerated) ── */
    async function tickNativo() {
      if (!ativo) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tickNativo);
        return;
      }
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const loop = async () => {
          if (!ativo) return;
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0) {
              onScan(codes[0].rawValue);
              return;
            }
          } catch { /* frame ruim, tenta próximo */ }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        // BarcodeDetector falhou → cai no jsQR
        tickJsQR();
      }
    }

    /* ── jsQR (fallback) ── */
    function tickJsQR() {
      if (!ativo) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d");
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img  = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code?.data) {
          onScan(code.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tickJsQR);
    }

    init();
    return () => {
      ativo = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onScan]);

  return (
    <div className="qr-overlay">
      {erro ? (
        <div className="qr-erro">
          <p>{erro}</p>
          <button className="qr-fechar-btn" onClick={onClose}>Fechar</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="qr-video" playsInline muted />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div className="qr-mira">
            <span className="qr-mira-canto tl" />
            <span className="qr-mira-canto tr" />
            <span className="qr-mira-canto bl" />
            <span className="qr-mira-canto br" />
          </div>
          <p className="qr-dica">Aponte para o QR code da academia</p>
        </>
      )}
      <button className="qr-fechar-btn" onClick={onClose}>✕  Fechar</button>
    </div>
  );
}
