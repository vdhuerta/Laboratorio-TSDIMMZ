// Hook de Node para ejecutar con tsx módulos de la app que importan imágenes (png/jpg/svg): las sustituye por un texto.
export async function load(url, context, nextLoad) {
  if (/\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i.test(url)) return { format: 'module', shortCircuit: true, source: `export default ${JSON.stringify(url)};` };
  return nextLoad(url, context);
}
