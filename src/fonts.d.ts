declare module 'kstack:fonts' {
  /** woff2 file name -> base64 bytes. */
  export const FILES: Record<string, string>
  export const FACES: Array<{ family: string; file: string; desc: FontFaceDescriptors }>
}
