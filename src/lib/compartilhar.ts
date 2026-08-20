/**
 * Compartilhar imagem pelo menu nativo do celular (Web Share API com arquivo).
 *
 * "Abrir a imagem numa aba" obrigava a pessoa a salvar e anexar na mão — no
 * celular, o gesto esperado é o menu de compartilhar com o PNG já pronto pra
 * cair no grupo. Onde arquivo não pode ser compartilhado (desktop, navegador
 * antigo), cai no comportamento de antes: abre a imagem numa aba.
 *
 * Só o arquivo, sem texto junto: legenda em share com arquivo é loteria entre
 * os apps (o WhatsApp ora usa, ora descarta) — o link da rodada já tem botão
 * próprio.
 */
export async function compartilharImagem(url: string, nomeDoArquivo: string): Promise<void> {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`imagem respondeu ${resposta.status}`);
    const blob = await resposta.blob();
    const arquivo = new File([blob], nomeDoArquivo, {
      type: blob.type || "image/png",
    });

    if (navigator.canShare?.({ files: [arquivo] })) {
      await navigator.share({ files: [arquivo] });
      return;
    }
  } catch (erro) {
    // Fechar o menu de compartilhar sem escolher app não é erro.
    if (erro instanceof DOMException && erro.name === "AbortError") return;
  }

  window.open(url, "_blank", "noopener");
}
