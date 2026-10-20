// Contenido del popup del mapa como NODO DE TEXTO. Leaflet hace
// `innerHTML = content` si le pasas un string; el título viene del portal
// y puede traer HTML. Con un nodo y textContent nunca se interpreta.
export function nodoPopup(titulo: string, doc: Pick<Document, "createElement"> = document): HTMLElement {
  const nodo = doc.createElement("span");
  nodo.textContent = titulo;
  return nodo;
}
