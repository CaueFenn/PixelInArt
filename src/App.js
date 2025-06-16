import React, { useState, useEffect, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import html2canvas from 'html2canvas';
import './App.css';

/**
 * Componente principal do editor de Pixel Art.
 */
function App() {
  // Estados principais
  const [gridSize, setGridSize] = useState(64); // Tamanho da grade (ex: 64x64)
  const [pixelSize, setPixelSize] = useState(20); // Tamanho visual de cada pixel (zoom)
  const [pixels, setPixels] = useState(Array(32 * 32).fill('#ffffff')); // Cores de todos os pixels
  const [currentColor, setCurrentColor] = useState('#000000'); // Cor atual de pintura
  const [isDrawing, setIsDrawing] = useState(false); // Controle do clique para pintar arrastando
  const [isEraser, setIsEraser] = useState(false); // Modo borracha
  const gridRef = useRef(null); // Referência à grade para calcular posição do mouse
  const [isBucketMode, setIsBucketMode] = useState(false);


  /**
   * Ajusta dinamicamente o tamanho do pixel com base na grade.
   */
  useEffect(() => {
    if (gridSize > 80) {
      setPixelSize(6); // Grades grandes → pixels menores
    } else if (gridSize > 64) {
      setPixelSize(8);
    } else {
      setPixelSize(20);
    }
  }, [gridSize]);

  /**
   * Redefine os pixels sempre que o tamanho da grade mudar.
   */
  useEffect(() => {
    setPixels(Array(gridSize * gridSize).fill('#ffffff'));
  }, [gridSize]);

  /**
   * Escuta eventos globais de mouse solto e tecla 'E' para ativar/desativar borracha.
   */
  useEffect(() => {
    const handleMouseUp = () => setIsDrawing(false);
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'e') {
        setIsEraser(prev => !prev);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * Pinta ou apaga um pixel no índice especificado.
   */
  const paintPixel = (index) => {
    setPixels(prevPixels => {
      const newColor = isEraser ? '#ffffff' : currentColor;

      if (prevPixels[index] === newColor) {
        return prevPixels; // Evita re-render desnecessário
      }

      const newPixels = [...prevPixels];
      newPixels[index] = newColor;
      return newPixels;
    });
  };

  const handleMouseDown = (e) => {
  const scale = 0.48;
  const rect = gridRef.current.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  const col = Math.floor(x / pixelSize);
  const row = Math.floor(y / pixelSize);
  const index = row * gridSize + col;

  if (index < 0 || index >= pixels.length) return;

  if (isBucketMode) {
    const targetColor = pixels[index];
    const replacementColor = isEraser ? '#ffffff' : currentColor;
    floodFill(index, targetColor, replacementColor);
    return; // Não ativa isDrawing
  }

  setIsDrawing(true);
  paintPixel(index);
};



  /**
   * Enquanto o mouse se move, pinta os pixels sobre os quais ele passa.
   */
  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const scale = 0.48; // mesmo valor do transform: scale

const rect = gridRef.current.getBoundingClientRect();
const x = (e.clientX - rect.left) / scale;
const y = (e.clientY - rect.top) / scale;

const col = Math.floor(x / pixelSize);
const row = Math.floor(y / pixelSize);
const index = row * gridSize + col;

if (index >= 0 && index < pixels.length) {
  paintPixel(index);
}
  };

  const floodFill = (startIndex, targetColor, replacementColor) => {
  if (targetColor === replacementColor) return;

  const newPixels = [...pixels];
  const stack = [startIndex];

  while (stack.length > 0) {
    const index = stack.pop();

    if (newPixels[index] !== targetColor) continue;

    newPixels[index] = replacementColor;

    const x = index % gridSize;
    const y = Math.floor(index / gridSize);

    // Verifica vizinhos: cima, baixo, esquerda, direita
    const neighbors = [];

    if (x > 0) neighbors.push(index - 1); // esquerda
    if (x < gridSize - 1) neighbors.push(index + 1); // direita
    if (y > 0) neighbors.push(index - gridSize); // cima
    if (y < gridSize - 1) neighbors.push(index + gridSize); // baixo

    for (let n of neighbors) {
      if (newPixels[n] === targetColor) {
        stack.push(n);
      }
    }
  }

  setPixels(newPixels);
};



  /**
   * Limpa completamente a grade, preenchendo todos os pixels de branco.
   */
  const clearGrid = () => {
    setPixels(Array(gridSize * gridSize).fill('#ffffff'));
  };

  /**
   * Aumenta o zoom (tamanho dos pixels).
   */
  const zoomIn = () => {
    setPixelSize(ps => Math.min(ps + 5, 50));
  };

  /**
   * Diminui o zoom (tamanho dos pixels).
   */
  const zoomOut = () => {
    setPixelSize(ps => Math.max(ps - 5, 5));
  };

  
const handleWheelZoom = (e) => {
  e.preventDefault();

  if (e.deltaY < 0) {
    // Scroll para cima → Aumenta o zoom
    setPixelSize((prev) => Math.min(prev + 2, 50));
  } else {
    // Scroll para baixo → Diminui o zoom
    setPixelSize((prev) => Math.max(prev - 2, 5));
  }
};


  /**
   * Atualiza o tamanho da grade com valores válidos entre 4 e 100.
   */
  const handleGridSizeChange = (e) => {
    const value = e.target.value;
    const parsed = parseInt(value, 10);

    if (!isNaN(parsed) && parsed >= 4 && parsed <= 64) {
      setGridSize(parsed);
    } else if (value === '') {
      setGridSize('');
    }
  };

  /**
   * Exporta o desenho como PNG com fundo transparente.
   */
  const exportToPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = gridSize;
    canvas.height = gridSize;

    const ctx = canvas.getContext('2d');

    // Pinta os pixels no canvas base
    pixels.forEach((color, index) => {
      if (color === '#ffffff') return; // branco = transparente

      const x = index % gridSize;
      const y = Math.floor(index / gridSize);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });

    // Cria canvas escalado para exportar com zoom
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = gridSize * pixelSize;
    exportCanvas.height = gridSize * pixelSize;

    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.imageSmoothingEnabled = false;
    exportCtx.scale(pixelSize, pixelSize);
    exportCtx.drawImage(canvas, 0, 0);

    // Gera o download
    const link = document.createElement('a');
    link.download = 'pixel-art.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  /**
   * JSX de retorno (interface).
   */
  return (
    <div className="container py-4">
     <h1 className="pixel-title mb-4 d-flex align-items-center gap-2">
  <img src="/pintor.png" alt="Logo" style={{ width: '100px', height: 'auto' }} />
  ArtInPixel
</h1>





      {/* Controles de ferramentas */}
      <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
        {/* Seletor de cor */}
        <label>Cor:</label>
        <input
          type="color"
          value={currentColor}
          onChange={(e) => setCurrentColor(e.target.value)}
        
        />

      <button
  className={`btn btn-outline-primary btn-balde ${isBucketMode ? 'btn-activated' : ''}`}
  onClick={() => setIsBucketMode(!isBucketMode)}
>
  🪣
  {/* <img src="/balde.png" alt="Logo" style={{ width: '30px', height: 'auto' }} /> */}
</button>



        {/* Tamanho da grade */}
        <label className="ms-3">Grade:</label>
        <input
          type="number"
          min="4"
          max="100"
          value={gridSize}
          onChange={handleGridSizeChange}
          className="form-control"
          style={{ width: '80px' }}
        />

        {/* Zoom atual */}
        <label className="ms-3">Tamanho do pixel:</label>
        <input
          type="number"
          min="5"
          max="50"
          value={pixelSize}
          readOnly
          className="form-control"
          style={{ width: '80px', backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
        />

        {/* Zoom buttons */}
        <button className="btn btn-secondary ms-1" onClick={zoomOut}>-</button>
        <button className="btn btn-secondary ms-1" onClick={zoomIn}>+</button>

        {/* Limpar grade */}
        <button className="btn btn-danger ms-3" onClick={clearGrid}>Limpar</button>

        {/* Exportar PNG */}
        <button className="btn btn-success ms-2" onClick={exportToPng}>
          Download PNG
        </button>

        {/* Ativar/Desativar borracha */}
       <button
  className={`btn ms-2 ${isEraser ? 'btn-warning btn-activated' : 'btn-outline-warning'}`}
  onClick={() => setIsEraser(!isEraser)}
>
  {isEraser ? 'Modo: Borracha (E)' : 'Ativar Borracha (E)'}
</button>

      </div>

      {/* Área de desenho (grade de pixels) */}
      <div
        ref={gridRef}
        className="pixel-grid"
        
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsDrawing(false)}
        onWheel={handleWheelZoom}
        style={{
          width: gridSize * pixelSize,
          height: gridSize * pixelSize,
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${gridSize}, ${pixelSize}px)`,
          backgroundImage: `
            linear-gradient(45deg, #ccc 25%, transparent 25%),
            linear-gradient(-45deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%),
            linear-gradient(-45deg, transparent 75%, #ccc 75%)
          `,
          backgroundSize: `${pixelSize * 2}px ${pixelSize * 2}px`,
          userSelect: 'none',
         // cursor: isDrawing ? 'crosshair' : 'default',
          border: '1px solid #ccc',
          marginTop: '10px'
        }}
      >
        {/* Renderização dos pixels */}
        {pixels.map((color, index) => (
          <div
            key={index}
            onMouseDown={(e) => handleMouseDown(e)}
            style={{
              width: pixelSize,
              height: pixelSize,
              backgroundColor: color,
              // boxSizing: 'border-box',
              // border: '1px solid #ddd'
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
