/**
 * Web-only polyfill para CSSStyleDeclaration.
 *
 * Problema: react-native-css-interop@0.1.22 (motor de NativeWind v4) intenta
 * asignar estilos CSS usando índices numéricos: `element.style[0] = value`.
 * El spec de CSSStyleDeclaration NO admite setters indexados, por lo que los
 * navegadores modernos lanzan:
 *   "Failed to set an indexed property [0] on 'CSSStyleDeclaration':
 *    Indexed property setter is not supported."
 *
 * Este polyfill define getters/setters no-op para los índices 0-255 en el
 * prototipo de CSSStyleDeclaration, eliminando el error sin afectar el
 * comportamiento real del estilo.
 */
if (typeof CSSStyleDeclaration !== 'undefined') {
  const proto = CSSStyleDeclaration.prototype;
  for (let i = 0; i < 256; i++) {
    const key = String(i);
    // Solo parchear si el navegador no definió ya la propiedad
    if (!Object.prototype.hasOwnProperty.call(proto, key)) {
      Object.defineProperty(proto, key, {
        get() {
          return this.item(i) ?? '';
        },
        set(_value: string) {
          // Silently ignore — indexed property setters no están soportados
          // por el spec CSS. react-native-css-interop@0.1.22 los usa
          // incorrectamente; este no-op previene el error en producción.
        },
        configurable: true,
        enumerable: false,
      });
    }
  }
}
