/// <reference types="vite/client" />

// Allow importing SVG files as string URLs
declare module '*.svg' {
  const src: string
  export default src
}

// Allow importing PNG files as string URLs
declare module '*.png' {
  const src: string
  export default src
}
