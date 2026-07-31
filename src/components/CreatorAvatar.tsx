import { useState } from "react";

/**
 * Avatar do criador. Usa a foto em /criador.jpg se ela existir
 * (basta salvar a imagem em public/criador.jpg); senao mostra "DSC".
 */
export default function CreatorAvatar({ size = 24 }: { size?: number }) {
  const [failed, setFailed] = useState(false);
  const dim = { width: size, height: size };

  if (failed) {
    return (
      <span className="credit-avatar" style={dim}>
        DSC
      </span>
    );
  }
  return (
    <img
      src="./criador.jpeg"
      alt="Daniel Santos Ciriaco"
      className="credit-avatar-img"
      style={dim}
      onError={() => setFailed(true)}
    />
  );
}
